/* ===== MACS Soldiers — Palnadu Co-operative Society ===== */
const SUPABASE_URL = "https://ebmpvhwssfzcbnvtslqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_4oUPXD3sCcegYV8BM8ODkg_IN-esr1J";
/* A thin bar across the top moves while anything is being fetched, so a slow
   connection reads as "working" rather than "stuck". It only counts requests;
   what is sent and what comes back is untouched. */
let netBusy = 0;
function netBar(){ const b = document.getElementById("netbar"); if (b) b.classList.toggle("on", netBusy > 0); }
function trackedFetch(...args){
  netBusy++; netBar();
  const done = () => { netBusy = Math.max(0, netBusy - 1); netBar(); };
  return fetch(...args).then(r => { done(); return r; }, e => { done(); throw e; });
}
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { global: { fetch: trackedFetch } });
/* People who ask their phone for less motion get none of the decoration. */
const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
/* The emblem is shown before anyone signs in, so it lives in its own public
   bucket. It used to sit in `proofs` alongside photographs of members'
   passbooks - which is the only reason that bucket could not simply be made
   private. */
const LOGO_URI = "https://ebmpvhwssfzcbnvtslqm.supabase.co/storage/v1/object/public/branding/logo.jpg";

const $ = (id) => document.getElementById(id);
const rupee = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* Dashboard figures count up to their value. The true figure is always what
   ends up on screen: a timer writes it even if the animation never ran. */
function setNum(id, n, money){
  const el = $(id); if (!el) return;
  const fmt = (v) => money ? rupee(v) : String(v);
  n = Number(n) || 0;
  if (REDUCED || n <= 0) { el.textContent = fmt(n); return; }
  const t0 = performance.now(), dur = 700;
  const step = (now) => {
    if (!el.isConnected || el.dataset.n !== String(n)) return;
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(n * e));
    if (p < 1) requestAnimationFrame(step);
  };
  el.dataset.n = String(n);
  requestAnimationFrame(step);
  setTimeout(() => { if (el.isConnected && el.dataset.n === String(n)) el.textContent = fmt(n); }, dur + 120);
}

/* ---------- the dash convention ----------
   The paper register is genuinely incomplete in places. Empty means empty:
   nothing is stored for an absent value, whatever its type. The dash is a
   display convention only — the typist may write "-" for a blank, and every
   empty value renders as "-", but no dash is ever written to the database.
   Nothing below rejects a value for being absent. */
const DASH = "-";
const isBlank = (v) => v === null || v === undefined ||
  (typeof v === "string" && (v.trim() === "" || v.trim() === DASH));
const dash    = (v) => isBlank(v) ? DASH : String(v);
const dashEsc = (v) => isBlank(v) ? DASH : esc(String(v));
/* what actually gets written to the database */
const textIn = (v) => isBlank(v) ? null : String(v).trim();
const dateIn = (v) => isBlank(v) ? null : String(v).trim();
const numIn  = (v) => { if (isBlank(v)) return null;
  const n = parseInt(String(v).trim(), 10); return Number.isFinite(n) ? n : null; };

/* ---------- business time: always Asia/Kolkata ----------
   The phone's own clock and timezone must never decide which
   business day a collection belongs to. Everything date-related
   goes through istParts(). */
const IST = "Asia/Kolkata";
const DOW = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
function istParts(date){
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, year:"numeric", month:"2-digit", day:"2-digit", weekday:"short"
  }).formatToParts(date || new Date());
  const p = {};
  parts.forEach(x => { p[x.type] = x.value; });
  return { y:+p.year, m:+p.month, d:+p.day, dow:DOW[p.weekday],
           iso:`${p.year}-${p.month}-${p.day}` };
}
const todayStr = () => istParts().iso;
const istTime = (ts) => new Date(ts).toLocaleTimeString("en-IN",
  { timeZone: IST, hour:"2-digit", minute:"2-digit" });

let staff = null;
let lang = localStorage.getItem("macs_lang") || "en";

/* Dark mode is a choice, remembered on this device. Every colour in
   styles.css is a name, and html[data-theme="dark"] gives those names their
   dark values - nothing else changes. */
const isDark = () => document.documentElement.dataset.theme === "dark";
function setTheme(dark){
  if (dark) document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
  try { localStorage.setItem("macs_theme", dark ? "dark" : "light"); } catch (e) {}
}
/* ---------- smooth moves (styles.css "SMOOTH PASS") ----------
   The browser's view transitions do the work where the phone has them;
   elsewhere the change simply happens, as it did before. The callback is
   never awaited: a tab that is still loading must not hold the screen. */
const canVT = () => !REDUCED && typeof document.startViewTransition === "function";
function smoothSwap(fn, back){
  if (!canVT()) return fn();
  const h = document.documentElement; h.classList.toggle("vt-back", !!back);
  try { document.startViewTransition(() => { fn(); }).finished.finally(() => h.classList.remove("vt-back")); }
  catch (e) { fn(); }
}
function themeSwitch(btn){
  const flip = () => { setTheme(!isDark()); if ($("themeBtn")) $("themeBtn").innerHTML = isDark() ? ICON.sun : ICON.moon; };
  if (!canVT()) return flip();
  const r = btn.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2;
  const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const h = document.documentElement; h.classList.add("vt-theme");
  let vt; try { vt = document.startViewTransition(flip); } catch (e) { h.classList.remove("vt-theme"); return flip(); }
  vt.ready.then(() => h.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`] },
    { duration: 520, easing: "cubic-bezier(.32,.72,0,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
  vt.finished.finally(() => h.classList.remove("vt-theme"));
}
/* Swipes. A sheet follows the finger down and closes past a third of its
   height (or a quick flick); a page dragged from the left edge goes back the
   same way. Both close through the screen's own close control, so whatever
   that does (clearing a half-taken photo, say) still happens. */
(function swipes(){
  let g = null;
  const reset = (el) => { el.classList.remove("dragging"); el.style.transform = ""; el.style.opacity = ""; };
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const tch = e.touches[0], tgt = e.target;
    const sheet = tgt.closest && tgt.closest(".sheet-back.open .sheet");
    if (sheet && sheet.scrollTop <= 0 && !tgt.closest("input,textarea,select,video,canvas")) {
      g = { kind: "sheet", el: sheet, back: sheet.parentElement, x: tch.clientX, y: tch.clientY, t: Date.now(), d: 0, on: false };
      return;
    }
    const page = tgt.closest && tgt.closest(".detail.open");
    if (page && tch.clientX < 26 && page.querySelector(".dhead .dback")) {
      g = { kind: "page", el: page, x: tch.clientX, y: tch.clientY, t: Date.now(), d: 0, on: false };
    }
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!g) return;
    const tch = e.touches[0], dx = tch.clientX - g.x, dy = tch.clientY - g.y;
    if (!g.on) {
      const along = g.kind === "sheet" ? dy : dx, across = g.kind === "sheet" ? dx : dy;
      if (Math.abs(along) < 8 && Math.abs(across) < 8) return;
      if (along <= 0 || Math.abs(across) > Math.abs(along)) { g = null; return; }   /* not our gesture */
      g.on = true; g.el.classList.add("dragging"); if (g.back) g.back.classList.add("dragging");
    }
    if (e.cancelable) e.preventDefault();
    g.d = Math.max(0, g.kind === "sheet" ? dy : dx);
    if (g.kind === "sheet") g.el.style.transform = `translateY(${g.d}px)`;
    else { g.el.style.transform = `translateX(${g.d}px)`; g.el.style.opacity = String(1 - Math.min(.35, g.d / innerWidth / 2)); }
  }, { passive: false });
  const end = () => {
    if (!g) return; const s = g; g = null;
    if (!s.on) return;
    const size = s.kind === "sheet" ? s.el.offsetHeight : s.el.offsetWidth;
    const fast = s.d / Math.max(1, Date.now() - s.t) > .6 && s.d > 40;
    const go = fast || s.d > size * (s.kind === "sheet" ? .33 : .35);
    s.el.classList.remove("dragging"); if (s.back) s.back.classList.remove("dragging");
    requestAnimationFrame(() => {
      if (go) {
        /* carry on in the direction of the swipe, then let the screen close itself */
        if (s.kind === "sheet") { s.el.style.transform = "translateY(105%)"; s.back.click(); }
        else { s.el.style.transform = "translateX(100%)"; s.el.style.opacity = "0"; const b = s.el.querySelector(".dhead .dback"); b && b.click(); }
        setTimeout(() => reset(s.el), 380);
      } else reset(s.el);
    });
  };
  document.addEventListener("touchend", end); document.addEventListener("touchcancel", end);
})();
try { if (localStorage.getItem("macs_theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch (e) {}

/* ---------- error tracking ----------
   A crash in an agent's hand must not be silent. The Sentry loader
   script is async, so guard every call. */
function reportError(err, context){
  try {
    if (window.Sentry && window.Sentry.captureException) {
      window.Sentry.captureException(err instanceof Error ? err : new Error(String(err)),
        { extra: context || {} });
    }
  } catch(e){ /* never let reporting break the app */ }
}
function setSentryUser(s){
  try {
    if (window.Sentry && window.Sentry.setUser) {
      window.Sentry.setUser(s ? { id:s.id, username:s.name,
        role: s.is_admin ? "admin" : "agent" } : null);
    }
  } catch(e){}
}
window.addEventListener("unhandledrejection", (e) => {
  reportError(e.reason, { kind:"unhandledrejection" });
});

/* ---------- i18n ---------- */
const T = {
  signin:{en:"Sign in",te:"సైన్ ఇన్"}, username:{en:"Username",te:"వినియోగదారు పేరు"},
  password:{en:"Password",te:"పాస్‌వర్డ్"}, society:{en:"Palnadu Co-operative Society Ltd.",te:"పల్నాడు కో-ఆపరేటివ్ సొసైటీ లిమిటెడ్"},
  wrong:{en:"Wrong username or password",te:"వినియోగదారు పేరు లేదా పాస్‌వర్డ్ తప్పు"},
  checking:{en:"Checking…",te:"తనిఖీ చేస్తోంది…"},
  today:{en:"Today",te:"నేడు"}, members:{en:"Members",te:"సభ్యులు"}, history:{en:"History",te:"చరిత్ర"},
  home:{en:"Home",te:"హోమ్"}, staff:{en:"Staff",te:"సిబ్బంది"}, maturities:{en:"Maturities",te:"మెచ్యూరిటీలు"},
  todaysCollections:{en:"Today's Collections",te:"నేటి వసూళ్లు"}, dashboard:{en:"Dashboard",te:"డాష్‌బోర్డ్"},
  collectedToday:{en:"Collected today",te:"నేడు వసూలైంది"}, realProfit:{en:"Real profit",te:"నికర లాభం"},
  notPaid:{en:"Not paid",te:"చెల్లించలేదు"}, activeMembers:{en:"Active members",te:"క్రియాశీల సభ్యులు"},
  maturing7:{en:"Maturing (7d)",te:"మెచ్యూర్ (7 రోజులు)"},
  noAssigned:{en:"No members assigned to you yet. Ask an admin to assign members.",te:"మీకు ఇంకా సభ్యులు కేటాయించబడలేదు. అడ్మిన్‌ను కేటాయించమని అడగండి."},
  searchMembers:{en:"Search name, account no, phone…",te:"పేరు, ఖాతా నం, ఫోన్ వెతకండి…"},
  comingNext:{en:"Coming next.",te:"త్వరలో వస్తుంది."},
  noHistory:{en:"No collections yet.",te:"ఇంకా వసూళ్లు లేవు."}, logout:{en:"Logout",te:"లాగ్ అవుట్"},
  yourStaff:{en:"Staff members",te:"సిబ్బంది సభ్యులు"}, admin:{en:"Admin",te:"అడ్మిన్"}, agent:{en:"Entry staff",te:"ఎంట్రీ సిబ్బంది"},
  /* --- real staff logins, passwords and staff management (the database lock) --- */
  connErr:{en:"Connection error",te:"కనెక్షన్ లోపం"},
  notStaff:{en:"This login is not active. Ask the admin.",te:"ఈ లాగిన్ యాక్టివ్‌గా లేదు. అడ్మిన్‌ను అడగండి."},
  setNewPw:{en:"Set a new password",te:"కొత్త పాస్‌వర్డ్ పెట్టండి"},
  mustChangeHint:{en:"For safety you must choose your own password before you continue.",te:"భద్రత కోసం, కొనసాగే ముందు మీ సొంత పాస్‌వర్డ్ ఎంచుకోవాలి."},
  changePw:{en:"Change password",te:"పాస్‌వర్డ్ మార్చండి"},
  curPw:{en:"Current password",te:"ప్రస్తుత పాస్‌వర్డ్"},
  newPw:{en:"New password",te:"కొత్త పాస్‌వర్డ్"},
  newPw2:{en:"New password again",te:"కొత్త పాస్‌వర్డ్ మళ్లీ"},
  pwRule:{en:"At least 8 characters, with a letter and a number.",te:"కనీసం 8 అక్షరాలు; ఒక ఇంగ్లీష్ అక్షరం, ఒక అంకె ఉండాలి."},
  pwMismatch:{en:"The two new passwords do not match",te:"రెండు కొత్త పాస్‌వర్డ్‌లు సరిపోలడం లేదు"},
  pwWrongCur:{en:"Current password is wrong",te:"ప్రస్తుత పాస్‌వర్డ్ తప్పు"},
  pwSame:{en:"Choose a different password",te:"వేరే పాస్‌వర్డ్ ఎంచుకోండి"},
  pwChanged:{en:"Password changed",te:"పాస్‌వర్డ్ మార్చబడింది"},
  addStaff:{en:"Add staff",te:"సిబ్బందిని జోడించండి"},
  staffName:{en:"Full name",te:"పూర్తి పేరు"},
  staffRole:{en:"Role",te:"పాత్ర"},
  staffBranch:{en:"Branch",te:"శాఖ"},
  allBranches:{en:"All branches",te:"అన్ని శాఖలు"},
  tempPw:{en:"Temporary password",te:"తాత్కాలిక పాస్‌వర్డ్"},
  tempPwHint:{en:"They must change it the first time they sign in.",te:"మొదటిసారి సైన్ ఇన్ చేసినప్పుడు వారు దీన్ని మార్చాలి."},
  usernameRule:{en:"Username: 3-30 small letters or numbers, no spaces",te:"వినియోగదారు పేరు: 3-30 చిన్న ఇంగ్లీష్ అక్షరాలు లేదా అంకెలు, ఖాళీలు వద్దు"},
  usernameTaken:{en:"That username is already used",te:"ఆ వినియోగదారు పేరు ఇప్పటికే వాడుకలో ఉంది"},
  nameNeeded:{en:"Enter the name",te:"పేరు నమోదు చేయండి"},
  staffAdded:{en:"Staff added",te:"సిబ్బంది జోడించబడ్డారు"},
  resetPw:{en:"Reset password",te:"పాస్‌వర్డ్ రీసెట్"},
  pwReset:{en:"Password reset",te:"పాస్‌వర్డ్ రీసెట్ అయింది"},
  deactivate:{en:"Deactivate login",te:"లాగిన్ నిలిపివేయండి"},
  activate:{en:"Activate login",te:"లాగిన్ యాక్టివేట్ చేయండి"},
  inactive:{en:"Login deactivated",te:"లాగిన్ నిలిపివేయబడింది"},
  pwPending:{en:"Has not set own password yet",te:"ఇంకా సొంత పాస్‌వర్డ్ పెట్టలేదు"},
  notAllowed:{en:"Not allowed",te:"అనుమతి లేదు"},
  paidToday:{en:"Paid today",te:"ఈరోజు చెల్లించారు"},
  typeToSearch:{en:"Type at least 2 letters or numbers",te:"కనీసం 2 అక్షరాలు లేదా అంకెలు టైప్ చేయండి"},
  searchNameAcc:{en:"Search name or account no…",te:"పేరు లేదా ఖాతా నం వెతకండి…"},
  saveBtn:{en:"Save",te:"సేవ్ చేయి"},
  confirmDeactivate:{en:"Stop this login? They will be signed out at once.",te:"ఈ లాగిన్ నిలిపివేయాలా? వారు వెంటనే సైన్ అవుట్ అవుతారు."},
  staffOff:{en:"Login deactivated",te:"లాగిన్ నిలిపివేయబడింది"},
  staffOn:{en:"Login activated",te:"లాగిన్ యాక్టివేట్ అయింది"},
  membersCount:{en:"members",te:"సభ్యులు"}, area:{en:"Area",te:"ప్రాంతం"},
  dueToday:{en:"Due today",te:"నేడు వసూలు చేయవలసినవి"}, done:{en:"done",te:"పూర్తయింది"},
  nothingDue:{en:"Nothing due today. Enjoy the day!",te:"నేడు వసూలు చేయవలసినవి లేవు."},
  amountLabel:{en:"Collection amount (₹)",te:"వసూలు మొత్తం (₹)"}, cancel:{en:"Cancel",te:"రద్దు"},
  save:{en:"Save collection",te:"సేవ్ చేయి"}, saving:{en:"Saving…",te:"సేవ్ అవుతోంది…"},
  markNotPaid:{en:"Mark as not paid",te:"చెల్లించలేదు అని గుర్తించు"}, addPhoto:{en:"Add photo proof",te:"రుజువు ఫోటో జోడించు"},
  enterAmount:{en:"Enter a valid amount",te:"సరైన మొత్తం నమోదు చేయండి"}, needPhoto:{en:"Photo proof is required",te:"రుజువు ఫోటో అవసరం"},
  photoSkipped:{en:"Saved without a photo — flagged for review",te:"ఫోటో లేకుండా సేవ్ అయింది — సమీక్ష కోసం గుర్తించబడింది"},
  noProof:{en:"No photo",te:"ఫోటో లేదు"},
  saved:{en:"Saved",te:"సేవ్ అయింది"}, whyNotPaid:{en:"Why not paid?",te:"ఎందుకు చెల్లించలేదు?"},
  rNotPaying:{en:"Not paying",te:"చెల్లించడం లేదు"}, rUnreachable:{en:"Unreachable",te:"అందుబాటులో లేరు"},
  rComplaint:{en:"Complaint",te:"ఫిర్యాదు"}, rPromised:{en:"Promised later",te:"తర్వాత చెల్లిస్తామన్నారు"},
  markedNotPaid:{en:"Marked not paid",te:"చెల్లించలేదు అని గుర్తించబడింది"},
  back:{en:"Back",te:"వెనుకకు"}, products:{en:"Products",te:"ఉత్పత్తులు"}, noProducts:{en:"No products yet",te:"ఇంకా ఉత్పత్తులు లేవు"},
  openingDate:{en:"Opened",te:"ప్రారంభం"}, maturityDate:{en:"Matures",te:"మెచ్యూర్"}, balance:{en:"Balance",te:"బ్యాలెన్స్"},
  depositType:{en:"Deposit type",te:"డిపాజిట్ రకం"}, sharePaid:{en:"Share paid",te:"షేర్ చెల్లింపు"},
  yes:{en:"Yes",te:"అవును"}, no:{en:"No",te:"కాదు"}, installments:{en:"Installments paid",te:"చెల్లించిన వాయిదాలు"},
  statusLabel:{en:"Status",te:"స్థితి"}, phoneLabel:{en:"Phone",te:"ఫోన్"},
  todaysWork:{en:"Today by agent",te:"నేటి పని (ఏజెంట్ వారీగా)"}, totalToday:{en:"Collected today",te:"నేడు వసూలైంది"},
  noWorkToday:{en:"No collections today.",te:"నేడు వసూళ్లు లేవు."}, recentHistory:{en:"Recent history",te:"ఇటీవలి చరిత్ర"},

  /* fixed deposit — monthly interest payout */
  fdThisMonth:{en:"FD interest due this month",te:"ఈ నెల ఎఫ్‌డీ వడ్డీ"},
  fdPayout:{en:"FD interest payout",te:"ఎఫ్‌డీ వడ్డీ చెల్లింపు"},
  fdMonthly:{en:"Monthly payout",te:"నెలవారీ చెల్లింపు"},
  fdPrincipal:{en:"Principal",te:"అసలు"},
  fdRate:{en:"Interest rate (% / year)",te:"వడ్డీ రేటు (% / సం)"},
  fdTerm:{en:"Term (months)",te:"కాలం (నెలలు)"},
  fdStart:{en:"Start date",te:"ప్రారంభ తేదీ"},
  fdNone:{en:"No fixed deposits recorded yet.",te:"ఇంకా ఫిక్స్‌డ్ డిపాజిట్లు నమోదు కాలేదు."},
  fdCount:{en:"deposits",te:"డిపాజిట్లు"},
  fdTotalMonth:{en:"Total interest / month",te:"మొత్తం వడ్డీ / నెల"},
  addFd:{en:"Add fixed deposit",te:"ఫిక్స్‌డ్ డిపాజిట్ జోడించు"},
  fdSaved:{en:"Fixed deposit added",te:"ఫిక్స్‌డ్ డిపాజిట్ జోడించబడింది"},
  perMonth:{en:"/mo",te:"/నెల"},

  /* recurring deposit + maturities */
  addRd:{en:"Add recurring deposit",te:"ఆర్‌డీ జోడించు"},
  rdScheme:{en:"Scheme",te:"పథకం"},
  rdAmountDaily:{en:"Amount per day (₹)",te:"రోజుకు మొత్తం (₹)"},
  rdAmountMonthly:{en:"Amount per month (₹)",te:"నెలకు మొత్తం (₹)"},
  rdDueDay:{en:"Collection day of month",te:"నెలలో వసూలు రోజు"},
  rdStart:{en:"Start date",te:"ప్రారంభ తేదీ"},
  rdSaved:{en:"Recurring deposit added",te:"ఆర్‌డీ జోడించబడింది"},
  expected:{en:"expected",te:"అంచనా"},
  expectedMaturity:{en:"Expected maturity",te:"అంచనా మెచ్యూరిటీ"},
  maturitiesForecast:{en:"A forecast — it moves as instalments are paid or missed.",te:"ఇది అంచనా — వాయిదాల ప్రకారం మారుతుంది."},
  noMaturities:{en:"No RD maturities to project yet.",te:"అంచనా వేయడానికి ఆర్‌డీలు లేవు."},
  matured:{en:"Complete",te:"పూర్తయింది"},
  paidOf:{en:"paid of",te:"చెల్లించారు,"},

  /* counter collection (Krosuru is counter-based, rules §6) */
  counter:{en:"Counter",te:"కౌంటర్"},
  counterHint:{en:"Search a member to take a payment at the counter.",te:"కౌంటర్ వద్ద చెల్లింపు తీసుకోవడానికి సభ్యుని వెతకండి."},
  takePayment:{en:"Take a payment",te:"చెల్లింపు తీసుకోండి"},
  collect:{en:"Collect",te:"వసూలు"},

  /* entry desk: my entries, reporting a wrong entry, the operator's check list */
  myEntries:{en:"My entries",te:"నా ఎంట్రీలు"},
  noEntries:{en:"No entries on this day.",te:"ఈ రోజు ఎంట్రీలు లేవు."},
  tapToReport:{en:"Entries cannot be changed or deleted. Tap an entry to report a mistake to the operator.",
               te:"ఎంట్రీలను మార్చడం లేదా తొలగించడం కుదరదు. తప్పు ఉంటే ఎంట్రీని నొక్కి ఆపరేటర్‌కు తెలియజేయండి."},
  reportWrong:{en:"Report wrong entry",te:"తప్పు ఎంట్రీని తెలియజేయండి"},
  reportHint:{en:"What is wrong? The operator will check and cancel it.",te:"ఏమి తప్పు? ఆపరేటర్ తనిఖీ చేసి రద్దు చేస్తారు."},
  reportPh:{en:"e.g. typed 5000 instead of 500",te:"ఉదా: 500 బదులు 5000 టైప్ చేశాను"},
  qWrongAmt:{en:"Wrong amount",te:"తప్పు మొత్తం"},
  qWrongMem:{en:"Wrong member",te:"తప్పు సభ్యుడు"},
  qMistake:{en:"Entered by mistake",te:"పొరపాటున నమోదైంది"},
  sendReport:{en:"Send to operator",te:"ఆపరేటర్‌కు పంపు"},
  reportSent:{en:"Sent to the operator",te:"ఆపరేటర్‌కు పంపబడింది"},
  noteRequired:{en:"Write what is wrong",te:"ఏమి తప్పో రాయండి"},
  stSent:{en:"Sent for check",te:"తనిఖీకి పంపబడింది"},
  stCancelled:{en:"Cancelled",te:"రద్దయింది"},
  stKept:{en:"Checked · kept",te:"తనిఖీ అయింది · ఉంచబడింది"},
  alreadyToday:{en:"Already entered today for this account. If it is wrong, report it in My entries.",
                te:"ఈ ఖాతాకు ఈరోజు ఇప్పటికే ఎంట్రీ ఉంది. తప్పైతే 'నా ఎంట్రీలు'లో తెలియజేయండి."},
  bigAmount:{en:"is much more than the usual instalment. Save it?",te:"సాధారణ వాయిదా కంటే చాలా ఎక్కువ. సేవ్ చేయాలా?"},
  nextMember:{en:"Next member",te:"తదుపరి సభ్యుడు"},
  entriesToCheck:{en:"Entries to check",te:"తనిఖీ చేయవలసిన ఎంట్రీలు"},
  nothingToCheck:{en:"Nothing to check.",te:"తనిఖీ చేయవలసినవి లేవు."},
  cancelEntry:{en:"Cancel entry",te:"ఎంట్రీ రద్దు చేయి"},
  keepEntry:{en:"Keep as it is",te:"అలాగే ఉంచు"},
  confirmCancelEntry:{en:"Cancel this entry? It stays in the book marked cancelled and will not count.",
                      te:"ఈ ఎంట్రీని రద్దు చేయాలా? ఇది పుస్తకంలో 'రద్దయింది' అని ఉంటుంది, లెక్కలోకి రాదు."},
  cancelWhy:{en:"Why is this entry being cancelled?",te:"ఈ ఎంట్రీని ఎందుకు రద్దు చేస్తున్నారు?"},
  entryCancelled:{en:"Entry cancelled",te:"ఎంట్రీ రద్దయింది"},
  entryKept:{en:"Entry kept",te:"ఎంట్రీ ఉంచబడింది"},
  enteredBy:{en:"Entered by",te:"నమోదు చేసినవారు"},
  staffNote:{en:"Staff note",te:"సిబ్బంది గమనిక"},

  /* requests: entry staff ask for a new member / deposit / loan, the operator approves */
  requests:{en:"Requests",te:"అభ్యర్థనలు"},
  rqNewMember:{en:"New member",te:"కొత్త సభ్యుడు"},
  rqNewProduct:{en:"New deposit / loan",te:"కొత్త డిపాజిట్ / రుణం"},
  rqDepositLoan:{en:"Deposit / loan",te:"డిపాజిట్ / రుణం"},
  rqForApproval:{en:"Goes to the operator for approval",te:"ఆమోదం కోసం ఆపరేటర్‌కు వెళ్తుంది"},
  rqHint:{en:"Nothing enters the book until the operator approves it. For a member already in the book, open them in Counter and tap “New deposit / loan”.",
          te:"ఆపరేటర్ ఆమోదించే వరకు ఏదీ పుస్తకంలోకి చేరదు. ఇప్పటికే ఉన్న సభ్యునికి అయితే, కౌంటర్‌లో వారిని తెరిచి “కొత్త డిపాజిట్ / రుణం” నొక్కండి."},
  rqProductHint:{en:"This is a request. It opens on the member's account only after the operator approves it.",
                 te:"ఇది అభ్యర్థన మాత్రమే. ఆపరేటర్ ఆమోదించిన తర్వాతే సభ్యుని ఖాతాలో తెరవబడుతుంది."},
  rqMemberHint:{en:"Only the name is required. Type - for anything the register leaves blank. The operator gives the account number when approving.",
                te:"పేరు మాత్రమే తప్పనిసరి. రిజిస్టర్‌లో ఖాళీగా ఉన్నవాటికి - టైప్ చేయండి. ఆమోదించేటప్పుడు ఆపరేటర్ ఖాతా నంబర్ ఇస్తారు."},
  rqAcNoHint:{en:"only if the register already has one",te:"రిజిస్టర్‌లో ఇప్పటికే ఉంటేనే"},
  rqNone:{en:"No requests yet.",te:"ఇంకా అభ్యర్థనలు లేవు."},
  rqSend:{en:"Send for approval",te:"ఆమోదం కోసం పంపు"},
  rqSent:{en:"Sent to the operator for approval",te:"ఆమోదం కోసం ఆపరేటర్‌కు పంపబడింది"},
  rqSentNoPhoto:{en:"Sent for approval — but the photo could not be uploaded",te:"ఆమోదం కోసం పంపబడింది — కానీ ఫోటో అప్‌లోడ్ కాలేదు"},
  rqWaiting:{en:"Waiting",te:"వేచి ఉంది"},
  rqApproved:{en:"Approved",te:"ఆమోదించబడింది"},
  rqRejected:{en:"Rejected",te:"తిరస్కరించబడింది"},
  rqWithdrawn:{en:"Taken back",te:"వెనక్కి తీసుకున్నారు"},
  rqWithdraw:{en:"Take back",te:"వెనక్కి తీసుకో"},
  rqConfirmWithdraw:{en:"Take this request back?",te:"ఈ అభ్యర్థనను వెనక్కి తీసుకోవాలా?"},
  rqWithdrawKids:{en:"Any deposit or loan asked for this new member is taken back too.",
                  te:"ఈ కొత్త సభ్యుని కోసం అడిగిన డిపాజిట్ / రుణం కూడా వెనక్కి వస్తుంది."},
  rqTakenBack:{en:"Request taken back",te:"అభ్యర్థన వెనక్కి తీసుకోబడింది"},
  rqType:{en:"What is it?",te:"ఏ రకం?"},
  rqFd:{en:"Fixed deposit",te:"ఫిక్స్‌డ్ డిపాజిట్"},
  rqLoan:{en:"Loan",te:"రుణం"},
  rqLoanAmount:{en:"Loan amount (₹)",te:"రుణ మొత్తం (₹)"},
  rqInstalment:{en:"Instalment (₹)",te:"వాయిదా (₹)"},
  rqRepay:{en:"Repaid",te:"వాయిదా చెల్లింపు"},
  rqDaily:{en:"daily",te:"రోజువారీ"}, rqWeekly:{en:"weekly",te:"వారానికి"}, rqMonthly:{en:"monthly",te:"నెలవారీ"},
  rqWeeks:{en:"Number of weeks (if known)",te:"వారాల సంఖ్య (తెలిస్తే)"},
  rqMonths:{en:"months",te:"నెలలు"},
  rqWeeksShort:{en:"weeks",te:"వారాలు"},
  rqAsksFor:{en:"Asks for",te:"కోరినది"},
  rqNote:{en:"Note for the operator",te:"ఆపరేటర్‌కు గమనిక"},
  rqPickRepay:{en:"Choose daily, weekly or monthly",te:"రోజువారీ, వారానికి లేదా నెలవారీ ఎంచుకోండి"},
  rqBadDate:{en:"Date not understood — type it as dd/mm/yyyy",te:"తేదీ అర్థం కాలేదు — dd/mm/yyyy గా టైప్ చేయండి"},
  rqBadRate:{en:"Check the interest rate",te:"వడ్డీ రేటు సరిచూడండి"},
  rqBadTerm:{en:"Check the term",te:"కాలాన్ని సరిచూడండి"},
  rqBadDay:{en:"Day of month must be 1 to 31",te:"నెలలో రోజు 1 నుండి 31 మధ్య ఉండాలి"},
  rqBadScheme:{en:"Choose what it is",te:"రకాన్ని ఎంచుకోండి"},
  rqBranchNeeded:{en:"Choose the branch",te:"శాఖను ఎంచుకోండి"},
  rqTooMany:{en:"Too many requests are waiting. Ask the operator to clear them first.",
             te:"చాలా అభ్యర్థనలు వేచి ఉన్నాయి. ముందు వాటిని పరిష్కరించమని ఆపరేటర్‌ను అడగండి."},
  rqNoMember:{en:"A request cannot be sent for this member",te:"ఈ సభ్యునికి అభ్యర్థన పంపడం కుదరదు"},
  rqDone:{en:"This request has already been dealt with",te:"ఈ అభ్యర్థన ఇప్పటికే పరిష్కరించబడింది"},
  rqToApprove:{en:"Requests to approve",te:"ఆమోదించవలసిన అభ్యర్థనలు"},
  rqNoneWaiting:{en:"No requests waiting.",te:"వేచి ఉన్న అభ్యర్థనలు లేవు."},
  rqAskedBy:{en:"Asked by",te:"అడిగినవారు"},
  rqApprove:{en:"Approve",te:"ఆమోదించు"},
  rqReject:{en:"Reject",te:"తిరస్కరించు"},
  rqRejectWhy:{en:"Why is this rejected? The staff member will see this.",te:"ఎందుకు తిరస్కరిస్తున్నారు? ఇది సిబ్బందికి కనిపిస్తుంది."},
  rqReasonNeeded:{en:"Write the reason",te:"కారణం రాయండి"},
  rqNextFree:{en:"Use next free number",te:"తదుపరి ఖాళీ నంబర్ వాడు"},
  rqMemberFirst:{en:"Approve the new member first.",te:"ముందు కొత్త సభ్యుని ఆమోదించండి."},
  rqConfirmMember:{en:"Add this member to the book as",te:"ఈ సభ్యుని పుస్తకంలో ఈ నంబర్‌తో చేర్చాలా:"},
  rqConfirmProduct:{en:"Open this on the member's account?",te:"దీన్ని సభ్యుని ఖాతాలో తెరవాలా?"},
  rqMemberAdded:{en:"Member added",te:"సభ్యుడు చేర్చబడ్డారు"},
  rqOpened:{en:"Approved and opened",te:"ఆమోదించి తెరవబడింది"},
  rqRejectedToast:{en:"Request rejected",te:"అభ్యర్థన తిరస్కరించబడింది"},
  rqSamePerson:{en:"You cannot approve your own request",te:"మీ సొంత అభ్యర్థనను మీరే ఆమోదించలేరు"},

  /* payment method + booking branch (v2 §9, #5) */
  payMethod:{en:"Payment method",te:"చెల్లింపు విధానం"},
  mCash:{en:"Cash",te:"నగదు"},
  mPhone:{en:"Phone / PhonePe",te:"ఫోన్ / ఫోన్‌పే"},
  fdBranch:{en:"Booking branch",te:"బుకింగ్ శాఖ"},
  bookedAt:{en:"Booked at",te:"బుక్ చేసిన శాఖ"},
  homeMember:{en:"Member's branch",te:"సభ్యుని శాఖ"},

  /* loan groups + arrears (v2 §3) */
  groups:{en:"Loan groups",te:"రుణ గ్రూపులు"},
  groupPosition:{en:"Group position",te:"గ్రూప్ స్థితి"},
  weeklyTotal:{en:"Weekly total",te:"వారపు మొత్తం"},
  perWeek:{en:"/wk",te:"/వారం"},
  wkArrears:{en:"wk behind",te:"వారాలు వెనుక"},
  dArrears:{en:"d behind",te:"రోజులు వెనుక"},
  onTrack:{en:"On track",te:"సరిగ్గా ఉంది"},
  noGroups:{en:"No loan groups yet.",te:"రుణ గ్రూపులు లేవు."},
  expectedToDate:{en:"Due to date",te:"ఇప్పటివరకు రావలసినవి"},
  recorded:{en:"Recorded",te:"నమోదైనవి"},
  behind:{en:"Behind",te:"వెనుక"},
  arrearsCaveat:{en:"Behind = instalments due to date minus those recorded in the app. Paper history isn't imported, so this reads high until collections are entered.",
                 te:"వెనుక = ఇప్పటివరకు రావలసిన వాయిదాలు − యాప్‌లో నమోదైనవి. కాగితపు చరిత్ర దిగుమతి కాలేదు, కాబట్టి వసూళ్లు నమోదయ్యే వరకు ఇది ఎక్కువగా కనిపిస్తుంది."},

  /* cashbook (v2 §8) */
  cashbook:{en:"Cashbook",te:"క్యాష్‌బుక్"},
  credit:{en:"Credit",te:"జమ"},
  debit:{en:"Debit",te:"ఖర్చు"},
  dayTotal:{en:"Day total",te:"రోజు మొత్తం"},
  counterTxns:{en:"Counter transactions",te:"కౌంటర్ లావాదేవీలు"},
  noCashbook:{en:"No transactions on this day.",te:"ఈ రోజు లావాదేవీలు లేవు."},
  scheme:{en:"Scheme",te:"పథకం"},
  debitNote:{en:"Debit (payouts, withdrawals) isn't tracked yet — shows nil.",te:"ఖర్చు (చెల్లింపులు, ఉపసంహరణలు) ఇంకా నమోదు కాదు."},

  /* branches + account entry */
  branch:{en:"Branch",te:"శాఖ"}, allBranches:{en:"All branches",te:"అన్ని శాఖలు"},
  byBranch:{en:"Members by branch",te:"శాఖల వారీగా సభ్యులు"},
  newAccount:{en:"New account",te:"కొత్త ఖాతా"}, editAccount:{en:"Edit account",te:"ఖాతా సవరించు"},
  reserved:{en:"Reserved",te:"రిజర్వ్ చేయబడింది"},
  reservedNumbers:{en:"Reserved numbers",te:"రిజర్వ్ చేసిన నంబర్లు"},
  fName:{en:"Name",te:"పేరు"}, fAcNo:{en:"A/c No",te:"ఖాతా నం"},
  fOpDate:{en:"A/c Op Date",te:"ఖాతా ప్రారంభ తేదీ"}, fDob:{en:"DOB",te:"పుట్టిన తేదీ"},
  fPhone:{en:"Phone",te:"ఫోన్"}, fScheme:{en:"Scheme",te:"పథకం"},
  fNominee:{en:"Nominee",te:"నామినీ"}, fRelation:{en:"Relation",te:"సంబంధం"},
  fNomineePh:{en:"Nominee Ph",te:"నామినీ ఫోన్"},
  fAge:{en:"Age",te:"వయస్సు"},
  fAgeHint:{en:"nominee's age",te:"నామినీ వయస్సు"},
  fAddress:{en:"Address",te:"చిరునామా"}, fVillage:{en:"Village",te:"గ్రామం"},
  fPhoto:{en:"Photo",te:"ఫోటో"},
  saveAccount:{en:"Save account",te:"ఖాతా సేవ్ చేయి"},
  accountSaved:{en:"Account saved",te:"ఖాతా సేవ్ అయింది"},
  dashHint:{en:"Type - for anything the register leaves blank. Nothing here is required.",
            te:"రిజిస్టర్‌లో ఖాళీగా ఉన్నవాటికి - టైప్ చేయండి. ఏదీ తప్పనిసరి కాదు."},
  errDuplicate:{en:"That account number already exists",te:"ఆ ఖాతా నంబర్ ఇప్పటికే ఉంది"},
  errPrefix:{en:"Number must start with",te:"నంబర్ దీనితో ప్రారంభం కావాలి"},
  errNoNumber:{en:"Account number is required",te:"ఖాతా నంబర్ అవసరం"},
  errNoPrefixSet:{en:"This branch has no number series yet",te:"ఈ శాఖకు ఇంకా నంబర్ సిరీస్ లేదు"},
  photoTap:{en:"Tap to add photo",te:"ఫోటో జోడించడానికి నొక్కండి"},
  saving2:{en:"Saving…",te:"సేవ్ అవుతోంది…"},
  dateUnclear:{en:"not read as a date — will save empty",te:"తేదీగా చదవలేదు — ఖాళీగా సేవ్ అవుతుంది"},
  dateFix:{en:"type the date as dd/mm/yyyy, or clear it",te:"తేదీని dd/mm/yyyy గా టైప్ చేయండి, లేదా ఖాళీ చేయండి"},
  editDetails:{en:"Edit details",te:"వివరాలు సవరించు"},
  goodMorning:{en:"Good morning",te:"శుభోదయం"}, goodAfternoon:{en:"Good afternoon",te:"శుభ మధ్యాహ్నం"},
  goodEvening:{en:"Good evening",te:"శుభ సాయంత్రం"},
  newVersion:{en:"New version ready — tap to refresh",te:"కొత్త వెర్షన్ సిద్ధం — రిఫ్రెష్ కోసం నొక్కండి"},

  /* attendance: the daily check-in */
  attendance:{en:"Attendance",te:"హాజరు"},
  checkIn:{en:"Check in",te:"చెక్ ఇన్"}, checkOut:{en:"Check out",te:"చెక్ అవుట్"},
  attNotIn:{en:"You have not checked in today",te:"మీరు ఈ రోజు ఇంకా చెక్ ఇన్ చేయలేదు"},
  attInAt:{en:"Checked in",te:"చెక్ ఇన్"}, attOutAt:{en:"Checked out",te:"చెక్ అవుట్"},
  attConfirmOut:{en:"Check out for today?",te:"ఈ రోజుకు చెక్ అవుట్ చేయాలా?"},
  attToday:{en:"Attendance today",te:"ఈ రోజు హాజరు"},
  attPresent:{en:"Present",te:"హాజరు"}, attAbsent:{en:"Absent",te:"గైర్హాజరు"},
  attNotYet:{en:"Not yet",te:"ఇంకా రాలేదు"}, attHoliday:{en:"Holiday",te:"సెలవు"},
  attIn:{en:"In",te:"ఇన్"}, attOut:{en:"Out",te:"అవుట్"},
  attThisMonth:{en:"Days present",te:"హాజరైన రోజులు"}, attDays:{en:"days",te:"రోజులు"}, attDay:{en:"day",te:"రోజు"},
  /* selfie + place at check-in */
  attSelfie:{en:"Selfie",te:"సెల్ఫీ"}, takeSelfie:{en:"Take a selfie",te:"సెల్ఫీ తీసుకోండి"},
  attPlaceWait:{en:"Finding your location…",te:"మీ లొకేషన్ కనుగొంటోంది…"},
  attPlaceOk:{en:"Location found",te:"లొకేషన్ దొరికింది"},
  attPlaceNo:{en:"Location not available",te:"లొకేషన్ అందుబాటులో లేదు"},
  retry:{en:"Try again",te:"మళ్లీ ప్రయత్నించు"},
  attOptionalNote:{en:"You can check in without them, but the operator will see what is missing.",
                   te:"ఇవి లేకుండా కూడా చెక్ ఇన్ చేయవచ్చు, కానీ ఏది లేదో ఆపరేటర్‌కు కనిపిస్తుంది."},
  attSelfieFailed:{en:"Checked in, but the selfie could not be uploaded",te:"చెక్ ఇన్ అయింది, కానీ సెల్ఫీ అప్‌లోడ్ కాలేదు"},
  attBadPhoto:{en:"The selfie was not accepted — take it again",te:"సెల్ఫీ అంగీకరించబడలేదు — మళ్లీ తీయండి"},
  attNoSelfie:{en:"No selfie",te:"సెల్ఫీ లేదు"}, attNoPlace:{en:"No location",te:"లొకేషన్ లేదు"},
  attMap:{en:"Map",te:"మ్యాప్"}, attByOperator:{en:"Added by operator",te:"ఆపరేటర్ జోడించారు"},
  /* the operator fixes a day */
  attFix:{en:"Fix",te:"సరిచేయి"}, attFixTitle:{en:"Fix attendance",te:"హాజరు సరిచేయి"},
  attInTime:{en:"In time",te:"వచ్చిన సమయం"}, attOutTime:{en:"Out time (if known)",te:"వెళ్లిన సమయం (తెలిస్తే)"},
  attReason:{en:"Reason",te:"కారణం"}, attReasonHint:{en:"e.g. forgot to check in",te:"ఉదా. చెక్ ఇన్ మర్చిపోయారు"},
  attFixedBy:{en:"Fixed by",te:"సరిచేసినవారు:"},
  attNeedTime:{en:"Enter the in time",te:"వచ్చిన సమయం నమోదు చేయండి"},
  attNeedReason:{en:"Write the reason",te:"కారణం రాయండి"},
  attOutBeforeIn:{en:"Out time must be after the in time",te:"వెళ్లిన సమయం వచ్చిన సమయం తర్వాత ఉండాలి"},
  attFuture:{en:"That time has not come yet",te:"ఆ సమయం ఇంకా రాలేదు"},
  attSaved:{en:"Attendance saved",te:"హాజరు సేవ్ అయింది"},
  attRemove:{en:"Remove this line",te:"ఈ లైన్ తొలగించు"},
  attRemoveConfirm:{en:"Remove this attendance line?",te:"ఈ హాజరు లైన్ తొలగించాలా?"},
  attRemoved:{en:"Line removed",te:"లైన్ తొలగించబడింది"},
  attCantRemove:{en:"Only a line added by the operator can be removed",te:"ఆపరేటర్ జోడించిన లైన్ మాత్రమే తొలగించవచ్చు"},
  /* small words that used to show in English only, and the newer screens */
  stActive:{en:"Active",te:"చురుకుగా ఉంది"}, stClosed:{en:"Closed",te:"మూసివేయబడింది"},
  loanWord:{en:"Loan",te:"రుణం"}, unknownWord:{en:"Unknown",te:"తెలియదు"},
  darkMode:{en:"Dark mode",te:"డార్క్ మోడ్"},
  inDays:{en:"in {n} days",te:"{n} రోజుల్లో"}, dueTodayWord:{en:"today",te:"నేడు"},
  within7:{en:"Within 7 days",te:"7 రోజుల్లో"}, within30:{en:"Within 30 days",te:"30 రోజుల్లో"}, laterWord:{en:"Later",te:"తర్వాత"},
  maturedHead:{en:"Complete",te:"పూర్తయినవి"},
  inToday:{en:"in today",te:"ఈ రోజు వచ్చారు"},
  printedOn:{en:"Printed on",te:"ముద్రించిన తేదీ"}, holdings:{en:"Deposits and loans",te:"డిపాజిట్లు మరియు రుణాలు"},
  myToday:{en:"You collected today",te:"ఈ రోజు మీరు వసూలు చేసినది"},
  collection:{en:"Collection",te:"వసూళ్లు"},
  coRd:{en:"RD",te:"ఆర్‌డి"}, coGroups:{en:"Groups",te:"గ్రూపులు"},
  coGiven:{en:"Given",te:"ఇచ్చారు"}, coNotGiven:{en:"Not given",te:"ఇవ్వలేదు"}, coPending:{en:"Waiting",te:"ఇంకా రాలేదు"},
  coOnlyPending:{en:"Only not yet given",te:"ఇంకా ఇవ్వనివి మాత్రమే"},
  coOf:{en:"of",te:"లో"}, coExpected:{en:"expected",te:"రావలసినది"},
  coNothing:{en:"Nothing is due on this day.",te:"ఈ రోజు వసూలు చేయవలసినవి లేవు."},
  coAllDone:{en:"Everything due on this day is in.",te:"ఈ రోజు వసూళ్లు అన్నీ వచ్చాయి."},
  coNotDue:{en:"groups not due this day",te:"గ్రూపులు ఈ రోజు కాదు"},
  coPersonal:{en:"Personal loans",te:"వ్యక్తిగత రుణాలు"},
  coAlert:{en:"collections not given yet today",te:"వసూళ్లు ఈ రోజు ఇంకా రాలేదు"},
  coAlertDone:{en:"All of today's collections are in",te:"ఈ రోజు వసూళ్లు అన్నీ వచ్చాయి"},
  coBy:{en:"by",te:"ద్వారా"},
  calTitle:{en:"Payment calendar",te:"చెల్లింపు క్యాలెండర్"},
  calPaid:{en:"Paid",te:"చెల్లించారు"}, calNotPaid:{en:"Not paid",te:"చెల్లించలేదు"},
  calMissed:{en:"No entry",te:"నమోదు లేదు"}, calUpcoming:{en:"Due",te:"రావలసినది"},
  calOf:{en:"of",te:"లో"}, calDueDays:{en:"due days",te:"వసూలు రోజులు"},
  calNone:{en:"Nothing due in this month.",te:"ఈ నెలలో వసూలు లేదు."},
  coTick:{en:"Mark as given",te:"ఇచ్చినట్లు గుర్తించు"}, coProof:{en:"Photo proof",te:"ఫోటో రుజువు"},
  coCollectedBy:{en:"Collected by",te:"వసూలు చేసినవారు"}, coMe:{en:"Me",te:"నేను"},
  backAgainExit:{en:"Press back again to close the app",te:"యాప్ మూసివేయడానికి మళ్ళీ వెనుకకు నొక్కండి"},
  noBranch:{en:"No branch",te:"శాఖ లేదు"},

  /* transcription checking */
  checkTitle:{en:"Check against the book",te:"పుస్తకంతో సరిచూడండి"},
  needsChecking:{en:"need checking",te:"తనిఖీ చేయాలి"},
  checkedOf:{en:"checked",te:"తనిఖీ అయ్యాయి"},
  markVerified:{en:"Mark checked",te:"తనిఖీ అయిందని గుర్తించు"},
  verifiedLabel:{en:"Checked",te:"తనిఖీ అయింది"},
  undoVerify:{en:"Undo",te:"రద్దు"},
  allChecked:{en:"Everything here has been checked.",te:"ఇక్కడ అన్నీ తనిఖీ అయ్యాయి."},
  notYetChecked:{en:"Not yet checked against the paper register",te:"ఇంకా కాగితపు రిజిస్టర్‌తో సరిచూడలేదు"},
  onlyUnchecked:{en:"Unchecked only",te:"తనిఖీ కానివి మాత్రమే"},
  showAll:{en:"All",te:"అన్నీ"},
  transcriberNote:{en:"Transcriber's note",te:"లిప్యంతరీకరణ గమనిక"},

  /* member photographs */
  photoFailed:{en:"Photo could not be uploaded — the rest was saved",
               te:"ఫోటో అప్‌లోడ్ కాలేదు — మిగిలినది సేవ్ అయింది"},
  addMemberPhoto:{en:"Add photo",te:"ఫోటో జోడించు"},
  changePhoto:{en:"Change photo",te:"ఫోటో మార్చు"},
  photoSaved:{en:"Photo saved",te:"ఫోటో సేవ్ అయింది"},
  photoNotSaved:{en:"Photo could not be saved — try again",te:"ఫోటో సేవ్ కాలేదు — మళ్లీ ప్రయత్నించండి"},
  bulkPhotos:{en:"Import photos",te:"ఫోటోలు దిగుమతి చేయి"},
  bulkPick:{en:"Choose a folder of images named by account number",
            te:"ఖాతా నంబర్‌తో పేరున్న ఫోటోల ఫోల్డర్ ఎంచుకోండి"},
  bulkHint:{en:"PACS005001.jpg matches account PACS005001. Images are shrunk before upload.",
            te:"PACS005001.jpg అనే ఫైల్ PACS005001 ఖాతాకు సరిపోతుంది."},
  bulkRunning:{en:"Uploading…",te:"అప్‌లోడ్ అవుతోంది…"},
  bulkUploaded:{en:"uploaded",te:"అప్‌లోడ్ అయ్యాయి"},
  bulkUnmatched:{en:"Files with no matching account",te:"సరిపోలని ఫైల్‌లు"},
  bulkMissing:{en:"Accounts still without a photo",te:"ఫోటో లేని ఖాతాలు"},
  bulkFailed:{en:"Failed",te:"విఫలమైంది"},
  bulkNone:{en:"No images selected",te:"ఫోటోలు ఎంచుకోలేదు"},
  bulkDone:{en:"Import finished",te:"దిగుమతి పూర్తయింది"},
  reservedNoPhoto:{en:"reserved, no photo expected",te:"రిజర్వ్డ్, ఫోటో అవసరం లేదు"},

  /* passbook */
  passbook:{en:"Passbook",te:"పాస్‌బుక్"},
  openPassbook:{en:"Open passbook",te:"పాస్‌బుక్ తెరవండి"},
  societyName:{en:"Palnadu Co-operative Society",te:"పల్నాడు కో-ఆపరేటివ్ సొసైటీ"},
  societyLong:{en:"Mutually Aided Co-operative Thrift & Credit Society Ltd.",
               te:"మ్యూచువల్లీ ఎయిడెడ్ కో-ఆపరేటివ్ థ్రిఫ్ట్ & క్రెడిట్ సొసైటీ లిమిటెడ్"},
  regdNo:{en:"Regd No",te:"రిజి. నం"},
  memberDetails:{en:"Member details",te:"సభ్యుని వివరాలు"},
  nomineeDetails:{en:"Nominee",te:"నామినీ"},
  transactions:{en:"Transactions",te:"లావాదేవీలు"},
  colDate:{en:"Date",te:"తేదీ"}, colParticulars:{en:"Particulars",te:"వివరాలు"},
  colAmount:{en:"Amount",te:"మొత్తం"}, colRunning:{en:"Total paid",te:"మొత్తం చెల్లించినది"},
  rdDeposit:{en:"RD deposit",te:"ఆర్‌డీ డిపాజిట్"},
  loanRepayment:{en:"Loan repayment",te:"రుణ చెల్లింపు"},
  collection:{en:"Collection",te:"వసూలు"},
  notPaidEntry:{en:"Not paid",te:"చెల్లించలేదు"},
  noTransactions:{en:"No transactions recorded yet.",te:"ఇంకా లావాదేవీలు నమోదు కాలేదు."},
  totalPaid:{en:"Total paid",te:"మొత్తం చెల్లించినది"},
  entries:{en:"entries",te:"నమోదులు"},
  printBook:{en:"Print",te:"ప్రింట్"},
  issuedBy:{en:"Authorised signatory",te:"అధీకృత సంతకం"},
  memberSign:{en:"Member's signature",te:"సభ్యుని సంతకం"},
  balanceNote:{en:"Running total of collections recorded. Not a scheme balance — that needs each product's terms.",
               te:"నమోదైన వసూళ్ల మొత్తం. ఇది స్కీమ్ బ్యాలెన్స్ కాదు."},
};
const t = (k) => (T[k] ? T[k][lang] : k);

/* ---------- emblem ---------- */
function emblem(size){
  if(typeof LOGO_URI!=="undefined"&&LOGO_URI){return '<img class="emblem" src="'+LOGO_URI+'" style="width:'+size+'px;height:'+size+'px;border-radius:50%;object-fit:cover" alt="Palnadu Co-operative Society"/>';}
  const u="e"+Math.random().toString(36).slice(2,7);
  const arms=[0,60,120,180,240,300].map((a,i)=>`<use href="#arm${u}" transform="rotate(${a} 50 50)" style="color:${i===1?'#F6B60C':'#1656C9'}"/>`).join("");
  return `<svg class="emblem" style="width:${size}px;height:${size}px" viewBox="0 0 100 100" aria-label="Palnadu Co-operative Society Limited">
    <defs><path id="${u}p" d="M50 15 a35 35 0 1 1 -0.1 0" fill="none"/>
    <g id="arm${u}"><rect x="47.2" y="20" width="5.6" height="20" rx="2.8" fill="currentColor"/><circle cx="50" cy="41.2" r="4.7" fill="currentColor"/></g></defs>
    <circle cx="50" cy="50" r="48" fill="#fff"/><circle cx="50" cy="50" r="48" fill="none" stroke="#1656C9" stroke-width="2.6"/>
    <circle cx="50" cy="50" r="42.5" fill="none" stroke="#1656C9" stroke-width="1.2"/>
    <text font-size="7" font-weight="700" fill="#E01586" letter-spacing="1"><textPath href="#${u}p" startOffset="2%">PALNADU CO-OPERATIVE SOCIETY · LIMITED ·</textPath></text>
    ${arms}
    <circle cx="50" cy="50" r="11.5" fill="#141F35"/><circle cx="50" cy="50" r="11.5" fill="none" stroke="#F6B60C" stroke-width="2.2"/>
    <text x="50" y="54.6" text-anchor="middle" font-size="13.5" font-weight="800" fill="#F6B60C">P</text>
    <path d="M50 86.5 l1.5 3.2 3.5.5-2.6 2.4.7 3.4-3.1-1.8-3.1 1.8.7-3.4-2.6-2.4 3.5-.5z" fill="#1656C9"/></svg>`;
}
const ICON = {
  collection:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l1.5 1.5L12 7"/><path d="M14 8.5h3"/><path d="M8 14l1.5 1.5L12 13"/><path d="M14 14.5h3"/></svg>',
  today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  members:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
  history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9m5 10V5m5 14v-7m5 7V8"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z"/></svg>',
  staff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M17 11h4M19 9v4"/></svg>',
  maturities:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg>',
  logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M18 12H9m9 0l-3-3m3 3l-3 3"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>',
  counter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9l1.4-4h13.2L20 9M4 9h16M4 9v10h16V9M9 13h6"/></svg>',
  requests:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.6"/><path d="M8 7l1.5-2h5L16 7"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  tick:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg>',
};

/* ---------- LOGIN ---------- */
function paintLoginLang(){
  $("username").placeholder = t("username");
  $("password").placeholder = t("password");
  $("loginBtn").textContent = t("signin");
  $("l-society").textContent = t("society");
  document.querySelectorAll(".lang-toggle button").forEach(b=>b.classList.toggle("on", b.dataset.lang===lang));
}
document.querySelector(".lang-toggle").addEventListener("click",(e)=>{
  const b=e.target.closest("button"); if(!b) return;
  lang=b.dataset.lang; localStorage.setItem("macs_lang",lang); paintLoginLang();
});
$("loginBtn").addEventListener("click", doLogin);
$("password").addEventListener("keydown",(e)=>{ if(e.key==="Enter") doLogin(); });

/* Sign-in is real: Supabase Auth issues the session and every rule in the
   database is keyed on it (see db/002_lock_database.sql). The staff record is
   fetched fresh from the server each time - nothing kept on the device is ever
   trusted to decide who someone is or what they may see. Staff type a username;
   the email form below is only how the login is stored. */
const STAFF_EMAIL_DOMAIN="@staff.palnadumacs.local";
const ICON_KEY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/></svg>';

/* One sign-in at a time: the button shows it is working, and a refusal gives
   the card a short shake so it is noticed even without reading the message. */
async function doLogin(){
  const btn=$("loginBtn"); if(btn.classList.contains("busy")) return;
  btn.classList.add("busy");
  try{ await signIn(); }
  finally{
    btn.classList.remove("busy");
    if($("loginMsg").textContent){ const g=document.querySelector(".glass"); g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); }
  }
}
async function signIn(){
  const u=$("username").value.trim().toLowerCase(), p=$("password").value;
  const msg=$("loginMsg"); msg.textContent=t("checking");
  if(!u||!p){ msg.textContent=t("wrong"); return; }
  const { error } = await db.auth.signInWithPassword({ email:u+STAFF_EMAIL_DOMAIN, password:p });
  $("password").value="";
  if(error){
    const m=error.message||"";
    if(/banned/i.test(m)) msg.textContent=t("notStaff");
    else if(error.status===400||/invalid/i.test(m)) msg.textContent=t("wrong");
    else { msg.textContent=t("connErr"); reportError(error,{op:"sign_in"}); }
    return;
  }
  await enterApp(true);
}

/* A session exists: find out who this is, then either insist on a new password
   or open the app. A login with no active staff record gets nothing. */
async function enterApp(fromLogin){
  const msg=$("loginMsg");
  const { data, error } = await db.rpc("my_staff");
  if(error){ msg.textContent=t("connErr"); reportError(error,{op:"my_staff"}); return; }
  const me = Array.isArray(data)?data[0]:data;
  if(!me){ await db.auth.signOut(); msg.textContent=t("notStaff"); return; }
  staff=me; setSentryUser(staff); msg.textContent="";
  if(fromLogin && me.preferred_lang){ lang=me.preferred_lang; localStorage.setItem("macs_lang",lang); }
  if(me.must_change_password){ openChangePassword(true); return; }
  startApp();
}
async function doLogout(){
  try{ await db.auth.signOut(); }catch(e){}
  location.reload();
}
/* If the admin resets or deactivates a login, the session dies on the server;
   drop back to the sign-in screen as soon as the app notices. */
db.auth.onAuthStateChange((ev)=>{ if(ev==="SIGNED_OUT" && staff) location.reload(); });

/* Server functions answer with short codes; show them in the user's language. */
const RPC_ERR={WRONG_CURRENT:"pwWrongCur",WEAK_PASSWORD:"pwRule",TOO_SIMILAR:"pwSame",BAD_USERNAME:"usernameRule",
  USERNAME_TAKEN:"usernameTaken",NAME_REQUIRED:"nameNeeded",NOT_ALLOWED:"notAllowed",NO_LOGIN:"notAllowed",
  CANNOT_DEACTIVATE_SELF:"notAllowed",USE_CHANGE_MY_PASSWORD:"notAllowed",
  NOTE_REQUIRED:"noteRequired",NOT_YOUR_ENTRY:"notAllowed",NO_ENTRY:"notAllowed",ALREADY_CANCELLED:"stCancelled",
  /* requests (db/006_staff_requests.sql) */
  TOO_MANY_PENDING:"rqTooMany",BRANCH_REQUIRED:"rqBranchNeeded",NO_MEMBER:"rqNoMember",BAD_SCHEME:"rqBadScheme",
  BAD_AMOUNT:"enterAmount",BAD_RATE:"rqBadRate",BAD_TERM:"rqBadTerm",BAD_FREQUENCY:"rqPickRepay",BAD_TYPE:"rqBadScheme",
  NOT_YOUR_REQUEST:"notAllowed",ALREADY_REVIEWED:"rqDone",NO_REQUEST:"rqDone",SAME_PERSON:"rqSamePerson",
  ACCNO_REQUIRED:"errNoNumber",NO_PREFIX:"errNoPrefixSet",PREFIX_MISMATCH:"errPrefix",DUPLICATE_ACCNO:"errDuplicate",
  MEMBER_NOT_APPROVED:"rqMemberFirst",
  /* attendance (db/007_attendance.sql, db/008_attendance_selfie_location_fix.sql) */
  NOT_CHECKED_IN:"attNotIn",BAD_PHOTO:"attBadPhoto",NO_STAFF:"notAllowed",BAD_DAY:"attFuture",TIME_REQUIRED:"attNeedTime",
  OUT_BEFORE_IN:"attOutBeforeIn",TIME_IN_FUTURE:"attFuture",NOT_OPERATOR_LINE:"attCantRemove"};
function rpcErrKey(error,op){
  const m=(error&&error.message)||"";
  for(const k in RPC_ERR){ if(m.includes(k)) return RPC_ERR[k]; }
  reportError(error,{op:op||"rpc"}); return "connErr";
}
const pwOk=(p)=>p.length>=8 && /[A-Za-z]/.test(p) && /[0-9]/.test(p);

/* Change password. forced=true is the first sign-in after an admin set a
   temporary password: there is no way past this screen except choosing a new
   one (the database also refuses everything until it is done). */
function openChangePassword(forced){
  let el=$("pwscreen");
  if(!el){ el=document.createElement("div"); el.id="pwscreen"; el.className="detail"; el.style.zIndex="60"; document.body.appendChild(el); }
  el.innerHTML=`<div class="dhead">${forced?"":`<button class="dback" id="pw-back" aria-label="${t("back")}">${ICON.back}</button>`}
    <div><div class="dtitle">${forced?t("setNewPw"):t("changePw")}</div><div class="dsub">${esc(staff.name)}</div></div></div>
    <div class="content">
      ${forced?`<div class="entry-hint">${t("mustChangeHint")}</div>`:""}
      <label class="flabel">${t("curPw")}</label>
      <input class="finput" id="pw-cur" type="password" autocomplete="current-password"/>
      <label class="flabel">${t("newPw")}</label>
      <input class="finput" id="pw-new" type="password" autocomplete="new-password"/>
      <label class="flabel">${t("newPw2")}</label>
      <input class="finput" id="pw-new2" type="password" autocomplete="new-password"/>
      <div class="mmeta" style="margin-top:8px">${t("pwRule")}</div>
      <div class="fmsg" id="pw-msg"></div>
      <button class="btn-primary" id="pw-save" style="width:100%;margin-top:14px">${t("saveBtn")}</button>
      ${forced?`<button class="btn-ghost" id="pw-out" style="width:100%;margin-top:10px">${t("logout")}</button>`:""}
    </div>`;
  el.classList.add("open");
  const close=()=>{ el.classList.remove("open"); el.innerHTML=""; };
  $("pw-back")?.addEventListener("click",close);
  $("pw-out")?.addEventListener("click",doLogout);
  $("pw-save").addEventListener("click",async()=>{
    const msg=$("pw-msg"); msg.className="fmsg"; msg.textContent="";
    const fail=(k)=>{ msg.className="fmsg err"; msg.textContent=t(k); };
    const cur=$("pw-cur").value, nw=$("pw-new").value, nw2=$("pw-new2").value;
    if(!cur) return fail("pwWrongCur");
    if(!pwOk(nw)) return fail("pwRule");
    if(nw!==nw2) return fail("pwMismatch");
    const btn=$("pw-save"); btn.disabled=true; btn.textContent=t("saving2");
    const { error } = await db.rpc("change_my_password",{p_current:cur,p_new:nw});
    btn.disabled=false; btn.textContent=t("saveBtn");
    if(error) return fail(rpcErrKey(error,"change_my_password"));
    staff.must_change_password=false;
    close(); toast(t("pwChanged"));
    if(forced) startApp();
  });
}

/* ---------- APP SHELL ---------- */
let currentTab;
function navFor(role){
  return role==="admin"
    ? [["home","dashboard","home"],["members","members","members"],["collection","collection","collection"],["staff","staff","staff"],["maturities","maturities","maturities"]]
    /* Entry staff only put payments in: no member list, no balances, no reports.
       New members, deposits and loans are asked for under Requests and wait
       for the operator. */
    : [["counter","counter","counter"],["today","today","today"],["myEntries","myEntries","history"],["requests","requests","requests"]];
}
/* ---------- the phone's back button ----------
   The app is one page, so without this the phone's back left the app at
   once. Now one entry is kept in the browser history while signed in, and
   back is used up inside the app, in this order:
     the top-most open thing (photo, sheet, page) closes,
     else any tab other than the first goes to the first tab,
     else "press back again" for two seconds, and a second back leaves.
   Screens close through their own close control, so whatever that does
   still happens. A screen with no back button (a forced password change)
   stays. */
let backArmedAt = 0;
function backGuard(){ if (!(history.state && history.state.macs)) history.pushState({ macs: 1 }, ""); }
function topOpenLayer(){
  const open = [...document.querySelectorAll(".lightbox.open,.sheet-back.open,.detail.open")];
  if (!open.length) return null;
  const z = (el) => parseInt(getComputedStyle(el).zIndex, 10) || 0;
  return open.reduce((a, b) => (z(b) >= z(a) ? b : a));           /* later in the page wins a tie */
}
window.addEventListener("popstate", () => {
  if (!$("nav")) return;                                            /* signed out: let the phone go back */
  const layer = topOpenLayer();
  if (layer) {
    backGuard();
    if (layer.classList.contains("lightbox")) layer.classList.remove("open");
    else if (layer.classList.contains("sheet-back")) layer.click();
    else { const b = layer.querySelector(".dhead .dback"); if (b) b.click(); }
    return;
  }
  const first = document.querySelector("#nav button");
  if (first && first.dataset.tab !== currentTab) { backGuard(); first.click(); return; }
  /* first press on the first tab: stay on the bottom history entry for two
     seconds, so a second back leaves the app the phone's own way */
  backArmedAt = Date.now(); toast(t("backAgainExit"));
  setTimeout(() => { if (Date.now() - backArmedAt >= 1990 && $("nav")) backGuard(); }, 2000);
});

function startApp(){
  backGuard();
  $("screen-login").classList.add("hidden");
  $("app-root").classList.remove("hidden");
  const role = staff.is_admin ? "admin" : "agent";
  const nav = navFor(role);
  currentTab = nav[0][0];
  $("app-root").innerHTML = `
    <header class="topbar">
      <div class="tb-left">${emblem(34).replace('class="emblem"','class="tb-emblem"')}
        <div><div class="tb-title">MACS Soldiers</div><div class="tb-sub">${esc(staff.name)} · ${staff.is_admin?t("admin"):t("agent")}</div></div></div>
      <div class="tb-right">
        <button class="langpill" id="langBtn">${lang==="en"?"EN":"తె"}</button>
        <button class="tb-btn" id="themeBtn" title="${t("darkMode")}" aria-label="${t("darkMode")}">${isDark()?ICON.sun:ICON.moon}</button>
        <button class="tb-btn" id="pwBtn" title="${t("changePw")}" aria-label="${t("changePw")}">${ICON_KEY}</button>
        <button class="tb-btn" id="logoutBtn" title="${t("logout")}">${ICON.logout}</button>
      </div>
    </header>
    <div id="attstrip"></div>
    <main class="content" id="content"></main>
    <nav class="bottomnav" id="nav">
      ${nav.map(([key,,icon])=>`<button data-tab="${key}" class="${key===currentTab?"on":""}">${ICON[icon]}<span>${t(key)}</span></button>`).join("")}
    </nav>`;
  $("langBtn").addEventListener("click",()=>{ lang=lang==="en"?"te":"en"; localStorage.setItem("macs_lang",lang); startApp(); });
  $("themeBtn").addEventListener("click",(e)=>themeSwitch(e.currentTarget));
  $("pwBtn").addEventListener("click",()=>openChangePassword(false));
  $("logoutBtn").addEventListener("click",doLogout);
  $("nav").addEventListener("click",(e)=>{ const b=e.target.closest("button"); if(!b)return;
    if(b.dataset.tab===currentTab){ window.scrollTo({top:0,behavior:"smooth"}); return; }
    const all=[...document.querySelectorAll("#nav button")];
    const back=all.findIndex(x=>x.dataset.tab===b.dataset.tab) < all.findIndex(x=>x.dataset.tab===currentTab);
    currentTab=b.dataset.tab; all.forEach(x=>x.classList.toggle("on",x===b));
    smoothSwap(()=>{ window.scrollTo(0,0); renderTab(); }, back); });
  renderAttStrip();          /* what is already known, at once (a language switch redraws the shell) */
  loadMyAttendance();
  renderTab();
}

function renderTab(){
  const c=$("content");
  c.dataset.tab=currentTab;                      /* the wide-screen layout differs per tab (styles.css) */
  /* the app can stay open past midnight: a new day means a new check-in */
  if(myAttDay && myAttDay!==todayStr()) loadMyAttendance();
  if(staff.is_admin){
    if(currentTab==="home") return adminDashboard(c);
    if(currentTab==="members") return adminMembers(c);
    if(currentTab==="collection") return adminCollection(c);
    if(currentTab==="staff") return adminStaff(c);
    if(currentTab==="maturities") return adminMaturities(c);
  } else {
    if(currentTab==="counter") return agentCounter(c);
    if(currentTab==="today") return agentToday(c);
    if(currentTab==="myEntries") return agentEntries(c);
    if(currentTab==="requests") return agentRequests(c);
  }
}
function placeholder(c,title){
  c.innerHTML=`<div class="empty">${ICON.maturities}<div>${title}</div><div style="margin-top:6px">${t("comingNext")}</div></div>`;
}

/* ---------- working-day + due logic ---------- */
let holidaySet=null;
async function loadHolidays(){
  if(holidaySet) return;
  holidaySet=new Set();
  const { data } = await db.from("holidays").select("holiday_date");
  (data||[]).forEach(h=>holidaySet.add(h.holiday_date));
}
function isWorkingDay(parts){
  const p = parts || istParts();
  if(p.dow===0) return false;                                        // Sunday
  if(p.dow===6){ const wk=Math.ceil(p.d/7); if(wk===2||wk===4) return false; } // 2nd/4th Sat
  return !(holidaySet && holidaySet.has(p.iso));
}
/* ---------- the three collection calendars ----------
   Confirmed 2026-09-05 (PALNADU-PRODUCT-RULES §4). The biggest source of wrong
   collections was applying ONE calendar to every product. They differ:
     - Daily RD    : working days only — skip Sun, 2nd/4th Sat, holidays table
     - Weekly loan : a fixed weekday EVERY calendar week, HOLIDAYS INCLUDED
     - Monthly RD  : a day of the month chosen by the member, holidays ignored
   Saving Book and FD never appear on a due list at all. */
function dowOf(dateStr){
  if(!dateStr) return null;
  const [y,m,d]=dateStr.split("-").map(Number);
  // a plain date read as UTC, so no phone timezone can shift the weekday
  return new Date(Date.UTC(y,m-1,d)).getUTCDay();
}
function monthlyDueDay(p, now){
  /* The member's chosen day of the month, falling back to the day the account
     opened. "Nobody chooses the 31st; if they did they would pay on the 30th",
     so a day past a short month's end lands on that month's last day. */
  let dom = (p.due_day!=null) ? Number(p.due_day)
          : (p.start_date ? Number(p.start_date.split("-")[2]) : null);
  if(!dom) return null;
  const lastDay = new Date(Date.UTC(now.y, now.m, 0)).getUTCDate(); // now.m is 1-based
  return Math.min(dom, lastDay);
}
function isDueToday(p){ return isDueOn(p, istParts()); }
function isoParts(iso){ const [y,m,d]=iso.split("-").map(Number); return partsFromUTC(new Date(Date.UTC(y,m-1,d))); }
function isDueOn(p, now){
  if(p.product_type==="LOAN"){
    /* Weekly, on the weekday the group was disbursed — holidays INCLUDED.
       A legacy daily loan still collects every day. */
    const f=p.frequency||"weekly";
    if(f==="daily") return true;
    const dow = (p.due_dow!=null) ? Number(p.due_dow) : dowOf(p.start_date);
    return dow==null ? true : dow===now.dow;   // unknown day → keep it visible
  }
  if(p.product_type!=="RD") return false;       // SB, FD, no-product → never due
  const f=p.frequency||"daily";
  if(f==="monthly"){                            // holidays ignored
    const d=monthlyDueDay(p, now); return d!=null && d===now.d;
  }
  if(f==="weekly"){                             // not a real RD product; treat as working-day weekly
    const dow=dowOf(p.start_date);
    return isWorkingDay(now) && (dow==null || dow===now.dow);
  }
  return isWorkingDay(now);                      // daily RD: working days only
}

/* ---------- AGENT: TODAY ---------- */
let dueData={};
async function agentToday(c){
  await loadHolidays();
  if(currentTab!=="today") return;                  /* the tab changed while this was loading */
  c.innerHTML=`<div class="tile blue"><div class="tlabel">${t("collectedToday")}</div><div class="tval" id="agToday">—</div><div class="tnote" id="agNote"></div>
      <div class="tbar"><span id="agBar"></span></div></div>
    <div class="sectlabel">${t("dueToday")}</div><div id="agList"><div class="skel"><i></i><i></i><i></i></div></div>`;
  /* The route comes from a server function. Entry staff cannot read the member
     or product tables at all - only the few fields needed to take a payment. */
  const [{ data:prods, error }, { data:cols }] = await Promise.all([
    db.rpc("entry_my_route"),
    db.from("collections").select("amount,product_id,status").eq("collected_on",todayStr()).eq("agent_id",staff.id)]);
  if(error) reportError(error,{op:"entry_my_route"});
  const list=$("agList");
  /* a cancelled entry no longer counts: that product is open to collect again */
  const paid={}; (cols||[]).forEach(x=>{ if(x.status!=="cancelled") paid[x.product_id]=x.status; });
  setNum("agToday",(cols||[]).filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.amount),0),true);
  if(!prods||!prods.length){ list.innerHTML=`<div class="empty">${ICON.members}<div>${t("noAssigned")}</div></div>`; return; }
  dueData={}; const byAcc={}, accMap={};
  prods.forEach(p=>{ if(!isDueToday(p)) return; (byAcc[p.account_id]=byAcc[p.account_id]||[]).push(p); dueData[p.id]={product:p};
    accMap[p.account_id]={id:p.account_id,holder_name:p.holder_name,account_number:p.account_number}; });
  const mem=Object.values(accMap);
  let done=0,total=0; mem.forEach(a=>byAcc[a.id].forEach(p=>{ total++; if(paid[p.id]) done++; }));
  $("agNote").textContent=`${done} / ${total} ${t("done")}`;
  $("agBar").style.width=(total?Math.round(done/total*100):0)+"%";     /* how much of today's round is behind you */
  if(!mem.length){ list.innerHTML=`<div class="empty">${ICON.today}<div>${t("nothingDue")}</div></div>`; return; }
  list.innerHTML=mem.map(a=>{
    byAcc[a.id].forEach(p=>{ dueData[p.id].member=a; });
    const slots=byAcc[a.id].map(p=>{
      const st=paid[p.id], kind=p.product_type==="LOAN"?"loan":"rd", label=typeWord(p.product_type);
      if(st==="paid") return `<span class="slot paid"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l4 4L19 6"/></svg>${label} ${rupee(p.installment_amount)}</span>`;
      if(st==="not_paid") return `<span class="slot np">${label} · ${t("notPaid")}</span>`;
      return `<span class="slot ${kind}" data-pid="${p.id}"><span class="lab">${label}</span>${rupee(p.installment_amount)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.4"/><path d="M8 7l1.5-2h5L16 7"/></svg></span>`;
    }).join("");
    return `<div class="card"><div class="mrow"><div class="mav">${initials(a.holder_name)}</div>
      <div><div class="mname">${esc(a.holder_name||"—")}</div><div class="mmeta">${esc(a.account_number)}</div></div></div>
      <div class="slots">${slots}</div></div>`;
  }).join("");
  list.querySelectorAll(".slot[data-pid]").forEach(el=>el.addEventListener("click",()=>openCollect(el.dataset.pid)));
}

/* ---------- collection sheet ---------- */
let sheetPhotoBlob=null, sheetPid=null, sheetMethod="cash";
function ensureSheet(){
  if($("csheet")) return;
  const d=document.createElement("div"); d.id="csheet"; d.className="sheet-back";
  d.innerHTML=`<div class="sheet"><div class="sheet-grab"></div>
    <div class="sh-mem"><div class="mav" id="cs-av"></div><div><div class="sh-name" id="cs-name"></div><div class="mmeta" id="cs-acc"></div></div></div>
    <span class="sh-prod" id="cs-prod"></span>
    <div class="amt-label">${t("amountLabel")}</div>
    <input class="amt-input" id="cs-amt" type="number" inputmode="numeric"/>
    <div class="quick" id="cs-quick"></div>
    <div class="amt-label" style="margin-top:12px">${t("payMethod")}</div>
    <div class="branchbar" id="cs-method">
      <button type="button" class="chip on" data-m="cash">${t("mCash")}</button>
      <button type="button" class="chip" data-m="phone">${t("mPhone")}</button>
    </div>
    <input id="cs-file" type="file" accept="image/*" capture="environment" style="display:none"/>
    <div id="cs-photo"></div>
    <div class="sh-actions"><button class="btn-ghost" id="cs-cancel">${t("cancel")}</button><button class="btn-primary" id="cs-save">${t("save")}</button></div>
    <div class="np-link"><button id="cs-np">${t("markNotPaid")}</button></div>
    <div id="cs-reasons"></div></div>`;
  document.body.appendChild(d);
  d.addEventListener("click",e=>{ if(e.target.id==="csheet") closeSheet(); });
  $("cs-cancel").addEventListener("click",closeSheet);
  $("cs-file").addEventListener("change",onPhoto);
  $("cs-photo").addEventListener("click",()=>{ if(!sheetPhotoBlob) $("cs-file").click(); });
  $("cs-save").addEventListener("click",saveCollect);
  $("cs-np").addEventListener("click",showReasons);
  $("cs-method").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
    sheetMethod=b.dataset.m; $("cs-method").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b)); });
}
function renderPhotoBox(){
  const box=$("cs-photo");
  if(sheetPhotoBlob){ const url=URL.createObjectURL(sheetPhotoBlob);
    box.innerHTML=`<div class="photo-prev"><img src="${url}"/><button id="cs-rm" aria-label="remove">✕</button></div>`;
    $("cs-rm").addEventListener("click",e=>{ e.stopPropagation(); sheetPhotoBlob=null; renderPhotoBox(); });
  } else {
    box.innerHTML=`<div class="photo-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.6"/><path d="M8 7l1.5-2h5L16 7"/></svg>${t("addPhoto")}</div>`;
  }
}
async function onPhoto(e){ const f=e.target.files[0]; if(!f) return; sheetPhotoBlob=await downscale(f); renderPhotoBox(); }
/* Always re-encodes to JPEG. Collection proofs keep 1200px; member
   photographs go to MEMBER_PHOTO_EDGE, which turns an ~800 KB camera file
   into roughly 20-40 KB. */
function downscale(file, max){ max = max || 1200; return new Promise(res=>{
  const img=new Image(); img.onload=()=>{ let w=img.width,h=img.height;
    if(w>max||h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
    const cv=document.createElement("canvas"); cv.width=w; cv.height=h; cv.getContext("2d").drawImage(img,0,0,w,h);
    cv.toBlob(b=>res(b||file),"image/jpeg",0.82); };
  img.onerror=()=>res(file); img.src=URL.createObjectURL(file); }); }

/* ---------- member photographs ----------
   The bucket is private. Nothing stores a URL: accounts.photo_path holds the
   object path and screens mint a short-lived signed link at render time, so a
   leaked row cannot leak the image. A missing photo is normal - several
   Krosuru members have none and the reserved accounts have none at all - so
   every path here falls back to initials rather than a broken image. */
const MEMBER_PHOTOS = "member-photos";
const PROOFS = "proofs";                    // collection proofs - also private
const MEMBER_PHOTO_EDGE = 400;
const SIGNED_URL_TTL = 300;                 // seconds
const photoUrlCache = new Map();            // "bucket/path" -> { url, expires }

const photoPathFor = (accountNumber) => `${String(accountNumber).trim().toUpperCase()}.jpg`;

/* Both private buckets read the same way: a link that expires. Nothing that
   reaches the database or a rendered page outlives SIGNED_URL_TTL. */
async function signedUrl(bucket, path){
  if (isBlank(path)) return null;
  const key = bucket + "/" + path;
  const hit = photoUrlCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) { reportError(error || new Error("no signed url"), { where:"signedUrl", bucket, path }); return null; }
  photoUrlCache.set(key, { url: data.signedUrl, expires: Date.now() + (SIGNED_URL_TTL - 30) * 1000 });
  return data.signedUrl;
}
const memberPhotoUrl = (path) => signedUrl(MEMBER_PHOTOS, path);
const proofUrl       = (path) => signedUrl(PROOFS, path);

/* Resolves every proof path in a list at once, so a day's collections cost
   one round of signing rather than one per row rendered. */
async function resolveProofUrls(rows){
  const map = {};
  const paths = [...new Set(rows.map(r => r.photo_path).filter(p => !isBlank(p)))];
  await Promise.all(paths.map(async p => { map[p] = await proofUrl(p); }));
  return map;
}

/* Neutral, never a broken image. */
function photoPlaceholder(name, size){
  const px = size || 96;
  return `<div class="photo-ph" style="width:${px}px;height:${px}px;font-size:${Math.round(px/2.8)}px">${esc(initials(name))}</div>`;
}

async function uploadMemberPhoto(accountNumber, blob){
  const path = photoPathFor(accountNumber);
  const { error } = await db.storage.from(MEMBER_PHOTOS)
    .upload(path, blob, { contentType:"image/jpeg", upsert:true });
  if (error) throw error;
  photoUrlCache.delete(MEMBER_PHOTOS + "/" + path);   // same key signedUrl() stores under
  return path;
}
function openCollect(pid){
  ensureSheet(); sheetPid=pid; sheetPhotoBlob=null;
  const d=dueData[pid]; if(!d) return; const p=d.product, m=d.member||{};
  $("cs-av").textContent=initials(m.holder_name); $("cs-name").textContent=m.holder_name||"—";
  $("cs-acc").textContent=(m.account_number||"")+" · "+typeWord(p.product_type);
  const pr=$("cs-prod"); pr.textContent=p.product_type==="LOAN"?t("loanRepayment"):t("rdDeposit"); pr.className="sh-prod "+(p.product_type==="LOAN"?"loan":"rd");
  $("cs-amt").value=p.installment_amount||"";
  $("cs-quick").innerHTML=[50,100,200,500].map(v=>`<button data-v="${v}">₹${v}</button>`).join("");
  $("cs-quick").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{$("cs-amt").value=b.dataset.v;}));
  $("cs-reasons").innerHTML=""; renderPhotoBox();
  sheetMethod="cash"; $("cs-method").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.m==="cash"));
  $("csheet").classList.add("open");
}
function closeSheet(){ const s=$("csheet"); if(s) s.classList.remove("open"); sheetPhotoBlob=null; sheetPid=null; }
async function saveCollect(){
  const amt=Number($("cs-amt").value);
  if(!amt||amt<=0){ toast(t("enterAmount"),true); return; }
  const p=dueData[sheetPid].product;
  /* A slipped finger (5000 for 500) is the commonest wrong entry and it cannot
     be edited afterwards, so an amount far above the instalment asks once. */
  const usual=Number(p.installment_amount)||0;
  if(usual>0 && amt>=usual*5 && !confirm(`${rupee(amt)} ${t("bigAmount")}`)) return;
  const btn=$("cs-save"); btn.disabled=true; btn.textContent=t("saving");
  /* A collection must ALWAYS save, with or without a photo (rules §6). If a
     photo was taken we attach it; if none was taken, or the upload fails, the
     payment is still recorded with photo_path null and left flagged for an
     admin to chase. A member who has handed over cash is never turned away. */
  let path=null;
  if(sheetPhotoBlob){
    const candidate=`${staff.id}/${todayStr()}/${p.id}-${Date.now()}.jpg`;
    const up=await db.storage.from(PROOFS).upload(candidate,sheetPhotoBlob,{contentType:"image/jpeg"});
    if(up.error){ reportError(up.error,{op:"photo_upload",product:p.id}); toast(t("photoSkipped"),true); }
    else path=candidate;  /* the path, never a URL - see collections.photo_path */
  }
  /* The database, not this device, has the final say on who collected, on which
     day and for which account: a trigger overwrites agent_id / collected_on /
     account fields for entry staff, and it also counts the installment. */
  const ins=await db.from("collections").insert({product_id:p.id,account_id:p.account_id,account_number:p.account_number,agent_id:staff.id,amount:amt,collected_on:todayStr(),status:"paid",photo_path:path,method:sheetMethod,branch_id:(p.branch_id||null)});
  btn.disabled=false; btn.textContent=t("save");
  if(ins.error){ saveFailed(ins.error,"Save failed: ",{op:"save_collection",product:p.id,amount:amt}); return; }
  closeSheet(); toast((path?t("saved"):t("photoSkipped"))+" "+rupee(amt)); afterCollect();
}
function showReasons(){
  const rs=[["not_paying",t("rNotPaying")],["unreachable",t("rUnreachable")],["complaint",t("rComplaint")],["promised",t("rPromised")]];
  $("cs-reasons").innerHTML=`<div class="amt-label" style="margin-top:14px">${t("whyNotPaid")}</div><div class="reasons">${rs.map(r=>`<button data-r="${r[0]}">${r[1]}</button>`).join("")}</div>`;
  $("cs-reasons").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>saveNotPaid(b.dataset.r)));
}
async function saveNotPaid(reason){
  const p=dueData[sheetPid].product;
  const ins=await db.from("collections").insert({product_id:p.id,account_id:p.account_id,account_number:p.account_number,agent_id:staff.id,amount:0,collected_on:todayStr(),status:"not_paid",reason,branch_id:(p.branch_id||null)});
  if(ins.error){ saveFailed(ins.error,"Failed: ",{op:"save_not_paid",product:p.id,reason}); return; }
  closeSheet(); toast(t("markedNotPaid")); afterCollect();
}
/* The book takes one live entry per product per day (23505 = that rule). That
   is a normal thing to run into at a counter, so it gets a plain message, not
   an error report. */
function saveFailed(error,prefix,ctx){
  if(error.code==="23505"){ toast(t("alreadyToday"),true); return; }
  toast(prefix+error.message,true); reportError(error,ctx);
}

/* Entry staff have no member list any more: they cannot browse the books, only
   look one member up at the counter (below). This cache is the admin's. */
let allAccounts=[];

/* ---------- AGENT: MY ENTRIES ----------
   Everything this staff member keyed in on one day, with the day's totals to
   tally against the cash drawer. Nothing here can be edited or deleted: a
   mistake is reported with a note, and the operator cancels it (or keeps it).
   A cancelled entry stays on the list, struck through, and stops counting. */
let entriesDate=null, entriesSeq=0, entryRows={};
function entryBadge(r){
  if(r.status==="cancelled") return `<span class="ebadge cancelled">${t("stCancelled")}</span>`;
  if(r.flagged_at) return `<span class="ebadge wait">${t("stSent")}</span>`;
  if(r.flag_note) return `<span class="ebadge kept">${t("stKept")}</span>`;
  return "";
}
async function agentEntries(c){
  const today=todayStr();
  if(!entriesDate || entriesDate>today) entriesDate=today;
  const day=entriesDate, isToday=day===today, seq=++entriesSeq;
  c.innerHTML=`<div class="branchbar">
      <button class="chip" id="en-prev" aria-label="previous day">‹</button>
      <button class="chip ${isToday?"on":""}" id="en-today">${t("today")}</button>
      <button class="chip" id="en-next" aria-label="next day" ${isToday?"disabled":""}>›</button>
    </div>
    <div id="en-body"><div class="skel"><i></i><i></i><i></i></div></div>`;
  const go=(d)=>{ entriesDate=d; agentEntries(c); };
  $("en-prev").addEventListener("click",()=>go(addDaysIso(day,-1)));
  $("en-today").addEventListener("click",()=>go(today));
  $("en-next").addEventListener("click",()=>{ if(!isToday) go(addDaysIso(day,1)); });
  const { data, error } = await db.rpc("entry_my_entries",{p_on:day});
  const body=$("en-body");
  if(seq!==entriesSeq || !body) return;            /* a newer day was asked for, or the tab changed */
  if(error){ reportError(error,{op:"entry_my_entries"}); body.innerHTML=`<div class="empty">${t("connErr")}</div>`; return; }
  const rows=data||[]; entryRows={}; rows.forEach(r=>{ entryRows[r.id]=r; });
  const sum=(l)=>l.reduce((s,r)=>s+Number(r.amount||0),0);
  const paid=rows.filter(r=>r.status==="paid");
  const phone=paid.filter(r=>r.method==="phone"), cash=paid.filter(r=>r.method!=="phone");
  let html=`<div class="tile blue"><div class="tlabel">${isToday?t("collectedToday"):t("dayTotal")} · ${dmy(day)} · ${weekdayName(day)}</div>
      <div class="tval">${rupee(sum(paid))}</div><div class="tnote">${paid.length} ${t("entries")}</div></div>
    <div class="grid2">
      <div class="stat"><div class="slabel">${t("mCash")}</div><div class="sval">${rupee(sum(cash))}</div></div>
      <div class="stat"><div class="slabel">${t("mPhone")}</div><div class="sval blue">${rupee(sum(phone))}</div></div>
    </div>`;
  if(!rows.length){ body.innerHTML=html+`<div class="empty">${ICON.history}<div>${t("noEntries")}</div></div>`; return; }
  html+=`<div class="sectlabel">${t("myEntries")} · ${rows.length}</div>`;
  html+=rows.map(r=>{
    const cancelled=r.status==="cancelled", np=r.status==="not_paid";
    const canReport=!cancelled && !r.flagged_at;
    const meta=[istTime(r.created_at), dash(r.account_number), schemeLabel(r),
                (np||cancelled&&!Number(r.amount))?null:(r.method==="phone"?t("mPhone"):t("mCash"))].filter(Boolean).join(" · ");
    const note = cancelled ? r.cancel_reason : (r.flag_note || (np ? r.reason : ""));
    const money = np ? `<span class="badge-np">${t("notPaid")}</span>`
                : (cancelled && !Number(r.amount)) ? "" : `<div class="amoney">${rupee(r.amount)}</div>`;
    return `<div class="card erow${cancelled?" cancelled":""}" ${canReport?`data-eid="${r.id}" role="button" tabindex="0"`:""}>
      <div class="mrow"><div class="mav">${initials(r.holder_name)}</div>
        <div style="flex:1;min-width:0"><div class="mname">${dashEsc(r.holder_name)}</div><div class="mmeta">${esc(meta)}</div></div>
        <div class="eright">${money}${entryBadge(r)}</div></div>
      ${note?`<div class="enote">${esc(note)}</div>`:""}</div>`;
  }).join("");
  html+=`<div class="entry-hint" style="margin-top:14px">${t("tapToReport")}</div>`;
  body.innerHTML=html;
  body.querySelectorAll("[data-eid]").forEach(el=>{
    el.addEventListener("click",()=>openReport(el.dataset.eid));
    el.addEventListener("keydown",e=>{ if(e.key==="Enter") openReport(el.dataset.eid); });
  });
}

/* "This entry of mine is wrong" - a note to the operator, never an edit. */
function openReport(id){
  const r=entryRows[id]; if(!r) return;
  let d=$("rsheet");
  if(!d){ d=document.createElement("div"); d.id="rsheet"; d.className="sheet-back"; document.body.appendChild(d);
    d.addEventListener("click",e=>{ if(e.target.id==="rsheet") d.classList.remove("open"); }); }
  const what=r.status==="not_paid"?t("notPaid"):rupee(r.amount);
  d.innerHTML=`<div class="sheet"><div class="sheet-grab"></div>
    <div class="sh-name">${t("reportWrong")}</div>
    <div class="mmeta" style="margin-top:4px">${dashEsc(r.holder_name)} · ${dashEsc(r.account_number)} · ${esc(what)} · ${istTime(r.created_at)}</div>
    <div class="amt-label">${t("reportHint")}</div>
    <div class="reasons" id="rs-quick">${["qWrongAmt","qWrongMem","qMistake"].map(k=>`<button type="button">${t(k)}</button>`).join("")}</div>
    <textarea class="finput rnote" id="rs-note" rows="3" maxlength="300" placeholder="${esc(t("reportPh"))}"></textarea>
    <div class="sh-actions"><button class="btn-ghost" id="rs-cancel">${t("cancel")}</button><button class="btn-primary" id="rs-send">${t("sendReport")}</button></div></div>`;
  const note=$("rs-note");
  $("rs-quick").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ note.value=b.textContent; note.focus(); }));
  $("rs-cancel").addEventListener("click",()=>d.classList.remove("open"));
  $("rs-send").addEventListener("click",async()=>{
    const txt=note.value.trim();
    if(!txt){ toast(t("noteRequired"),true); note.focus(); return; }
    const btn=$("rs-send"); btn.disabled=true;
    const { error } = await db.rpc("entry_flag_entry",{p_id:id,p_note:txt});
    btn.disabled=false;
    if(error){ toast(t(rpcErrKey(error,"entry_flag_entry")),true); return; }
    d.classList.remove("open"); toast(t("reportSent"));
    if(currentTab==="myEntries" && $("content")) agentEntries($("content"));
  });
  d.classList.add("open");
}

/* ---------- AGENT: COUNTER ----------
   Krosuru is counter-based — members come in to pay, so the primary screen is
   find-a-member → take-a-payment, not a route due list (rules §6). The member's
   photo is shown up top: names don't identify people here (multiple members
   share a name), so the cashier confirms the right account by face before
   taking cash. */
let counterAccId=null, counterRows={}, counterSeq=0, counterTimer=null;
async function agentCounter(c){
  await loadHolidays();
  if(currentTab!=="counter") return;                /* the tab changed while this was loading */
  c.innerHTML=`<div class="hello"><div class="hello-hi">${greeting()}, ${esc(staff.name||"")}</div>
      <div class="hello-date">${esc(todayLong())}</div></div>
    <div id="cMine"></div>
    <input class="searchbar" id="csearch" placeholder="${t("searchNameAcc")}" autocomplete="off"/>
    <div class="listmeta" id="ccount"></div>
    <div id="clist"></div>`;
  /* what this person has taken in today - their own entries only, as on My entries */
  db.rpc("entry_my_entries",{p_on:todayStr()}).then(({ data })=>{
    const box=$("cMine"); if(!box) return;
    const paid=(data||[]).filter(r=>r.status==="paid");
    box.innerHTML=`<div class="tile blue mini"><div class="tlabel">${t("myToday")}</div>
      <div class="tval">${rupee(paid.reduce((s,r)=>s+Number(r.amount||0),0))}</div>
      <div class="tnote">${paid.length} ${t("entries")}</div></div>`;
  });
  const hint=(k)=>{ $("ccount").textContent=""; $("clist").innerHTML=`<div class="empty">${ICON.members}<div>${t(k)}</div></div>`; };
  /* The search runs on the server and hands back name, number and photo only.
     The member list is never downloaded to an entry-staff device. */
  const run=async(f)=>{
    const q=(f||"").trim(), seq=++counterSeq;
    if(!q) return hint("counterHint");
    if(q.length<2) return hint("typeToSearch");
    const { data, error } = await db.rpc("entry_search_members",{p_q:q});
    if(seq!==counterSeq || !$("clist")) return;      /* a newer search started, or the tab changed */
    if(error){ reportError(error,{op:"entry_search_members"}); return hint("connErr"); }
    const rows=data||[];
    rows.forEach(m=>{ counterRows[m.id]=m; });
    $("ccount").textContent=`${rows.length} ${t("membersCount")}`;
    $("clist").innerHTML=rows.map(m=>`<div class="card" data-acc="${m.id}" style="cursor:pointer"><div class="mrow">
      <div class="mav">${initials(m.holder_name)}</div>
      <div style="flex:1"><div class="mname">${dashEsc(m.holder_name)}</div><div class="mmeta">${dashEsc(m.account_number)}</div></div>
      <span style="color:var(--muted);font-size:20px">›</span></div></div>`).join("")||`<div class="empty">${DASH}</div>`;
    $("clist").querySelectorAll("[data-acc]").forEach(el=>el.addEventListener("click",()=>openCounterMember(el.dataset.acc)));
    return rows;
  };
  hint("counterHint");
  const box=$("csearch");
  box.addEventListener("input",e=>{ const v=e.target.value; clearTimeout(counterTimer); counterTimer=setTimeout(()=>run(v),250); });
  /* Keyboard desk: Enter searches at once, and opens the member when the
     search leaves exactly one (typing a full account number does that). */
  box.addEventListener("keydown",async e=>{
    if(e.key!=="Enter") return;
    clearTimeout(counterTimer);
    const rows=await run(box.value);
    if(rows && rows.length===1) openCounterMember(rows[0].id);
  });
  if(window.matchMedia && matchMedia("(pointer:fine)").matches) box.focus();
}
/* Done with this member: back to an empty search box, ready for the next. */
function counterNext(){
  const d=$("detail"); if(d) d.classList.remove("open");
  counterAccId=null;
  const box=$("csearch"); if(!box) return;
  box.value=""; box.dispatchEvent(new Event("input")); box.focus();
}

async function openCounterMember(accountId){
  const acc=counterRows[accountId]; if(!acc) return;
  counterAccId=accountId;
  ensureDetail();
  $("d-title").textContent=dash(acc.holder_name); $("d-sub").textContent=dash(acc.account_number);
  const cont=$("d-content"); cont.innerHTML=`<div class="skel"><i></i><i></i><i></i></div>`;
  const [{ data:prods, error }, photo] = await Promise.all([
    db.rpc("entry_member_products",{p_account_id:accountId}), memberPhotoUrl(acc.photo_path)]);
  if(error) reportError(error,{op:"entry_member_products"});
  const collectible=prods||[];
  /* a large picture: this is where the cashier checks it is the right person */
  let html = memberHero(acc, photo, { big:true });
  html += `<div class="sectlabel">${t("takePayment")}</div>`;
  if(!collectible.length){ html+=`<div class="empty">${t("noProducts")}</div>`; }
  else html+=collectible.map(p=>`<div class="card counter-prod" data-pid="${p.id}" style="cursor:pointer"><div class="mrow">
      <span class="pill-s ${PKIND(p)}">${esc(typeWord(p.product_type))}</span>
      <div style="flex:1;margin-left:8px"><div class="mname">${p.installment_amount?rupee(p.installment_amount):""}${p.frequency?" / "+esc(freqWord(p.frequency)):""}</div>
        ${p.paid_today?`<div class="mmeta" style="color:var(--green,#1a7f4b);font-weight:700">✓ ${t("paidToday")}</div>`:""}</div>
      ${p.paid_today?"":`<span style="background:var(--blue);color:#fff;padding:7px 15px;border-radius:10px;font-weight:700;font-size:13px">${t("collect")}</span>`}
    </div></div>`).join("");
  /* Group positions show other members' money - operators only. */
  const grpLoan=staff.is_admin ? collectible.find(p=>p.group_id) : null;
  if(grpLoan) html+=`<button class="actionbtn" id="cm-group">${t("groupPosition")}</button>`;
  /* Entry staff cannot open a deposit or loan themselves; they ask the operator. */
  if(!staff.is_admin) html+=`<button class="actionbtn" id="cm-newprod" style="margin-top:14px">＋ ${t("rqNewProduct")}</button>`;
  html+=`<button class="actionbtn nextbtn" id="cm-next"${staff.is_admin?"":' style="margin-top:0"'}>${t("nextMember")} ›</button>`;
  cont.innerHTML=html;
  collectible.forEach(p=>{ dueData[p.id]={product:p, member:acc}; });   // so openCollect can use them
  cont.querySelectorAll("img[data-full]").forEach(im=>im.addEventListener("click",()=>openImg(im.dataset.full)));
  /* Already paid today: say so instead of opening a sheet the book would refuse. */
  cont.querySelectorAll(".counter-prod").forEach(el=>el.addEventListener("click",()=>{
    const d=dueData[el.dataset.pid];
    if(d && d.product.paid_today){ toast(t("alreadyToday"),true); return; }
    openCollect(el.dataset.pid); }));
  $("cm-group")?.addEventListener("click",()=>openGroup(grpLoan.group_id));
  $("cm-newprod")?.addEventListener("click",()=>openProductRequest({accountId:acc.id,name:acc.holder_name,accountNumber:acc.account_number}));
  $("cm-next").addEventListener("click",counterNext);
  $("detail").classList.add("open");
}

/* After a collection saves, refresh whatever agent screen is showing. */
function afterCollect(){
  if(staff && staff.is_admin) return;
  if(currentTab==="counter" && counterAccId){ openCounterMember(counterAccId); }
  else if(currentTab==="today"){ agentToday($("content")); }
}

/* ---------- ADMIN: DASHBOARD ---------- */
function greeting(){
  const h=Number(new Intl.DateTimeFormat("en-GB",{timeZone:IST,hour:"2-digit",hourCycle:"h23"}).format(new Date()));
  return t(h<12?"goodMorning":h<17?"goodAfternoon":"goodEvening");
}
const todayLong=()=>new Date().toLocaleDateString(lang==="te"?"te-IN":"en-IN",
  {timeZone:IST,weekday:"long",day:"numeric",month:"long",year:"numeric"});

async function adminDashboard(c){
  c.innerHTML=`<div class="hello"><div class="hello-hi">${greeting()}, ${esc(staff.name||"")}</div>
      <div class="hello-date">${esc(todayLong())}</div></div>
    <div class="dash-a">
    <div class="tile pink hero"><div class="tlabel">${t("collectedToday")}</div><div class="tval" id="adToday">—</div></div>
    <div id="adCheck"></div>
    <div id="adReq"></div>
    <div id="adColl"></div>
    <div class="grid2">
      <div class="stat"><div class="slabel">${t("realProfit")}</div><div class="sval blue" id="adProfit">—</div></div>
      <div class="stat"><div class="slabel">${t("notPaid")}</div><div class="sval pink" id="adNP">—</div></div>
      <div class="stat"><div class="slabel">${t("maturing7")}</div><div class="sval gold" id="adMat">—</div></div>
      <div class="stat"><div class="slabel">${t("activeMembers")}</div><div class="sval" id="adActive">—</div></div>
    </div>
    <div class="card fdcard" id="adFdBtn" style="cursor:pointer;display:flex;align-items:center;gap:12px">
      <div style="flex:1"><div class="slabel">${t("fdThisMonth")}</div><div class="sval gold" id="adFdTotal">—</div></div>
      <span style="font-size:22px;color:var(--muted)">›</span>
    </div>
    <div class="card" id="adAttBtn" style="cursor:pointer;display:flex;align-items:center;gap:12px">
      <div style="flex:1"><div class="slabel">${t("attToday")}</div><div class="sval blue" id="adAtt">—</div></div>
      <span style="font-size:22px;color:var(--muted)">›</span>
    </div>
    <div class="grid2">
      <div class="card" id="adGroupsBtn" style="cursor:pointer">
        <div class="slabel">${t("groups")}</div><div class="sval blue" id="adGroupsN">—</div></div>
      <div class="card" id="adCashbookBtn" style="cursor:pointer">
        <div class="slabel">${t("cashbook")}</div><div class="sval gold" id="adCbToday">—</div></div>
    </div>
    </div>
    <div class="dash-b">
    <div class="sectlabel">${t("byBranch")}</div><div id="adBranches"></div>
    <div class="sectlabel">${t("todaysWork")}</div><div id="adAgents"></div>
    </div>`;
  $("adAttBtn").addEventListener("click",()=>openAttendance(todayStr()));
  paintAttCard();
  const { data:cols } = await db.from("collections").select("amount,status,agent_id,account_id").eq("collected_on",todayStr());
  const paidCols=(cols||[]).filter(x=>x.status==="paid");
  if(!$("adToday")) return;                          /* the tab changed while this was loading */
  setNum("adToday",paidCols.reduce((s,r)=>s+Number(r.amount),0),true);
  setNum("adNP",(cols||[]).filter(x=>x.status==="not_paid").length);
  $("adProfit").textContent="₹0";
  /* Entries that staff reported as wrong and nobody has looked at yet (any day). */
  const { count:toCheck } = await db.from("collections").select("id",{count:"exact",head:true})
    .not("flagged_at","is",null).neq("status","cancelled");
  if($("adCheck")) $("adCheck").innerHTML = toCheck ? `<button class="checkbtn" id="adCheckBtn" style="margin:11px 0 0">
      <span class="checkbtn-n">${toCheck}</span><span>${t("entriesToCheck")}</span><span class="checkbtn-go">›</span></button>` : "";
  $("adCheckBtn")?.addEventListener("click",openEntryCheck);
  /* New members, deposits and loans that entry staff asked for and that wait for a yes or no. */
  const { count:toApprove } = await db.from("requests").select("id",{count:"exact",head:true}).eq("status","pending");
  if($("adReq")) $("adReq").innerHTML = toApprove ? `<button class="checkbtn req" id="adReqBtn" style="margin:11px 0 0">
      <span class="checkbtn-n">${toApprove}</span><span>${t("rqToApprove")}</span><span class="checkbtn-go">›</span></button>` : "";
  $("adReqBtn")?.addEventListener("click",openRequestCheck);
  paintCollAlert();

  /* Members and money, per branch, with the roll-up above.
     'placeholder' rows are allocated numbers, not members, and the
     status filter keeps them out of every count below. */
  await loadBranches();
  const { data:accs } = await db.from("accounts").select("id,branch_id,status");
  const live = (accs||[]).filter(a=>a.status==="active");
  if(!$("adBranches")) return;
  setNum("adActive", live.length);
  const brOf = {}; (accs||[]).forEach(a => { brOf[a.id] = a.branch_id; });
  const memByBr = {}, moneyByBr = {};
  live.forEach(a => { memByBr[a.branch_id] = (memByBr[a.branch_id]||0) + 1; });
  paidCols.forEach(x => { const b = brOf[x.account_id];
    moneyByBr[b] = (moneyByBr[b]||0) + Number(x.amount); });
  $("adBranches").innerHTML = branches.map(b => `
    <div class="card" style="display:flex;align-items:center">
      <div class="mav" style="width:34px;height:34px;font-size:12px">${esc(b.name.slice(0,2).toUpperCase())}</div>
      <div style="margin-left:11px;flex:1">
        <div class="mname">${esc(b.name)}</div>
        <div class="mmeta">${memByBr[b.id]||0} ${t("membersCount")}</div>
      </div>
      <div class="amoney">${rupee(moneyByBr[b.id]||0)}</div>
    </div>`).join("");
  /* Maturity is a moving, instalment-based projection (rules §4), not a stored
     date — so the 7-day count is computed from expected maturities. */
  const wk=istParts(new Date(Date.now()+7*864e5)).iso;
  const rdm=await loadRdMaturities();
  if(!$("adFdBtn")) return;
  setNum("adMat",rdm.filter(x=>x.expected>=todayStr() && x.expected<=wk).length);
  /* FD interest is a monthly cash payout, not something that accrues to maturity
     (rules §2). Surface the whole month's obligation here and open the full list. */
  const { data:fds } = await db.from("products").select("principal,interest_rate").eq("product_type","FD").in("status",["active","running"]);
  if(!$("adFdBtn")) return;
  setNum("adFdTotal",Math.round((fds||[]).reduce((s,p)=>s+fdMonthlyInterest(p),0)),true);
  $("adFdBtn").addEventListener("click",openFdPayout);
  const { count:gc } = await db.from("groups").select("*",{count:"exact",head:true}).neq("status","closed");
  if(!$("adGroupsBtn")) return;
  setNum("adGroupsN",gc??0);
  $("adGroupsBtn").addEventListener("click",openGroupList);
  setNum("adCbToday",paidCols.reduce((s,r)=>s+Number(r.amount),0),true);
  $("adCashbookBtn").addEventListener("click",()=>openCashbook(todayStr()));
  const { data:sl } = await db.rpc("list_staff");
  const nm={}; (sl||[]).forEach(s=>nm[s.id]=s.name);
  const byA={}; paidCols.forEach(x=>byA[x.agent_id]=(byA[x.agent_id]||0)+Number(x.amount));
  const rows=Object.entries(byA).sort((a,b)=>b[1]-a[1]);
  const el=$("adAgents");
  if(!rows.length){ el.innerHTML=`<div class="empty">${t("noWorkToday")}</div>`; return; }
  el.innerHTML=rows.map(([id,amt])=>`<div class="card" data-agent="${id}" data-name="${esc(nm[id]||"?")}" style="display:flex;align-items:center;cursor:pointer">
    <div class="mav" style="width:34px;height:34px;font-size:12px">${initials(nm[id]||"?")}</div>
    <div class="mname" style="margin-left:11px;flex:1">${esc(nm[id]||t("unknownWord"))}</div>
    <div class="amoney">${rupee(amt)}</div></div>`).join("");
  el.querySelectorAll("[data-agent]").forEach(r=>r.addEventListener("click",()=>openAgent(r.dataset.agent,r.dataset.name)));
}

/* ---------- ADMIN: FD INTEREST PAYOUT ----------
   FD interest is paid MONTHLY in cash (rules §2) — the society's largest
   recurring obligation, and the one report nothing produced before: who is
   owed how much this month, grouped by branch. 18%/yr = 1.5% of principal
   per month. */
function fdMonthlyInterest(p){ return Number(p.principal||0) * (Number(p.interest_rate ?? 18)/100/12); }

async function openFdPayout(){
  await loadBranches();
  let el=$("fdpayout");
  if(!el){ el=document.createElement("div"); el.id="fdpayout"; el.className="detail"; document.body.appendChild(el); }
  el.innerHTML=`<div class="dhead"><button class="dback" id="fd-back" aria-label="${t("back")}">${ICON.back}</button>
    <div style="flex:1"><div class="dtitle">${t("fdPayout")}</div><div class="dsub" id="fd-sub"></div></div></div>
    <div class="content" id="fd-content"><div class="skel"><i></i><i></i><i></i></div></div>`;
  el.classList.add("open");
  $("fd-back").addEventListener("click",()=>el.classList.remove("open"));

  const { data, error } = await db.from("products")
    .select("principal,interest_rate,start_date,term_months,status,account_id,branch_id,accounts(holder_name,account_number,branch_id)")
    .eq("product_type","FD").in("status",["active","running"]);
  const cont=$("fd-content");
  if(error){ reportError(error,{where:"openFdPayout"}); cont.innerHTML=`<div class="empty">${esc(error.message)}</div>`; return; }

  /* Group by the BOOKING branch, not the member's home branch — an FD can be
     booked at a branch other than the member's own (v2 #5). */
  const rows=(data||[]).map(p=>({ ...p, monthly:fdMonthlyInterest(p), acc:p.accounts||{},
    bookBr:(p.branch_id || (p.accounts&&p.accounts.branch_id) || null) }));
  const grand=rows.reduce((s,r)=>s+r.monthly,0);
  const monthLabel=new Date().toLocaleDateString("en-IN",{timeZone:IST,month:"long",year:"numeric"});
  $("fd-sub").textContent=`${rows.length} ${t("fdCount")} · ${monthLabel}`;

  const totalTile=`<div class="tile gold"><div class="tlabel">${t("fdTotalMonth")}</div>
    <div class="tval">${rupee(Math.round(grand))}</div><div class="tnote">${rows.length} ${t("fdCount")} · ${esc(monthLabel)}</div></div>`;
  if(!rows.length){ cont.innerHTML=totalTile+`<div class="empty">${ICON.maturities}<div>${t("fdNone")}</div></div>`; return; }

  const card=(r)=>{
    const home=branchById(r.acc.branch_id);
    const cross = r.acc.branch_id && r.bookBr && r.acc.branch_id!==r.bookBr;
    return `<div class="card"><div class="mrow">
      <div class="mav">${initials(r.acc.holder_name)}</div>
      <div style="flex:1"><div class="mname">${dashEsc(r.acc.holder_name)}</div>
        <div class="mmeta">${dashEsc(r.acc.account_number)} · ${t("fdPrincipal")} ${rupee(r.principal)}${cross?` · ${t("homeMember")}: ${esc(home?home.name:"?")}`:""}</div></div>
      <div class="amoney">${rupee(Math.round(r.monthly))}<div class="mmeta" style="text-align:right;font-weight:400">${t("perMonth")}</div></div>
    </div></div>`;
  };

  const byBr={}; rows.forEach(r=>{ (byBr[r.bookBr]=byBr[r.bookBr]||[]).push(r); });
  let html=totalTile;
  branches.forEach(b=>{
    const list=(byBr[b.id]||[]).sort((a,c)=>c.monthly-a.monthly);
    if(!list.length) return;
    const sub=list.reduce((s,r)=>s+r.monthly,0);
    html+=`<div class="sectlabel">${esc(b.name)} · ${rupee(Math.round(sub))}${t("perMonth")}</div>`+list.map(card).join("");
  });
  const orphan=rows.filter(r=>!r.bookBr || !branchById(r.bookBr));
  if(orphan.length){ html+=`<div class="sectlabel">${t("noBranch")}</div>`+orphan.map(card).join(""); }
  cont.innerHTML=html;
}

/* ---------- MATURITY: A MOVING PROJECTION ----------
   Maturity is instalment-based, not date-based (rules §4). A member must
   complete the scheme's pay_count instalments; each missed day pushes the date
   out. So it is recomputed from how many instalments remain and is always
   labelled "expected", never fixed. */
let schemesCache=null;
async function loadSchemes(){
  if(schemesCache) return schemesCache;
  const { data } = await db.from("schemes").select("*");
  schemesCache={}; (data||[]).forEach(s=>{ schemesCache[s.id]=s; });
  return schemesCache;
}
function partsFromUTC(dt){
  const y=dt.getUTCFullYear(), m=dt.getUTCMonth()+1, d=dt.getUTCDate();
  return { y, m, d, dow:dt.getUTCDay(), iso:`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}` };
}
function addWorkingDays(fromParts, n){
  let dt=new Date(Date.UTC(fromParts.y, fromParts.m-1, fromParts.d));
  if(n<=0) return partsFromUTC(dt).iso;
  let count=0;
  while(count<n){ dt=new Date(dt.getTime()+864e5); if(isWorkingDay(partsFromUTC(dt))) count++; }
  return partsFromUTC(dt).iso;
}
/* the date the required instalments finish, counted forward from today */
function expectedMaturity(p, scheme){
  const need = scheme && scheme.pay_count;
  if(!need) return null;
  const remaining = Math.max(0, need - (p.installments_paid||0));
  const now = istParts();
  const monthly = (scheme.frequency==="monthly") || (p.frequency==="monthly");
  if(monthly){
    const dueDom = p.due_day || (p.start_date ? Number(p.start_date.split("-")[2]) : now.d);
    const target = new Date(Date.UTC(now.y, (now.m-1)+remaining, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth()+1, 0)).getUTCDate();
    const dom = Math.min(dueDom||1, lastDay);
    return partsFromUTC(new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), dom))).iso;
  }
  return addWorkingDays(now, remaining);   // daily: n more working days
}
async function loadRdMaturities(){
  await loadHolidays();
  const byId = await loadSchemes();
  const { data } = await db.from("products")
    .select("id,installment_amount,frequency,start_date,installments_paid,due_day,scheme_id,status,account_id,accounts(holder_name,account_number,branch_id)")
    .eq("product_type","RD").in("status",["active","running"]);
  return (data||[]).map(p=>{
    const sc=byId[p.scheme_id];
    return { ...p, scheme:sc, expected:expectedMaturity(p,sc), acc:p.accounts||{},
             paid:p.installments_paid||0, need:(sc&&sc.pay_count)||null };
  }).filter(x=>x.expected).sort((a,b)=>a.expected.localeCompare(b.expected));
}

async function adminMaturities(c){
  await loadBranches();
  c.innerHTML=`<div class="sectlabel">${t("maturities")}</div>
    <div class="entry-hint">${t("maturitiesForecast")}</div>
    <div id="matList"><div class="skel"><i></i><i></i><i></i></div></div>`;
  const rows=await loadRdMaturities();
  const el=$("matList");
  if(!rows.length){ el.innerHTML=`<div class="empty">${ICON.maturities}<div>${t("noMaturities")}</div></div>`; return; }
  /* Sorted into what needs attention first: finished, this week, this month, later.
     The date is still a forecast - it moves with every instalment paid or missed. */
  const now=istParts(), heads={ done:"maturedHead", week:"within7", month:"within30", later:"laterWord" };
  const groups={ done:[], week:[], month:[], later:[] };
  rows.forEach(r=>{
    const done=r.need && r.paid>=r.need;
    const left=r.expected ? -daysBetween(r.expected, now) : null;      /* days from today to the expected date */
    groups[done?"done":left!==null&&left<=7?"week":left!==null&&left<=30?"month":"later"].push({ r, done, left });
  });
  el.innerHTML=Object.keys(groups).filter(k=>groups[k].length).map(k=>
    `<div class="sectlabel">${t(heads[k])} · ${groups[k].length}</div>`+groups[k].map(({ r, done, left })=>{
    const br=branchById(r.acc.branch_id);
    const pct=r.need?Math.min(100,Math.round((r.paid/r.need)*100)):0;
    const when=done ? `<span class="ebadge kept">${t("matured")}</span>`
      : left===null ? ""
      : `<span class="ebadge ${left<=7?"wait":"gone"}">${left<=0?t("dueTodayWord"):t("inDays").replace("{n}",left)}</span>`;
    return `<div class="card" data-acc="${r.account_id}" style="cursor:pointer">
      <div class="mrow">
        <div class="mav">${initials(r.acc.holder_name)}</div>
        <div style="flex:1;min-width:0"><div class="mname">${dashEsc(r.acc.holder_name)}</div>
          <div class="mmeta">${dashEsc(r.acc.account_number)}${br?" · "+esc(br.name):""}${r.installment_amount?" · "+rupee(r.installment_amount):""}${r.frequency?" / "+esc(freqWord(r.frequency)):""}</div></div>
        <div class="eright">
          ${when}
          <div class="mmeta">${done?"":esc(dmyOr(r.expected))+" · "+t("expected")}</div>
        </div>
      </div>
      <div class="bar${done?" full":""}"><span style="width:${pct}%"></span></div>
      <div class="mmeta" style="margin-top:5px">${r.paid} ${t("paidOf")} ${r.need||"?"}${r.scheme?" · "+esc(r.scheme.name):""}</div>
    </div>`;
  }).join("")).join("");
  el.querySelectorAll("[data-acc]").forEach(card=>card.addEventListener("click",()=>openAccount(card.dataset.acc)));
}

/* ---------- LOANS: GROUPS + ARREARS ----------
   Loans are weekly (or daily) and ignore the holiday calendar (v2 §3). Arrears
   = instalments due to date minus those recorded. Paper history isn't imported,
   so "behind" reads high until collections are entered — the screens say so. */
function daysBetween(startIso, nowParts){
  const [y,m,d]=startIso.split("-").map(Number);
  return Math.floor((Date.UTC(nowParts.y,nowParts.m-1,nowParts.d) - Date.UTC(y,m-1,d))/864e5);
}
function loanExpectedToDate(p){
  if(!p.start_date) return 0;
  const days=daysBetween(p.start_date, istParts());
  if(days<0) return 0;
  const per = (p.frequency==="daily") ? (days+1) : (Math.floor(days/7)+1);
  if(p.term_weeks){ const cap=(p.frequency==="daily")?p.term_weeks*7:p.term_weeks; return Math.min(per,cap); }
  return per;
}
const loanArrears=(p)=>Math.max(0, loanExpectedToDate(p) - (p.installments_paid||0));

async function openGroupList(){
  await loadBranches();
  let el=$("grouplist");
  if(!el){ el=document.createElement("div"); el.id="grouplist"; el.className="detail"; document.body.appendChild(el); }
  el.innerHTML=`<div class="dhead"><button class="dback" id="gl-back" aria-label="${t("back")}">${ICON.back}</button>
    <div style="flex:1"><div class="dtitle">${t("groups")}</div><div class="dsub" id="gl-sub"></div></div></div>
    <div class="content" id="gl-content"><div class="skel"><i></i><i></i><i></i></div></div>`;
  el.classList.add("open");
  $("gl-back").addEventListener("click",()=>el.classList.remove("open"));
  const { data:grps } = await db.from("groups").select("id,name,status").neq("status","closed").order("name");
  const { data:loans } = await db.from("products").select("group_id,installment_amount,frequency,start_date,installments_paid,term_weeks,status")
    .eq("product_type","LOAN").not("group_id","is",null);
  const byG={}; (loans||[]).forEach(l=>{ (byG[l.group_id]=byG[l.group_id]||[]).push(l); });
  const cont=$("gl-content");
  $("gl-sub").textContent=`${(grps||[]).length} ${t("groups").toLowerCase()}`;
  cont.innerHTML=(grps||[]).map(g=>{
    const ls=(byG[g.id]||[]).filter(l=>l.status==="running");
    const weekly=ls.reduce((s,l)=>s+(l.frequency==="weekly"?Number(l.installment_amount||0):0),0);
    const behind=ls.reduce((s,l)=>s+loanArrears(l),0);
    return `<div class="card" data-g="${g.id}" style="cursor:pointer"><div class="mrow">
      <div class="mav">${esc((g.name||"G").replace(/Krosuru\s*/,'')||'G')}</div>
      <div style="flex:1"><div class="mname">${esc(g.name)}</div><div class="mmeta">${ls.length} ${t("membersCount")} · ${rupee(weekly)}${t("perWeek")}</div></div>
      ${behind>0?`<span class="badge-np" style="background:#FBE6A2;color:#7a5c00">${behind} ${t("behind").toLowerCase()}</span>`:`<span class="badge-np" style="background:#d8f3e3;color:#1a7a4a">${t("onTrack")}</span>`}
    </div></div>`;
  }).join("")||`<div class="empty">${t("noGroups")}</div>`;
  cont.querySelectorAll("[data-g]").forEach(c=>c.addEventListener("click",()=>openGroup(c.dataset.g)));
}

async function openGroup(groupId){
  let el=$("group");
  if(!el){ el=document.createElement("div"); el.id="group"; el.className="detail"; document.body.appendChild(el); }
  el.innerHTML=`<div class="dhead"><button class="dback" id="g-back" aria-label="${t("back")}">${ICON.back}</button>
    <div style="flex:1"><div class="dtitle" id="g-title">…</div><div class="dsub" id="g-sub"></div></div></div>
    <div class="content" id="g-content"><div class="skel"><i></i><i></i><i></i></div></div>`;
  el.classList.add("open");
  $("g-back").addEventListener("click",()=>el.classList.remove("open"));
  const { data:g } = await db.from("groups").select("*").eq("id",groupId).single();
  const { data:loans } = await db.from("products")
    .select("id,account_id,account_number,installment_amount,frequency,start_date,installments_paid,term_weeks,principal,status,accounts(holder_name)")
    .eq("product_type","LOAN").eq("group_id",groupId);
  const cont=$("g-content");
  if(!g){ cont.innerHTML=`<div class="empty">${DASH}</div>`; return; }
  $("g-title").textContent=g.name;
  const running=(loans||[]).filter(l=>l.status==="running").sort((a,b)=>loanArrears(b)-loanArrears(a));
  const weekly=running.reduce((s,l)=>s+(l.frequency==="weekly"?Number(l.installment_amount||0):0),0);
  const behind=running.reduce((s,l)=>s+loanArrears(l),0);
  $("g-sub").textContent=`${running.length} ${t("membersCount")}`;
  let html=`<div class="tile blue"><div class="tlabel">${t("weeklyTotal")}</div><div class="tval">${rupee(weekly)}</div>
    <div class="tnote">${running.length} ${t("membersCount")} · ${behind} ${t("behind").toLowerCase()}</div></div>
    <div class="entry-hint">${t("arrearsCaveat")}</div>`;
  html+=running.map(l=>{
    const exp=loanExpectedToDate(l), rec=l.installments_paid||0, beh=Math.max(0,exp-rec);
    const unit=l.frequency==="daily"?t("dArrears"):t("wkArrears");
    const m=l.accounts||{};
    return `<div class="card" data-acc="${l.account_id}" style="cursor:pointer"><div class="mrow">
      <div class="mav">${initials(m.holder_name)}</div>
      <div style="flex:1"><div class="mname">${dashEsc(m.holder_name)}</div>
        <div class="mmeta">${dashEsc(l.account_number)} · ${rupee(l.installment_amount)} ${esc(l.frequency)}</div></div>
      ${beh>0?`<span class="badge-np" style="background:#FBE6A2;color:#7a5c00">${beh} ${unit}</span>`:`<span class="badge-np" style="background:#d8f3e3;color:#1a7a4a">${t("onTrack")}</span>`}
      </div>
      <div class="mmeta" style="margin-top:6px">${t("expectedToDate")}: ${exp} · ${t("recorded")}: ${rec}</div>
    </div>`;
  }).join("");
  cont.innerHTML=html;
  cont.querySelectorAll("[data-acc]").forEach(c=>c.addEventListener("click",()=>openAccount(c.dataset.acc)));
}

/* ---------- ADMIN: COLLECTION ----------
   For one day: every daily/monthly RD and every group loan that falls due
   on that day by its own calendar (isDueOn), marked Given / Not given /
   Waiting from that day's collection entries. A cancelled entry counts as
   not entered. Loans and RDs that have not started yet, or whose loan term
   is over, are left out. Home shows how many of today's are still waiting. */
let collDay=null, collView="rd", collOnly=false; const collOpen=new Set();
async function loadCollectionDay(day){
  await loadHolidays();
  const parts=isoParts(day);
  const [{ data:prods, error }, { data:cols }, { data:grps }, { data:sl }] = await Promise.all([
    db.from("products").select("id,account_id,account_number,product_type,frequency,installment_amount,start_date,maturity_date,due_dow,due_day,group_id,status,term_weeks,accounts(holder_name,status)")
      .in("product_type",["RD","LOAN"]).in("status",["active","running"]),
    db.from("collections").select("id,product_id,amount,status,agent_id,reason,created_at,photo_path,method").eq("collected_on",day).neq("status","cancelled"),
    db.from("groups").select("id,name"),
    db.rpc("list_staff")]);
  if(error) reportError(error,{op:"collection_day"});
  const nm={}; (sl||[]).forEach(x=>nm[x.id]=x.name);
  const gname={}; (grps||[]).forEach(g=>gname[g.id]=g.name);
  const entry={}; (cols||[]).forEach(x=>{ const o=entry[x.product_id];
    if(!o || (o.status!=="paid" && x.status==="paid") || (o.status===x.status && x.created_at>o.created_at)) entry[x.product_id]=x; });
  const rows=[];
  (prods||[]).forEach(p=>{
    if(p.accounts && p.accounts.status && p.accounts.status!=="active") return;
    if(p.start_date && p.start_date>day) return;
    if(p.product_type==="RD" && p.maturity_date && p.maturity_date<day) return;   /* finished: due for payout, not collection */
    if(!isDueOn(p, parts)) return;
    const e=entry[p.id];
    rows.push({ p, e, name:(p.accounts&&p.accounts.holder_name)||"—",
      state: !e ? "wait" : e.status==="paid" ? "given" : "not",
      by: e ? (nm[e.agent_id]||"") : "", group: p.product_type==="LOAN" ? (p.group_id||"_personal") : null });
  });
  const paidAmt=(cols||[]).filter(x=>x.status==="paid").reduce((a,x)=>a+Number(x.amount||0),0);
  return { rows, gname, paidAmt, groupsAll:(grps||[]).length, staffList:(sl||[]).filter(x=>x.active!==false) };
}
async function paintCollAlert(){
  const box=$("adColl"); if(!box) return;
  const { rows } = await loadCollectionDay(todayStr());
  if(!$("adColl") || !rows.length) return;
  const wait=rows.filter(r=>r.state==="wait").length;
  const goColl=()=>document.querySelector('#nav button[data-tab="collection"]')?.click();
  box.innerHTML = wait
    ? `<button class="checkbtn coll" id="adCollBtn" style="margin:11px 0 0"><span class="checkbtn-n">${wait}</span>
        <span>${t("coOf")} ${rows.length} ${t("coAlert")}</span><span class="checkbtn-go">›</span></button>`
    : `<button class="checkbtn coll done" id="adCollBtn" style="margin:11px 0 0"><span class="checkbtn-n">✓</span>
        <span>${t("coAlertDone")}</span><span class="checkbtn-go">›</span></button>`;
  $("adCollBtn").addEventListener("click",()=>{ collDay=todayStr(); goColl(); });
}
function collRow(r){
  const p=r.p, sch=p.product_type==="RD" ? schemeLabel(p) : (p.frequency==="daily"?"D.Loan":"Loan");
  const tag = r.state==="given" ? `<span class="co-pill given">✓ ${t("coGiven")} ${rupee(r.e.amount)}</span>`
    : r.state==="not" ? `<span class="co-pill not">${t("coNotGiven")}</span>`
    : `<span class="co-pill wait">${t("coPending")}</span>`;
  const sub = r.state==="given" && r.by ? ` · ${t("coBy")} ${esc(r.by)}` : r.state==="not" && r.e.reason ? ` · ${esc(r.e.reason)}` : "";
  return `<div class="card co-row ${r.state}" data-acc="${p.account_id}" style="cursor:pointer"><div class="mrow">
    <div class="mav">${initials(r.name)}</div>
    <div style="flex:1;min-width:0"><div class="mname">${esc(r.name)}</div>
      <div class="mmeta">${esc(p.account_number||"")} · ${sch} ${rupee(p.installment_amount)}${sub}</div></div>
    ${tag}
    ${r.state==="given" && r.e.photo_path ? `<button class="co-act proof" data-proof="${esc(r.e.photo_path)}" aria-label="${t("coProof")}">${ICON.camera}</button>` : ""}
    ${r.state!=="given" ? `<button class="co-act tick" data-tick="${p.id}" aria-label="${t("coTick")}">✓</button>` : ""}
    </div></div>`;
}
/* The operator ticks a payment in: for any day on the Collection tab, and on
   behalf of whichever staff member took the money ("collected by"). The entry
   is an ordinary collection row, so the cashbook, passbook and counts all see
   it. Agents still collect with their own phone and photo proof as before. */
let tickCtx=null;
function openTick(r, day, staffList, onDone){
  tickCtx={ r, day, onDone, by: staff.id, method:"cash" };
  let d=$("tsheet");
  if(!d){ d=document.createElement("div"); d.id="tsheet"; d.className="sheet-back"; document.body.appendChild(d);
    d.addEventListener("click",e=>{ if(e.target.id==="tsheet") d.classList.remove("open"); }); }
  const people=[{id:staff.id,name:t("coMe")}].concat((staffList||[]).filter(x=>x.id!==staff.id));
  d.innerHTML=`<div class="sheet"><div class="sheet-grab"></div>
    <div class="sh-mem"><div class="mav">${initials(r.name)}</div><div><div class="sh-name">${esc(r.name)}</div>
      <div class="mmeta">${esc(r.p.account_number||"")} · ${dmy(day)}</div></div></div>
    <div class="amt-label">${t("amountLabel")}</div>
    <input class="amt-input" id="tk-amt" type="number" inputmode="numeric" value="${Number(r.p.installment_amount)||""}"/>
    <div class="amt-label" style="margin-top:12px">${t("coCollectedBy")}</div>
    <div class="branchbar" id="tk-by">${people.map(x=>`<button type="button" class="chip ${x.id===staff.id?"on":""}" data-id="${x.id}">${esc(x.name)}</button>`).join("")}</div>
    <div class="amt-label" style="margin-top:12px">${t("payMethod")}</div>
    <div class="branchbar" id="tk-m"><button type="button" class="chip on" data-m="cash">${t("mCash")}</button><button type="button" class="chip" data-m="phone">${t("mPhone")}</button></div>
    <div class="sh-actions"><button class="btn-ghost" id="tk-np">${t("coNotGiven")}</button><button class="btn-primary" id="tk-save">✓ ${t("coGiven")}</button></div></div>`;
  const pick=(box,key)=>$(box).addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
    tickCtx[key]=b.dataset.id||b.dataset.m; $(box).querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===b)); });
  pick("tk-by","by"); pick("tk-m","method");
  $("tk-save").addEventListener("click",()=>saveTick("paid"));
  $("tk-np").addEventListener("click",()=>saveTick("not_paid"));
  d.classList.add("open");
}
async function saveTick(status){
  const c=tickCtx; if(!c) return;
  const amt=status==="paid" ? Number($("tk-amt").value) : 0;
  if(status==="paid" && !(amt>0)){ toast(t("enterAmount"),true); return; }
  const usual=Number(c.r.p.installment_amount)||0;
  if(status==="paid" && usual>0 && amt>=usual*5 && !confirm(`${rupee(amt)} ${t("bigAmount")}`)) return;
  const b1=$("tk-save"), b2=$("tk-np"); b1.disabled=b2.disabled=true;
  /* an earlier "not given" for the same day is replaced by this answer */
  if(c.r.e && c.r.e.id && c.r.state==="not")
    await db.from("collections").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancelled_by:staff.id,cancel_reason:"replaced by operator"}).eq("id",c.r.e.id);
  const { error } = await db.from("collections").insert({ product_id:c.r.p.id, agent_id:c.by, amount:amt, collected_on:c.day,
    status, method: status==="paid" ? c.method : null, reason: status==="paid" ? null : "marked by operator", notes:"ticked by operator" });
  b1.disabled=b2.disabled=false;
  if(error){ reportError(error,{op:"operator_tick"}); toast(t(rpcErrKey(error))||error.message,true); return; }
  $("tsheet").classList.remove("open");
  toast(status==="paid" ? `${t("saved")} ${rupee(amt)}` : t("markedNotPaid"));
  c.onDone && c.onDone();
}
async function adminCollection(c){
  collDay = collDay || todayStr();
  const day=collDay, isToday=day===todayStr();
  c.innerHTML=`<div class="branchbar"><button class="chip" id="co-prev">‹</button>
      <button class="chip ${isToday?"on":""}" id="co-today">${t("today")}</button>
      <button class="chip" id="co-next" ${isToday?"disabled":""}>›</button></div>
    <div class="tile blue"><div class="tlabel">${t("collection")} · ${dmy(day)} · ${weekdayName(day)}</div>
      <div class="tval" id="coAmt">—</div><div class="tnote" id="coNote"></div><div class="tbar"><span id="coBar"></span></div></div>
    <div class="co-seg" id="co-seg"><button data-v="rd">${t("coRd")} <b id="coRdN"></b></button><button data-v="groups">${t("coGroups")} <b id="coGN"></b></button><i></i></div>
    <label class="co-only"><input type="checkbox" id="co-only" ${collOnly?"checked":""}/> ${t("coOnlyPending")}</label>
    <div id="coList"><div class="skel"><i></i><i></i><i></i></div></div>`;
  const shift=(n)=>{ collDay=addDaysIso(collDay,n); if(collDay>todayStr()) collDay=todayStr(); smoothSwap(()=>adminCollection(c), n<0); };
  $("co-prev").addEventListener("click",()=>shift(-1));
  $("co-next").addEventListener("click",()=>shift(1));
  $("co-today").addEventListener("click",()=>{ if(!isToday){ collDay=todayStr(); adminCollection(c); } });
  const seg=$("co-seg");
  const paintSeg=()=>{ seg.dataset.v=collView; seg.querySelectorAll("button").forEach(b=>b.classList.toggle("on",b.dataset.v===collView)); };
  paintSeg();
  const d=await loadCollectionDay(day);
  if(currentTab!=="collection" || collDay!==day || !$("coList")) return;
  const rows=d.rows, given=rows.filter(r=>r.state==="given").length;
  const expected=rows.reduce((a,r)=>a+Number(r.p.installment_amount||0),0);
  setNum("coAmt",rows.filter(r=>r.state==="given").reduce((a,r)=>a+Number(r.e.amount||0),0),true);
  $("coNote").textContent=`${given} / ${rows.length} ${t("coGiven").toLowerCase()} · ${rupee(expected)} ${t("coExpected")}`;
  $("coBar").style.width=(rows.length?Math.round(given/rows.length*100):0)+"%";
  const rd=rows.filter(r=>r.p.product_type==="RD"), ln=rows.filter(r=>r.p.product_type==="LOAN");
  const waitOf=(a)=>a.filter(r=>r.state!=="given").length;
  $("coRdN").textContent=rd.length?`${rd.length-waitOf(rd)}/${rd.length}`:"0";
  $("coGN").textContent=ln.length?`${ln.length-waitOf(ln)}/${ln.length}`:"0";
  const order={wait:0,not:1,given:2};
  const sortRows=(a)=>a.slice().sort((x,y)=>order[x.state]-order[y.state]||x.name.localeCompare(y.name));
  const list=$("coList");
  const paint=()=>{
    paintSeg();
    const keep=(r)=>!collOnly || r.state!=="given";
    if(!rows.length){ list.innerHTML=`<div class="empty">${ICON.collection}<div>${t("coNothing")}</div></div>`; return; }
    if(collView==="rd"){
      const a=sortRows(rd).filter(keep);
      list.innerHTML = a.length ? a.map(collRow).join("") : `<div class="empty">${ICON.collection}<div>${rd.length?t("coAllDone"):t("coNothing")}</div></div>`;
    } else {
      const byG={}; ln.forEach(r=>{ (byG[r.group]=byG[r.group]||[]).push(r); });
      const keys=Object.keys(byG).sort((x,y)=>(x==="_personal")-(y==="_personal")||String(d.gname[x]||"").localeCompare(String(d.gname[y]||""),undefined,{numeric:true}));
      const notDue=Math.max(0,d.groupsAll-keys.filter(k=>k!=="_personal").length);
      list.innerHTML = keys.map(k=>{
        const g=byG[k], gv=g.filter(r=>r.state==="given").length, w=g.length-gv;
        if(collOnly && !w) return "";
        const name = k==="_personal" ? t("coPersonal") : (d.gname[k]||"—");
        const amt=g.filter(r=>r.state==="given").reduce((a,r)=>a+Number(r.e.amount||0),0);
        const tot=g.reduce((a,r)=>a+Number(r.p.installment_amount||0),0);
        const open=collOpen.has(k);
        return `<div class="card co-group ${open?"open":""}" data-g="${k}">
          <div class="mrow co-ghead"><div class="mav">${esc(String(name).replace(/^(Krosuru\s*)?(Group\s*)?/i,"").slice(0,3)||"G")}</div>
            <div style="flex:1;min-width:0"><div class="mname">${esc(name)}</div>
              <div class="mmeta">${gv}/${g.length} ${t("coGiven").toLowerCase()} · ${rupee(amt)} / ${rupee(tot)}</div>
              <div class="bar"><span style="width:${Math.round(gv/g.length*100)}%"></span></div></div>
            ${w?`<span class="co-pill wait">${w}</span>`:`<span class="co-pill given">✓</span>`}
            <span class="co-chev">›</span></div>
          <div class="co-gbody">${open?sortRows(g).filter(keep).map(collRow).join(""):""}</div></div>`;
      }).join("") + (notDue?`<div class="mmeta" style="text-align:center;margin:10px 0">${notDue} ${t("coNotDue")}</div>`:"");
      if(!keys.length) list.innerHTML=`<div class="empty">${ICON.collection}<div>${t("coNothing")}</div></div>`;
      list.querySelectorAll(".co-ghead").forEach(h=>h.addEventListener("click",()=>{
        const k=h.parentElement.dataset.g; collOpen.has(k)?collOpen.delete(k):collOpen.add(k); paint(); }));
    }
    list.querySelectorAll(".co-row[data-acc]").forEach(x=>x.addEventListener("click",(e)=>{ if(e.target.closest(".co-act")) return; openAccount(x.dataset.acc); }));
    list.querySelectorAll("[data-tick]").forEach(b=>b.addEventListener("click",()=>{
      const r=rows.find(x=>x.p.id===b.dataset.tick); if(r) openTick(r, day, d.staffList, ()=>adminCollection(c)); }));
    list.querySelectorAll("[data-proof]").forEach(b=>b.addEventListener("click",async()=>{
      const u=await proofUrl(b.dataset.proof); if(u) openImg(u); else toast("—",true); }));
  };
  seg.addEventListener("click",(e)=>{ const b=e.target.closest("button"); if(!b||b.dataset.v===collView) return; collView=b.dataset.v; paint(); });
  $("co-only").addEventListener("change",(e)=>{ collOnly=e.target.checked; paint(); });
  paint();
}

/* ---------- ADMIN: CASHBOOK (v2 §8) ----------
   One page per day: each collector's day as a single roll-up row, the
   collector's individual transactions available underneath, and a day total.
   Columns follow the paper book: #, A/c, Name, Scheme, Credit. */
let cashbookDate=null;
function weekdayName(iso){ const [y,m,d]=iso.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).toLocaleDateString(lang==="te"?"te-IN":"en-IN",{weekday:"long",timeZone:"UTC"}); }
function addDaysIso(iso,n){ const [y,m,d]=iso.split("-").map(Number); return partsFromUTC(new Date(Date.UTC(y,m-1,d+n))).iso; }
function schemeLabel(pr){
  if(!pr) return "—";
  if(pr.product_type==="RD")   return pr.frequency==="monthly"?"M.R.D":pr.frequency==="daily"?"D.R.D":"R.D";
  if(pr.product_type==="LOAN") return pr.frequency==="daily"?"D.Loan":"weekly loan";
  if(pr.product_type==="FD")   return "FD";
  if(pr.product_type==="SB")   return "SB";
  return "—";
}
async function openCashbook(dateIso){
  cashbookDate=dateIso||todayStr();
  let el=$("cashbook");
  if(!el){ el=document.createElement("div"); el.id="cashbook"; el.className="detail"; document.body.appendChild(el); }
  el.innerHTML=`<div class="dhead"><button class="dback" id="cb-back" aria-label="${t("back")}">${ICON.back}</button>
    <div style="flex:1"><div class="dtitle">${t("cashbook")}</div><div class="dsub" id="cb-sub"></div></div></div>
    <div class="content" id="cb-content"><div class="skel"><i></i><i></i><i></i></div></div>`;
  el.classList.add("open");
  $("cb-back").addEventListener("click",()=>el.classList.remove("open"));
  renderCashbook();
}
async function renderCashbook(){
  const cont=$("cb-content");
  $("cb-sub").textContent=`${dmy(cashbookDate)} · ${weekdayName(cashbookDate)}`;
  const { data:sl } = await db.rpc("list_staff"); const nm={}; (sl||[]).forEach(s=>nm[s.id]=s.name);
  const { data } = await db.from("collections")
    .select("amount,method,agent_id,account_number,created_at,accounts(holder_name),products(product_type,frequency)")
    .eq("collected_on",cashbookDate).eq("status","paid").order("created_at");
  const rows=data||[];
  const nav=`<div class="branchbar"><button class="chip" id="cb-prev">‹</button><button class="chip" id="cb-today">${t("today")}</button><button class="chip" id="cb-next">›</button></div>`;
  const total=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const tile=`<div class="tile pink"><div class="tlabel">${t("dayTotal")} · ${t("credit")}</div><div class="tval">${rupee(total)}</div><div class="tnote">${rows.length} · ${t("debit")}: ${rupee(0)}</div></div>`;
  if(!rows.length){ cont.innerHTML=nav+tile+`<div class="empty">${t("noCashbook")}</div>`; wireCbNav(); return; }
  const byA={}; rows.forEach(r=>{ (byA[r.agent_id]=byA[r.agent_id]||[]).push(r); });
  let sno=0;
  const blocks=Object.entries(byA)
    .sort((a,b)=>b[1].reduce((s,r)=>s+ +r.amount,0)-a[1].reduce((s,r)=>s+ +r.amount,0))
    .map(([aid,list])=>{
      const sub=list.reduce((s,r)=>s+Number(r.amount||0),0);
      const det=list.map(r=>{ sno++; const m=r.accounts||{};
        return `<tr><td>${sno}</td><td>${dashEsc(r.account_number)}</td><td>${dashEsc(m.holder_name)}</td><td>${esc(schemeLabel(r.products))}</td><td class="pb-num">${rupee(r.amount)}</td></tr>`;
      }).join("");
      return `<div class="card cb-collector" style="cursor:pointer">
        <div class="mrow"><div class="mav">${initials(nm[aid]||"?")}</div>
          <div style="flex:1"><div class="mname">${esc(nm[aid]||t("unknownWord"))} · ${esc(t("collection"))}</div><div class="mmeta">${list.length} ${t("counterTxns").toLowerCase()}</div></div>
          <div class="amoney">${rupee(sub)}</div></div>
        <div class="cb-detail" hidden><div class="pb-tablewrap"><table class="pb-table">
          <thead><tr><th>#</th><th>${t("fAcNo")}</th><th>${t("fName")}</th><th>${t("scheme")}</th><th class="pb-num">${t("credit")}</th></tr></thead>
          <tbody>${det}</tbody></table></div></div>
      </div>`;
    }).join("");
  cont.innerHTML=nav+tile+blocks+`<div class="entry-hint">${t("debitNote")}</div>`;
  wireCbNav();
  cont.querySelectorAll(".cb-collector").forEach(c=>c.addEventListener("click",()=>{ const d=c.querySelector(".cb-detail"); if(d) d.hidden=!d.hidden; }));
}
function wireCbNav(){
  $("cb-prev") && $("cb-prev").addEventListener("click",()=>{ cashbookDate=addDaysIso(cashbookDate,-1); renderCashbook(); });
  $("cb-next") && $("cb-next").addEventListener("click",()=>{ cashbookDate=addDaysIso(cashbookDate,1); renderCashbook(); });
  $("cb-today") && $("cb-today").addEventListener("click",()=>{ cashbookDate=todayStr(); renderCashbook(); });
}

/* ---------- ATTENDANCE: daily check-in ----------
   One tap when the day starts, one when it ends. The server writes the time
   and decides which day it is (db/007_attendance.sql); the app only shows
   it. Nobody can type a time in or check in for somebody else.
   myAtt: undefined = not loaded yet, null = not checked in today. */
let myAtt, myAttDay = null;
async function loadMyAttendance(){
  const day = todayStr();
  const { data, error } = await db.from("attendance").select("day,check_in_at,check_out_at")
    .eq("agent_id", staff.id).eq("day", day).maybeSingle();
  if (error) { reportError(error, { op:"attendance_today" }); return; }   /* keep whatever is showing */
  myAtt = data || null; myAttDay = day;
  renderAttStrip();
}
function renderAttStrip(){
  const box = $("attstrip"); if (!box) return;
  if (myAtt === undefined) { box.innerHTML = ""; return; }
  if (!myAtt) {
    box.innerHTML = `<div class="att att-no">${ICON.clock}<span class="att-t">${t("attNotIn")}</span>
      <button class="att-btn" id="attIn">${t("checkIn")}</button></div>`;
    $("attIn").addEventListener("click", openCheckIn);
  } else if (!myAtt.check_out_at) {
    box.innerHTML = `<div class="att att-in">${ICON.tick}<span class="att-t">${t("attInAt")} ${istTime(myAtt.check_in_at)}</span>
      <button class="att-link" id="attOut">${t("checkOut")}</button></div>`;
    $("attOut").addEventListener("click", () => { if (confirm(t("attConfirmOut"))) attendanceTap("attendance_check_out"); });
  } else {
    box.innerHTML = `<div class="att att-done">${ICON.tick}<span class="att-t">${t("attInAt")} ${istTime(myAtt.check_in_at)} · ${t("attOutAt")} ${istTime(myAtt.check_out_at)}</span></div>`;
  }
}
async function attendanceTap(fn, args){
  const btn = $("attIn") || $("attOut"); if (btn) btn.disabled = true;
  const { data, error } = await db.rpc(fn, args || {});
  if (error) { if (btn) btn.disabled = false; toast(t(rpcErrKey(error, fn)), true); return false; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) { if (btn) btn.disabled = false; toast(t("connErr"), true); return false; }
  myAtt = { day: row.day, check_in_at: row.check_in_at, check_out_at: row.check_out_at }; myAttDay = row.day;
  renderAttStrip();
  toast(fn === "attendance_check_in" ? `${t("attInAt")} · ${istTime(myAtt.check_in_at)}`
                                     : `${t("attOutAt")} · ${istTime(myAtt.check_out_at)}`);
  if (staff.is_admin) paintAttCard();
  return true;
}

/* Check-in asks for a selfie and for the place. Neither is forced: a phone
   with no camera or no signal must still be able to check in, exactly as a
   payment saves without its photo. The operator sees what is missing
   (db/008_attendance_selfie_location_fix.sql). */
const SELFIE_EDGE = 640;
let ciPhoto = null, ciPlace = null, ciSeq = 0;
function openCheckIn(){
  let d = $("cisheet");
  if (!d) { d = document.createElement("div"); d.id = "cisheet"; d.className = "sheet-back"; document.body.appendChild(d);
    d.addEventListener("click", e => { if (e.target.id === "cisheet") d.classList.remove("open"); }); }
  ciPhoto = null; ciPlace = null; const seq = ++ciSeq;
  d.innerHTML = `<div class="sheet"><div class="sheet-grab"></div>
    <div class="sh-name">${t("checkIn")}</div>
    <div class="mmeta" style="margin-top:3px">${esc(todayLong())}</div>
    <label class="flabel">${t("attSelfie")}</label>
    <input id="ci-file" type="file" accept="image/*" capture="user" style="display:none"/>
    <div id="ci-photo"></div>
    <div class="ci-place wait" id="ci-place"></div>
    <div class="mmeta" style="margin-top:10px">${t("attOptionalNote")}</div>
    <div class="sh-actions"><button class="btn-ghost" id="ci-cancel">${t("cancel")}</button>
      <button class="btn-primary" id="ci-go">${t("checkIn")}</button></div>
  </div>`;
  d.classList.add("open");
  $("ci-cancel").addEventListener("click", () => d.classList.remove("open"));

  const paintPhoto = () => { const box = $("ci-photo"); if (!box) return;
    if (!ciPhoto) { box.innerHTML = `<div class="photo-btn">${ICON.camera}${t("takeSelfie")}</div>`; return; }
    box.innerHTML = `<div class="photo-prev"><img src="${URL.createObjectURL(ciPhoto)}" alt=""/>
      <button id="ci-rm" aria-label="remove">✕</button></div>`;
    $("ci-rm").addEventListener("click", e => { e.stopPropagation(); ciPhoto = null; $("ci-file").value = ""; paintPhoto(); }); };
  $("ci-photo").addEventListener("click", () => { if (!ciPhoto) $("ci-file").click(); });
  $("ci-file").addEventListener("change", async ev => { const f = ev.target.files[0]; if (!f) return;
    ciPhoto = await downscale(f, SELFIE_EDGE); paintPhoto(); });
  paintPhoto();

  const paintPlace = (state) => { const el = $("ci-place"); if (!el || seq !== ciSeq) return;
    el.className = "ci-place " + state;
    el.innerHTML = ICON.pin + `<span>${state === "ok" ? `${t("attPlaceOk")} · ±${Math.round(ciPlace.acc)} m`
                                     : state === "wait" ? t("attPlaceWait") : t("attPlaceNo")}</span>` +
      (state === "no" ? `<button class="linkbtn" id="ci-retry">${t("retry")}</button>` : "");
    if ($("ci-retry")) $("ci-retry").addEventListener("click", askPlace); };
  const askPlace = () => {
    if (!navigator.geolocation) return paintPlace("no");
    paintPlace("wait");
    navigator.geolocation.getCurrentPosition(
      p => { if (seq !== ciSeq) return;
             ciPlace = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }; paintPlace("ok"); },
      () => paintPlace("no"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  askPlace();

  $("ci-go").addEventListener("click", async () => {
    const btn = $("ci-go"); btn.disabled = true; btn.textContent = t("saving2");
    let path = null;
    if (ciPhoto) {
      const candidate = `${staff.id}/attendance/${todayStr()}-${Date.now()}.jpg`;
      const up = await db.storage.from(PROOFS).upload(candidate, ciPhoto, { contentType: "image/jpeg" });
      if (up.error) reportError(up.error, { op: "attendance_selfie" }); else path = candidate;
    }
    const ok = await attendanceTap("attendance_check_in", {
      p_lat: ciPlace ? ciPlace.lat : null, p_lng: ciPlace ? ciPlace.lng : null,
      p_accuracy: ciPlace ? ciPlace.acc : null, p_photo_path: path });
    if (ok) { d.classList.remove("open"); if (ciPhoto && !path) toast(t("attSelfieFailed"), true); }
    else if ($("ci-go")) { btn.disabled = false; btn.textContent = t("checkIn"); }
  });
}

/* Operator: who is in today, on the dashboard. */
async function paintAttCard(){
  if (!$("adAtt")) return;
  const [{ data:sl }, { data:rows }] = await Promise.all([
    db.rpc("list_staff"), db.from("attendance").select("agent_id").eq("day", todayStr())]);
  if (!$("adAtt")) return;
  const active = (sl || []).filter(s => s.active);
  const inToday = new Set((rows || []).map(r => r.agent_id));
  $("adAtt").textContent = `${active.filter(s => inToday.has(s.id)).length} / ${active.length}`;
}

/* Operator: the register. One day at a time - who came, when they came and
   left - with each person's days present in that month underneath. */
let attDate = null;
const hoursBetween = (a, b) => { const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`; };
async function openAttendance(dateIso){
  attDate = dateIso || todayStr();
  let el = $("attscreen");
  if (!el) { el = document.createElement("div"); el.id = "attscreen"; el.className = "detail"; document.body.appendChild(el); }
  el.innerHTML = `<div class="dhead"><button class="dback" id="at-back" aria-label="${t("back")}">${ICON.back}</button>
    <div style="flex:1"><div class="dtitle">${t("attendance")}</div><div class="dsub" id="at-sub"></div></div></div>
    <div class="content" id="at-content"><div class="skel"><i></i><i></i><i></i></div></div>`;
  el.classList.add("open"); el.scrollTop = 0;
  $("at-back").addEventListener("click", () => el.classList.remove("open"));
  renderAttendance();
}
async function renderAttendance(){
  const day = attDate, today = todayStr();
  const [y, m, d] = day.split("-").map(Number);
  $("at-sub").textContent = `${dmy(day)} · ${weekdayName(day)}`;
  const monthStart = `${day.slice(0, 8)}01`;
  const monthEnd = `${day.slice(0, 8)}${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  await loadHolidays();
  const [{ data:sl, error:e1 }, { data:rows, error:e2 }] = await Promise.all([
    db.rpc("list_staff"),
    db.from("attendance")
      .select("agent_id,day,check_in_at,check_out_at,in_lat,in_lng,in_accuracy_m,in_photo_path,by_operator,marked_by,mark_note")
      .gte("day", monthStart).lte("day", monthEnd)]);
  const cont = $("at-content");
  if (attDate !== day || !cont) return;                 /* another day was asked for meanwhile */
  if (e1 || e2) { reportError(e1 || e2, { op:"attendance" }); cont.innerHTML = `<div class="empty">${t("connErr")}</div>`; return; }
  const all = rows || [];
  const onDay = {}, daysIn = {}, nameOf = {};
  (sl || []).forEach(s => { nameOf[s.id] = s.name; });
  all.forEach(r => { daysIn[r.agent_id] = (daysIn[r.agent_id] || 0) + 1; if (r.day === day) onDay[r.agent_id] = r; });
  /* selfies are private files: one short-lived link each, for this day only */
  const selfie = {};
  await Promise.all(Object.values(onDay).filter(r => !isBlank(r.in_photo_path))
    .map(async r => { selfie[r.agent_id] = await proofUrl(r.in_photo_path); }));
  if (attDate !== day || !$("at-content")) return;
  /* everyone who has a login now, plus anyone since switched off who was in that day */
  const people = (sl || []).filter(s => s.active || onDay[s.id]);
  const present = people.filter(s => onDay[s.id]).length;
  const working = isWorkingDay(partsFromUTC(new Date(Date.UTC(y, m - 1, d))));
  const nav = `<div class="branchbar"><button class="chip" id="at-prev">‹</button>
    <button class="chip ${day === today ? "on" : ""}" id="at-today">${t("today")}</button>
    <button class="chip" id="at-next" ${day >= today ? "disabled" : ""}>›</button></div>`;
  const tile = `<div class="tile blue"><div class="tlabel">${t("attPresent")}${working ? "" : " · " + t("attHoliday")}</div>
    <div class="tval">${present} / ${people.length}</div><div class="tnote">${dmy(day)} · ${weekdayName(day)}</div></div>`;
  const list = people.map(s => {
    const r = onDay[s.id];
    const meta = r ? `${t("attIn")} ${istTime(r.check_in_at)}` +
                     (r.check_out_at ? ` · ${t("attOut")} ${istTime(r.check_out_at)} · ${hoursBetween(r.check_in_at, r.check_out_at)}` : "")
                   : (s.is_admin ? t("admin") : t("agent"));
    const badge = r ? `<span class="ebadge kept">${t("attPresent")}</span>`
                : !working ? `<span class="ebadge gone">${t("attHoliday")}</span>`
                : day < today ? `<span class="ebadge cancelled">${t("attAbsent")}</span>`
                : `<span class="ebadge wait">${t("attNotYet")}</span>`;
    /* Where and who: a map link and the selfie when the person gave them, a
       plain flag when they did not. A line the operator added has neither. */
    const face = selfie[s.id]
      ? `<img class="att-selfie" src="${esc(selfie[s.id])}" data-full="${esc(selfie[s.id])}" alt=""/>`
      : `<div class="mav">${initials(s.name)}</div>`;
    const hasPlace = r && r.in_lat != null && r.in_lng != null;
    const extra = !r ? "" : r.by_operator ? `<span class="ebadge gone">${t("attByOperator")}</span>`
      : (hasPlace ? `<a class="linkbtn" target="_blank" rel="noopener noreferrer"
             href="https://www.google.com/maps?q=${Number(r.in_lat)},${Number(r.in_lng)}">${t("attMap")} · ±${Math.round(Number(r.in_accuracy_m) || 0)} m</a>`
                  : `<span class="ebadge wait">${t("attNoPlace")}</span>`) +
        (selfie[s.id] ? "" : `<span class="ebadge wait">${t("attNoSelfie")}</span>`);
    const fixed = r && r.marked_by
      ? `<div class="enote">${t("attFixedBy")} ${esc(nameOf[r.marked_by] || "—")}${r.mark_note ? " · " + esc(r.mark_note) : ""}</div>` : "";
    return `<div class="card"><div class="mrow">${face}
      <div style="flex:1"><div class="mname">${esc(s.name || "")}</div><div class="mmeta">${esc(meta)}</div></div>${badge}</div>
      <div class="att-extra">${extra}<span class="sp"></span><button class="linkbtn" data-fix="${esc(s.id)}">${t("attFix")}</button></div>${fixed}</div>`;
  }).join("") || `<div class="empty">${DASH}</div>`;
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN",
    { month:"long", year:"numeric", timeZone:"UTC" });
  const month = people.length ? `<div class="sectlabel">${t("attThisMonth")} · ${esc(monthName)}</div><div class="card">` +
    people.map(s => `<div class="kv"><span class="k">${esc(s.name || "")}</span><span class="v">${daysIn[s.id] || 0} ${t(daysIn[s.id] === 1 ? "attDay" : "attDays")}</span></div>`).join("") +
    `</div>` : "";
  cont.innerHTML = nav + tile + list + month;
  $("at-prev").addEventListener("click", () => { attDate = addDaysIso(attDate, -1); renderAttendance(); });
  $("at-next").addEventListener("click", () => { if (attDate < todayStr()) { attDate = addDaysIso(attDate, 1); renderAttendance(); } });
  $("at-today").addEventListener("click", () => { attDate = todayStr(); renderAttendance(); });
  cont.querySelectorAll("img[data-full]").forEach(im => im.addEventListener("click", () => openImg(im.dataset.full)));
  cont.querySelectorAll("[data-fix]").forEach(b => b.addEventListener("click", () => {
    const s = people.find(p => p.id === b.dataset.fix); if (s) openAttFix(s, day, onDay[s.id] || null); }));
}

/* Operator: fix a day. Mark someone present who forgot to check in, or
   correct the times. A reason is always asked for and the line then says who
   fixed it. A line the operator added can be removed again; a line the staff
   member tapped themselves cannot. */
const hhmm = (ts) => new Date(ts).toLocaleTimeString("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function openAttFix(person, day, row){
  let d = $("axsheet");
  if (!d) { d = document.createElement("div"); d.id = "axsheet"; d.className = "sheet-back"; document.body.appendChild(d);
    d.addEventListener("click", e => { if (e.target.id === "axsheet") d.classList.remove("open"); }); }
  d.innerHTML = `<div class="sheet"><div class="sheet-grab"></div>
    <div class="sh-name">${t("attFixTitle")}</div>
    <div class="mmeta" style="margin-top:3px">${esc(person.name || "")} · ${dmy(day)}</div>
    <label class="flabel" for="ax-in">${t("attInTime")}</label>
    <input class="finput" id="ax-in" type="time" value="${row ? hhmm(row.check_in_at) : ""}"/>
    <label class="flabel" for="ax-out">${t("attOutTime")}</label>
    <input class="finput" id="ax-out" type="time" value="${row && row.check_out_at ? hhmm(row.check_out_at) : ""}"/>
    <label class="flabel" for="ax-note">${t("attReason")}</label>
    <input class="finput" id="ax-note" maxlength="300" autocomplete="off" placeholder="${t("attReasonHint")}"/>
    <div class="fmsg" id="ax-msg"></div>
    <div class="sh-actions"><button class="btn-ghost" id="ax-cancel">${t("cancel")}</button>
      <button class="btn-primary" id="ax-save">${t("saveBtn")}</button></div>
    ${row && row.by_operator ? `<div class="np-link"><button id="ax-remove">${t("attRemove")}</button></div>` : ""}
  </div>`;
  d.classList.add("open");
  const close = () => d.classList.remove("open");
  const fail = (k) => { const m = $("ax-msg"); m.className = "fmsg err"; m.textContent = t(k); };
  const after = (msg) => { close(); toast(t(msg)); renderAttendance(); paintAttCard();
    if (person.id === staff.id && day === todayStr()) loadMyAttendance(); };
  $("ax-cancel").addEventListener("click", close);
  $("ax-save").addEventListener("click", async () => {
    const tin = $("ax-in").value, tout = $("ax-out").value, note = $("ax-note").value.trim();
    if (!tin) return fail("attNeedTime");
    if (tout && tout <= tin) return fail("attOutBeforeIn");
    if (!note) return fail("attNeedReason");
    const btn = $("ax-save"); btn.disabled = true; btn.textContent = t("saving2");
    const { error } = await db.rpc("admin_mark_attendance",
      { p_agent_id: person.id, p_day: day, p_in: tin, p_out: tout || null, p_note: note });
    btn.disabled = false; btn.textContent = t("saveBtn");
    if (error) return fail(rpcErrKey(error, "admin_mark_attendance"));
    after("attSaved");
  });
  $("ax-remove")?.addEventListener("click", async () => {
    if (!confirm(t("attRemoveConfirm"))) return;
    const { error } = await db.rpc("admin_clear_attendance", { p_agent_id: person.id, p_day: day });
    if (error) return fail(rpcErrKey(error, "admin_clear_attendance"));
    after("attRemoved");
  });
}

/* ---------- ADMIN: STAFF ---------- */
/* The operator manages logins here: add a staff member, hand out a temporary
   password, or stop a login. Every one of these is a server function that
   checks the caller is an admin - the buttons are only a convenience. */
async function adminStaff(c){
  await loadBranches();
  /* who is in today, next to each name (the register itself is on the dashboard) */
  const [{ data, error }, { data:att }] = await Promise.all([
    db.rpc("list_staff"), db.from("attendance").select("agent_id,check_in_at").eq("day",todayStr())]);
  if(error) reportError(error,{op:"list_staff"});
  if(currentTab!=="staff") return;                  /* the tab changed while this was loading */
  const inAt={}; (att||[]).forEach(r=>{ inAt[r.agent_id]=r.check_in_at; });
  const active=(data||[]).filter(a=>a.active);
  const small="flex:1;padding:10px;font-size:13px";
  c.innerHTML=`<button class="actionbtn cta" id="st-add">+ ${t("addStaff")}</button>
    <div class="sectlabel">${t("yourStaff")} · ${active.length} · ${active.filter(a=>inAt[a.id]).length} ${t("inToday")}</div>`+ (data||[]).map(a=>{
    const br=a.branch_id?branchById(a.branch_id):null, me=a.id===staff.id;
    const badge=!a.active?`<span class="badge-np">${t("inactive")}</span>`
      :(a.must_change_password?`<span class="ebadge wait">${t("pwPending")}</span>`:"");
    const here=!a.active ? "" : inAt[a.id] ? `<span class="ebadge kept">${t("attIn")} ${istTime(inAt[a.id])}</span>`
                                           : `<span class="ebadge gone">${t("attNotYet")}</span>`;
    return `<div class="card"${a.active?"":' style="opacity:.72"'}><div class="mrow" data-agent="${a.id}" data-name="${esc(a.name)}" style="cursor:pointer">
      <div class="mav">${initials(a.name)}</div>
      <div style="flex:1;min-width:0"><div class="mname">${esc(a.name)}</div><div class="mmeta">${br?esc(br.name)+" · ":""}${a.assigned_area?esc(a.assigned_area)+" · ":""}${a.username?"@"+esc(a.username):""}</div></div>
      <div class="eright"><span class="pill-s ${a.is_admin?"fd":"sb"}">${a.is_admin?t("admin"):t("agent")}</span>${here}</div>
      </div>${badge?`<div style="margin-top:8px">${badge}</div>`:""}
      ${me?"":`<div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn-ghost" style="${small}" data-reset="${a.id}" data-name="${esc(a.name)}">${t("resetPw")}</button>
        <button class="btn-ghost" style="${small}" data-setactive="${a.id}" data-to="${a.active?"0":"1"}">${a.active?t("deactivate"):t("activate")}</button>
      </div>`}</div>`; }).join("");
  $("st-add").addEventListener("click",openAddStaff);
  c.querySelectorAll("[data-agent]").forEach(r=>r.addEventListener("click",()=>openAgent(r.dataset.agent,r.dataset.name)));
  c.querySelectorAll("[data-reset]").forEach(b=>b.addEventListener("click",()=>openResetPassword(b.dataset.reset,b.dataset.name)));
  c.querySelectorAll("[data-setactive]").forEach(b=>b.addEventListener("click",async()=>{
    const on=b.dataset.to==="1";
    if(!on && !confirm(t("confirmDeactivate"))) return;
    b.disabled=true;
    const { error } = await db.rpc("admin_set_staff_active",{p_staff_id:b.dataset.setactive,p_active:on});
    if(error){ b.disabled=false; toast(t(rpcErrKey(error,"admin_set_staff_active")),true); return; }
    toast(t(on?"staffOn":"staffOff")); adminStaff($("content"));
  }));
}
function staffOverlay(){
  let el=$("staffform");
  if(!el){ el=document.createElement("div"); el.id="staffform"; el.className="detail"; document.body.appendChild(el); }
  return el;
}
async function openAddStaff(){
  await loadBranches();
  const el=staffOverlay(); let isAdmin=false, branchId="";
  el.innerHTML=`<div class="dhead"><button class="dback" id="sf-back" aria-label="${t("back")}">${ICON.back}</button>
    <div><div class="dtitle">${t("addStaff")}</div></div></div>
    <div class="content">
      <label class="flabel">${t("staffName")}</label>
      <input class="finput" id="sf-name" autocomplete="off"/>
      <label class="flabel">${t("username")}</label>
      <input class="finput" id="sf-user" autocomplete="off" autocapitalize="none" spellcheck="false"/>
      <label class="flabel">${t("staffRole")}</label>
      <div class="branchbar" id="sf-role">
        <button type="button" class="chip on" data-r="0">${t("agent")}</button>
        <button type="button" class="chip" data-r="1">${t("admin")}</button>
      </div>
      <label class="flabel">${t("staffBranch")}</label>
      <div class="branchbar" id="sf-branch">
        <button type="button" class="chip on" data-b="">${t("allBranches")}</button>
        ${branches.map(b=>`<button type="button" class="chip" data-b="${b.id}">${esc(b.name)}</button>`).join("")}
      </div>
      <label class="flabel">${t("tempPw")}</label>
      <input class="finput" id="sf-pw" autocomplete="off" autocapitalize="none" spellcheck="false"/>
      <div class="mmeta" style="margin-top:8px">${t("pwRule")} ${t("tempPwHint")}</div>
      <div class="fmsg" id="sf-msg"></div>
      <button class="btn-primary" id="sf-save" style="width:100%;margin-top:14px">${t("saveBtn")}</button>
      <div style="height:24px"></div>
    </div>`;
  el.classList.add("open");
  const close=()=>{ el.classList.remove("open"); el.innerHTML=""; };
  $("sf-back").addEventListener("click",close);
  $("sf-role").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
    isAdmin=ch.dataset.r==="1"; $("sf-role").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); }));
  $("sf-branch").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
    branchId=ch.dataset.b; $("sf-branch").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); }));
  $("sf-save").addEventListener("click",async()=>{
    const msg=$("sf-msg"); msg.className="fmsg"; msg.textContent="";
    const fail=(k)=>{ msg.className="fmsg err"; msg.textContent=t(k); };
    const name=$("sf-name").value.trim(), user=$("sf-user").value.trim().toLowerCase(), pw=$("sf-pw").value;
    if(!name) return fail("nameNeeded");
    if(!/^[a-z0-9._-]{3,30}$/.test(user)) return fail("usernameRule");
    if(!pwOk(pw)) return fail("pwRule");
    const btn=$("sf-save"); btn.disabled=true; btn.textContent=t("saving2");
    const { error } = await db.rpc("admin_create_staff",{p_name:name,p_username:user,p_password:pw,p_is_admin:isAdmin,p_branch_id:branchId||null,p_area:null});
    btn.disabled=false; btn.textContent=t("saveBtn");
    if(error) return fail(rpcErrKey(error,"admin_create_staff"));
    close(); toast(t("staffAdded")); if(currentTab==="staff") adminStaff($("content"));
  });
}
function openResetPassword(id,name){
  const el=staffOverlay();
  el.innerHTML=`<div class="dhead"><button class="dback" id="sf-back" aria-label="${t("back")}">${ICON.back}</button>
    <div><div class="dtitle">${t("resetPw")}</div><div class="dsub">${esc(name||"")}</div></div></div>
    <div class="content">
      <label class="flabel">${t("tempPw")}</label>
      <input class="finput" id="sf-pw" autocomplete="off" autocapitalize="none" spellcheck="false"/>
      <div class="mmeta" style="margin-top:8px">${t("pwRule")} ${t("tempPwHint")}</div>
      <div class="fmsg" id="sf-msg"></div>
      <button class="btn-primary" id="sf-save" style="width:100%;margin-top:14px">${t("saveBtn")}</button>
    </div>`;
  el.classList.add("open");
  const close=()=>{ el.classList.remove("open"); el.innerHTML=""; };
  $("sf-back").addEventListener("click",close);
  $("sf-save").addEventListener("click",async()=>{
    const msg=$("sf-msg"); msg.className="fmsg"; msg.textContent="";
    const fail=(k)=>{ msg.className="fmsg err"; msg.textContent=t(k); };
    const pw=$("sf-pw").value;
    if(!pwOk(pw)) return fail("pwRule");
    const btn=$("sf-save"); btn.disabled=true; btn.textContent=t("saving2");
    const { error } = await db.rpc("admin_set_staff_password",{p_staff_id:id,p_password:pw});
    btn.disabled=false; btn.textContent=t("saveBtn");
    if(error) return fail(rpcErrKey(error,"admin_set_staff_password"));
    close(); toast(t("pwReset")); if(currentTab==="staff") adminStaff($("content"));
  });
}

/* ---------- branches ----------
   Branch is stored on the account, never inferred from the number at read
   time. The prefix is held here only so the entry screen can check what the
   typist keyed against the branch they picked. */
let branches = [];
let branchFilter = "all";
async function loadBranches(){
  if (branches.length) return branches;
  const { data, error } = await db.from("branches").select("id,name,account_prefix").order("name");
  if (error) reportError(error, { where:"loadBranches" });
  branches = data || [];
  return branches;
}
const branchById   = (id) => branches.find(b => b.id === id);
const branchByName = (n)  => branches.find(b => b.name === n);
const isPlaceholder = (a) => a.status === "placeholder";

/* ---------- ADMIN: MEMBERS (browse -> account detail) ---------- */
async function adminMembers(c){
  await loadBranches();
  c.innerHTML = `
    <div class="branchbar" id="branchbar"></div>
    <div id="checkbanner"></div>
    <input class="searchbar" id="msearch" placeholder="${t("searchMembers")}"/>
    <div class="listmeta" id="mcount"></div>
    <div id="mlist"></div>
    <button class="fab" id="newAccBtn" title="${t("newAccount")}">+</button>`;

  const { data } = await db.from("accounts")
    .select("id,account_number,holder_name,phone,status,branch_id,verified,needs_check").order("account_number");
  allAccounts = data || [];

  /* Transcribed rows stay suspect until someone has held them against the
     book, so the outstanding count is impossible to miss while it is > 0.
     Only branches that actually came from a transcription are counted: every
     row defaults to unverified, and Piduguralla's 521 predate this workflow —
     surfacing them here would bury the 30 that genuinely need a look. */
  const unchecked = {}, transcribed = {};
  allAccounts.forEach(a => {
    if (!a.verified) unchecked[a.branch_id] = (unchecked[a.branch_id]||0) + 1;
    if (a.needs_check) transcribed[a.branch_id] = true;
  });
  const pending = branches
    .filter(b => transcribed[b.id] && unchecked[b.id] && (branchFilter === "all" || branchFilter === b.id));
  $("checkbanner").innerHTML = pending.map(b => `
    <button class="checkbtn" data-vb="${b.id}">
      <span class="checkbtn-n">${unchecked[b.id]}</span>
      <span>${esc(b.name)} · ${t("needsChecking")}</span>
      <span class="checkbtn-go">›</span>
    </button>`).join("");
  $("checkbanner").querySelectorAll("[data-vb]").forEach(el =>
    el.addEventListener("click", () => openVerifyList(el.dataset.vb)));

  $("checkbanner").insertAdjacentHTML("beforeend",
    `<button class="actionbtn" id="bulkPhotoBtn">${t("bulkPhotos")}</button>`);
  $("bulkPhotoBtn").addEventListener("click", () =>
    openBulkPhotos(branchFilter === "all" ? null : branchFilter));

  /* Reserved numbers are real rows but not members. They are never counted. */
  const counts = {};
  allAccounts.forEach(a => {
    if (isPlaceholder(a)) return;
    counts[a.branch_id] = (counts[a.branch_id] || 0) + 1;
  });
  const totalMembers = allAccounts.filter(a => !isPlaceholder(a)).length;

  $("branchbar").innerHTML =
    `<button class="chip ${branchFilter==="all"?"on":""}" data-b="all">${t("allBranches")} · ${totalMembers}</button>` +
    branches.map(b => `<button class="chip ${branchFilter===b.id?"on":""}" data-b="${b.id}">${esc(b.name)} · ${counts[b.id]||0}</button>`).join("");
  $("branchbar").querySelectorAll(".chip").forEach(el =>
    el.addEventListener("click", () => { branchFilter = el.dataset.b; adminMembers(c); }));

  const render = (f) => {
    const q = (f || "").toLowerCase();
    const rows = allAccounts.filter(a =>
      (branchFilter === "all" || a.branch_id === branchFilter) &&
      (!q || (a.holder_name||"").toLowerCase().includes(q)
          || (a.account_number||"").toLowerCase().includes(q)
          || (a.phone||"").includes(q)));
    const shown = rows.filter(a => !isPlaceholder(a));
    const held  = rows.filter(isPlaceholder);
    $("mcount").textContent = `${shown.length} ${t("membersCount")}` +
      (held.length ? ` · ${held.length} ${t("reserved").toLowerCase()}` : "");

    const memberCard = (m) => `<div class="card" data-acc="${m.id}" style="cursor:pointer"><div class="mrow">
      <div class="mav">${initials(m.holder_name)}</div>
      <div style="flex:1"><div class="mname">${dashEsc(m.holder_name)}</div>
        <div class="mmeta">${dashEsc(m.account_number)} · ${dashEsc(m.phone)}</div></div>
      </div></div>`;
    const heldCard = (m) => `<div class="card held" data-acc="${m.id}" style="cursor:pointer"><div class="mrow">
      <div class="mav held">#</div>
      <div style="flex:1"><div class="mname">${dashEsc(m.account_number)}</div>
        <div class="mmeta">${t("reserved")}</div></div>
      <span class="badge-np">${t("reserved")}</span>
      </div></div>`;

    $("mlist").innerHTML =
      (shown.length ? shown.slice(0,150).map(memberCard).join("") : `<div class="empty">${DASH}</div>`) +
      (held.length ? `<div class="sectlabel">${t("reservedNumbers")}</div>` + held.map(heldCard).join("") : "");

    $("mlist").querySelectorAll("[data-acc]").forEach(el => {
      const row = allAccounts.find(a => a.id === el.dataset.acc);
      el.addEventListener("click", () =>
        isPlaceholder(row) ? openAccountEntry(row) : openAccount(el.dataset.acc));
    });
  };
  render("");
  $("msearch").addEventListener("input", e => render(e.target.value));
  $("newAccBtn").addEventListener("click", () => openAccountEntry(null));
}

/* ---------- PASSBOOK ----------
   The member's own record, laid out the way the paper passbook is: society
   head, who they are, what they hold, then a ruled ledger of what has been
   collected. Prints on one sheet.

   The last column is deliberately "Total paid", not "Balance". A balance
   means different things to an RD and to a loan, and computing either needs
   the product's terms - which have not been decided. A running total of what
   was actually collected is a fact; a balance would be a guess. */
const SOCIETY_REGD = "AMC/PLD/DCO/2023/37";

async function openPassbook(accountId){
  await loadBranches();
  const { data: acc, error } = await db.from("accounts").select("*").eq("id", accountId).single();
  if (error || !acc) { reportError(error, { where:"openPassbook" }); return; }

  const { data: prods } = await db.from("products").select("*").eq("account_id", accountId);
  const { data: hist }  = await db.from("collections")
    .select("amount,status,reason,collected_on,created_at,product_id")
    .eq("account_id", accountId).neq("status", "cancelled")   /* a cancelled entry is not in the member's book */
    .order("collected_on", { ascending: true });

  const br    = branchById(acc.branch_id);
  const photo = await memberPhotoUrl(acc.photo_path);
  const prodById = {}; (prods || []).forEach(p => { prodById[p.id] = p; });

  let el = $("passbook");
  if (!el) {
    el = document.createElement("div");
    el.id = "passbook"; el.className = "detail";
    document.body.appendChild(el);
  }

  const row = (k, v) => `<div class="pb-row"><span class="pb-k">${k}</span><span class="pb-v">${dashEsc(v)}</span></div>`;

  let running = 0;
  const ledger = (hist || []).map(r => {
    const paid = r.status === "paid";
    if (paid) running += Number(r.amount) || 0;
    const p = prodById[r.product_id];
    const what = !p ? t("collection")
               : p.product_type === "LOAN" ? t("loanRepayment")
               : p.product_type === "RD"   ? t("rdDeposit")
               : t("collection");
    return `<tr class="${paid ? "" : "pb-unpaid"}">
      <td class="pb-date">${esc(dmyOr(r.collected_on))}</td>
      <td>${paid ? esc(what) : `${t("notPaidEntry")}${r.reason ? " · " + esc(r.reason) : ""}`}</td>
      <td class="pb-num">${paid ? rupee(r.amount) : DASH}</td>
      <td class="pb-num">${paid ? rupee(running) : DASH}</td>
    </tr>`;
  }).join("");

  const paidCount = (hist || []).filter(r => r.status === "paid").length;

  el.innerHTML = `
    <div class="dhead pb-chrome">
      <button class="dback" id="pb-back" aria-label="${t("back")}">${ICON.back}</button>
      <div style="flex:1"><div class="dtitle">${t("passbook")}</div>
        <div class="dsub">${dashEsc(acc.account_number)}</div></div>
      <button class="tb-btn" id="pb-print" title="${t("printBook")}" aria-label="${t("printBook")}">${ICON.print}</button>
    </div>
    <div class="content pb-scroll">
      <div class="pbook" id="pbook">
        <img class="pb-water" src="${esc(LOGO_URI)}" alt=""/>

        <div class="pb-head">
          <img class="pb-logo" src="${esc(LOGO_URI)}" alt=""/>
          <div class="pb-head-txt">
            <div class="pb-society">${t("societyName")}</div>
            <div class="pb-society-sub">${t("societyLong")}</div>
            <div class="pb-regd">${t("regdNo")}: ${SOCIETY_REGD}${br ? " &nbsp;·&nbsp; " + esc(br.name) : ""}</div>
          </div>
        </div>

        <div class="pb-member">
          ${photo ? `<img class="pb-photo" src="${esc(photo)}" alt=""/>`
                  : `<div class="pb-photo pb-photo-ph">${esc(initials(acc.holder_name))}</div>`}
          <div class="pb-ident">
            <div class="pb-name">${dashEsc(acc.holder_name)}</div>
            <div class="pb-acno">${dashEsc(acc.account_number)}</div>
            <div class="pb-status">
              <span class="pb-pill ${acc.status === "active" ? "on" : ""}">${esc(statusWord(acc.status))}</span>
              ${acc.verified ? `<span class="pb-pill ok">${t("verifiedLabel")}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="pb-sect">${t("memberDetails")}</div>
        <div class="pb-grid">
          ${row(t("fOpDate"),  dmyOr(acc.op_date))}
          ${row(t("fDob"),     dmyOr(acc.date_of_birth))}
          ${row(t("fPhone"),   acc.phone)}
          ${acc.phone_alt ? row(t("fPhone") + " 2", acc.phone_alt) : ""}
          ${row(t("fAddress"), acc.address_line)}
          ${row(t("fVillage"), acc.village)}
        </div>

        <div class="pb-sect">${t("nomineeDetails")}</div>
        <div class="pb-grid">
          ${row(t("fNominee"),   acc.nominee_name)}
          ${row(t("fRelation"),  acc.nominee_relation)}
          ${row(t("fNomineePh"), acc.nominee_phone)}
          ${row(`${t("fAge")} (${t("fAgeHint")})`, acc.nominee_age)}
        </div>

        <div class="pb-sect">${t("fScheme")}</div>
        ${isBlank(acc.scheme_raw)
          ? `<div class="pb-grid">${row(t("fScheme"), null)}</div>`
          : `<div class="pb-scheme">${dashEsc(acc.scheme_raw)}</div>`}
        ${(prods || []).length ? `<div class="pb-sect">${t("holdings")}</div>
        <div class="pb-tablewrap"><table class="pb-table pb-hold"><tbody>${prods.map(p => `<tr>
            <td><span class="pill-s ${PKIND(p)}">${esc(typeWord(p.product_type))}</span></td>
            <td>${p.installment_amount ? rupee(p.installment_amount) + (p.frequency ? " / " + esc(freqWord(p.frequency)) : "")
                 : p.principal ? rupee(p.principal) : DASH}</td>
            <td class="pb-date">${esc(dmyOr(p.start_date))}</td>
            <td class="pb-num">${esc(statusWord(p.status))}</td></tr>`).join("")}</tbody></table></div>` : ""}

        <div class="pb-sect">${t("transactions")}</div>
        ${ledger ? `<div class="pb-tablewrap"><table class="pb-table">
          <thead><tr>
            <th>${t("colDate")}</th><th>${t("colParticulars")}</th>
            <th class="pb-num">${t("colAmount")}</th><th class="pb-num">${t("colRunning")}</th>
          </tr></thead>
          <tbody>${ledger}</tbody>
          <tfoot><tr>
            <td colspan="2">${t("totalPaid")} · ${paidCount} ${t("entries")}</td>
            <td class="pb-num"></td><td class="pb-num">${rupee(running)}</td>
          </tr></tfoot>
        </table></div>
        <div class="pb-note">${t("balanceNote")}</div>`
        : `<div class="pb-empty">${t("noTransactions")}</div>`}

        <div class="pb-signs">
          <div><div class="pb-signline"></div>${t("memberSign")}</div>
          <div><div class="pb-signline"></div>${t("issuedBy")}</div>
        </div>
        <div class="pb-foot">${t("societyName")} · ${t("regdNo")}: ${SOCIETY_REGD} · ${t("printedOn")} ${dmy(todayStr())}</div>
      </div>
      <div style="height:28px"></div>
    </div>`;

  el.classList.add("open");
  $("pb-back").addEventListener("click", () => el.classList.remove("open"));
  $("pb-print").addEventListener("click", () => window.print());
}

/* ---------- BULK PHOTO IMPORT ----------
   Takes a folder of images named by account number. The filename is the whole
   matching rule, which is why the object path is the account number too.
   Reports both directions of mismatch: files that match no account, and
   accounts still without a photo - the second is the one that quietly rots
   if nobody prints it. */
async function openBulkPhotos(branchId){
  await loadBranches();
  let el = $("bulk");
  if (!el) {
    el = document.createElement("div");
    el.id = "bulk"; el.className = "detail";
    document.body.appendChild(el);
  }
  const br = branchById(branchId);
  el.innerHTML = `
    <div class="dhead">
      <button class="dback" id="b-back" aria-label="${t("back")}">${ICON.back}</button>
      <div><div class="dtitle">${t("bulkPhotos")}</div>
           <div class="dsub">${br ? esc(br.name) : t("allBranches")}</div></div>
    </div>
    <div class="content">
      <div class="entry-hint">${t("bulkHint")}</div>
      <input id="b-files" type="file" accept="image/jpeg,image/png" multiple webkitdirectory style="display:none"/>
      <input id="b-files2" type="file" accept="image/jpeg,image/png" multiple style="display:none"/>
      <button class="btn-primary" id="b-pick" style="width:100%">${t("bulkPick")}</button>
      <div style="height:8px"></div>
      <button class="btn-ghost" id="b-pick2" style="width:100%">${t("fPhoto")}…</button>
      <div id="b-progress" class="fmsg"></div>
      <div id="b-report"></div>
      <div style="height:24px"></div>
    </div>`;
  el.classList.add("open");
  $("b-back").addEventListener("click", () => {
    el.classList.remove("open");
    if (currentTab === "members") adminMembers($("content"));
  });
  $("b-pick").addEventListener("click", () => $("b-files").click());
  $("b-pick2").addEventListener("click", () => $("b-files2").click());
  const run = (ev) => runBulkPhotos([...ev.target.files], branchId);
  $("b-files").addEventListener("change", run);
  $("b-files2").addEventListener("change", run);
}

async function runBulkPhotos(files, branchId){
  const prog = $("b-progress"), report = $("b-report");
  report.innerHTML = "";
  const images = files.filter(f => /^image\/(jpeg|png)$/.test(f.type) || /\.(jpe?g|png)$/i.test(f.name));
  if (!images.length) { prog.className = "fmsg err"; prog.textContent = t("bulkNone"); return; }

  let q = db.from("accounts").select("id,account_number,holder_name,status,photo_path");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data: accounts, error } = await q;
  if (error) { reportError(error, { where:"bulkPhotos" });
    prog.className = "fmsg err"; prog.textContent = error.message; return; }

  const byNumber = new Map((accounts || []).map(a => [a.account_number.toUpperCase(), a]));
  const unmatched = [], failed = [];
  let uploaded = 0;

  prog.className = "fmsg";
  for (let i = 0; i < images.length; i++) {
    const f = images[i];
    prog.textContent = `${t("bulkRunning")} ${i + 1} / ${images.length}`;
    /* strip any folder prefix and the extension; the rest must be an account number */
    const base = f.name.split(/[\\/]/).pop().replace(/\.[^.]+$/, "").trim().toUpperCase();
    const acc = byNumber.get(base);
    if (!acc) { unmatched.push(f.name); continue; }
    try {
      const blob = await downscale(f, MEMBER_PHOTO_EDGE);
      const path = await uploadMemberPhoto(acc.account_number, blob);
      const upd = await db.from("accounts").update({ photo_path: path }).eq("id", acc.id);
      if (upd.error) throw upd.error;
      acc.photo_path = path;
      uploaded++;
    } catch (e) {
      reportError(e, { where:"bulkPhotoUpload", file:f.name });
      failed.push(`${f.name} — ${e.message || e}`);
    }
  }

  /* Reserved rows are expected to have no photo and are listed apart, so the
     "still missing" list stays a list of real gaps. */
  const missing  = (accounts || []).filter(a => a.status !== "placeholder" && isBlank(a.photo_path));
  const reserved = (accounts || []).filter(a => a.status === "placeholder");

  prog.className = "fmsg";
  prog.textContent = `${t("bulkDone")} · ${uploaded} ${t("bulkUploaded")}`;
  const block = (title, items, cls) => !items.length ? "" : `
    <div class="sectlabel">${title} · ${items.length}</div>
    <div class="card"><div class="bulklist ${cls || ""}">${items.map(x => `<div>${esc(x)}</div>`).join("")}</div></div>`;

  report.innerHTML =
    block(t("bulkUnmatched"), unmatched, "warn") +
    block(t("bulkFailed"), failed, "warn") +
    block(t("bulkMissing"), missing.map(a => `${a.account_number} · ${dash(a.holder_name)}`)) +
    block(t("reservedNoPhoto"), reserved.map(a => a.account_number), "muted");
  toast(`${t("bulkDone")} · ${uploaded} ${t("bulkUploaded")}`);
}

/* ---------- CHECKING TRANSCRIBED ROWS ----------
   Rows loaded from a CSV transcribed off photographs are unverified until a
   human has held them against the book. This screen puts the transcriber's
   note and the values it doubts side by side, so a misread photograph gets
   caught here rather than becoming permanent record. */
let verifyOnlyUnchecked = true;

async function openVerifyList(branchId){
  await loadBranches();
  let el = $("verify");
  if (!el) {
    el = document.createElement("div");
    el.id = "verify"; el.className = "detail";
    document.body.appendChild(el);
  }
  const br = branchById(branchId);
  el.innerHTML = `
    <div class="dhead">
      <button class="dback" id="v-back" aria-label="${t("back")}">${ICON.back}</button>
      <div><div class="dtitle">${t("checkTitle")}</div>
           <div class="dsub" id="v-sub">${br ? esc(br.name) : ""}</div></div>
    </div>
    <div class="content">
      <div class="branchbar">
        <button class="chip ${verifyOnlyUnchecked?"on":""}" id="v-unchecked">${t("onlyUnchecked")}</button>
        <button class="chip ${verifyOnlyUnchecked?"":"on"}" id="v-all">${t("showAll")}</button>
      </div>
      <div id="v-list"><div class="skel"><i></i><i></i><i></i></div></div>
      <div style="height:24px"></div>
    </div>`;
  el.classList.add("open");
  $("v-back").addEventListener("click", () => {
    el.classList.remove("open");
    if (currentTab === "members") adminMembers($("content"));
  });
  $("v-unchecked").addEventListener("click", () => { verifyOnlyUnchecked = true;  openVerifyList(branchId); });
  $("v-all").addEventListener("click",       () => { verifyOnlyUnchecked = false; openVerifyList(branchId); });
  await renderVerifyList(branchId);
}

async function renderVerifyList(branchId){
  const { data, error } = await db.from("accounts")
    .select("id,account_number,holder_name,op_date,date_of_birth,phone,phone_alt,scheme_raw,nominee_name,nominee_relation,nominee_phone,nominee_age,address_line,village,status,verified,needs_check")
    .eq("branch_id", branchId).order("account_number");
  if (error) { reportError(error, { where:"renderVerifyList" });
    $("v-list").innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }

  const all = data || [];
  const done = all.filter(a => a.verified).length;
  $("v-sub").textContent = `${done} / ${all.length} ${t("checkedOf")}`;

  const rows = verifyOnlyUnchecked ? all.filter(a => !a.verified) : all;
  /* Order by how much a human glance is worth: rows carrying real data and a
     transcriber's doubt first, then the rest of the data, and reserved blanks
     last. A reserved row also carries a note ("blank in register"), but there
     is nothing on the page to misread, so it must not crowd out the rows that
     can actually be wrong. */
  const rank = (a) => a.status === "placeholder" ? 2 : (a.needs_check ? 0 : 1);
  rows.sort((a,b) => rank(a) - rank(b) || a.account_number.localeCompare(b.account_number));

  if (!rows.length) { $("v-list").innerHTML = `<div class="empty">${t("allChecked")}</div>`; return; }

  const f = (label, v) => `<div class="vf"><span class="vk">${label}</span><span class="vv">${dashEsc(v)}</span></div>`;
  $("v-list").innerHTML = rows.map(a => `
    <div class="card vcard ${a.verified?"done":""}" data-id="${a.id}">
      <div class="mrow">
        <div style="flex:1">
          <div class="mname">${dashEsc(a.holder_name)}</div>
          <div class="mmeta">${dashEsc(a.account_number)}${a.status==="placeholder"?` · ${t("reserved")}`:""}</div>
        </div>
        <button class="tick ${a.verified?"on":""}" data-tick="${a.id}"
                aria-label="${a.verified?t("undoVerify"):t("markVerified")}">✓</button>
      </div>
      ${a.needs_check ? `<div class="vnote"><span class="vnote-k">${t("transcriberNote")}</span>${esc(a.needs_check)}</div>` : ""}
      ${a.status==="placeholder" ? "" : `<div class="vgrid">
        ${f(t("fOpDate"), a.op_date)}
        ${f(t("fDob"), a.date_of_birth)}
        ${f(t("fPhone"), a.phone)}
        ${a.phone_alt ? f(t("fPhone")+" 2", a.phone_alt) : ""}
        ${f(t("fScheme"), a.scheme_raw)}
        ${f(t("fNominee"), a.nominee_name)}
        ${f(t("fRelation"), a.nominee_relation)}
        ${f(`${t("fAge")} (${t("fAgeHint")})`, a.nominee_age)}
        ${f(t("fAddress"), a.address_line)}
        ${f(t("fVillage"), a.village)}
      </div>`}
    </div>`).join("");

  $("v-list").querySelectorAll("[data-tick]").forEach(btn =>
    btn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const id = btn.dataset.tick;
      const row = rows.find(r => r.id === id);
      const next = !row.verified;
      btn.disabled = true;
      const patch = next
        ? { verified:true,  verified_at:new Date().toISOString(), verified_by: staff.id }
        : { verified:false, verified_at:null, verified_by:null };
      const res = await db.from("accounts").update(patch).eq("id", id);
      btn.disabled = false;
      if (res.error) { reportError(res.error, { where:"markVerified", id });
        toast(res.error.message, true); return; }
      toast(next ? `${t("verifiedLabel")} · ${row.account_number}` : `${t("undoVerify")} · ${row.account_number}`);
      renderVerifyList(branchId);
    }));

  $("v-list").querySelectorAll(".vcard").forEach(card =>
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-tick]")) return;
      openAccount(card.dataset.id);
    }));
}

/* ---------- ACCOUNT ENTRY ----------
   Field order deliberately mirrors the paper register line for line, so the
   typist reads across the book and down the screen without hunting. Only two
   things can stop a save: an account number that contradicts the chosen
   branch, and one that already exists. Everything else accepts whatever the
   register says, including nothing at all. */
const ENTRY_FIELDS = [
  ["holder_name",     "fName",      "text"],
  ["account_number",  "fAcNo",      "acno"],
  ["op_date",         "fOpDate",    "date"],
  ["date_of_birth",   "fDob",       "date"],
  ["phone",           "fPhone",     "tel"],
  ["scheme_raw",      "fScheme",    "text"],
  ["nominee_name",    "fNominee",   "text"],
  ["nominee_relation","fRelation",  "text"],
  ["nominee_phone",   "fNomineePh", "tel"],
  ["nominee_age",     "fAge",       "age"],
  ["address_line",    "fAddress",   "text"],
  ["village",         "fVillage",   "text"],
];

/* The same twelve fields, in the same order, shown as three cards so a long
   form reads as member, nominee, address. `field` draws one field. */
const ENTRY_GROUPS = [["memberDetails", 0, 6], ["nomineeDetails", 6, 10], ["fAddress", 10, 12]];
function entryGroups(field){
  return ENTRY_GROUPS.map(([title, a, b]) =>
    `<div class="sectlabel">${t(title)}</div><div class="card fcard">${ENTRY_FIELDS.slice(a, b).map(field).join("")}</div>`).join("");
}

/* The register writes dates as 15-11-2025 or 15/11/2025. Typing that is far
   faster than a date picker on a phone, so accept it as text and show back
   what it was understood as. Unparseable is not an error — it stores null and
   says so, rather than guessing. */
function parseRegisterDate(raw){
  const s = (raw || "").trim();
  if (s === "" || s === DASH) return null;
  /* A day the calendar does not have (31 February) is not understood either. */
  const real = (y, mo, d) => {
    if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
    return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  };
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return real(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    return real(y, +m[2], +m[1]);
  }
  return null;
}

let entryPhotoBlob = null;
let entryRow = null;

async function openAccountEntry(existing){
  await loadBranches();
  entryRow = existing || null;
  entryPhotoBlob = null;

  let branchId = existing ? existing.branch_id
               : (branchFilter !== "all" ? branchFilter : (branchByName("Krosuru")||branches[0]||{}).id);

  /* A member who is already saved keeps the account number and the branch:
     products, the photo and the passbook all hang off that number. Only the
     details can be corrected. A reserved number is still free to be filled. */
  const editingReal = !!existing && !isPlaceholder(existing);

  let el = $("entry");
  if (!el) { el = document.createElement("div"); el.id = "entry"; el.className = "detail"; }
  document.body.appendChild(el);            /* last in the page = on top of the member page */

  const val = (k) => existing ? (existing[k] == null ? "" : String(existing[k])) : "";
  /* dates come back from the database as 2026-06-03; show them the way they are typed */
  const shown = (k, kind) => kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(val(k)) ? dmy(val(k)) : val(k);

  el.innerHTML = `
    <div class="dhead">
      <button class="dback" id="e-back" aria-label="${t("back")}">${ICON.back}</button>
      <div><div class="dtitle">${existing ? t("editAccount") : t("newAccount")}</div>
           <div class="dsub">${existing ? dashEsc(existing.account_number) : t("fAcNo")}</div></div>
    </div>
    <div class="content">
      <div class="entry-hint">${t("dashHint")}</div>

      <label class="flabel">${t("branch")}</label>
      <div class="branchbar" id="e-branch">
        ${branches.map(b => `<button type="button" class="chip ${b.id===branchId?"on":""}" data-b="${b.id}"
            ${editingReal && b.id!==branchId ? "disabled" : ""}>${esc(b.name)}</button>`).join("")}
      </div>

      ${entryGroups(([key,label,kind]) => `
        <label class="flabel" for="f-${key}">${t(label)}${kind==="age"?` <span class="fhint">(${t("fAgeHint")})</span>`:""}</label>
        <input class="finput" id="f-${key}" value="${esc(shown(key,kind))}"
               ${kind==="acno" && editingReal ? 'readonly' : ''}
               ${kind==="tel"||kind==="age" ? 'inputmode="numeric"' : ''}
               ${kind==="date" ? 'inputmode="numeric" placeholder="dd/mm/yyyy"' : ''}
               ${kind==="acno" ? 'autocapitalize="characters" spellcheck="false"' : ''}
               autocomplete="off"/>
        ${kind==="date" ? `<div class="fnote" id="n-${key}"></div>` : ""}
      `)}

      <div class="sectlabel">${t("fPhoto")}</div>
      <div class="card fcard">
        <input id="e-file" type="file" accept="image/*" style="display:none"/>
        <div id="e-photo"></div>
      </div>

      <div class="fmsg" id="e-msg"></div>
      <button class="btn-primary" id="e-save" style="width:100%;margin-top:14px">${t("saveAccount")}</button>
      <div style="height:24px"></div>
    </div>`;

  el.classList.add("open"); el.scrollTop = 0;

  $("e-back").addEventListener("click", () => el.classList.remove("open"));
  $("e-branch").querySelectorAll(".chip").forEach(ch =>
    ch.addEventListener("click", () => {
      if (editingReal) return;
      branchId = ch.dataset.b;
      $("e-branch").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === ch));
    }));

  /* echo back how each date was understood */
  ENTRY_FIELDS.filter(f => f[2] === "date").forEach(([key]) => {
    const inp = $("f-" + key), note = $("n-" + key);
    const show = () => {
      const raw = inp.value.trim();
      if (raw === "" || raw === DASH) { note.textContent = ""; return; }
      const iso = parseRegisterDate(raw);
      note.textContent = iso ? dateLong(iso) : t("dateUnclear");
      note.className = "fnote" + (iso ? "" : " warn");
    };
    inp.addEventListener("blur", show); inp.addEventListener("input", show); show();
  });

  const renderEntryPhoto = async () => {
    const box = $("e-photo");
    if (entryPhotoBlob) {
      box.innerHTML = `<div class="photo-prev"><img src="${URL.createObjectURL(entryPhotoBlob)}"/>
        <button id="e-rm" aria-label="remove">✕</button></div>`;
      $("e-rm").addEventListener("click", e => { e.stopPropagation(); entryPhotoBlob = null; renderEntryPhoto(); });
      return;
    }
    const stored = existing && !isBlank(existing.photo_path) ? existing.photo_path : null;
    const url = stored ? await memberPhotoUrl(stored) : null;
    box.innerHTML = url
      ? `<div class="photo-prev"><img src="${esc(url)}" alt=""/></div>
         <div class="photo-btn" style="margin-top:8px">${ICON.camera}${t("changePhoto")}</div>`
      : `<div class="photo-btn">${ICON.camera}${t("addMemberPhoto")}</div>`;
  };
  $("e-photo").addEventListener("click", () => { if (!entryPhotoBlob) $("e-file").click(); });
  $("e-file").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    entryPhotoBlob = await downscale(f, MEMBER_PHOTO_EDGE); renderEntryPhoto();
  });
  renderEntryPhoto();

  $("e-save").addEventListener("click", () => saveAccountEntry(() => branchId, el));
}

async function saveAccountEntry(getBranchId, el){
  const msg = $("e-msg"); msg.className = "fmsg"; msg.textContent = "";
  const branchId = getBranchId();
  const branch = branchById(branchId);
  /* Correcting a saved member: the number, branch and status stay as they are. */
  const editingReal = !!entryRow && !isPlaceholder(entryRow);
  const acno = editingReal ? entryRow.account_number
             : ($("f-account_number").value || "").trim().toUpperCase();

  if (editingReal) {
    /* A new line may leave a date blank, but a correction must never wipe a
       date that is already on file just because of a typing slip. */
    const bad = ENTRY_FIELDS.find(([key,,kind]) => kind === "date" &&
      !isBlank($("f-" + key).value) && !parseRegisterDate($("f-" + key).value));
    if (bad) { msg.className = "fmsg err"; msg.textContent = `${t(bad[1])} — ${t("dateFix")}`; $("f-" + bad[0]).focus(); return; }
  } else {
    /* The only two things worth refusing. */
    if (acno === "" || acno === DASH) { msg.className = "fmsg err"; msg.textContent = t("errNoNumber"); return; }
    if (!branch || !branch.account_prefix) { msg.className = "fmsg err"; msg.textContent = t("errNoPrefixSet"); return; }
    if (!acno.startsWith(branch.account_prefix)) {
      msg.className = "fmsg err";
      msg.textContent = `${t("errPrefix")} ${branch.account_prefix} (${branch.name})`;
      return;
    }
    const clash = allAccounts.find(a => a.account_number === acno && (!entryRow || a.id !== entryRow.id));
    if (clash) { msg.className = "fmsg err"; msg.textContent = t("errDuplicate"); return; }
  }

  const btn = $("e-save"); btn.disabled = true; btn.textContent = t("saving2");
  try {
    const row = editingReal ? {} : { account_number: acno, branch_id: branchId, status: "active" };
    ENTRY_FIELDS.forEach(([key,,kind]) => {
      if (key === "account_number") return;
      const raw = $("f-" + key).value;
      row[key] = kind === "date" ? parseRegisterDate(raw)
               : kind === "age"  ? numIn(raw)
               : textIn(raw);
    });

    /* The object is named for the account, so re-linking and bulk import
       stay trivial. A photo that fails to upload must not lose the typed
       row, so it is reported and the save continues without one. */
    if (entryPhotoBlob) {
      try { row.photo_path = await uploadMemberPhoto(acno, entryPhotoBlob); }
      catch (e) { reportError(e, { where:"memberPhotoUpload", acno }); toast(t("photoFailed"), true); }
    }

    const res = entryRow
      ? await db.from("accounts").update(row).eq("id", entryRow.id)
      : await db.from("accounts").insert(row);

    if (res.error) {
      reportError(res.error, { where:"saveAccount", acno });
      msg.className = "fmsg err";
      msg.textContent = /duplicate|unique/i.test(res.error.message) ? t("errDuplicate") : res.error.message;
      return;
    }
    el.classList.remove("open");
    toast(`${t("accountSaved")} · ${acno}`);
    allAccounts = [];
    if (currentTab === "members") adminMembers($("content"));
    if (editingReal && $("detail") && $("detail").classList.contains("open")) openAccount(entryRow.id);
  } catch (e) {
    reportError(e, { where:"saveAccountEntry" });
    msg.className = "fmsg err"; msg.textContent = String(e && e.message || e);
  } finally {
    btn.disabled = false; btn.textContent = t("saveAccount");
  }
}

/* ---------- detail overlay ---------- */
function ensureDetail(){
  if($("detail")) return;
  const d=document.createElement("div"); d.id="detail"; d.className="detail";
  d.innerHTML=`<div class="dhead"><button class="dback" id="d-back" aria-label="${t("back")}">${ICON.back}</button>
    <div><div class="dtitle" id="d-title"></div><div class="dsub" id="d-sub"></div></div></div>
    <div class="content" id="d-content"></div>`;
  document.body.appendChild(d);
  $("d-back").addEventListener("click",()=>d.classList.remove("open"));
}
function openImg(url){
  let lb=$("lightbox");
  if(!lb){ lb=document.createElement("div"); lb.id="lightbox"; lb.className="lightbox"; lb.innerHTML="<img alt=''/>"; document.body.appendChild(lb); lb.addEventListener("click",()=>lb.classList.remove("open")); }
  lb.querySelector("img").src=url; lb.classList.add("open");
}
const PKIND=(p)=>p.product_type==="LOAN"?"loan":p.product_type==="FD"?"fd":p.product_type==="RD"?"rd":"sb";

async function openAccount(id){
  ensureDetail();
  const { data:acc } = await db.from("accounts").select("*").eq("id",id).single();
  if(!acc) return;
  $("d-title").textContent=dash(acc.holder_name); $("d-sub").textContent=dash(acc.account_number);
  const cont=$("d-content"); cont.innerHTML=`<div class="skel"><i></i><i></i><i></i></div>`;
  await loadBranches();
  const schemesById = await loadSchemes();
  const { data:prods } = await db.from("products").select("*").eq("account_id",id);
  const { data:hist } = await db.from("collections").select("amount,status,reason,cancel_reason,collected_on,photo_path,created_at").eq("account_id",id).order("created_at",{ascending:false}).limit(15);
  const proofs = await resolveProofUrls(hist || []);
  const kv=(k,v)=>`<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  const br = branchById(acc.branch_id);
  let html = "";
  const photoUrl = await memberPhotoUrl(acc.photo_path);
  html += memberHero(acc, photoUrl, { pills: [
    [br ? br.name : t("noBranch")],
    [statusWord(acc.status), acc.status === "active" ? "ok" : "off"],
    acc.verified ? [t("verifiedLabel"), "ok"] : null] });
  /* The photo can be added or replaced right here - no need to open the
     edit form. Camera or gallery, whichever the phone offers. While there
     is no photo the button is the big dashed one; after that it sits with
     the other actions. */
  if (staff.is_admin) html += `<input id="d-photofile" type="file" accept="image/*" style="display:none"/>` +
    (photoUrl ? "" : `<button class="photo-btn" id="d-photobtn" style="margin-bottom:10px">${ICON.camera}${t("addMemberPhoto")}</button>`);
  html += `<div class="btnrow"><button class="actionbtn" id="d-passbook">${ICON.book}${t("openPassbook")}</button>
    ${staff.is_admin ? `<button class="actionbtn" id="d-edit">${ICON.edit}${t("editDetails")}</button>` : ""}
    ${staff.is_admin && photoUrl ? `<button class="actionbtn" id="d-photobtn">${ICON.camera}${t("changePhoto")}</button>` : ""}</div>`;
  const phone = (v) => isBlank(v) ? DASH : `<a class="linkbtn" href="tel:${esc(String(v).replace(/[^0-9+]/g, ""))}">${esc(v)}</a>`;
  html += `<div class="card">
    ${kv(t("fOpDate"), esc(dmyOr(acc.op_date)))}
    ${kv(t("fDob"), esc(dmyOr(acc.date_of_birth)))}
    ${kv(t("phoneLabel"), phone(acc.phone))}
    ${kv(t("fScheme"), dashEsc(acc.scheme_raw))}
  </div>
  <div class="sectlabel">${t("fNominee")}</div>
  <div class="card">
    ${kv(t("fNominee"), dashEsc(acc.nominee_name))}
    ${kv(t("fRelation"), dashEsc(acc.nominee_relation))}
    ${kv(t("fNomineePh"), phone(acc.nominee_phone))}
    ${kv(`${t("fAge")} (${t("fAgeHint")})`, dashEsc(acc.nominee_age))}
  </div>
  <div class="sectlabel">${t("fAddress")}</div>
  <div class="card">
    ${kv(t("fAddress"), dashEsc(acc.address_line))}
    ${kv(t("fVillage"), dashEsc(acc.village))}
  </div>
  <div class="sectlabel">${t("products")}</div>`;
  if(!prods||!prods.length){ html+=`<div class="empty">${t("noProducts")}</div>`; }
  else html+=prods.map(p=>{
    const amt = p.installment_amount ? rupee(p.installment_amount)+(p.frequency?" / "+esc(freqWord(p.frequency)):"")
              : p.principal ? rupee(p.principal) : "";
    let extra="";
    if(p.product_type==="RD"){
      const sc=schemesById[p.scheme_id];
      const exp=expectedMaturity(p,sc);
      const need=sc&&sc.pay_count;
      extra = (sc?kv(t("rdScheme"),esc(sc.name)):"")
            + (exp?kv(t("expectedMaturity"),`${dmyOr(exp)} · ${t("expected")}`):"")
            + kv(t("installments"), `${p.installments_paid||0}${need?" / "+need:""}`);
    } else if(p.product_type==="FD"){
      extra = kv(t("fdMonthly"), rupee(Math.round(fdMonthlyInterest(p)))+t("perMonth"))
            + (p.maturity_date?kv(t("maturityDate"),dmyOr(p.maturity_date)):"");
    } else {
      extra = (p.maturity_date?kv(t("maturityDate"),dmyOr(p.maturity_date)):"")+kv(t("installments"),p.installments_paid||0);
    }
    const cal = (p.product_type==="RD"||p.product_type==="LOAN") && p.start_date && p.frequency ? `<div class="mcal" data-cal="${p.id}"></div>` : "";
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:8px"><span class="pill-s ${PKIND(p)}">${esc(typeWord(p.product_type))}</span>
        <span class="mname" style="flex:1">${amt}</span>
        <span class="mmeta">${esc(statusWord(p.status))}</span></div>
      <div style="margin-top:8px">${kv(t("openingDate"),esc(dmyOr(p.start_date)))}${extra}</div>
      ${cal}
    </div>`;
  }).join("");
  const grpLoan=(prods||[]).find(p=>p.group_id);
  if(grpLoan) html+=`<button class="actionbtn" id="d-group">${t("groupPosition")}</button>`;
  if(staff.is_admin) html+=`<button class="actionbtn" id="d-addrd">${t("addRd")}</button><button class="actionbtn" id="d-addfd">${t("addFd")}</button>`;
  html+=`<div class="sectlabel">${t("recentHistory")}</div>`;
  if(!hist||!hist.length){ html+=`<div class="empty">${t("noHistory")}</div>`; }
  else html+=hist.map(r=>{ const x=r.status==="cancelled", why=x?r.cancel_reason:r.reason;
    return `<div class="card${x?" erow cancelled":""}"><div class="mrow">
    <div class="mav">${r.status==="paid"?"₹":"—"}</div>
    <div style="flex:1"><div class="mname">${r.status==="not_paid"?t("notPaid"):x?`<s>${rupee(r.amount)}</s>`:rupee(r.amount)}</div><div class="mmeta">${r.collected_on}${why?" · "+esc(why):""}</div></div>
    ${x?`<span class="ebadge cancelled">${t("stCancelled")}</span>`:""}
    </div>${proofs[r.photo_path]?`<img class="thumb" src="${esc(proofs[r.photo_path])}" data-full="${esc(proofs[r.photo_path])}" alt=""/>`:""}</div>`; }).join("");
  cont.innerHTML=html;
  fillCalendars(cont, prods||[], id);
  cont.querySelectorAll("img[data-full]").forEach(im=>im.addEventListener("click",()=>openImg(im.dataset.full)));
  $("d-passbook")?.addEventListener("click", () => openPassbook(id));
  $("d-edit")?.addEventListener("click", () => openAccountEntry(acc));
  $("d-photobtn")?.addEventListener("click", () => $("d-photofile").click());
  $("d-photofile")?.addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const btn = $("d-photobtn"); btn.disabled = true; btn.textContent = t("saving2");
    try {
      const blob = await downscale(f, MEMBER_PHOTO_EDGE);
      const path = await uploadMemberPhoto(acc.account_number, blob);
      const { error } = await db.from("accounts").update({ photo_path: path }).eq("id", acc.id);
      if (error) throw error;
      toast(t("photoSaved"));
    } catch (e) {
      reportError(e, { where:"memberPhotoAdd", acno: acc.account_number });
      toast(t("photoNotSaved"), true);
    }
    openAccount(id);
  });
  $("d-group")?.addEventListener("click", () => openGroup(grpLoan.group_id));
  $("d-addrd")?.addEventListener("click", () => openAddRd(acc.id, acc.account_number));
  $("d-addfd")?.addEventListener("click", () => openAddFd(acc.id, acc.account_number));
  $("detail").classList.add("open");
}

/* ---------- the payment calendar (member page) ----------
   One month at a time for each RD and loan, by that product's own calendar
   (isDueOn: daily RD on working days, weekly loans on their weekday, monthly
   RD on its day). Each due day shows what happened:
     green tick  paid                 pink cross  marked not paid
     red ring    passed with no entry blue dot    still to come
   A payment on a day that was not due shows as a small green tick. Days
   before the start, or after the end (RD end date, loan term), are blank.
   Tap a day with an entry to see it. Paper history before the app is not
   in the app, so early months can show "no entry" where the book has one. */
const calMonth = {};
function productLastDay(p){
  if (p.product_type==="RD" && p.maturity_date) return p.maturity_date;
  if (p.product_type==="LOAN" && p.term_weeks && p.start_date) return addDaysIso(p.start_date, p.term_weeks*7 - 1);
  return null;
}
async function fillCalendars(cont, prods, accountId){
  const boxes = [...cont.querySelectorAll("[data-cal]")];
  if (!boxes.length) return;
  await loadHolidays();
  const { data:rows } = await db.from("collections").select("product_id,amount,status,reason,collected_on")
    .eq("account_id", accountId).neq("status","cancelled").order("collected_on");
  const byP = {};
  (rows||[]).forEach(r => { const m = byP[r.product_id] || (byP[r.product_id] = {}); (m[r.collected_on] = m[r.collected_on] || []).push(r); });
  boxes.forEach(box => { const p = prods.find(x => x.id === box.dataset.cal); if (p) paintCal(box, p, byP[p.id] || {}); });
}
function paintCal(box, p, entries){
  const today = todayStr(), last = productLastDay(p);
  const startM = p.start_date.slice(0,7), endM = (last && last < today ? last : today).slice(0,7);
  let ym = calMonth[p.id] || (today < p.start_date ? startM : endM);
  if (ym < startM) ym = startM; if (ym > endM && ym > today.slice(0,7)) ym = endM;
  calMonth[p.id] = ym;
  const [Y, M] = ym.split("-").map(Number);
  const days = new Date(Date.UTC(Y, M, 0)).getUTCDate(), lead = new Date(Date.UTC(Y, M-1, 1)).getUTCDay();
  const heads = (lang === "te" ? ["ఆ","సో","మం","బు","గు","శు","శ"] : ["S","M","T","W","T","F","S"]);
  let cells = heads.map(h => `<b>${h}</b>`).join("") + "<i></i>".repeat(lead);
  let due = 0, paid = 0, notp = 0, miss = 0;
  for (let d = 1; d <= days; d++) {
    const iso = `${ym}-${String(d).padStart(2,"0")}`, e = entries[iso], inLife = iso >= p.start_date && (!last || iso <= last);
    const isDue = inLife && isDueOn(p, isoParts(iso));
    const got = e && e.find(x => x.status === "paid"), np = e && !got && e.find(x => x.status === "not_paid");
    let cls = "off", mark = "";
    if (isDue) {
      due++;
      if (got) { cls = "paid"; mark = "✓"; paid++; }
      else if (np) { cls = "np"; mark = "✕"; notp++; }
      else if (iso < today) { cls = "miss"; miss++; }
      else cls = iso === today ? "due today" : "due";
    } else if (got) { cls = "extra"; mark = "✓"; }
    else if (!inLife) cls = "out";
    cells += `<span class="${cls}${iso === today ? " now" : ""}" data-d="${iso}">${d}${mark ? `<em>${mark}</em>` : ""}</span>`;
  }
  const monthName = new Date(Date.UTC(Y, M-1, 1)).toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", { month:"long", year:"numeric", timeZone:"UTC" });
  box.innerHTML = `<div class="mcal-head"><span class="mcal-t">${t("calTitle")}</span>
      <button class="chip" data-m="-1" ${ym <= startM ? "disabled" : ""} aria-label="‹">‹</button>
      <span class="mcal-m">${esc(monthName)}</span>
      <button class="chip" data-m="1" ${ym >= endM ? "disabled" : ""} aria-label="›">›</button></div>
    <div class="mcal-grid">${cells}</div>
    <div class="mcal-sum">${due ? `<span class="paid">✓ ${paid}</span><span class="np">✕ ${notp}</span><span class="miss">○ ${miss}</span>
      <span class="mcal-of">${paid} ${t("calOf")} ${due} ${t("calDueDays")}</span>` : `<span class="mcal-of">${t("calNone")}</span>`}</div>
    <div class="mcal-key"><span class="paid">${t("calPaid")}</span><span class="np">${t("calNotPaid")}</span><span class="miss">${t("calMissed")}</span><span class="due">${t("calUpcoming")}</span></div>`;
  box.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
    const n = new Date(Date.UTC(Y, M-1 + Number(b.dataset.m), 1));
    calMonth[p.id] = `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,"0")}`; paintCal(box, p, entries); }));
  box.querySelectorAll("[data-d]").forEach(c => c.addEventListener("click", () => {
    const e = entries[c.dataset.d]; if (!e) return;
    toast(`${dmy(c.dataset.d)} · ` + e.map(x => x.status === "paid" ? rupee(x.amount) : t("notPaid") + (x.reason ? " (" + x.reason + ")" : "")).join(", "));
  }));
}

/* ---------- ADMIN: ADD A FIXED DEPOSIT ----------
   The app had no way to record any product; an FD needs only a principal to
   drive the monthly payout list. Rate defaults to 18%/yr and term to 37 months
   (rules §2). What happens to the principal after 37 months is still OPEN, so
   maturity_date is stored only as a reference, not acted on. */
async function openAddFd(accountId, accountNumber){
  await loadBranches();
  let el=$("addfd");
  if(!el){ el=document.createElement("div"); el.id="addfd"; el.className="detail"; document.body.appendChild(el); }
  const todayDMY=todayStr().split("-").reverse().join("/");
  /* Default the booking branch to the one the account number belongs to, but it
     can differ — an FD may be booked at another branch (v2 #5). */
  let bookBranch=(branches.find(b=>accountNumber&&b.account_prefix&&accountNumber.startsWith(b.account_prefix))
                 ||branchByName("Krosuru")||branches[0]||{}).id;
  el.innerHTML=`<div class="dhead"><button class="dback" id="af-back" aria-label="${t("back")}">${ICON.back}</button>
    <div><div class="dtitle">${t("addFd")}</div><div class="dsub">${dashEsc(accountNumber)}</div></div></div>
    <div class="content">
      <label class="flabel">${t("fdPrincipal")} (₹)</label>
      <input class="finput" id="af-principal" inputmode="numeric" autocomplete="off"/>
      <label class="flabel">${t("fdBranch")}</label>
      <div class="branchbar" id="af-branch">
        ${branches.map(b=>`<button type="button" class="chip ${b.id===bookBranch?"on":""}" data-b="${b.id}">${esc(b.name)}</button>`).join("")}
      </div>
      <label class="flabel">${t("fdStart")}</label>
      <input class="finput" id="af-start" inputmode="numeric" placeholder="dd/mm/yyyy" value="${esc(todayDMY)}"/>
      <label class="flabel">${t("fdRate")}</label>
      <input class="finput" id="af-rate" inputmode="decimal" value="18"/>
      <label class="flabel">${t("fdTerm")}</label>
      <input class="finput" id="af-term" inputmode="numeric" value="37"/>
      <div class="fmsg" id="af-msg"></div>
      <button class="btn-primary" id="af-save" style="width:100%;margin-top:14px">${t("save")}</button>
      <div style="height:24px"></div>
    </div>`;
  el.classList.add("open");
  $("af-back").addEventListener("click",()=>el.classList.remove("open"));
  $("af-branch").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
    bookBranch=ch.dataset.b; $("af-branch").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); }));
  $("af-save").addEventListener("click",async()=>{
    const msg=$("af-msg"); msg.className="fmsg"; msg.textContent="";
    const principal=Number($("af-principal").value);
    if(!principal||principal<=0){ msg.className="fmsg err"; msg.textContent=t("enterAmount"); return; }
    const start=parseRegisterDate($("af-start").value)||todayStr();
    const rate=Number($("af-rate").value)||18;
    const term=parseInt($("af-term").value,10)||37;
    const [sy,sm,sd]=start.split("-").map(Number);
    const md=new Date(Date.UTC(sy,sm-1+term,sd));
    const maturity=`${md.getUTCFullYear()}-${String(md.getUTCMonth()+1).padStart(2,"0")}-${String(md.getUTCDate()).padStart(2,"0")}`;
    const btn=$("af-save"); btn.disabled=true; btn.textContent=t("saving2");
    const ins=await db.from("products").insert({account_id:accountId,account_number:accountNumber,product_type:"FD",
      principal,interest_rate:rate,start_date:start,term_months:term,maturity_date:maturity,branch_id:bookBranch,status:"active"});
    btn.disabled=false; btn.textContent=t("save");
    if(ins.error){ msg.className="fmsg err"; msg.textContent=ins.error.message; reportError(ins.error,{op:"add_fd",accountId}); return; }
    el.classList.remove("open"); toast(t("fdSaved")); openAccount(accountId);
  });
}

/* ---------- ADMIN: ADD A RECURRING DEPOSIT ----------
   The amount is the member's chosen ₹/day (or ₹/month) — the "D-100 / D-200"
   in the register are daily amounts, not schemes (rules §4). Only the two
   confirmed schemes are offered; frequency follows the scheme. */
async function openAddRd(accountId, accountNumber){
  const byId=await loadSchemes();
  const rdSchemes=Object.values(byId)
    .filter(s=>(s.kind==="rd_daily"||s.kind==="rd_monthly")&&s.active)
    .sort((a,b)=>a.kind.localeCompare(b.kind));
  let picked=rdSchemes[0]||null, amtVal="", dueVal="";
  const isMonthly=()=>picked&&picked.frequency==="monthly";
  const todayDMY=todayStr().split("-").reverse().join("/");

  let el=$("addrd");
  if(!el){ el=document.createElement("div"); el.id="addrd"; el.className="detail"; document.body.appendChild(el); }

  async function saveRd(){
    const msg=$("ar-msg"); msg.className="fmsg"; msg.textContent="";
    if(!picked){ msg.className="fmsg err"; msg.textContent=t("rdScheme"); return; }
    const amt=Number($("ar-amt").value);
    if(!amt||amt<=0){ msg.className="fmsg err"; msg.textContent=t("enterAmount"); return; }
    const start=parseRegisterDate($("ar-start").value)||todayStr();
    const freq=picked.frequency||"daily";
    const row={account_id:accountId,account_number:accountNumber,product_type:"RD",scheme_id:picked.id,
      installment_amount:amt,frequency:freq,start_date:start,installments_paid:0,status:"active"};
    if(freq==="monthly"){ const dd=parseInt(($("ar-dueday")||{}).value,10);
      row.due_day=(dd>=1&&dd<=31)?dd:Number(start.split("-")[2]); }
    const btn=$("ar-save"); btn.disabled=true; btn.textContent=t("saving2");
    const ins=await db.from("products").insert(row);
    btn.disabled=false; btn.textContent=t("save");
    if(ins.error){ msg.className="fmsg err"; msg.textContent=ins.error.message; reportError(ins.error,{op:"add_rd",accountId}); return; }
    el.classList.remove("open"); toast(t("rdSaved")); openAccount(accountId);
  }

  const render=()=>{
    el.innerHTML=`<div class="dhead"><button class="dback" id="ar-back" aria-label="${t("back")}">${ICON.back}</button>
      <div><div class="dtitle">${t("addRd")}</div><div class="dsub">${dashEsc(accountNumber)}</div></div></div>
      <div class="content">
        <label class="flabel">${t("rdScheme")}</label>
        <div class="branchbar" id="ar-schemes">
          ${rdSchemes.length?rdSchemes.map(s=>`<button type="button" class="chip ${picked&&s.id===picked.id?"on":""}" data-s="${s.id}">${esc(s.name)}</button>`).join(""):`<span class="mmeta">${t("noProducts")}</span>`}
        </div>
        <label class="flabel">${isMonthly()?t("rdAmountMonthly"):t("rdAmountDaily")}</label>
        <input class="finput" id="ar-amt" inputmode="numeric" autocomplete="off"/>
        <label class="flabel">${t("rdStart")}</label>
        <input class="finput" id="ar-start" inputmode="numeric" placeholder="dd/mm/yyyy" value="${esc(todayDMY)}"/>
        ${isMonthly()?`<label class="flabel">${t("rdDueDay")}</label><input class="finput" id="ar-dueday" inputmode="numeric" placeholder="1-31"/>`:""}
        <div class="fmsg" id="ar-msg"></div>
        <button class="btn-primary" id="ar-save" style="width:100%;margin-top:14px">${t("save")}</button>
        <div style="height:24px"></div>
      </div>`;
    $("ar-amt").value=amtVal;
    if($("ar-dueday")) $("ar-dueday").value=dueVal;
    $("ar-back").addEventListener("click",()=>el.classList.remove("open"));
    $("ar-schemes").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{ picked=byId[ch.dataset.s]; render(); }));
    $("ar-amt").addEventListener("input",e=>amtVal=e.target.value);
    if($("ar-dueday")) $("ar-dueday").addEventListener("input",e=>dueVal=e.target.value);
    $("ar-save").addEventListener("click",saveRd);
  };
  render(); el.classList.add("open");
}

/* ---------- ADMIN: WRONG ENTRIES ----------
   Entry staff cannot change or delete what they keyed in; they report it. Only
   the operator can cancel an entry, and cancelling never erases it: the row
   stays in the book marked cancelled (who, when, why), it stops counting, and
   the instalment comes back off the product. The audit log records it too. */
async function reviewEntry(id, cancel, reason){
  const { error } = await db.rpc("admin_review_entry",{p_id:id,p_cancel:cancel,p_reason:reason||null});
  if(error){ toast(t(rpcErrKey(error,"admin_review_entry")),true); return false; }
  toast(t(cancel?"entryCancelled":"entryKept"));
  if(currentTab==="home" && $("content")) adminDashboard($("content"));   // totals and the to-check count moved
  return true;
}
async function openEntryCheck(){
  ensureDetail();
  $("d-title").textContent=t("entriesToCheck"); $("d-sub").textContent="";
  const cont=$("d-content"); cont.innerHTML=`<div class="skel"><i></i><i></i><i></i></div>`;
  $("detail").classList.add("open");
  const [{ data, error }, { data:sl }] = await Promise.all([
    db.from("collections")
      .select("id,amount,status,method,reason,collected_on,created_at,agent_id,account_number,flag_note,accounts(holder_name),products(product_type,frequency)")
      .not("flagged_at","is",null).neq("status","cancelled").order("flagged_at",{ascending:true}),
    db.rpc("list_staff")]);
  if(error){ reportError(error,{op:"entries_to_check"}); cont.innerHTML=`<div class="empty">${t("connErr")}</div>`; return; }
  const nm={}; (sl||[]).forEach(s=>nm[s.id]=s.name);
  const rows=data||[];
  $("d-sub").textContent=String(rows.length);
  if(!rows.length){ cont.innerHTML=`<div class="empty">${ICON.history}<div>${t("nothingToCheck")}</div></div>`; return; }
  cont.innerHTML=rows.map(r=>{ const m=r.accounts||{}, np=r.status==="not_paid";
    const meta=[dash(r.account_number), schemeLabel(r.products), r.collected_on+" "+istTime(r.created_at),
                np?null:(r.method==="phone"?t("mPhone"):t("mCash"))].filter(Boolean).join(" · ");
    return `<div class="card vcard" style="cursor:default"><div class="mrow">
        <div class="mav">${initials(m.holder_name)}</div>
        <div style="flex:1;min-width:0"><div class="mname">${dashEsc(m.holder_name)}</div><div class="mmeta">${esc(meta)}</div></div>
        ${np?`<span class="badge-np">${t("notPaid")}</span>`:`<div class="amoney">${rupee(r.amount)}</div>`}</div>
      <div class="vnote"><span class="vnote-k">${t("staffNote")} · ${esc(nm[r.agent_id]||"?")}</span>${esc(r.flag_note||DASH)}</div>
      <div class="sh-actions" style="margin-top:11px">
        <button class="btn-ghost" data-keep="${r.id}">${t("keepEntry")}</button>
        <button class="btn-danger" data-cancel="${r.id}">${t("cancelEntry")}</button></div></div>`; }).join("");
  cont.querySelectorAll("[data-keep]").forEach(b=>b.addEventListener("click",async()=>{
    b.disabled=true; if(await reviewEntry(b.dataset.keep,false)) openEntryCheck(); else b.disabled=false; }));
  cont.querySelectorAll("[data-cancel]").forEach(b=>b.addEventListener("click",async()=>{
    if(!confirm(t("confirmCancelEntry"))) return;
    b.disabled=true; if(await reviewEntry(b.dataset.cancel,true)) openEntryCheck(); else b.disabled=false; }));
}

async function openAgent(id,name){
  ensureDetail();
  $("d-title").textContent=name; $("d-sub").textContent=t("todaysWork")+" · "+todayStr();
  const cont=$("d-content"); cont.innerHTML=`<div class="skel"><i></i><i></i><i></i></div>`;
  const { data } = await db.from("collections").select("id,amount,status,reason,cancel_reason,flagged_at,flag_note,photo_path,created_at,accounts(holder_name,account_number)").eq("agent_id",id).eq("collected_on",todayStr()).order("created_at",{ascending:false});
  const proofs = await resolveProofUrls(data || []);
  const rows=data||[];
  const total=rows.filter(r=>r.status==="paid").reduce((s,r)=>s+Number(r.amount),0);
  let html=`<div class="tile blue"><div class="tlabel">${t("totalToday")}</div><div class="tval">${rupee(total)}</div><div class="tnote">${rows.filter(r=>r.status!=="cancelled").length} ${t("entries")}</div></div><div style="height:6px"></div>`;
  if(!rows.length){ html+=`<div class="empty">${t("noWorkToday")}</div>`; }
  else html+=rows.map(r=>{const m=r.accounts||{}; const tm=istTime(r.created_at); const x=r.status==="cancelled";
    const why = x ? r.cancel_reason : r.status==="not_paid" ? r.reason : "";
    return `<div class="card${x?" erow cancelled":""}"><div class="mrow">
      <div class="mav">${initials(m.holder_name)}</div>
      <div style="flex:1"><div class="mname">${esc(m.holder_name||m.account_number||"—")}</div><div class="mmeta">${esc(m.account_number||"")} · ${tm}${why?" · "+esc(why):""}</div></div>
      <div class="eright">${r.status==="not_paid"?`<span class="badge-np">${t("notPaid")}</span>`:(x&&!Number(r.amount))?"":`<div class="amoney">${rupee(r.amount)}</div>`}${entryBadge(r)}</div>
    </div>${!x && r.flag_note?`<div class="enote">${t("staffNote")}: ${esc(r.flag_note)}</div>`:""}${proofs[r.photo_path]
      ? `<img class="thumb" src="${esc(proofs[r.photo_path])}" data-full="${esc(proofs[r.photo_path])}" alt=""/>`
      : (r.status==="paid" ? `<span class="badge-np" style="background:#FBE6A2;color:#7a5c00">⚑ ${t("noProof")}</span>` : "")}
    ${x?"":`<div class="rowact"><button class="linkbtn danger" data-cancel="${r.id}">${t("cancelEntry")}</button></div>`}</div>`;}).join("");
  cont.innerHTML=html;
  cont.querySelectorAll("img[data-full]").forEach(im=>im.addEventListener("click",()=>openImg(im.dataset.full)));
  /* The operator can cancel any entry, reported or not; an unreported one asks why. */
  cont.querySelectorAll("[data-cancel]").forEach(b=>b.addEventListener("click",async()=>{
    const r=rows.find(z=>z.id===b.dataset.cancel); if(!r) return;
    let why=null;
    if(r.flag_note){ if(!confirm(t("confirmCancelEntry"))) return; }
    else { why=prompt(t("cancelWhy")+"\n"+t("confirmCancelEntry")); if(why===null) return; }
    b.disabled=true;
    if(await reviewEntry(r.id,true,why)) openAgent(id,name); else b.disabled=false; }));
  $("detail").classList.add("open");
}

/* ---------- REQUESTS: ASK, THEN APPROVE ----------
   Entry staff never write to the book of members, deposits or loans. They ask:
   a request waits in a list of its own (db/006_staff_requests.sql) until the
   operator says yes or no. Yes puts it in the book in one step; no needs a
   reason, which the staff member sees. The person who asked can never be the
   person who approves, and the database enforces every rule shown here. */
const REQ_BADGE={pending:["wait","rqWaiting"],approved:["kept","rqApproved"],rejected:["cancelled","rqRejected"],withdrawn:["gone","rqWithdrawn"]};
const reqBadge=(status)=>{ const b=REQ_BADGE[status]||REQ_BADGE.pending; return `<span class="ebadge ${b[0]}">${t(b[1])}</span>`; };
const dmy=(iso)=>String(iso||"").split("-").reverse().join("/");
const reqWhen=(ts)=>`${dmy(istParts(new Date(ts)).iso)} ${istTime(ts)}`;
const FREQ_KEY={daily:"rqDaily",weekly:"rqWeekly",monthly:"rqMonthly"};
/* "1,500" or "₹1500" as typed -> 1500; anything that is not a positive amount -> null */
const moneyIn=(raw)=>{ const n=Number(String(raw==null?"":raw).replace(/[₹,\s]/g,""));
  return Number.isFinite(n)&&n>0 ? Math.round(n*100)/100 : null; };

/* One line that says what was asked for: "Daily RD · ₹100 daily". */
function reqProductLine(p, byId){
  p=p||{};
  const freq=FREQ_KEY[p.frequency]?t(FREQ_KEY[p.frequency]):"";
  if(p.product_type==="RD"){ const s=byId&&byId[p.scheme_id];
    return [s?s.name:"RD", `${rupee(p.installment_amount)} ${freq}`.trim()].join(" · "); }
  if(p.product_type==="FD")
    return [t("rqFd"), rupee(p.principal), `${p.interest_rate}%`, `${p.term_months} ${t("rqMonths")}`].join(" · ");
  if(p.product_type==="LOAN")
    return [t("rqLoan"), rupee(p.principal), `${rupee(p.installment_amount)} ${freq}`.trim(),
            p.term_weeks?`${p.term_weeks} ${t("rqWeeksShort")}`:null].filter(Boolean).join(" · ");
  return DASH;
}

/* ----- entry staff: what I asked for, and what became of it ----- */
let reqSeq=0;
async function agentRequests(c){
  const seq=++reqSeq;
  c.innerHTML=`<button class="actionbtn cta" id="rq-new">＋ ${t("rqNewMember")}</button>
    <div class="entry-hint">${t("rqHint")}</div>
    <div id="rq-body"><div class="skel"><i></i><i></i><i></i></div></div>`;
  $("rq-new").addEventListener("click",openMemberRequest);
  const [{ data, error }, byId] = await Promise.all([db.rpc("entry_my_requests"), loadSchemes()]);
  const body=$("rq-body");
  if(seq!==reqSeq || !body) return;                /* asked again, or the tab changed */
  if(error){ reportError(error,{op:"entry_my_requests"}); body.innerHTML=`<div class="empty">${t("connErr")}</div>`; return; }
  const rows=data||[], byRid={}; rows.forEach(r=>{ byRid[r.id]=r; });
  if(!rows.length){ body.innerHTML=`<div class="empty">${ICON.requests}<div>${t("rqNone")}</div></div>`; return; }
  body.innerHTML=`<div class="sectlabel">${t("requests")} · ${rows.length}</div>`+rows.map(r=>{
    const p=r.payload||{}, isMember=r.kind==="member";
    const off=r.status==="rejected"||r.status==="withdrawn";
    const meta=[isMember?t("rqNewMember"):reqProductLine(p,byId), r.account_number, reqWhen(r.created_at)].filter(Boolean).join(" · ");
    const acts=[];
    if(isMember && (r.status==="pending"||r.status==="approved"))
      acts.push(`<button class="linkbtn" data-addprod="${r.id}">＋ ${t("rqDepositLoan")}</button>`);
    if(r.status==="pending") acts.push(`<button class="linkbtn danger" data-withdraw="${r.id}">${t("rqWithdraw")}</button>`);
    return `<div class="card erow${off?" cancelled":""}">
      <div class="mrow"><div class="mav">${initials(r.member_name)}</div>
        <div style="flex:1;min-width:0"><div class="mname">${dashEsc(r.member_name)}</div><div class="mmeta">${esc(meta)}</div></div>
        <div class="eright">${reqBadge(r.status)}</div></div>
      ${r.status==="rejected"&&r.review_note?`<div class="enote">${t("rqRejected")}: ${esc(r.review_note)}</div>`:""}
      ${acts.length?`<div class="rowact">${acts.join("")}</div>`:""}</div>`;
  }).join("");
  body.querySelectorAll("[data-addprod]").forEach(b=>b.addEventListener("click",()=>{
    const r=byRid[b.dataset.addprod]; if(!r) return;
    openProductRequest({forRequestId:r.id,name:r.member_name,accountNumber:r.account_number}); }));
  body.querySelectorAll("[data-withdraw]").forEach(b=>b.addEventListener("click",async()=>{
    const r=byRid[b.dataset.withdraw]; if(!r) return;
    const kids=r.kind==="member" && rows.some(k=>k.for_request_id===r.id && k.status==="pending");
    if(!confirm(t("rqConfirmWithdraw")+(kids?"\n"+t("rqWithdrawKids"):""))) return;
    b.disabled=true;
    const { error:e }=await db.rpc("entry_withdraw_request",{p_id:r.id});
    if(e) toast(t(rpcErrKey(e,"entry_withdraw_request")),true); else toast(t("rqTakenBack"));
    if(currentTab==="requests" && $("content")) agentRequests($("content"));
  }));
}

/* ----- entry staff: ask for a new member -----
   The same fields as the operator's own form, but nothing is written to the
   book. Only the name is required; the operator gives the account number. */
let reqPhotoBlob=null;
async function openMemberRequest(){
  await loadBranches();
  reqPhotoBlob=null;
  /* Staff tied to a branch ask for that branch only (the database insists). */
  let branchId = staff.branch_id
    || (branchById(localStorage.getItem("macs_req_branch"))||branchByName("Krosuru")||branches[0]||{}).id || null;

  let el=$("rqmember");
  if(!el){ el=document.createElement("div"); el.id="rqmember"; el.className="detail"; }
  document.body.appendChild(el);                   /* last in the page = on top of any other open screen */

  el.innerHTML=`
    <div class="dhead">
      <button class="dback" id="rm-back" aria-label="${t("back")}">${ICON.back}</button>
      <div><div class="dtitle">${t("rqNewMember")}</div><div class="dsub">${t("rqForApproval")}</div></div>
    </div>
    <div class="content">
      <div class="entry-hint">${t("rqMemberHint")}</div>
      ${staff.branch_id ? "" : `<label class="flabel">${t("branch")}</label>
      <div class="branchbar" id="rm-branch">
        ${branches.map(b=>`<button type="button" class="chip ${b.id===branchId?"on":""}" data-b="${b.id}">${esc(b.name)}</button>`).join("")}
      </div>`}
      ${entryGroups(([key,label,kind])=>`
        <label class="flabel" for="rm-${key}">${t(label)}${kind==="age"?` <span class="fhint">(${t("fAgeHint")})</span>`:""}${kind==="acno"?` <span class="fhint">(${t("rqAcNoHint")})</span>`:""}</label>
        <input class="finput" id="rm-${key}"
               ${kind==="tel"||kind==="age" ? 'inputmode="numeric"' : ''}
               ${kind==="date" ? 'inputmode="numeric" placeholder="dd/mm/yyyy"' : ''}
               ${kind==="acno" ? 'autocapitalize="characters" spellcheck="false"' : ''}
               autocomplete="off"/>
        ${kind==="date" ? `<div class="fnote" id="rmn-${key}"></div>` : ""}
      `)}
      <div class="sectlabel">${t("fPhoto")}</div>
      <div class="card fcard">
        <input id="rm-file" type="file" accept="image/*" style="display:none"/>
        <div id="rm-photo"></div>
      </div>
      <div class="fmsg" id="rm-msg"></div>
      <button class="btn-primary" id="rm-save" style="width:100%;margin-top:14px">${t("rqSend")}</button>
      <div style="height:24px"></div>
    </div>`;
  el.classList.add("open"); el.scrollTop=0;

  $("rm-back").addEventListener("click",()=>el.classList.remove("open"));
  if($("rm-branch")) $("rm-branch").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
    branchId=ch.dataset.b; $("rm-branch").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); }));

  /* echo back how each date was understood */
  ENTRY_FIELDS.filter(f=>f[2]==="date").forEach(([key])=>{
    const inp=$("rm-"+key), note=$("rmn-"+key);
    const show=()=>{ const raw=inp.value.trim();
      if(raw===""||raw===DASH){ note.textContent=""; return; }
      const iso=parseRegisterDate(raw);
      note.textContent=iso?dateLong(iso):t("rqBadDate"); note.className="fnote"+(iso?"":" warn"); };
    inp.addEventListener("blur",show); inp.addEventListener("input",show);
  });

  const renderPhoto=()=>{ const box=$("rm-photo");
    if(!reqPhotoBlob){ box.innerHTML=`<div class="photo-btn">${ICON.camera}${t("addMemberPhoto")}</div>`; return; }
    box.innerHTML=`<div class="photo-prev"><img src="${URL.createObjectURL(reqPhotoBlob)}" alt=""/>
      <button id="rm-rm" aria-label="remove">✕</button></div>`;
    $("rm-rm").addEventListener("click",e=>{ e.stopPropagation(); reqPhotoBlob=null; $("rm-file").value=""; renderPhoto(); }); };
  $("rm-photo").addEventListener("click",()=>{ if(!reqPhotoBlob) $("rm-file").click(); });
  $("rm-file").addEventListener("change",async(ev)=>{ const f=ev.target.files[0]; if(!f) return;
    reqPhotoBlob=await downscale(f,MEMBER_PHOTO_EDGE); renderPhoto(); });
  renderPhoto();

  $("rm-save").addEventListener("click",()=>sendMemberRequest(()=>branchId, el));
}

async function sendMemberRequest(getBranchId, el){
  const msg=$("rm-msg"); msg.className="fmsg"; msg.textContent="";
  const fail=(m)=>{ msg.className="fmsg err"; msg.textContent=m; };
  const name=textIn($("rm-holder_name").value);
  if(!name){ $("rm-holder_name").focus(); return fail(t("nameNeeded")); }
  const branchId=getBranchId(), branch=branchById(branchId);
  if(!branchId) return fail(t("rqBranchNeeded"));
  const acno=(textIn($("rm-account_number").value)||"").toUpperCase();
  if(acno && branch && branch.account_prefix && !acno.startsWith(branch.account_prefix))
    return fail(`${t("errPrefix")} ${branch.account_prefix} (${branch.name})`);

  const payload={ holder_name:name };
  if(acno) payload.account_number=acno;
  for(const [key,label,kind] of ENTRY_FIELDS){
    if(key==="holder_name"||key==="account_number") continue;
    const raw=$("rm-"+key).value;
    if(isBlank(raw)) continue;
    if(kind==="date"){
      /* The operator never sees the paper, so a date that cannot be read is
         stopped here rather than quietly dropped. */
      const iso=parseRegisterDate(raw);
      if(!iso){ $("rm-"+key).focus(); return fail(`${t(label)} — ${t("rqBadDate")}`); }
      payload[key]=iso;
    } else if(kind==="age"){ const n=numIn(raw); if(n!==null) payload[key]=n; }
    else payload[key]=textIn(raw);
  }

  const btn=$("rm-save"); if(btn.disabled) return;
  btn.disabled=true; btn.textContent=t("saving2");
  try{
    /* The photo waits in this staff member's own folder; it becomes the
       member's photo only when the operator approves. A photo that fails to
       upload must not lose the typed request. */
    let photoLost=false;
    if(reqPhotoBlob){
      const path=`${staff.id}/requests/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
      const up=await db.storage.from(PROOFS).upload(path,reqPhotoBlob,{contentType:"image/jpeg"});
      if(up.error){ reportError(up.error,{where:"requestPhotoUpload"}); photoLost=true; }
      else payload.photo_path=path;
    }
    const { error }=await db.rpc("entry_submit_member",{p_payload:payload,p_branch_id:staff.branch_id?null:branchId});
    if(error){ fail(t(rpcErrKey(error,"entry_submit_member"))); return; }
    if(!staff.branch_id) localStorage.setItem("macs_req_branch",branchId);
    reqPhotoBlob=null;
    el.classList.remove("open");
    toast(t(photoLost?"rqSentNoPhoto":"rqSent"),photoLost);
    if(currentTab==="requests" && $("content")) agentRequests($("content"));
  }catch(e){
    reportError(e,{where:"sendMemberRequest"}); fail(t("connErr"));
  }finally{
    btn.disabled=false; btn.textContent=t("rqSend");
  }
}

/* ----- entry staff: ask for a new deposit or loan -----
   target = { accountId } for a member already in the book, or { forRequestId }
   for a new member this staff member asked for. Nothing is preselected: the
   kind, and for a loan how it is repaid, must be chosen on purpose. */
async function openProductRequest(target){
  target=target||{};
  const byId=await loadSchemes();
  const rdSchemes=Object.values(byId)
    .filter(s=>(s.kind==="rd_daily"||s.kind==="rd_monthly")&&s.active)
    .sort((a,b)=>a.kind.localeCompare(b.kind));
  /* kind: "rd:<scheme id>", "fd" or "loan". What was typed survives a change of kind. */
  let kind=null, freq=null, sending=false;
  const v={ amt:"", due:"", principal:"", rate:"18", term:"37", loan:"", inst:"", weeks:"",
            start:todayStr().split("-").reverse().join("/"), note:"" };
  const FIELD={ "rp-amt":"amt","rp-due":"due","rp-principal":"principal","rp-rate":"rate","rp-term":"term",
                "rp-loan":"loan","rp-inst":"inst","rp-weeks":"weeks","rp-start":"start","rp-note":"note" };
  const scheme=()=>kind&&kind.startsWith("rd:") ? byId[kind.slice(3)] : null;

  let el=$("rqproduct");
  if(!el){ el=document.createElement("div"); el.id="rqproduct"; el.className="detail"; }
  document.body.appendChild(el);                   /* last in the page = on top of the member screen */

  async function send(){
    const msg=$("rp-msg"); msg.className="fmsg"; msg.textContent="";
    const fail=(m)=>{ msg.className="fmsg err"; msg.textContent=m; };
    if(sending) return;
    if(!kind) return fail(t("rqBadScheme"));
    const s=scheme(), p={};
    if(s){
      const amt=moneyIn(v.amt); if(!amt) return fail(t("enterAmount"));
      Object.assign(p,{ product_type:"RD", scheme_id:s.id, installment_amount:amt });
      if(s.frequency==="monthly" && !isBlank(v.due)){
        const d=numIn(v.due); if(!(d>=1&&d<=31)) return fail(t("rqBadDay")); p.due_day=d; }
    } else if(kind==="fd"){
      const prin=moneyIn(v.principal); if(!prin) return fail(t("enterAmount"));
      const rate=isBlank(v.rate) ? 18 : Number(String(v.rate).replace(/[%\s]/g,""));
      if(!(rate>=0&&rate<=60)) return fail(t("rqBadRate"));
      const term=isBlank(v.term) ? 37 : numIn(v.term);
      if(!(term>=1&&term<=240)) return fail(t("rqBadTerm"));
      Object.assign(p,{ product_type:"FD", principal:prin, interest_rate:Math.round(rate*100)/100, term_months:term });
    } else {
      const prin=moneyIn(v.loan), inst=moneyIn(v.inst);
      if(!prin||!inst) return fail(t("enterAmount"));
      if(!freq) return fail(t("rqPickRepay"));
      Object.assign(p,{ product_type:"LOAN", principal:prin, installment_amount:inst, frequency:freq });
      if(!isBlank(v.weeks)){ const w=numIn(v.weeks); if(!(w>=1&&w<=520)) return fail(t("rqBadTerm")); p.term_weeks=w; }
    }
    if(!isBlank(v.start)){ const iso=parseRegisterDate(v.start); if(!iso) return fail(t("rqBadDate")); p.start_date=iso; }
    const note=textIn(v.note); if(note) p.note=note.slice(0,300);

    sending=true;
    const btn=$("rp-send"); btn.disabled=true; btn.textContent=t("saving2");
    let error=null;
    try{ ({ error }=await db.rpc("entry_submit_product",
           {p_payload:p,p_account_id:target.accountId||null,p_for_request_id:target.forRequestId||null})); }
    catch(e){ error=e; }
    sending=false;
    const b2=$("rp-send"); if(b2){ b2.disabled=false; b2.textContent=t("rqSend"); }
    if(error) return fail(t(rpcErrKey(error,"entry_submit_product")));
    el.classList.remove("open"); toast(t("rqSent"));
    if(currentTab==="requests" && $("content")) agentRequests($("content"));
  }

  const render=()=>{
    const s=scheme(), monthly=!!s&&s.frequency==="monthly";
    const inp=(id,label,attrs)=>`<label class="flabel" for="${id}">${label}</label>
      <input class="finput" id="${id}" value="${esc(v[FIELD[id]])}" autocomplete="off" ${attrs||'inputmode="decimal"'}/>`;
    let fields="";
    if(s) fields=inp("rp-amt", monthly?t("rdAmountMonthly"):t("rdAmountDaily"))
               +(monthly?inp("rp-due",t("rdDueDay"),'inputmode="numeric" placeholder="1-31"'):"");
    else if(kind==="fd") fields=inp("rp-principal",`${t("fdPrincipal")} (₹)`)+inp("rp-rate",t("fdRate"))
               +inp("rp-term",t("fdTerm"),'inputmode="numeric"');
    else if(kind==="loan") fields=inp("rp-loan",t("rqLoanAmount"))+inp("rp-inst",t("rqInstalment"))
               +`<label class="flabel">${t("rqRepay")}</label><div class="branchbar" id="rp-freq">
                  ${Object.keys(FREQ_KEY).map(f=>`<button type="button" class="chip ${freq===f?"on":""}" data-f="${f}">${t(FREQ_KEY[f])}</button>`).join("")}</div>`
               +inp("rp-weeks",t("rqWeeks"),'inputmode="numeric"');
    el.innerHTML=`<div class="dhead"><button class="dback" id="rp-back" aria-label="${t("back")}">${ICON.back}</button>
        <div><div class="dtitle">${t("rqNewProduct")}</div>
          <div class="dsub">${esc([target.name,target.accountNumber].filter(x=>!isBlank(x)).join(" · ")||t("rqForApproval"))}</div></div></div>
      <div class="content">
        <div class="entry-hint">${t("rqProductHint")}</div>
        <label class="flabel">${t("rqType")}</label>
        <div class="branchbar chipwrap" id="rp-kinds">
          ${rdSchemes.map(x=>`<button type="button" class="chip ${kind==="rd:"+x.id?"on":""}" data-k="rd:${x.id}">${esc(x.name)}</button>`).join("")}
          <button type="button" class="chip ${kind==="fd"?"on":""}" data-k="fd">${t("rqFd")}</button>
          <button type="button" class="chip ${kind==="loan"?"on":""}" data-k="loan">${t("rqLoan")}</button>
        </div>
        ${kind ? fields+inp("rp-start",t("fdStart"),'inputmode="numeric" placeholder="dd/mm/yyyy"')
                 +`<label class="flabel" for="rp-note">${t("rqNote")}</label>
                   <textarea class="finput rnote" id="rp-note" rows="2" maxlength="300" style="margin-top:0;min-height:64px">${esc(v.note)}</textarea>` : ""}
        <div class="fmsg" id="rp-msg"></div>
        <button class="btn-primary" id="rp-send" style="width:100%;margin-top:14px">${t("rqSend")}</button>
        <div style="height:24px"></div>
      </div>`;
    $("rp-back").addEventListener("click",()=>el.classList.remove("open"));
    $("rp-kinds").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{ kind=ch.dataset.k; render(); }));
    if($("rp-freq")) $("rp-freq").querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
      freq=ch.dataset.f; $("rp-freq").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); }));
    Object.keys(FIELD).forEach(id=>{ const i=$(id); if(i) i.addEventListener("input",e=>{ v[FIELD[id]]=e.target.value; }); });
    $("rp-send").addEventListener("click",send);
  };
  render(); el.classList.add("open"); el.scrollTop=0;
}

/* ----- operator: requests waiting for a yes or no -----
   A new member is listed with the deposits / loans asked for them underneath;
   those can only be approved once the member is in the book. */
async function copyRequestPhoto(path, res){
  /* The photo sent with a request sits in the staff member's folder. Once the
     member is in the book it is stored under the account number like every
     other member photo. A failed copy never undoes the approval. */
  try{
    const dl=await db.storage.from(PROOFS).download(path);
    if(dl.error||!dl.data) throw dl.error||new Error("request photo missing");
    const stored=await uploadMemberPhoto(res.account_number,dl.data);
    const up=await db.from("accounts").update({photo_path:stored}).eq("id",res.account_id);
    if(up.error) throw up.error;
    return true;
  }catch(e){ reportError(e,{where:"copyRequestPhoto"}); return false; }
}

async function openRequestCheck(){
  ensureDetail();
  const title=t("rqToApprove");
  $("d-title").textContent=title; $("d-sub").textContent="";
  const cont=$("d-content"); cont.innerHTML=`<div class="skel"><i></i><i></i><i></i></div>`;
  $("detail").classList.add("open");
  const mine=()=>$("d-title").textContent===title;           /* the overlay is shared: stop if it moved on */

  const [{ data, error }, { data:sl }, byId] = await Promise.all([
    db.from("requests").select("*").eq("status","pending").order("created_at",{ascending:true}),
    db.rpc("list_staff"), loadSchemes(), loadBranches()]);
  if(!mine()) return;
  if(error){ reportError(error,{op:"requests_to_approve"}); cont.innerHTML=`<div class="empty">${t("connErr")}</div>`; return; }
  const rows=data||[];
  $("d-sub").textContent=String(rows.length);
  if(!rows.length){ cont.innerHTML=`<div class="empty">${ICON.requests}<div>${t("rqNoneWaiting")}</div></div>`; return; }

  const nm={}; (sl||[]).forEach(s=>{ nm[s.id]=s.name; });
  const byRid={}, waitingMember={};
  rows.forEach(r=>{ byRid[r.id]=r; if(r.kind==="member") waitingMember[r.id]=r; });
  const accIds=[...new Set(rows.map(r=>r.account_id).filter(Boolean))];
  const [accRes, numRes, photos] = await Promise.all([
    accIds.length ? db.from("accounts").select("id,holder_name,account_number").in("id",accIds) : { data:[] },
    Object.keys(waitingMember).length ? db.from("accounts").select("account_number") : { data:[] },
    resolveProofUrls(rows.map(r=>({ photo_path:(r.payload||{}).photo_path })))]);
  if(!mine()) return;
  const acc={}; (accRes.data||[]).forEach(a=>{ acc[a.id]=a; });
  const taken=(numRes.data||[]).map(a=>a.account_number||"");

  /* Only a suggestion - reserved numbers count as used, and the database
     refuses a number that is already taken whatever is typed here. */
  const nextFree=(prefix)=>{ if(!prefix) return null; let max=0;
    taken.forEach(n=>{ if(!n.startsWith(prefix)) return; const tail=n.slice(prefix.length);
      if(/^[0-9]+$/.test(tail)) max=Math.max(max,Number(tail)); });
    return prefix+String(max+1).padStart(3,"0"); };

  /* oldest first; a new member's deposits / loans sit right under the member */
  const ordered=[];
  rows.forEach(r=>{
    if(r.kind==="member"){ ordered.push(r); rows.forEach(k=>{ if(k.kind==="product"&&k.for_request_id===r.id) ordered.push(k); }); }
    else if(!(r.for_request_id && waitingMember[r.for_request_id])) ordered.push(r); });

  const pick={};                                              /* request id -> branch chosen for it */
  const who=(r)=>`${t("rqAskedBy")} ${nm[r.created_by]||"?"} · ${reqWhen(r.created_at)}`;
  const actions=(r,blocked)=>`<div class="sh-actions" style="margin-top:11px">
      <button class="btn-danger" data-reject="${r.id}">${t("rqReject")}</button>
      <button class="btn-primary" data-approve="${r.id}" ${blocked?"disabled":""}>${t("rqApprove")}</button></div>`;

  cont.innerHTML=ordered.map(r=>{
    const p=r.payload||{};
    if(r.kind==="member"){
      pick[r.id]=r.branch_id;
      const grid=ENTRY_FIELDS.filter(([k])=>k!=="holder_name"&&!isBlank(p[k])).map(([k,label,kind])=>
        `<div class="vf"><span class="vk">${t(label)}</span><span class="vv">${esc(kind==="date"?dmy(p[k]):String(p[k]))}</span></div>`).join("");
      const photo=photos[p.photo_path];
      return `<div class="card vcard" style="cursor:default">
        <div class="mrow"><div class="mav">${initials(p.holder_name)}</div>
          <div style="flex:1;min-width:0"><div class="mname">${dashEsc(p.holder_name)}</div><div class="mmeta">${esc(who(r))}</div></div>
          <span class="pill-s sb">${t("rqNewMember")}</span></div>
        ${photo?`<img class="thumb" src="${esc(photo)}" data-full="${esc(photo)}" alt=""/>`:""}
        ${grid?`<div class="vgrid">${grid}</div>`:""}
        <label class="flabel">${t("branch")}</label>
        <div class="branchbar" data-brbar="${r.id}" style="padding-bottom:0">
          ${branches.map(b=>`<button type="button" class="chip ${b.id===r.branch_id?"on":""}" data-b="${b.id}">${esc(b.name)}</button>`).join("")}</div>
        <label class="flabel" for="rq-ac-${r.id}">${t("fAcNo")}</label>
        <input class="finput" id="rq-ac-${r.id}" value="${esc(p.account_number||"")}" autocapitalize="characters" spellcheck="false" autocomplete="off"/>
        <div class="rowact" style="justify-content:flex-start;margin-top:5px"><button type="button" class="linkbtn" data-next="${r.id}"></button></div>
        <div class="fmsg" id="rq-msg-${r.id}" style="margin-top:4px"></div>
        ${actions(r,false)}</div>`;
    }
    const par=r.for_request_id ? waitingMember[r.for_request_id] : null;
    const a=acc[r.account_id]||{};
    const name=par ? (par.payload||{}).holder_name : a.holder_name;
    return `<div class="card vcard${par?" reqchild":""}" style="cursor:default">
      <div class="mrow"><div class="mav">${initials(name)}</div>
        <div style="flex:1;min-width:0"><div class="mname">${dashEsc(name)}</div>
          <div class="mmeta">${esc([par?t("rqNewMember"):dash(a.account_number), who(r)].join(" · "))}</div></div>
        <span class="pill-s ${PKIND(p)}">${esc(p.product_type||DASH)}</span></div>
      <div class="vgrid"><div class="vf"><span class="vk">${t("rqAsksFor")}</span><span class="vv">${esc(reqProductLine(p,byId))}</span></div>
        ${p.start_date?`<div class="vf"><span class="vk">${t("fdStart")}</span><span class="vv">${esc(dmy(p.start_date))}</span></div>`:""}</div>
      ${p.note?`<div class="vnote"><span class="vnote-k">${t("staffNote")}</span>${esc(p.note)}</div>`:""}
      ${par?`<div class="fnote warn" style="margin-top:9px">${t("rqMemberFirst")}</div>`:""}
      ${actions(r,!!par)}</div>`;
  }).join("");

  cont.querySelectorAll("img[data-full]").forEach(im=>im.addEventListener("click",()=>openImg(im.dataset.full)));

  /* branch chips + the "next free number" offer under each new member */
  const paintNext=(id)=>{ const b=cont.querySelector(`[data-next="${id}"]`); if(!b) return;
    const br=branchById(pick[id]), n=br ? nextFree(br.account_prefix) : null;
    b.textContent=n ? `${t("rqNextFree")}: ${n}` : t("errNoPrefixSet");
    b.disabled=!n; b.dataset.n=n||""; };
  cont.querySelectorAll("[data-brbar]").forEach(bar=>{ const id=bar.dataset.brbar;
    bar.querySelectorAll(".chip").forEach(ch=>ch.addEventListener("click",()=>{
      pick[id]=ch.dataset.b; bar.querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x===ch)); paintNext(id); }));
    paintNext(id); });
  cont.querySelectorAll("[data-next]").forEach(b=>b.addEventListener("click",()=>{
    const i=$("rq-ac-"+b.dataset.next); if(i && b.dataset.n){ i.value=b.dataset.n; i.focus(); } }));

  const done=()=>{ openRequestCheck();
    if(currentTab==="home" && $("content")) adminDashboard($("content")); };   /* the to-approve count moved */

  cont.querySelectorAll("[data-reject]").forEach(b=>b.addEventListener("click",async()=>{
    const why=prompt(t("rqRejectWhy")); if(why===null) return;
    if(!why.trim()){ toast(t("rqReasonNeeded"),true); return; }
    b.disabled=true;
    const { error:e }=await db.rpc("admin_review_request",{p_id:b.dataset.reject,p_approve:false,p_note:why.trim()});
    if(e){ b.disabled=false; const k=rpcErrKey(e,"admin_review_request"); toast(t(k),true); if(k==="rqDone") done(); return; }
    toast(t("rqRejectedToast")); done();
  }));

  cont.querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click",async()=>{
    const r=byRid[b.dataset.approve]; if(!r) return;
    const p=r.payload||{}, args={ p_id:r.id, p_approve:true };
    let br=null;
    if(r.kind==="member"){
      const msg=$("rq-msg-"+r.id); msg.className="fmsg"; msg.textContent="";
      const fail=(m)=>{ msg.className="fmsg err"; msg.textContent=m; };
      const acno=($("rq-ac-"+r.id).value||"").trim().toUpperCase();
      br=branchById(pick[r.id]);
      if(acno===""||acno===DASH) return fail(t("errNoNumber"));
      if(!br||!br.account_prefix) return fail(t("errNoPrefixSet"));
      if(!acno.startsWith(br.account_prefix)) return fail(`${t("errPrefix")} ${br.account_prefix} (${br.name})`);
      if(!confirm(`${t("rqConfirmMember")} ${acno}?\n${dash(p.holder_name)} · ${br.name}`)) return;
      args.p_account_number=acno; args.p_branch_id=br.id;
    } else if(!confirm(`${t("rqConfirmProduct")}\n${reqProductLine(p,byId)}`)) return;
    b.disabled=true;
    const { data:res, error:e }=await db.rpc("admin_review_request",args);
    if(e){ b.disabled=false; const k=rpcErrKey(e,"admin_review_request");
      toast(k==="errPrefix"&&br ? `${t(k)} ${br.account_prefix}` : t(k),true);
      if(k==="rqDone") done(); return; }
    const out=res||{};
    if(r.kind==="member"){
      const photoOk=!p.photo_path || await copyRequestPhoto(p.photo_path,out);
      allAccounts=[];                                           /* the member list is reloaded next time it opens */
      if(photoOk) toast(`${t("rqMemberAdded")} · ${out.account_number||""}`); else toast(t("photoFailed"),true);
    } else toast(`${t("rqOpened")} · ${out.account_number||""}`);
    done();
  }));
}

/* ---------- helpers ---------- */
/* dates the way people here write them: 03/06/2026 */
/* a date spelled out, so there is no doubt which part is the day: 3 June 2026 */
function dateLong(iso){ const [y,m,d]=String(iso).split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d)).toLocaleDateString(lang==="te"?"te-IN":"en-IN",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}); }
function dmyOr(v){ if(isBlank(v)) return DASH; const x=String(v); return /^\d{4}-\d{2}-\d{2}/.test(x) ? dmy(x.slice(0,10)) : x; }
/* the word for a status, for how often, for a kind of product - in the chosen language */
function statusWord(v){ const k={active:"stActive",running:"stActive",closed:"stClosed",placeholder:"reserved",matured:"matured"}[String(v||"").toLowerCase()]; return k?t(k):dash(v); }
function freqWord(v){ const k=FREQ_KEY[String(v||"").toLowerCase()]; return k?t(k):dash(v); }
function typeWord(v){ return v==="LOAN"?t("loanWord"):dash(v); }
/* The top of a member's page: who this is, at a glance. The picture opens
   full size on a tap - the cashier still confirms the person by it. */
function memberHero(acc, photoUrl, o){
  o = o || {};
  const face = photoUrl
    ? `<img class="hero-photo${o.big?" big":""}" src="${esc(photoUrl)}" data-full="${esc(photoUrl)}" alt=""/>`
    : `<div class="hero-photo ph${o.big?" big":""}">${esc(initials(acc.holder_name))}</div>`;
  const pills = (o.pills||[]).filter(Boolean).map(x=>`<span class="hero-pill ${x[1]||""}">${esc(x[0])}</span>`).join("");
  return `<div class="mhero">${face}
    <div class="hero-name">${dashEsc(acc.holder_name)}</div>
    <div class="hero-acno">${dashEsc(acc.account_number)}</div>
    ${pills?`<div class="hero-pills">${pills}</div>`:""}</div>`;
}
function initials(n){ if(!n)return"?"; const p=n.trim().split(/\s+/); return ((p[0]?.[0]||"")+(p[1]?.[0]||"")).toUpperCase(); }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
let toastTimer;
/* a longer message stays up longer, so it can actually be read */
function toast(m,err){ const el=$("toast"); el.textContent=m; el.className="toast show"+(err?" err":""); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.className="toast",Math.min(6500,Math.max(2500,String(m).length*60))); }

/* ---------- boot ---------- */
(async function init(){
  $("emblem-slot").innerHTML=emblem(104);
  paintLoginLang();
  /* Older versions kept the staff record on the device and trusted it. Clear it:
     who you are is now decided by the server session only. */
  try{ localStorage.removeItem("macs_staff"); }catch(e){}
  /* The page opens on the emblem alone ("booting"). Someone already signed in
     goes straight to the app; everyone else gets the sign-in card. */
  try{
    const { data } = await db.auth.getSession();
    if(data && data.session) await enterApp(false);
  }catch(e){ reportError(e,{op:"boot_session"}); }
  finally{
    $("screen-login").classList.remove("booting");
    /* Tell the opening (splash.js) that the screen behind it is ready. If that
       script never loaded, take its curtain down ourselves. */
    if(window.MACS_SPLASH) window.MACS_SPLASH.bootDone();
    else{ const sp=$("splash"); if(sp) sp.remove(); document.documentElement.classList.remove("splashing"); }
  }
})();

/* ---------- motion: press ripple ----------
   Decoration only. Nothing depends on it, and it is skipped entirely for
   anyone who has asked their device for reduced motion. */
const RIPPLE_ON=".btn-primary,.btn-gold,.btn-ghost,.btn-danger,.actionbtn,.photo-btn,.checkbtn,.chip,.fab,.slot,.tb-btn,.dback,.langpill,.att-btn,.att-link,.bottomnav button,.card[data-acc],.card[style*='cursor:pointer']";
document.addEventListener("pointerdown",(e)=>{
  if(REDUCED || !e.target.closest) return;
  const el=e.target.closest(RIPPLE_ON);
  if(!el || el.disabled) return;
  const r=el.getBoundingClientRect(), d=Math.max(r.width,r.height)*2.1;
  const s=document.createElement("i");
  s.className="ripple";
  s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  el.classList.add("rip"); el.appendChild(s);
  const gone=()=>s.remove();
  s.addEventListener("animationend",gone); setTimeout(gone,900);
},{passive:true});

/* The app keeps its files on the device, so a new version only shows after a
   reload. Say so, and let the person choose the moment - never reload under
   someone who is in the middle of typing an entry. */
if("serviceWorker" in navigator){
  const hadWorker=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!hadWorker || $("updpill")) return;
    const b=document.createElement("button"); b.id="updpill"; b.className="updpill"; b.textContent=t("newVersion");
    b.addEventListener("click",()=>location.reload());
    document.body.appendChild(b);
  });
}

/* ===== MACS Soldiers — the opening =====
   A cinematic reveal of the society's seal, about eleven seconds:

     1  0.0s  deep navy space: drifting blue and gold particles, a rush of
              speed lines, one pass of blue-and-gold light
     2  2.0s  energy trails begin to orbit the centre on tilted rings, close
              in, and a disc of light forms; the seal's border is drawn on it
     3  4.0s  the six clasped hands fly in one by one, the gold one last
     4  6.0s  a burst of gold at the centre and the P emblem appears
     5  7.5s  the lettering comes round in reading order; the border closes
     6  9.0s  everything gathers into the finished seal on a blue field,
              held for a moment, and then it travels to its place in the app

   Nothing here is a redrawing of the seal. Every piece of it on screen is
   cut, at run time, out of the seal's own picture (icons/seal-640.jpg):
     - white is turned into transparency, so a piece can fly over the dark
       scene and lie back down on white exactly as it was;
     - rings, lettering and emblem are separated by radius;
     - the hands are separated with icons/seal-parts.png, a map of which arm
       each pixel belongs to. The artwork already draws a white outline
       wherever one hand crosses another; the map only records it.
   The last frame is the untouched picture itself. Particles, trails, rings
   and light are drawn around it and never replace any part of it.

   This file is loaded before everything else and stands on its own: if the
   rest of the app is slow or fails, the opening still ends and gets out of
   the way. People who ask their device for less motion get a still seal. */
(function () {
  "use strict";
  const root = document.getElementById("splash");
  if (!root) return;

  const html = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now();
  const since = () => performance.now() - t0;

  /* app.js calls bootDone() once it knows whether someone is signed in */
  let bootDone;
  const boot = new Promise((res) => { bootDone = res; });
  window.MACS_SPLASH = { bootDone: () => bootDone() };

  html.classList.add("splashing");

  /* This opening (v1) is the one for everyone. Intro v3 (splash-v3.js) stays
     for a phone that opens the app once with ?intro=v3; ?intro=v1 goes back.
     The stored choice has a new name (macs_intro_pick), so phones that had
     v3 from before come back to this one. bootDone() is kept until v3 has
     loaded and asks for it. */
  let pick = "v1";
  try {
    localStorage.removeItem("macs_intro");
    const m = location.search.match(/[?&]intro=(v1|v3)(?![0-9a-z])/i);
    if (m) localStorage.setItem("macs_intro_pick", m[1].toLowerCase());
    pick = localStorage.getItem("macs_intro_pick") || "v1";
  } catch (e) {}
  if (pick === "v3") {
    window.__macsBootHooks = [];
    window.MACS_SPLASH = { bootDone: () => { window.__macsBooted = true; window.__macsBootHooks.forEach((f) => f()); } };
    root.style.background = "#020818";
    for (const c of [...root.children]) c.style.visibility = "hidden";
    const s = document.createElement("script"); s.src = "splash-v3.js";
    s.onerror = () => { html.classList.remove("splashing"); html.classList.add("splashed"); root.remove(); };
    document.head.appendChild(s);
    return;
  }

  const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const q = (sel) => root.querySelector(sel);
  const stage = $("sp-stage"), seal = $("sp-seal"), box = $("sp-layers"), finalImg = $("sp-final");
  const env = $("sp-env"), over = $("sp-over"), lines = $("sp-lines"), hero = q(".sp-hero");
  const aura = q(".sp-aura"), bloom = q(".sp-bloom"), paper = q(".sp-paper"), rays = q(".sp-rays"), gold = q(".sp-gold");

  /* The full opening plays on the first visit of the day. After that the seal
     simply appears: staff open the app many times a day and should not be
     made to wait eleven seconds each time. ?splash=full shows it again. */
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const DAY_KEY = "macs_opening_day";
  let seenToday = false;
  try { seenToday = localStorage.getItem(DAY_KEY) === today; } catch (e) {}
  if (/[?&]splash=full\b/.test(location.search)) seenToday = false;

  /* ---------- the clock ----------
     Scene 1 needs nothing but the page, so it starts at once. The rest waits
     for the seal's pieces; if they arrive late, the clock is held at the
     start of scene 2 rather than skipping ahead. */
  const P2 = 2000, P3 = 4000, P4 = 6000, P5 = 7500, P6 = 9000, END = 10800;
  let zero = t0;
  const tl = () => performance.now() - zero;

  const EASE_OUT = "cubic-bezier(.16,1,.3,1)", EASE_IO = "cubic-bezier(.65,0,.35,1)";
  const anims = [], timers = [];
  const play = (el, frames, opts) => {
    if (!el || !el.animate) return null;
    const a = el.animate(frames, Object.assign({ fill: "both" }, opts));
    anims.push(a); return a;
  };
  /* at(): starts at a moment on the clock. flash(): leaves no trace before or after. */
  const at = (el, frames, start, duration, opts) => play(el, frames, Object.assign({ delay: start - tl(), duration }, opts || {}));
  const flash = (el, frames, start, duration, opts) => at(el, frames, start, duration, Object.assign({ fill: "none" }, opts || {}));
  const later = (ms, fn) => { timers.push(setTimeout(fn, Math.max(0, ms))); };
  const laterAt = (t, fn) => later(t - tl(), fn);

  let left = false, skipped = false, fx = null;
  /* whatever happens, never sit on top of the app for long */
  const watchdog = setTimeout(() => leave(true), 20000);

  /* ---------- cutting the seal into its pieces ---------- */
  const N = 640;                                   /* working size = the picture's own size */
  const R_EMBLEM = 0.215, R_HANDS = 0.625, R_INNER = 0.70, R_TEXT = 0.93;   /* measured on the artwork, as parts of the radius */
  const OUTER = 1, TEXT = 2, INNER = 3, ARM0 = 3, EMBLEM = 10;              /* arms are 4..9 */

  const loaded = (img) => new Promise((res, rej) => {
    if (img.complete && img.naturalWidth) return res(img);
    img.addEventListener("load", () => res(img), { once: true });
    img.addEventListener("error", () => rej(new Error("image")), { once: true });
  });

  async function buildParts() {
    const mapImg = new Image(); mapImg.src = "icons/seal-parts.png";
    await Promise.all([loaded(finalImg), loaded(mapImg)]);
    const cv = document.createElement("canvas"); cv.width = cv.height = N;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(finalImg, 0, 0, N, N);
    const src = cx.getImageData(0, 0, N, N).data;
    cx.clearRect(0, 0, N, N); cx.imageSmoothingEnabled = false; cx.drawImage(mapImg, 0, 0, N, N);
    const map = cx.getImageData(0, 0, N, N).data;

    const keyed = new Uint8ClampedArray(N * N * 4), which = new Uint8Array(N * N), boxes = [];
    const ends = [];                               /* per arm: where its hand end and its sleeve end sit */
    for (let a = 0; a < 6; a++) ends.push([0, 0, 0, 0, 0, 0]);
    const half = N / 2;
    for (let y = 0; y < N; y++) {
      const dy = y + 0.5 - half;
      for (let x = 0; x < N; x++) {
        const p = y * N + x, i = p * 4, r = src[i], g = src[i + 1], b = src[i + 2];
        const a = 255 - Math.min(r, g, b);            /* how far from white = how solid */
        if (a < 10) continue;
        const dx = x + 0.5 - half, rad = Math.sqrt(dx * dx + dy * dy) / half;
        let k;
        if (rad > R_TEXT) k = OUTER;
        else if (rad > R_INNER) k = TEXT;
        else if (rad > R_HANDS) k = INNER;
        else if (rad > R_EMBLEM) {
          const arm = Math.round(map[i] / 40); if (arm < 1 || arm > 6) continue; k = ARM0 + arm;
          if (a > 120) { const e = ends[arm - 1], o = rad < 0.43 ? 0 : 3; e[o] += x; e[o + 1] += y; e[o + 2]++; }
        }
        else k = EMBLEM;
        /* the colour that, laid back over white at this solidity, gives the original pixel */
        const f = 255 / a;
        keyed[i] = 255 - (255 - r) * f; keyed[i + 1] = 255 - (255 - g) * f; keyed[i + 2] = 255 - (255 - b) * f; keyed[i + 3] = a;
        which[p] = k;
        const bx = boxes[k] || (boxes[k] = [x, y, x, y]);
        if (x < bx[0]) bx[0] = x; if (y < bx[1]) bx[1] = y; if (x > bx[2]) bx[2] = x; if (y > bx[3]) bx[3] = y;
      }
    }
    const pct = (v) => (v / N * 100).toFixed(4) + "%";
    const piece = (k) => {
      const bx = boxes[k]; if (!bx) return null;
      const w = bx[2] - bx[0] + 1, h = bx[3] - bx[1] + 1;
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d"), id = ctx.createImageData(w, h), d = id.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = (bx[1] + y) * N + bx[0] + x; if (which[p] !== k) continue;
        const s = p * 4, t = (y * w + x) * 4;
        d[t] = keyed[s]; d[t + 1] = keyed[s + 1]; d[t + 2] = keyed[s + 2]; d[t + 3] = keyed[s + 3];
      }
      ctx.putImageData(id, 0, 0);
      c.style.cssText = `left:${pct(bx[0])};top:${pct(bx[1])};width:${pct(w)};height:${pct(h)}`;
      c._box = [bx[0], bx[1], w, h];
      return c;
    };
    const parts = { outer: piece(OUTER), text: piece(TEXT), inner: piece(INNER), emblem: piece(EMBLEM), arms: [], ends: [] };
    for (let a = 1; a <= 6; a++) {
      parts.arms.push(piece(ARM0 + a));
      const e = ends[a - 1];
      parts.ends.push({ ix: e[2] ? e[0] / e[2] : half, iy: e[2] ? e[1] / e[2] : half, ox: e[5] ? e[3] / e[5] : half, oy: e[5] ? e[4] / e[5] : half });
    }
    if (!parts.outer || !parts.text || !parts.inner || !parts.emblem || parts.arms.some((c) => !c)) throw new Error("parts");
    return parts;
  }

  /* a soft copy of one piece - a shadow under it, or a glow around it - as its
     own picture, so nothing has to be blurred while it moves */
  function haloOf(c, color, blur, dy, twice) {
    const pad = Math.round(N * 0.05), w = c.width + pad * 2, h = c.height + pad * 2;
    const s = document.createElement("canvas"); s.width = w; s.height = h;
    const ctx = s.getContext("2d");
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 5000; ctx.shadowOffsetY = dy;
    ctx.drawImage(c, pad - 5000, pad);
    if (twice) ctx.drawImage(c, pad - 5000, pad);
    s._pad = pad;
    return s;
  }

  /* ---------- drawing something round, the way a pen would ---------- */
  let SWEEP = false;
  try { CSS.registerProperty({ name: "--sp-a", syntax: "<angle>", inherits: false, initialValue: "0deg" }); SWEEP = true; }
  catch (e) { SWEEP = !!(e && e.name === "InvalidModificationError"); }      /* already registered is fine too */
  const SOFT = 14;
  /* keys: [[moment on the clock, degrees drawn so far], ...] */
  function sweep(el, from, ccw, keys, b) {
    const first = keys[0][0], last = keys[keys.length - 1][0], span = Math.max(1, last - first);
    if (!SWEEP) { at(el, [{ opacity: 0 }, { opacity: 1 }], first + span * 0.2, span * 0.6, { easing: "ease" }); return; }
    const m = ccw
      ? `conic-gradient(from ${from}deg, rgba(0,0,0,0) 0deg, rgba(0,0,0,0) calc(360deg - var(--sp-a) - ${SOFT}deg), #000 calc(360deg - var(--sp-a)), #000 360deg)`
      : `conic-gradient(from ${from}deg, #000 0deg, #000 var(--sp-a), rgba(0,0,0,0) calc(var(--sp-a) + ${SOFT}deg), rgba(0,0,0,0) 360deg)`;
    /* the gradient is centred on the seal, not on this piece's own box */
    b = b || el._box;
    const size = `${(N / b[2] * 100).toFixed(3)}% ${(N / b[3] * 100).toFixed(3)}%`;
    const pos = `${(b[2] === N ? 0 : b[0] / (N - b[2]) * 100).toFixed(3)}% ${(b[3] === N ? 0 : b[1] / (N - b[3]) * 100).toFixed(3)}%`;
    el.style.webkitMaskImage = m; el.style.maskImage = m;
    el.style.webkitMaskSize = size; el.style.maskSize = size;
    el.style.webkitMaskPosition = pos; el.style.maskPosition = pos;
    el.style.webkitMaskRepeat = "no-repeat"; el.style.maskRepeat = "no-repeat";
    const frames = keys.map((k) => ({ "--sp-a": `${k[1]}deg`, offset: (k[0] - first) / span, easing: EASE_IO }));
    at(el, frames, first, span, { easing: "linear" });
    if (keys[keys.length - 1][1] >= 360) laterAt(last + 60, () => { el.style.webkitMaskImage = "none"; el.style.maskImage = "none"; });
  }

  /* =====================================================================
     THE SCENE AROUND THE SEAL
     Two canvases: one behind the seal, one in front of it. Whatever orbits
     the centre is drawn half on each, so trails really pass behind the seal
     and come round in front of it.
     ===================================================================== */
  function startFx() {
    const bc = $("sp-fx-bg"), fc = $("sp-fx-fg");
    if (!bc || !fc || !bc.getContext) return null;
    const b = bc.getContext("2d"), f = fc.getContext("2d");
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    let weak = mem <= 2 || cores <= 4;              /* a modest phone: fewer particles, coarser canvas */
    let W = 0, H = 0, dpr = 1, running = true;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 1.5);
      W = root.clientWidth; H = root.clientHeight;
      [bc, fc].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    };
    size(); window.addEventListener("resize", size);

    const COL = { blue: "64,140,255", cyan: "120,205,255", gold: "255,196,58", pink: "255,84,178", white: "236,244,255" };
    const SPR = {};
    for (const k in COL) {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.16, `rgba(${COL[k]},.95)`);
      g.addColorStop(0.5, `rgba(${COL[k]},.26)`); g.addColorStop(1, `rgba(${COL[k]},0)`);
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); SPR[k] = c;
    }
    const rnd = (a, c) => a + Math.random() * (c - a);
    const clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
    const easeOut = (k) => 1 - Math.pow(1 - k, 3), easeIn = (k) => k * k * k;
    const DEG = Math.PI / 180;

    /* particles: a field of points we are flying into */
    const tint = (T) => { const r = Math.random();
      if (T > P6 - 400) return r < 0.68 ? "gold" : r < 0.9 ? "blue" : "white";
      return r < 0.46 ? "blue" : r < 0.66 ? "cyan" : r < 0.94 ? "gold" : "white"; };
    /* during the rush a new point starts far away; in calm it may appear anywhere in depth, fading in */
    const reseed = (p, T, far) => { p.a = rnd(0, 6.283); p.d = rnd(0.22, 1.5);
      p.z = !far ? rnd(0.14, 1) : T > 1900 ? rnd(0.3, 1) : rnd(0.82, 1); p.f = far ? 0 : 1;
      p.s = rnd(0.6, 1.7); p.col = tint(T); p.tw = rnd(0, 6.283); p.px = null; return p; };
    let dots = []; for (let i = 0; i < (weak ? 70 : 125); i++) dots.push(reseed({}, 0, false));
    const speed = (T) => T < 850 ? 0.05 : T < 1250 ? 0.05 + (T - 850) / 400 * 1.05 : T < 1850 ? 1.1 - (T - 1250) / 600 * 1.0
      : T < P6 ? 0.07 : 0.035;
    const swirl = (T) => T < P2 - 100 ? 0 : T < P6 ? 0.3 * clamp((T - P2 + 100) / 600) : 0.3 - 0.22 * clamp((T - P6) / 500);

    /* the energy trails: comets on tilted rings round the centre */
    const ORB = [
      { col: "blue",  r0: 1.95, r1: 1.07, tilt: 66,  phi: 18,  w: 2.7,  born: P2,       len: 2.3, lw: 2.4, ph: 0.3 },
      { col: "gold",  r0: 1.75, r1: 1.13, tilt: -57, phi: -34, w: -2.2, born: P2 + 130, len: 1.9, lw: 2.2, ph: 2.1 },
      { col: "cyan",  r0: 2.35, r1: 1.36, tilt: 74,  phi: 82,  w: 1.6,  born: P2 + 280, len: 2.8, lw: 1.8, ph: 4.0 },
      { col: "gold",  r0: 2.15, r1: 1.25, tilt: 42,  phi: 143, w: -1.3, born: P2 + 430, len: 1.5, lw: 1.8, ph: 1.2 },
      { col: "blue",  r0: 1.55, r1: 1.035, tilt: 20, phi: 0,   w: 3.3,  born: P2 + 600, len: 1.3, lw: 2.0, ph: 5.2 },
      { col: "white", r0: 2.7,  r1: 1.52, tilt: -70, phi: 60,  w: 1.1,  born: P2 + 760, len: 3.2, lw: 1.2, ph: 3.3 },
    ];
    const sparks = [], waves = [], motes = [];
    for (let i = 0; i < 11; i++) motes.push({ a: rnd(0, 6.283), r: rnd(0.25, 0.37), w: rnd(1.6, 3.2) * (i % 2 ? 1 : -1), s: rnd(0.7, 1.4) });
    const burst = (x, y, n, col, v, alt) => { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(0.35, 1) * v;
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.35, 0.8), max: 0.8, col: alt && Math.random() < 0.3 ? alt : col, sz: rnd(0.8, 1.9) }); } };
    const wave = (t, dur, r0, r1, col, lw) => waves.push({ t, dur, r0, r1, col, lw });

    /* things that happen once, at a moment on the clock */
    const cues = [];
    const cue = (t, fn) => cues.push({ t, fn });
    let cx = 0, cy = 0, Rs = 100, last = performance.now(), frames = 0, slow = 0, textFed = 0;

    function orbit(o, T) {
      const age = T - o.born; if (age <= 0) return;
      const out = clamp((T - P6) / 380), a = clamp(age / 350) * (T < P3 ? 1 : 0.8) * (1 - out);
      if (a <= 0.01) return;
      let R = (o.r0 + (o.r1 - o.r0) * easeOut(clamp(age / 1300))) * Rs;
      if (T > P6) R += (Rs - R) * easeIn(out);                       /* gathering into the seal */
      const e = Math.abs(Math.cos(o.tilt * DEG)), rot = o.phi * DEG, sgn = Math.sin(o.tilt * DEG) < 0 ? -1 : 1;
      const front = (ang) => Math.sin(ang) * sgn > 0;
      if (!weak) {                                                    /* the ring itself, faint */
        for (let h = 0; h < 2; h++) { const ctx = front(h ? 4.7 : 1.6) ? f : b;
          ctx.beginPath(); ctx.ellipse(cx, cy, R, R * e, rot, h * Math.PI, (h + 1) * Math.PI);
          ctx.strokeStyle = `rgba(${COL[o.col]},${(0.16 * a).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke(); }
      }
      const headA = o.ph + o.w * age / 1000, n = weak ? 8 : 12, step = o.len / n * (o.w > 0 ? -1 : 1);
      for (let i = 0; i < n; i++) {
        const a1 = headA + i * step, a2 = a1 + step, ctx = front((a1 + a2) / 2) ? f : b;
        const al = a * Math.pow(1 - i / n, 1.7);
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * e, rot, Math.min(a1, a2), Math.max(a1, a2));
        ctx.lineCap = "round";
        if (i < 4) { ctx.strokeStyle = `rgba(${COL[o.col]},${(al * 0.22).toFixed(3)})`; ctx.lineWidth = o.lw * 3.4; ctx.stroke(); }
        ctx.strokeStyle = `rgba(${COL[o.col]},${al.toFixed(3)})`; ctx.lineWidth = o.lw * (1 - 0.65 * i / n); ctx.stroke();
      }
      const hx = Math.cos(headA) * R, hy = Math.sin(headA) * R * e;
      const sx = cx + hx * Math.cos(rot) - hy * Math.sin(rot), sy = cy + hx * Math.sin(rot) + hy * Math.cos(rot);
      const ctx = front(headA) ? f : b, g = 9 + o.lw * 3;
      ctx.globalAlpha = a; ctx.drawImage(SPR[o.col], sx - g, sy - g, g * 2, g * 2); ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const T = tl();
      /* a phone that cannot keep up gets a lighter scene instead of a stuttering one */
      if (!weak && T > 300 && frames < 50) { frames++; slow += dt; if (frames === 50 && slow / 50 > 0.026) { weak = true; dots = dots.slice(0, 70); size(); } }
      const sr = seal.getBoundingClientRect();
      cx = sr.left + sr.width / 2; cy = sr.top + sr.height / 2; Rs = (sr.width + sr.height) / 4;
      b.setTransform(dpr, 0, 0, dpr, 0, 0); f.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.clearRect(0, 0, W, H); f.clearRect(0, 0, W, H);
      b.globalCompositeOperation = "lighter";

      /* particles */
      const v = speed(T), sw = swirl(T), U = Math.max(W, H) * 0.52;
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        p.z -= v * dt * (0.6 + p.s * 0.4); p.a += sw * dt * (0.5 + 0.5 / (p.z + 0.3)); p.tw += dt * 3; if (p.f < 1) p.f = Math.min(1, p.f + dt * 1.6);
        if (p.z < 0.13) reseed(p, T, true);
        const k = p.d * U / (p.z * 3.2 + 0.25), x = cx + Math.cos(p.a) * k, y = cy + Math.sin(p.a) * k;
        if (x < -60 || y < -60 || x > W + 60 || y > H + 60) { reseed(p, T, true); continue; }
        const al = Math.min(1, (1 - p.z) * 3 + 0.22) * p.f * (0.62 + 0.38 * Math.sin(p.tw)), r = p.s * (2.1 + 5.2 * (1 - p.z));
        if (v > 0.3 && p.px !== null) {                               /* rushing: draw the streak it leaves */
          b.strokeStyle = `rgba(${COL[p.col]},${(al * 0.75).toFixed(3)})`; b.lineWidth = Math.max(0.8, r * 0.34); b.lineCap = "round";
          b.beginPath(); b.moveTo(p.px, p.py); b.lineTo(x, y); b.stroke();
        }
        b.globalAlpha = al; b.drawImage(SPR[p.col], x - r, y - r, r * 2, r * 2);
        p.px = x; p.py = y;
      }
      b.globalAlpha = 1;

      for (let i = 0; i < ORB.length; i++) orbit(ORB[i], T);

      /* gold motes circling the emblem */
      if (T > P4 + 80 && T < P5 + 1300) {
        const a = clamp((T - P4 - 80) / 300) * (1 - clamp((T - P5 - 700) / 600));
        for (let i = 0; i < motes.length; i++) { const m = motes[i]; m.a += m.w * dt;
          const x = cx + Math.cos(m.a) * m.r * Rs, y = cy + Math.sin(m.a) * m.r * Rs * 0.92, r = 3.2 * m.s;
          f.globalAlpha = a * 0.9; f.drawImage(SPR.gold, x - r * 2, y - r * 2, r * 4, r * 4); }
        f.globalAlpha = 1;
      }
      /* pink sparks at the pen while the lettering is drawn */
      if (T > P5 + 150 && T < P5 + 1200 && now - textFed > 28) { textFed = now;
        const k = (T - P5 - 150) / 1050, ee = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const ang = (168 + ee * 374 - 8) * DEG, x = cx + Math.sin(ang) * Rs * 0.82, y = cy - Math.cos(ang) * Rs * 0.82;
        burst(x, y, 2, "pink", 90, "white"); }

      for (let i = cues.length - 1; i >= 0; i--) if (T >= cues[i].t) { const c = cues.splice(i, 1)[0]; try { c.fn(); } catch (e) {} }

      /* rings of light that spread from a point */
      for (let i = waves.length - 1; i >= 0; i--) { const w = waves[i], k = (T - w.t) / w.dur;
        if (k < 0) continue; if (k >= 1) { waves.splice(i, 1); continue; }
        const R = (w.r0 + (w.r1 - w.r0) * easeOut(k)) * Rs, al = (1 - k) * (1 - k);
        [b, f].forEach((ctx, j) => { ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283);
          ctx.strokeStyle = `rgba(${COL[w.col]},${(al * (j ? 0.55 : 0.9)).toFixed(3)})`; ctx.lineWidth = w.lw * (1 + 2 * (1 - k)); ctx.stroke(); }); }
      /* sparks */
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; const drag = 1 - 2.4 * dt; s.vx *= drag; s.vy *= drag;
        const al = Math.min(1, s.life / s.max * 1.6), r = s.sz * 2.6;
        f.strokeStyle = `rgba(${COL[s.col]},${(al * 0.8).toFixed(3)})`; f.lineWidth = s.sz; f.lineCap = "round";
        f.beginPath(); f.moveTo(s.x, s.y); f.lineTo(s.x - s.vx * 0.045, s.y - s.vy * 0.045); f.stroke();
        f.globalAlpha = al; f.drawImage(SPR[s.col], s.x - r, s.y - r, r * 2, r * 2); f.globalAlpha = 1; }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return {
      cue, burst, wave,
      at: (fx_, fy_) => ({ x: cx + (fx_ / N - 0.5) * 2 * Rs, y: cy + (fy_ / N - 0.5) * 2 * Rs }),
      centre: () => ({ x: cx, y: cy, R: Rs }),
      stop: () => { running = false; window.removeEventListener("resize", size); },
    };
  }

  /* ---------- the full opening ---------- */
  function fullOpening(parts) {
    if (tl() > P2) zero = performance.now() - P2;     /* the pieces came late: hold the clock at scene 2 */
    const S = stage.getBoundingClientRect().width || 240;
    const add = (el) => { box.appendChild(el); return el; };
    const el = (cls, css) => { const d = document.createElement("div"); d.className = cls; if (css) d.style.cssText = css; return d; };

    /* the camera: a slow push-in with a slight turn, flat and exact by the final shot */
    const cam = (rx, ry, k) => `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${k})`;
    const camT = (t) => (t - 3000) / (END - 3000);
    at(seal, [
      { transform: cam(11, -15, 0.8), offset: 0, easing: "ease-in-out" },
      { transform: cam(5, 9, 0.9), offset: camT(P3 + 900), easing: "ease-in-out" },
      { transform: cam(-4, -6, 0.96), offset: camT(P4 + 700), easing: "ease-in-out" },
      { transform: cam(2, 3, 0.99), offset: camT(P5 + 800), easing: "ease-in-out" },
      { transform: cam(0, 0, 1), offset: camT(P6 + 150), easing: "ease-out" },
      { transform: cam(0, 0, 1.045), offset: 1 }], 3000, END - 3000, { easing: "linear" });

    /* scene 2: light gathers into a disc, and the border is drawn on it */
    at(bloom, [{ opacity: 0, transform: "scale(.05)" }, { opacity: 1, transform: "scale(.5)", offset: 0.35 }, { opacity: 0, transform: "scale(1.25)" }], 2850, 620, { easing: "ease-out" });
    at(paper, [{ opacity: 0, transform: "scale(.12)" }, { opacity: 1, transform: "scale(1.03)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }], 3020, 520, { easing: EASE_OUT });
    at(aura, [{ opacity: 0 }, { opacity: 1 }], 3050, 700, { easing: "ease" });
    const outer = add(parts.outer);
    sweep(outer, 0, false, [[3180, -SOFT], [4000, 300], [P5 + 1150, 300], [P5 + 1450, 360]]);
    const comet = add(el("sp-comet"));
    at(comet, [{ transform: "rotate(0deg)" }, { transform: "rotate(314deg)" }], 3180, 820, { easing: EASE_IO });
    flash(comet, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], 3180, 880, { easing: "linear" });
    const comet2 = add(el("sp-comet"));                                /* the same pen, closing the border in scene 5 */
    at(comet2, [{ transform: "rotate(314deg)" }, { transform: "rotate(374deg)" }], P5 + 1150, 300, { easing: EASE_IO });
    flash(comet2, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], P5 + 1150, 360, { easing: "linear" });
    if (fx) { fx.cue(2960, () => { const c = fx.centre(); fx.burst(c.x, c.y, 20, "cyan", 420, "white"); fx.wave(2960, 700, 0.15, 1.35, "cyan", 1.6); }); }

    /* scene 3: the hands. Each arm flies in along its own length, trailing light,
       and takes hold; the five blue ones first, the gold one last. */
    const hands = add(el("sp-hands"));
    const order = [2, 3, 4, 5, 6, 1];
    order.forEach((armNo, n) => {
      const c = parts.arms[armNo - 1], b = c._box, e = parts.ends[armNo - 1], isGold = armNo === 1;
      const wrap = el("", `position:absolute;left:${b[0] / N * 100}%;top:${b[1] / N * 100}%;width:${b[2] / N * 100}%;height:${b[3] / N * 100}%;opacity:0`);
      const ang = (329 + 60 * (armNo - 1)) * Math.PI / 180;           /* the way this arm reaches, clockwise from 12 */
      const ux = Math.sin(ang), uy = -Math.cos(ang), dist = 0.8 * S;
      const start = P3 + 50 + (isGold ? 980 : n * 190), duration = isGold ? 800 : 760;
      /* the light it trails: one streak behind each end of the arm */
      const tail = Math.atan2(-uy, -ux) * 180 / Math.PI;
      [[e.ix, e.iy, 1], [e.ox, e.oy, 0.7]].forEach((pt) => {
        const st = el("sp-streak" + (isGold ? " gold" : ""),
          `left:${(pt[0] - b[0]) / b[2] * 100}%;top:${(pt[1] - b[1]) / b[3] * 100}%;width:${(0.95 * S * pt[2]).toFixed(0)}px;height:${(0.075 * S).toFixed(1)}px;margin-top:${(-0.0375 * S).toFixed(1)}px`);
        wrap.appendChild(st);
        at(st, [{ opacity: 0, transform: `rotate(${tail.toFixed(1)}deg) scaleX(1)` }, { opacity: 0.95, offset: 0.12 }, { opacity: 0.75, offset: 0.55 },
          { opacity: 0, transform: `rotate(${tail.toFixed(1)}deg) scaleX(.08)` }], start, duration * 0.92, { easing: "ease-out" });
      });
      const sh = haloOf(c, "rgba(8,24,70,.5)", N * 0.022, N * 0.014);
      sh.style.cssText = `position:absolute;left:${(-sh._pad / c.width * 100).toFixed(3)}%;top:${(-sh._pad / c.height * 100).toFixed(3)}%;` +
        `width:${(sh.width / c.width * 100).toFixed(3)}%;height:${(sh.height / c.height * 100).toFixed(3)}%`;
      c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      wrap.appendChild(sh); wrap.appendChild(c); hands.appendChild(wrap);
      at(wrap, [
        { opacity: 0, transform: `translate(${(-ux * dist).toFixed(1)}px,${(-uy * dist).toFixed(1)}px) rotate(-16deg) scale(.8)` },
        { opacity: 1, offset: 0.28 },
        { opacity: 1, transform: "translate(0,0) rotate(0deg) scale(1)" }], start, duration, { easing: EASE_OUT });
      at(sh, [{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0.9, offset: 0.78 }, { opacity: 0 }], start, duration + 180, { easing: "linear" });
      /* a flash of its own colour under the hand as it takes hold */
      const fl = el("sp-flashdot" + (isGold ? " gold" : ""), `left:${e.ix / N * 100}%;top:${e.iy / N * 100}%`);
      box.insertBefore(fl, hands);
      flash(fl, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 0.9, offset: 0.25 }, { opacity: 0, transform: "scale(1.5)" }], start + duration * 0.62, 460, { easing: "ease-out" });
      if (fx) fx.cue(start + duration * 0.66, () => { const p = fx.at(e.ix, e.iy); fx.burst(p.x, p.y, isGold ? 18 : 9, isGold ? "gold" : "blue", isGold ? 300 : 230, "white"); });
    });
    /* all six have hold: one pulse through everything */
    const CLASP = P3 + 50 + 980 + 800 - 40;
    at(hands, [{ transform: "scale(1)" }, { transform: "scale(1.04)", offset: 0.45 }, { transform: "scale(1)" }], CLASP, 460, { easing: "ease-in-out" });
    flash(stage, [{ transform: "scale(1)" }, { transform: "scale(1.03)", offset: 0.4 }, { transform: "scale(1)" }], CLASP, 200, { easing: "ease-out" });
    flash(lines, [{ opacity: 0, transform: "scale(1.25)" }, { opacity: 0.55, offset: 0.3 }, { opacity: 0, transform: "scale(.96)" }], CLASP - 40, 420, { easing: "ease-out" });
    if (fx) fx.cue(CLASP, () => { fx.wave(CLASP, 800, 0.3, 1.75, "white", 1.8); fx.wave(CLASP + 90, 900, 0.3, 2.1, "blue", 1.2); });

    /* scene 4: a burst of gold at the centre, and the emblem */
    at(gold, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.1)", offset: 0.3 }, { opacity: 0.55, transform: "scale(1)", offset: 0.6 }, { opacity: 0, transform: "scale(1.3)" }],
      P4, 1500, { easing: "ease-out" });
    at(rays, [{ opacity: 0, transform: "scale(.3) rotate(0deg)" }, { opacity: 0.9, transform: "scale(1) rotate(25deg)", offset: 0.22 }, { opacity: 0.5, transform: "scale(1.02) rotate(70deg)", offset: 0.7 }, { opacity: 0, transform: "scale(1.06) rotate(95deg)" }],
      P4 + 20, 2700, { easing: "linear" });
    flash(stage, [{ transform: "scale(1)" }, { transform: "scale(1.055)", offset: 0.3 }, { transform: "scale(1)" }], P4, 640, { easing: "ease-out" });
    flash(lines, [{ opacity: 0, transform: "scale(1.3) rotate(8deg)" }, { opacity: 0.6, offset: 0.25 }, { opacity: 0, transform: "scale(.95) rotate(8deg)" }], P4 - 30, 480, { easing: "ease-out" });
    const emblem = add(parts.emblem); emblem.style.opacity = "0";
    at(emblem, [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "scale(1.06)", offset: 0.7 }, { opacity: 1, transform: "scale(1)" }], P4 + 130, 720, { easing: EASE_OUT });
    try {
      const eb = emblem._box, shine = add(el("sp-shine")), url = `url(${emblem.toDataURL("image/png")})`;
      shine.style.cssText = `left:${eb[0] / N * 100}%;top:${eb[1] / N * 100}%;width:${eb[2] / N * 100}%;height:${eb[3] / N * 100}%;` +
        `-webkit-mask-image:${url};mask-image:${url};-webkit-mask-size:100% 100%;mask-size:100% 100%`;
      const band = shine.appendChild(document.createElement("i"));
      at(band, [{ transform: "translateX(-130%) skewX(-18deg)" }, { transform: "translateX(230%) skewX(-18deg)" }], P4 + 680, 760, { easing: EASE_IO });
    } catch (e) {}
    if (fx) fx.cue(P4 + 20, () => { const c = fx.centre(); fx.burst(c.x, c.y, 38, "gold", 520, "white");
      fx.wave(P4 + 20, 700, 0.1, 0.62, "gold", 1.6); fx.wave(P4 + 300, 800, 0.12, 0.78, "gold", 1.1); });

    /* scene 5: the lettering comes round in reading order, glowing; the border closes */
    const inner = add(parts.inner);
    sweep(inner, 0, true, [[P5, -SOFT], [P5 + 650, 360]]);
    const tb = parts.text._box;
    const glow = haloOf(parts.text, "rgba(255,40,165,.95)", N * 0.03, 0, true);
    const gb = [tb[0] - glow._pad, tb[1] - glow._pad, glow.width, glow.height];
    glow.style.cssText = `left:${gb[0] / N * 100}%;top:${gb[1] / N * 100}%;width:${gb[2] / N * 100}%;height:${gb[3] / N * 100}%`;
    add(glow);
    sweep(glow, 168, false, [[P5 + 110, -SOFT], [P5 + 1160, 360]], gb);
    at(glow, [{ opacity: 1 }, { opacity: 0 }], P5 + 1250, 620, { easing: "ease" });
    const text = add(parts.text);
    sweep(text, 168, false, [[P5 + 150, -SOFT], [P5 + 1200, 360]]);    /* from just before the star at the foot, so it shows whole */

    /* scene 6: everything gathers; the untouched seal on a blue field */
    at(hero, [{ opacity: 0 }, { opacity: 1 }], P6, 620, { easing: "ease" });
    flash(lines, [{ opacity: 0, transform: "scale(1.35) rotate(-6deg)" }, { opacity: 0.7, offset: 0.3 }, { opacity: 0, transform: "scale(.94) rotate(-6deg)" }], P6 - 20, 520, { easing: "ease-out" });
    if (fx) fx.cue(P6 + 130, () => { fx.wave(P6 + 130, 900, 1.0, 1.7, "white", 2); fx.wave(P6 + 220, 1100, 1.0, 2.3, "gold", 1.2); });
    at(finalImg, [{ opacity: 0 }, { opacity: 1 }], P6 + 150, 260, { easing: "ease" });
    laterAt(P6 + 470, () => { box.style.display = "none"; gold.style.display = "none"; rays.style.display = "none"; });

    laterAt(END, () => { try { localStorage.setItem(DAY_KEY, today); } catch (e) {} finish(0); });
  }

  /* ---------- the short one: the seal simply arrives ---------- */
  function shortOpening(haveImage) {
    if (haveImage) {
      play(aura, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease" });
      play(paper, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease" });
      play(finalImg, [{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease" });
      play(seal, [{ transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 640, easing: EASE_OUT });
      play(hero, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: "ease" });
      const ring = document.createElement("div"); ring.className = "sp-ringflash"; seal.insertBefore(ring, paper);
      play(ring, [{ opacity: 0.9, transform: "scale(.8)" }, { opacity: 0, transform: "scale(1.7)" }], { delay: 120, duration: 760, easing: "ease-out" });
    }
    later(haveImage ? 850 : 0, () => finish(Math.max(0, 1200 - since())));
  }
  function stillSeal(haveImage) {                       /* reduced motion: no movement at all */
    if (haveImage) { aura.style.opacity = "1"; paper.style.opacity = "1"; finalImg.style.opacity = "1"; hero.style.opacity = "1"; }
    finish(Math.max(0, 1000 - since()));
  }

  /* ---------- handing over to the app ---------- */
  async function finish(hold) {
    await wait(hold);
    await Promise.race([boot, wait(6000)]);             /* the app decides what is behind us; do not wait for ever */
    leave(false);
  }
  function landingSpot() {
    if (document.querySelector(".detail.open")) return null;
    const login = $("screen-login");
    if (login && !login.classList.contains("hidden")) return login.querySelector("#emblem-slot .emblem");
    return document.querySelector("#app-root:not(.hidden) .tb-emblem");
  }
  async function leave(forced) {
    if (left) return; left = true;
    clearTimeout(watchdog);
    root.style.pointerEvents = "none";
    const done = () => {
      html.classList.remove("splashing"); html.classList.add("splashed");
      if (fx) fx.stop();
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
      timers.forEach(clearTimeout);
      root.remove();
    };
    try {
      const target = forced || REDUCED ? null : landingSpot();
      const base = stage.getBoundingClientRect(), to = target ? target.getBoundingClientRect() : null;
      const fade = (el, ms) => el && el.animate && el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: ms, easing: "ease", fill: "forwards" });
      fade(env, 560); fade(over, 420); fade(aura, 380);
      if (to && to.width > 4 && base.width > 4 && getComputedStyle(finalImg).opacity > 0.5) {
        /* the seal travels to where the app shows it */
        const k = to.width / base.width;
        const dx = to.left + to.width / 2 - (base.left + base.width / 2), dy = to.top + to.height / 2 - (base.top + base.height / 2);
        seal.animate([{ transform: getComputedStyle(seal).transform }, { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${k.toFixed(4)})` }],
          { duration: 720, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
        await wait(720);
        html.classList.remove("splashing"); html.classList.add("splashed");
        fade(seal, 220);
        await wait(240);
      } else {
        seal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease", fill: "forwards" });
        await wait(560);
      }
    } catch (e) {}
    done();
  }

  /* a tap skips to the end */
  root.addEventListener("pointerdown", () => {
    if (left || skipped) return; skipped = true;
    if (fx) { try { localStorage.setItem(DAY_KEY, today); } catch (e) {} }   /* skipped the full one: do not play it again today */
    timers.forEach(clearTimeout);
    anims.forEach((a) => { try { a.finish(); } catch (e) {} });
    box.style.display = "none"; gold.style.display = "none"; rays.style.display = "none";
    if (fx) fx.stop();
    if (finalImg.complete && finalImg.naturalWidth) { aura.style.opacity = "1"; paper.style.opacity = "1"; finalImg.style.opacity = "1"; hero.style.opacity = "1"; }
    finish(0);
  });

  /* ---------- go ---------- */
  (async function start() {
    try {
      const imageOk = () => loaded(finalImg).then(() => true, () => false);
      if (REDUCED || !seal.animate) return stillSeal(await Promise.race([imageOk(), wait(2000).then(() => false)]));
      if (seenToday) return shortOpening(await Promise.race([imageOk(), wait(2000).then(() => false)]));
      root.classList.add("sp-full");                    /* scene 1 runs in CSS from this moment */
      try { fx = startFx(); } catch (e) { fx = null; }
      const parts = await Promise.race([buildParts().catch(() => null), wait(3500).then(() => null)]);
      if (skipped || left) return;
      if (parts) fullOpening(parts);
      else shortOpening(await Promise.race([imageOk(), wait(500).then(() => false)]));
    } catch (e) { leave(true); }
  })();
})();

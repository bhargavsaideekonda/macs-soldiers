/* ===== MACS Soldiers — intro v3, "the institution" (chosen per phone with ?intro=v3) =====
   A preview next to the regular opening (splash.js). splash.js hands over to
   this file only on a phone that chose it with ?intro=v3 (?intro=v1 goes
   back). While chosen it plays in full on every open; a tap skips to the end.

   About eleven seconds, in six phases:
     1  0.0s  a dark architectural space: tall navy monoliths in depth, one
              blue light source, light shafts, fine dust; the camera moves in
     2  2.0s  engineered metal rings (blue steel, gold, a toothed ring, a
              tick ring) come out of the depth on tilted axes at different
              speeds and settle flat, on the seal's own border radii
     3  4.0s  the six original hands arrive out of depth one by one, each
              turning into its place under a passing light; the gold one last
     4  6.0s  a restrained gold light behind the centre; the P emblem comes
              into focus; a refraction passes across it
     5  7.5s  the lettering comes round in reading order; a light runs along
              it; the border closes
     6  9.5s  the untouched seal, held in a quiet navy field, then it travels
              to its place in the app
   No stars, sparkles, neon or bounce. Every piece of the seal on screen is
   cut, at run time, out of the seal's own picture (icons/seal-640.jpg) with
   icons/seal-parts.png as the map of which hand each pixel belongs to; the
   last frame is the untouched picture itself. */
(function () {
  "use strict";
  const root = document.getElementById("splash");
  if (!root) return;
  const html = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now();
  const tl = () => performance.now() - t0;
  html.classList.add("splashing");

  /* splash.js put in a stand-in for bootDone(); pick up what it heard */
  const boot = new Promise((res) => {
    if (window.__macsBooted) return res();
    (window.__macsBootHooks = window.__macsBootHooks || []).push(res);
  });

  const REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const WEAK = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2;
  const P2 = 2000, P3 = 4000, P4 = 6000, P5 = 7500, P6 = 9500, END = 11000;
  const EASE = "cubic-bezier(.16,1,.3,1)", QUINT = "cubic-bezier(.83,0,.17,1)", SOFT_IO = "cubic-bezier(.65,0,.35,1)";

  /* ---------- the scene's own styles ---------- */
  const css = `
  #splash.v3{background:#020818;display:block}
  #splash.v3 *{box-sizing:border-box}
  .v3-world{position:absolute;inset:0;overflow:hidden;perspective:1100px;perspective-origin:50% 44%}
  .v3-cam{position:absolute;inset:0;transform-style:preserve-3d}
  .v3-sky{position:absolute;inset:0;background:
    radial-gradient(70% 50% at 50% 38%,#0d2a6b 0%,#071a46 38%,#040f2c 70%,#020818 100%)}
  .v3-src{position:absolute;inset:0;opacity:0;
    background:radial-gradient(75% 55% at 50% 34%,rgba(70,130,255,.5),rgba(40,90,220,.16) 40%,rgba(20,50,140,0) 75%)}
  .v3-shaft{position:absolute;top:-30%;height:150%;opacity:0;transform-origin:50% 0;
    background:linear-gradient(180deg,rgba(120,170,255,.28),rgba(80,130,255,.10) 45%,rgba(60,110,240,0) 85%)}
  .v3-mono{position:absolute;left:50%;top:50%;transform-style:preserve-3d;backface-visibility:hidden}
  .v3-mono i{position:absolute;inset:0;
    background:linear-gradient(90deg,#030a1f 0%,#0a1d4a 40%,#1a3c8c 49%,#0b2052 52%,#040c24 100%)}
  .v3-mono b{position:absolute;left:0;right:0;top:0;height:100%;
    background:linear-gradient(180deg,rgba(255,206,110,.0) 0%,rgba(255,206,110,.0) 30%,rgba(255,206,110,.22) 31%,rgba(255,206,110,0) 32%,rgba(255,206,110,0) 70%,rgba(120,170,255,.18) 71%,rgba(120,170,255,0) 72%)}
  .v3-arc{position:absolute;left:50%;top:44%;border-radius:50%;border:1px solid rgba(110,160,255,.22)}
  .v3-mist{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 70%,rgba(6,18,50,0),rgba(2,8,24,.65) 100%)}
  .v3-mech{position:absolute;left:50%;top:50%;width:var(--S);height:var(--S);margin:calc(var(--S) / -2) 0 0 calc(var(--S) / -2);
    transform-style:preserve-3d}
  .v3-ring{position:absolute;border-radius:50%;opacity:0;transform-style:preserve-3d}
  .v3-ring>i{position:absolute;inset:0;border-radius:50%;display:block;
    -webkit-mask:var(--m);mask:var(--m);-webkit-mask-composite:source-in;mask-composite:intersect}
  .v3-steel>i{background:conic-gradient(from 20deg,#0b1f55,#5c8ef0 8%,#0e2766 18%,#c6d7ff 27%,#1a3f96 38%,#7aa5ff 52%,#0a1c4e 63%,#a9c2ff 76%,#123274 88%,#0b1f55)}
  .v3-goldm>i{background:conic-gradient(from 60deg,#5a3a06,#f6d27a 9%,#8a5d0f 19%,#fff1c2 28%,#a8740f 40%,#e9bb4d 55%,#6b4508 66%,#ffe39a 79%,#8f6210 90%,#5a3a06)}
  .v3-silver>i{background:conic-gradient(from 0deg,#556,#e8eef9 12%,#7b8496 25%,#f6f8ff 38%,#5f6878 52%,#cfd6e4 68%,#6a7282 82%,#556)}
  .v3-stage{position:absolute;left:50%;top:50%;width:var(--S);height:var(--S);margin:calc(var(--S) / -2) 0 0 calc(var(--S) / -2);
    perspective:900px}
  .v3-seal{position:absolute;inset:0;transform-style:preserve-3d}
  .v3-seal canvas,.v3-seal .v3-abs{position:absolute}
  .v3-porcelain{position:absolute;inset:0;border-radius:50%;opacity:0;
    background:radial-gradient(circle at 42% 36%,#ffffff 0%,#f4f6fb 55%,#e6ebf5 100%);
    box-shadow:0 0 0 1px rgba(255,255,255,.4),0 30px 60px -20px rgba(0,0,0,.6)}
  .v3-backlight{position:absolute;left:18%;top:18%;width:64%;height:64%;border-radius:50%;opacity:0;
    background:radial-gradient(closest-side,rgba(255,214,120,.75),rgba(255,180,60,.25) 45%,rgba(255,170,40,0) 75%)}
  .v3-final{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;opacity:0;display:block}
  .v3-rim{position:absolute;inset:-3%;border-radius:50%;opacity:0;
    box-shadow:0 0 0 1px rgba(255,214,130,.55),0 0 24px 2px rgba(255,190,90,.22),0 0 80px 10px rgba(60,110,255,.18)}
  .v3-band{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-size:100% 100%;mask-size:100% 100%;
    -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
  .v3-band i{position:absolute;top:-20%;bottom:-20%;left:0;width:38%;transform:translateX(-140%) skewX(-16deg);
    background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,250,230,.85),rgba(255,255,255,0))}
  .v3-textlight{position:absolute;opacity:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
    background:conic-gradient(from var(--v3-l,0deg) at 50% 50%,rgba(255,255,255,0) 0deg,rgba(255,240,250,.95) 10deg,rgba(255,255,255,0) 26deg,rgba(255,255,255,0) 360deg)}
  .v3-flare{position:absolute;left:-20%;right:-20%;top:50%;height:2px;margin-top:-1px;opacity:0;
    background:linear-gradient(90deg,rgba(90,140,255,0),rgba(120,170,255,.55) 35%,rgba(235,242,255,.9) 50%,rgba(120,170,255,.55) 65%,rgba(90,140,255,0));
    box-shadow:0 0 14px 2px rgba(100,150,255,.35)}
  .v3-dust,.v3-grain{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .v3-grain{inset:-50%;width:auto;height:auto;opacity:.05;background-size:180px 180px;animation:v3grain .5s steps(4) infinite}
  @keyframes v3grain{0%{transform:translate(0,0)}25%{transform:translate(-31px,17px)}50%{transform:translate(23px,-29px)}75%{transform:translate(-13px,-41px)}}
  .v3-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,rgba(2,8,24,0) 40%,rgba(1,4,14,.72) 100%)}
  #splash.v3.still .v3-final,#splash.v3.still .v3-rim{opacity:1}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  /* ---------- the scene's markup ---------- */
  const S = Math.round(Math.min(innerWidth * 0.6, innerHeight * 0.34, 300));
  root.className = "v3"; root.style.setProperty("--S", S + "px");
  root.innerHTML = `
    <div class="v3-world" id="v3-world">
      <div class="v3-sky"></div><div class="v3-src" id="v3-src"></div>
      <div class="v3-cam" id="v3-cam"></div>
      <div class="v3-mist"></div>
    </div>
    <canvas class="v3-dust" id="v3-dust"></canvas>
    <div class="v3-stage" id="v3-stage"><div class="v3-seal" id="v3-seal">
      <div class="v3-backlight" id="v3-back"></div>
      <div class="v3-porcelain" id="v3-porc"></div>
      <div class="v3-abs" id="v3-layers" style="inset:0"></div>
      <img class="v3-final" id="v3-final" src="icons/seal-640.jpg" alt=""/>
      <div class="v3-rim" id="v3-rim"></div>
    </div></div>
    <div class="v3-flare" id="v3-flare"></div>
    <div class="v3-grain" id="v3-grain"></div>
    <div class="v3-vig"></div>`;
  const $ = (id) => document.getElementById(id);
  const world = $("v3-world"), cam = $("v3-cam"), stage = $("v3-stage"), seal = $("v3-seal"), layers = $("v3-layers");
  const finalImg = $("v3-final"), rim = $("v3-rim"), porc = $("v3-porc"), back = $("v3-back"), flareEl = $("v3-flare");

  const anims = [], timers = [];
  const play = (el, frames, opts) => { if (!el || !el.animate) return null; const a = el.animate(frames, Object.assign({ fill: "both" }, opts)); anims.push(a); return a; };
  const at = (el, frames, start, duration, opts) => play(el, frames, Object.assign({ delay: Math.max(0, start - tl()), duration }, opts || {}));
  const flash = (el, frames, start, duration, opts) => at(el, frames, start, duration, Object.assign({ fill: "none" }, opts || {}));
  const laterAt = (t, fn) => timers.push(setTimeout(fn, Math.max(0, t - tl())));
  const div = (cls, cssText, parent) => { const d = document.createElement("div"); if (cls) d.className = cls; if (cssText) d.style.cssText = cssText; (parent || cam).appendChild(d); return d; };
  let left = false, skipped = false, loops = [];
  const watchdog = setTimeout(() => leave(true), 20000);

  /* ---------- cutting the seal into its pieces (as in splash.js) ---------- */
  const N = 640, R_EMBLEM = 0.215, R_HANDS = 0.625, R_INNER = 0.70, R_TEXT = 0.93;
  const OUTER = 1, TEXT = 2, INNER = 3, ARM0 = 3, EMBLEM = 10;
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
    const keyed = new Uint8ClampedArray(N * N * 4), which = new Uint8Array(N * N), boxes = [], half = N / 2;
    for (let y = 0; y < N; y++) {
      const dy = y + 0.5 - half;
      for (let x = 0; x < N; x++) {
        const p = y * N + x, i = p * 4, r = src[i], g = src[i + 1], b = src[i + 2];
        const a = 255 - Math.min(r, g, b);
        if (a < 10) continue;
        const dx = x + 0.5 - half, rad = Math.sqrt(dx * dx + dy * dy) / half;
        let k;
        if (rad > R_TEXT) k = OUTER;
        else if (rad > R_INNER) k = TEXT;
        else if (rad > R_HANDS) k = INNER;
        else if (rad > R_EMBLEM) { const arm = Math.round(map[i] / 40); if (arm < 1 || arm > 6) continue; k = ARM0 + arm; }
        else k = EMBLEM;
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
    const parts = { outer: piece(OUTER), text: piece(TEXT), inner: piece(INNER), emblem: piece(EMBLEM), arms: [] };
    for (let a = 1; a <= 6; a++) parts.arms.push(piece(ARM0 + a));
    if (!parts.outer || !parts.text || !parts.inner || !parts.emblem || parts.arms.some((c) => !c)) throw new Error("parts");
    return parts;
  }
  /* a piece's own shape as a mask picture, encoded off the main thread */
  function maskOf(c, use) {
    try { c.toBlob((b) => { if (b && !left) try { use(`url(${URL.createObjectURL(b)})`); } catch (e) {} }, "image/png"); } catch (e) {}
  }
  /* a soft dark copy of a piece, used as the shadow it casts while in depth */
  function shadowOf(c) {
    const pad = Math.round(N * 0.05), s = document.createElement("canvas");
    s.width = c.width + pad * 2; s.height = c.height + pad * 2;
    const ctx = s.getContext("2d");
    ctx.shadowColor = "rgba(4,12,40,.6)"; ctx.shadowBlur = N * 0.025; ctx.shadowOffsetX = 5000; ctx.shadowOffsetY = N * 0.018;
    ctx.drawImage(c, pad - 5000, pad); s._pad = pad; return s;
  }
  /* drawing something round, the way a pen would (needs a registered angle) */
  let SWEEP = false;
  try { CSS.registerProperty({ name: "--v3-a", syntax: "<angle>", inherits: false, initialValue: "0deg" }); SWEEP = true; }
  catch (e) { SWEEP = !!(e && e.name === "InvalidModificationError"); }
  try { CSS.registerProperty({ name: "--v3-l", syntax: "<angle>", inherits: false, initialValue: "0deg" }); } catch (e) {}
  function sweep(el, from, ccw, keys) {
    const first = keys[0][0], last = keys[keys.length - 1][0], span = Math.max(1, last - first), b = el._box;
    if (!SWEEP) { at(el, [{ opacity: 0 }, { opacity: 1 }], first + span * 0.2, span * 0.6, { easing: "ease" }); return; }
    const m = ccw
      ? `conic-gradient(from ${from}deg, rgba(0,0,0,0) 0deg, rgba(0,0,0,0) calc(360deg - var(--v3-a) - 14deg), #000 calc(360deg - var(--v3-a)), #000 360deg)`
      : `conic-gradient(from ${from}deg, #000 0deg, #000 var(--v3-a), rgba(0,0,0,0) calc(var(--v3-a) + 14deg), rgba(0,0,0,0) 360deg)`;
    const size = `${(N / b[2] * 100).toFixed(3)}% ${(N / b[3] * 100).toFixed(3)}%`;
    const pos = `${(b[2] === N ? 0 : b[0] / (N - b[2]) * 100).toFixed(3)}% ${(b[3] === N ? 0 : b[1] / (N - b[3]) * 100).toFixed(3)}%`;
    Object.assign(el.style, { webkitMaskImage: m, maskImage: m, webkitMaskSize: size, maskSize: size, webkitMaskPosition: pos, maskPosition: pos, webkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" });
    at(el, keys.map((k) => ({ "--v3-a": `${k[1]}deg`, offset: (k[0] - first) / span, easing: SOFT_IO })), first, span, { easing: "linear" });
    if (keys[keys.length - 1][1] >= 360) laterAt(last + 60, () => { el.style.webkitMaskImage = "none"; el.style.maskImage = "none"; });
  }

  /* ---------- dust in depth, and film grain ---------- */
  function startDust() {
    const cv = $("v3-dust"), ctx = cv.getContext("2d");
    let W, H, raf = 0, on = true;
    const size = () => { const d = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    /* two soft dots drawn once (blue and gold); every speck is a scaled stamp of one */
    const sprite = (c) => { const s = document.createElement("canvas"); s.width = s.height = 64; const x = s.getContext("2d");
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(0.35, `rgba(${c},.45)`); g.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = g; x.fillRect(0, 0, 64, 64); return s; };
    const BLUE = sprite("150,185,255"), GOLD = sprite("255,205,120");
    size(); addEventListener("resize", size);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const motes = [];
    for (let i = 0; i < (WEAK ? 30 : 70); i++) {
      const z = Math.random();                       /* 0 = far, 1 = near the lens */
      motes.push({ x: rnd(0, 1), y: rnd(0, 1), z, r: 0.4 + z * z * 3.2, a: 0.12 + (1 - Math.abs(z - 0.45)) * 0.28, gold: Math.random() < 0.28, ph: rnd(0, 6.28) });
    }
    function frame(now) {
      if (!on) return;
      const t = now - t0, push = Math.min(1, t / END);
      ctx.clearRect(0, 0, W, H);
      for (const m of motes) {
        /* the camera moves forward: near motes drift outward from the centre faster than far ones */
        const k = 1 + push * (0.08 + m.z * 0.6);
        const x = (0.5 + (m.x - 0.5) * k + Math.sin(t / 4000 + m.ph) * 0.004 * (1 + m.z)) * W;
        const y = (0.46 + (m.y - 0.46) * k - t / 90000 * (0.3 + m.z)) * H;
        const r = m.r * (1 + push * m.z * 0.8) * (m.z > 0.8 ? 2.4 : 1.4) * 1.6;
        ctx.globalAlpha = m.a; ctx.drawImage(m.gold ? GOLD : BLUE, x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { on = false; cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }
  function startGrain() {
    const el = $("v3-grain");
    if (WEAK) { el.remove(); return () => {}; }
    const cv = document.createElement("canvas"); cv.width = cv.height = 90;
    const ctx = cv.getContext("2d"), id = ctx.createImageData(90, 90), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(id, 0, 0);
    cv.toBlob((b) => { if (b) el.style.backgroundImage = `url(${URL.createObjectURL(b)})`; });
    return () => {};
  }

  /* ---------- phase 1: the architecture ---------- */
  function buildWorld() {
    const vw = innerWidth, vh = innerHeight;
    /* monoliths in two receding rows, like a colonnade seen from inside */
    const cols = WEAK ? 4 : 6;
    for (let i = 0; i < cols; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      const x = side * (vw * (0.42 + row * 0.08)), z = -300 - row * 520;
      const w = vw * (0.16 + (row % 3) * 0.04), h = vh * (1.6 + row * 0.25);
      const d = div("v3-mono", `width:${w}px;height:${h}px;margin:${-h * 0.55}px 0 0 ${-w / 2}px;transform:translate3d(${x}px,0,${z}px) rotateY(${-side * 18}deg)`);
      d.innerHTML = "<i></i><b></b>";
    }
    /* far structural arcs, very faint */
    [[1.9, -1900], [1.4, -1300]].forEach(([s, z]) => {
      const dim = Math.min(vw, vh) * s;
      div("v3-arc", `width:${dim}px;height:${dim}px;margin:${-dim / 2}px 0 0 ${-dim / 2}px;transform:translateZ(${z}px) rotateX(64deg)`);
    });
    /* light shafts from the source above */
    const shafts = [];
    for (let i = 0; i < (WEAK ? 2 : 4); i++) {
      const left = 18 + i * 15 + (Math.random() * 6 - 3), wdt = 7 + Math.random() * 10, rot = -14 + i * 7;
      shafts.push(div("v3-shaft", `left:${left}%;width:${wdt}%;transform:rotate(${rot}deg)`, world));
    }
    world.insertBefore(world.querySelector(".v3-mist"), null);
    return shafts;
  }

  /* ---------- phase 2: the engineered rings ---------- */
  function ring(cls, insetPct, widthPx, extraMask) {
    const r = div("v3-ring " + cls, `inset:${insetPct}%`, $("v3-mech"));
    const annulus = `radial-gradient(farthest-side,rgba(0,0,0,0) calc(100% - ${widthPx}px),#000 calc(100% - ${widthPx - 0.6}px),#000 calc(100% - .6px),rgba(0,0,0,0) 100%)`;
    r.style.setProperty("--m", extraMask ? `${annulus},${extraMask}` : annulus);
    r.appendChild(document.createElement("i"));
    return r;
  }

  function full(parts) {
    const shafts = buildWorld();
    /* the rings live in the seal's own space, so where they settle is exactly the seal's border */
    const mech = div("v3-mech", "inset:0;left:0;top:0;width:100%;height:100%;margin:0", seal);
    mech.id = "v3-mech"; seal.insertBefore(mech, porc);

    /* the camera: a slow, deliberate travel forward with a slight turn, level by the end */
    at(cam, [
      { transform: "translateZ(-420px) rotateX(4deg) rotateY(9deg)", easing: SOFT_IO },
      { transform: "translateZ(-120px) rotateX(2deg) rotateY(-4deg)", offset: 0.36, easing: SOFT_IO },
      { transform: "translateZ(40px) rotateX(0deg) rotateY(2deg)", offset: 0.72, easing: SOFT_IO },
      { transform: "translateZ(90px) rotateX(0deg) rotateY(0deg)" }], 0, END, { easing: "linear" });
    at($("v3-src"), [{ opacity: 0 }, { opacity: 1, offset: 0.7 }, { opacity: 0.75 }], 150, 2600, { easing: "ease-out" });
    shafts.forEach((s, i) => at(s, [{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0.55 }], 400 + i * 160, 3200, { easing: "ease-in-out" }));

    /* rings: [style, inset %, width px, mask, start tilt, spin seconds per turn, final opacity] */
    const W = (f) => Math.max(1.5, S * f);
    const teeth = "repeating-conic-gradient(#000 0deg 7deg,rgba(0,0,0,0) 7deg 10deg)";
    const ticks = "repeating-conic-gradient(#000 0deg 1.2deg,rgba(0,0,0,0) 1.2deg 6deg)";
    const segs = "repeating-conic-gradient(#000 0deg 52deg,rgba(0,0,0,0) 52deg 60deg)";
    const spec = [
      /* the big ones start in front of the lens, so the camera travels through them */
      ["v3-silver", -34, W(0.010), ticks, [72, -28, 640], 90, 0.32],
      ["v3-goldm", -22, W(0.022), segs, [-64, 40, 520], 60, 0.42],
      ["v3-steel", -9, W(0.030), teeth, [58, 30, -900], -40, 0.38],
      ["v3-steel", 0, W(0.034), null, [-48, -36, 420], 0, 1],         /* lands on the seal's outer border */
      ["v3-goldm", 15, W(0.016), null, [66, 12, -1100], 0, 1],        /* lands on the inner border */
      ["v3-silver", 39.25, W(0.012), null, [-70, -20, -600], 0, 1]    /* lands on the emblem's edge */
    ];
    const rings = spec.map(([cls, inset, w, mask, [rx, ry, z], spin, keep], n) => {
      const r = ring(cls, inset, w, mask), start = P2 + n * 140;
      at(r, [{ opacity: 0, transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg)` },
        { opacity: z > 0 ? 0.85 : 1, offset: z > 0 ? 0.15 : 0.3 },
        { opacity: 1, transform: "translateZ(0) rotateX(0deg) rotateY(0deg)" }], start, 1750 - n * 60, { easing: QUINT });
      const inner = r.firstChild;
      if (spin) play(inner, [{ transform: "rotate(0deg)" }, { transform: `rotate(${spin > 0 ? 360 : -360}deg)` }], { duration: Math.abs(spin) * 1000, iterations: Infinity, easing: "linear" });
      else at(inner, [{ transform: `rotate(${n % 2 ? -150 : 150}deg)` }, { transform: "rotate(0deg)" }], start, 1900, { easing: EASE });
      r._keep = keep; return r;
    });

    /* the seal's own borders are drawn where the metal settled; the metal steps back */
    /* the seal's white face arrives only once everything on it is in place; until then it all forms on the dark field */
    at(porc, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "scale(1)" }], P5 + 1050, 700, { easing: EASE });
    const outer = layers.appendChild(parts.outer), inner = layers.appendChild(parts.inner);
    sweep(outer, 0, false, [[3500, -14], [4200, 300], [P5 + 1300, 300], [P5 + 1650, 360]]);
    sweep(inner, 180, true, [[3650, -14], [4350, 360]]);
    rings.forEach((r, n) => at(r, [{ opacity: 1 }, { opacity: r._keep === 1 ? 0 : r._keep }], 3900 + n * 40, 900, { easing: "ease" }));

    /* ---------- phase 3: the hands, out of depth ---------- */
    const hands = div("v3-abs", "inset:0;transform-style:preserve-3d", layers);
    const order = [2, 3, 4, 5, 6, 1];
    order.forEach((armNo, n) => {
      const c = parts.arms[armNo - 1], b = c._box, gold = armNo === 1;
      const wrap = div("v3-abs", `left:${b[0] / N * 100}%;top:${b[1] / N * 100}%;width:${b[2] / N * 100}%;height:${b[3] / N * 100}%;opacity:0;transform-style:preserve-3d`, hands);
      const sh = WEAK ? document.createElement("canvas") : shadowOf(c);
      if (WEAK) { sh.width = sh.height = 1; sh._pad = 0; }
      sh.style.cssText = `position:absolute;left:${(-sh._pad / c.width * 100).toFixed(3)}%;top:${(-sh._pad / c.height * 100).toFixed(3)}%;width:${(sh.width / c.width * 100).toFixed(3)}%;height:${(sh.height / c.height * 100).toFixed(3)}%`;
      c.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
      wrap.appendChild(sh); wrap.appendChild(c);
      const ang = (329 + 60 * (armNo - 1)) * Math.PI / 180, ux = Math.sin(ang), uy = -Math.cos(ang);
      const start = P3 + 60 + (gold ? 1040 : n * 200), dur = gold ? 900 : 820;
      const from = `translate3d(${(-ux * S * 0.35).toFixed(1)}px,${(-uy * S * 0.35).toFixed(1)}px,${(WEAK ? 260 : 420)}px) rotateY(${(ux * 55).toFixed(1)}deg) rotateX(${(-uy * 35).toFixed(1)}deg) rotateZ(${(gold ? -10 : 8)}deg)`;
      at(wrap, [{ opacity: 0, transform: from }, { opacity: 1, offset: 0.25 }, { opacity: 1, transform: "translate3d(0,0,0) rotateY(0deg) rotateX(0deg) rotateZ(0deg)" }], start, dur, { easing: QUINT });
      /* a directional light passes over each hand as it turns into place */
      at(sh, [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], start, dur + 300, { easing: "linear" });
    });
    const CLASP = P3 + 60 + 1040 + 900;
    flash(hands, [{ transform: "scale(1)" }, { transform: "scale(1.018)", offset: 0.4 }, { transform: "scale(1)" }], CLASP, 520, { easing: "ease-in-out" });

    /* ---------- phase 4: the emblem ---------- */
    at(back, [{ opacity: 0, transform: "scale(.6)" }, { opacity: 0.85, transform: "scale(1)", offset: 0.4 }, { opacity: 0.35, transform: "scale(1.05)" }], P4, 1700, { easing: "ease-out" });
    const emblem = layers.appendChild(parts.emblem);
    at(emblem, [{ opacity: 0, transform: "scale(1.14)" }, { opacity: 1, transform: "scale(1)" }], P4 + 120, 950, { easing: EASE });
    at(flareEl, [{ opacity: 0, transform: "scaleX(.2)" }, { opacity: 0.55, transform: "scaleX(1)", offset: 0.35 }, { opacity: 0, transform: "scaleX(1.15)" }], P4 + 140, 900, { easing: "ease-out", fill: "none" });
    maskOf(emblem, (url) => {
      const eb = emblem._box;
      const band = div("v3-band", `left:${eb[0] / N * 100}%;top:${eb[1] / N * 100}%;width:${eb[2] / N * 100}%;height:${eb[3] / N * 100}%;-webkit-mask-image:${url};mask-image:${url}`, layers);
      at(band.appendChild(document.createElement("i")), [{ transform: "translateX(-140%) skewX(-16deg)" }, { transform: "translateX(260%) skewX(-16deg)" }], P4 + 800, 850, { easing: SOFT_IO });
    });

    /* ---------- phase 5: the lettering, and a light along it ---------- */
    const text = layers.appendChild(parts.text);
    sweep(text, 168, false, [[P5, -14], [P5 + 1300, 360]]);
    if (!WEAK) maskOf(parts.text, (url) => {
      const tb = parts.text._box;
      const tlight = div("v3-textlight", `left:${tb[0] / N * 100}%;top:${tb[1] / N * 100}%;width:${tb[2] / N * 100}%;height:${tb[3] / N * 100}%;-webkit-mask-image:${url};mask-image:${url}`, layers);
      at(tlight, [{ opacity: 0, "--v3-l": "160deg" }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.85 }, { opacity: 0, "--v3-l": "520deg" }], P5 + 1350, 1500, { easing: SOFT_IO, fill: "none" });
    });

    /* ---------- phase 6: the master shot ---------- */
    at(finalImg, [{ opacity: 0 }, { opacity: 1 }], P6, 300, { easing: "ease" });
    laterAt(P6 + 340, () => { layers.style.display = "none"; back.style.display = "none"; });
    at(rim, [{ opacity: 0 }, { opacity: 1 }], P6 + 100, 900, { easing: "ease" });
    at(seal, [{ transform: "scale(1)" }, { transform: "scale(1.035)" }], P6, END - P6 + 400, { easing: "cubic-bezier(.33,0,.2,1)" });
    rings.forEach((r) => { if (r._keep < 1) at(r, [{ opacity: r._keep }, { opacity: r._keep * 0.55 }], P6, 1200, { easing: "ease" }); });
    laterAt(END, () => finish());
  }
  function still() {                                   /* less motion asked for: the finished seal, nothing moves */
    root.classList.add("still");
    laterAt(1100, () => finish());
  }

  /* ---------- handing over to the app (as in splash.js) ---------- */
  async function finish() {
    await Promise.race([boot, wait(6000)]);
    leave(false);
  }
  function landingSpot() {
    if (document.querySelector(".detail.open")) return null;
    const login = document.getElementById("screen-login");
    if (login && !login.classList.contains("hidden")) return login.querySelector("#emblem-slot .emblem");
    return document.querySelector("#app-root:not(.hidden) .tb-emblem");
  }
  async function leave(forced) {
    if (left) return; left = true;
    clearTimeout(watchdog); timers.forEach(clearTimeout);
    root.style.pointerEvents = "none";
    const done = () => {
      html.classList.remove("splashing"); html.classList.add("splashed");
      loops.forEach((f) => { try { f(); } catch (e) {} });
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
      root.remove(); style.remove();
    };
    try {
      if (forced || !root.animate) throw 0;
      const fade = (el, ms) => el && el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: ms, easing: "ease", fill: "forwards" });
      fade(world, 600); fade($("v3-dust"), 500); fade($("v3-grain"), 300); fade(rim, 300); fade(flareEl, 200);
      root.animate([{ backgroundColor: "#020818" }, { backgroundColor: "rgba(2,8,24,0)" }], { duration: 600, delay: 150, fill: "forwards" });
      const target = REDUCED ? null : landingSpot();
      const base = stage.getBoundingClientRect(), to = target ? target.getBoundingClientRect() : null;
      if (to && to.width > 4 && base.width > 4 && Number(getComputedStyle(finalImg).opacity) > 0.5) {
        const k = to.width / base.width;
        const dx = to.left + to.width / 2 - (base.left + base.width / 2), dy = to.top + to.height / 2 - (base.top + base.height / 2);
        stage.animate([{ transform: "none" }, { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${k.toFixed(4)})` }],
          { duration: 760, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" });
        await wait(760);
        html.classList.remove("splashing"); html.classList.add("splashed");
        stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
        await wait(220);
      } else { fade(stage, 420); await wait(560); }
    } catch (e) {}
    done();
  }

  /* a tap skips to the finished seal */
  root.addEventListener("pointerdown", () => {
    if (left || skipped) return; skipped = true;
    timers.forEach(clearTimeout);
    anims.forEach((a) => { try { a.finish(); } catch (e) {} });
    layers.style.display = "none"; back.style.display = "none";
    if (finalImg.complete && finalImg.naturalWidth) { finalImg.style.opacity = "1"; porc.style.opacity = "1"; rim.style.opacity = "1"; }
    finish();
  });

  /* ---------- go ---------- */
  (async function start() {
    try {
      if (REDUCED || !root.animate) return still();
      /* the seal is cut first (a short burst of work while the screen is still plain navy); only then does anything move */
      const parts = await Promise.race([buildParts().catch(() => null), wait(3000).then(() => null)]);
      if (left || skipped) return;
      loops.push(startDust()); loops.push(startGrain());
      if (parts) full(parts);
      else { finalImg.style.opacity = "1"; rim.style.opacity = "1"; laterAt(1500, () => finish()); }
    } catch (e) { leave(true); }
  })();
})();

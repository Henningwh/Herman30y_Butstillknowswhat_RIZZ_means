// Front-page transition: cut-out Herman with two gatling guns pointed at the viewer.
// He shouts, spins up, and shoots the screen full of holes before the scene drops away.
// Usage: (await import("./gatling.js")).playGatling(() => showHomePane())

const CSS = `
.gat { position: fixed; inset: 0; z-index: 12; overflow: hidden; cursor: pointer; }
.gat-scene { position: absolute; inset: 0; overflow: hidden;
  background: radial-gradient(ellipse at 50% 70%, #ff7a1a 0%, #c2181f 32%, #3a0610 68%, #0b0206 100%); }
.gat-rays { position: absolute; inset: -60%; opacity: .28;
  background: repeating-conic-gradient(from 0deg at 50% 50%, #ffd23f 0 4deg, transparent 4deg 14deg);
  animation: gat-spin 18s linear infinite; }
@keyframes gat-spin { to { transform: rotate(360deg); } }
.gat svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.gat-grain { position: absolute; inset: 0; pointer-events: none; opacity: .18;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.gat-title { position: absolute; left: 50%; top: 6%; translate: -50% 0; z-index: 3; opacity: 0; white-space: nowrap;
  background: #111; color: #ffd23f; padding: 10px 18px; font: 900 clamp(15px, 3.4vw, 30px) "Unbounded", sans-serif;
  box-shadow: 4px 5px 0 #ff2bd6; letter-spacing: .04em; }
.gat-holes { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.gat-hole { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; }
.gat-shell { position: absolute; z-index: 5; width: 7px; height: 18px; margin: -9px 0 0 -3px; border-radius: 2px 2px 1px 1px;
  background: linear-gradient(90deg, #8a5a12, #ffd36b 45%, #b07a1c); box-shadow: 0 0 4px #ffb34780; }
.gat-skip { position: absolute; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 6;
  font: 600 12px "Inter", sans-serif; color: #fff; opacity: .6; }
.gat .disk { transform-box: fill-box; transform-origin: center; }
#gt-top { transform-origin: 54px -126px; }
`;

function star(points, outer, inner) {
  return Array.from({ length: points * 2 }, (_, k) => {
    const r = k % 2 ? inner : outer * (0.8 + Math.random() * 0.4), a = (k / (points * 2)) * Math.PI * 2;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
}

const gun = (id, x, y) => `
  <g id="${id}" transform="translate(${x} ${y})">
    <rect x="-44" y="-34" width="88" height="68" rx="14" fill="#25282d"/>
    <rect x="-52" y="-10" width="12" height="20" rx="3" fill="#15171a"/><rect x="40" y="-10" width="12" height="20" rx="3" fill="#15171a"/>
    <rect x="-20" y="-46" width="40" height="14" rx="4" fill="#3b3f46"/>
    <g class="disk">
      <circle r="31" fill="#3d424a" stroke="#767c86" stroke-width="4"/>
      ${Array.from({ length: 6 }, (_, k) => { const a = k * Math.PI / 3; return `<circle cx="${(Math.cos(a) * 18).toFixed(1)}" cy="${(Math.sin(a) * 18).toFixed(1)}" r="6.5" fill="#050505"/>`; }).join("")}
      <circle r="5" fill="#8d939c"/>
    </g>
    <g class="flash" opacity="0">
      <polygon points="${star(12, 92, 34)}" fill="#ff9d1a" opacity=".9"/>
      <polygon points="${star(10, 64, 26)}" fill="#ffe14d"/>
      <circle r="24" fill="#fffbe6"/>
    </g>
  </g>`;

const MARKUP = `
<div class="gat-scene">
  <div class="gat-rays"></div>
  <svg id="gt-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMax slice">
    <defs><filter id="gt-cut" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="3" dy="4" stdDeviation="0" flood-color="#000" flood-opacity=".35"/></filter></defs>
    <g id="gt-herman" filter="url(#gt-cut)" style="transform: translate(400px, 900px) scale(1.3)">
      <g id="gt-in">
        <path d="M-50,-92 L50,-92 L56,10 L-56,10 Z" fill="#f0c2a6"/>
        <text x="0" y="-60" text-anchor="middle" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="12" font-weight="700" fill="#2b3a8c" transform="rotate(-3 0 -60)">NO RAGRETS</text>
        <g stroke="#2b3a8c" stroke-width="1.6" fill="none"><circle cx="-24" cy="-40" r="2" fill="#2b3a8c"/><path d="M-30,-34 q6,5 12,0"/><path d="M-25,-32 q1,6 4,6 q2,-1 1,-6"/></g>
        <g stroke="#f0c2a6" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <polyline points="-48,-84 -84,-72 -112,-64"/><polyline points="48,-84 84,-72 112,-64"/>
        </g>
        <g id="gt-head">
          <polygon points="-44,-148 42,-137 42,-128 -44,-139" fill="#2a0606"/>
          <image href="crew/herman-jaw.png" x="-62" y="-273" width="125" height="191"/>
          <g id="gt-top"><image href="crew/herman-top.png" x="-62" y="-273" width="125" height="191"/></g>
        </g>
        ${gun("gt-gun-l", -118, -64)}
        ${gun("gt-gun-r", 118, -64)}
      </g>
    </g>
    <g id="gt-bubble" opacity="0" filter="url(#gt-cut)">
      <rect x="262" y="22" width="276" height="64" rx="18" fill="#ffd23f" stroke="#111" stroke-width="4"/>
      <polygon points="420,84 444,84 428,110" fill="#ffd23f" stroke="#111" stroke-width="4" stroke-linejoin="round"/><rect x="418" y="79" width="28" height="7" fill="#ffd23f"/>
      <text x="400" y="66" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="900" font-size="25" fill="#111">NO RAGRETS!!!</text>
    </g>
  </svg>
  <div class="gat-grain"></div>
</div>
<div class="gat-title">⚠ RETURNING TO HOME BASE ⚠</div>
<div class="gat-holes"></div>
<div class="gat-skip">tap to skip</div>`;

function holeSvg() {
  const cracks = Array.from({ length: 6 + Math.floor(Math.random() * 4) }, () => {
    let a = Math.random() * Math.PI * 2, r = 10, pts = ["45,45"];
    const len = 26 + Math.random() * 18;
    while (r < len) { r += 6 + Math.random() * 6; a += (Math.random() - .5) * .5; pts.push(`${(45 + Math.cos(a) * r).toFixed(1)},${(45 + Math.sin(a) * r).toFixed(1)}`); }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.3"/>`;
  }).join("");
  return `<svg viewBox="0 0 90 90" width="90" height="90">${cracks}
    <circle cx="45" cy="45" r="15" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
    <circle cx="45" cy="45" r="9" fill="#0a0a0a" stroke="#6b6b6b" stroke-width="2"/></svg>`;
}

let busy = false;

export async function playGatling(swap) {
  if (busy) return swap();
  busy = true;
  if (!document.getElementById("gat-css")) {
    const st = document.createElement("style"); st.id = "gat-css"; st.textContent = CSS; document.head.append(st);
  }
  const root = document.createElement("div");
  root.className = "gat"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = MARKUP;
  document.body.append(root);
  const $ = id => root.querySelector("#" + id);
  const scene = root.querySelector(".gat-scene"), holes = root.querySelector(".gat-holes");

  // Keep Herman and both guns in view on narrow screens.
  const asp = innerWidth / innerHeight, w = Math.max(440, Math.min(800, 450 * asp)), h = Math.max(450, w / asp);
  $("gt-svg").setAttribute("viewBox", `${400 - w / 2} ${450 - h} ${w} ${h}`);
  $("gt-svg").setAttribute("preserveAspectRatio", "xMidYMax meet");

  const A = [], timers = [];
  let skipped = false, wake = null;
  const a = (el, kf, o) => { const x = el.animate(kf, { fill: "forwards", ...o }); A.push(x); return x; };
  const wait = ms => new Promise(r => { if (skipped) return r(); const t = setTimeout(r, ms); wake = () => { clearTimeout(t); r(); }; });
  root.onpointerdown = () => { skipped = true; timers.forEach(clearInterval); A.forEach(x => { try { x.finish(); } catch {} }); wake?.(); };

  const H = (y, extra = "") => `translate(400px, ${y}px) scale(1.3) ${extra}`;
  const disks = [...root.querySelectorAll(".disk")], flashes = [...root.querySelectorAll(".flash")];
  const guns = [$("gt-gun-l"), $("gt-gun-r")];
  const flap = (delay, n, ms = 170) => a($("gt-top"), [
    { transform: "rotate(0deg)", offset: 0 }, { transform: "rotate(0deg)", offset: .5 },
    { transform: "rotate(-24deg)", offset: .5 }, { transform: "rotate(-24deg)", offset: 1 }], { delay, duration: ms, iterations: n, fill: "none" });

  await root.animate([{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)" }], { duration: 350, easing: "cubic-bezier(.7,0,.3,1)" }).finished;

  const title = root.querySelector(".gat-title");
  a(title, [{ opacity: 0, transform: "scale(1.8) rotate(-4deg)" }, { opacity: 1, transform: "scale(1) rotate(-2deg)" }], { duration: 200, easing: "steps(3)" });
  a(title, [{ opacity: 1 }, { opacity: 0 }], { delay: 600, duration: 100, easing: "steps(2)" });

  // 1. rise into frame (stop-motion), 2. shout + spin up
  a($("gt-herman"), [{ transform: H(900) }, { transform: H(470) }], { duration: 450, easing: "steps(5)" });
  a($("gt-bubble"), [{ opacity: 0 }, { opacity: 1, offset: .05 }, { opacity: 1, offset: .95 }, { opacity: 0 }], { delay: 720, duration: 800 });
  flap(720, 5);
  disks.forEach(d => a(d, [{ transform: "rotate(0deg)" }, { transform: "rotate(540deg)" }], { delay: 800, duration: 700, easing: "ease-in", fill: "none" }));
  await wait(1500);

  // 3. FIRE
  const FIRE = 1800;
  if (!skipped) {
    disks.forEach(d => a(d, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 110, iterations: Math.ceil(FIRE / 110), fill: "none" }));
    flashes.forEach((f, k) => a(f, [{ opacity: 1, transform: "rotate(0deg) scale(1)", offset: 0 }, { opacity: 1, transform: "rotate(20deg) scale(1.15)", offset: .5 },
      { opacity: 0, offset: .5 }, { opacity: 0, offset: 1 }], { delay: k * 45, duration: 90, iterations: Math.ceil(FIRE / 90), fill: "none" }));
    a($("gt-in"), [{ transform: "translate(0,0)" }, { transform: "translate(-3px,4px)" }, { transform: "translate(3px,2px)" }, { transform: "translate(0,0)" }],
      { duration: 90, iterations: Math.ceil(FIRE / 90), easing: "steps(3)", fill: "none" });
    a(scene, [{ transform: "translate(0,0)" }, { transform: "translate(-7px,5px)" }, { transform: "translate(6px,-6px)" }, { transform: "translate(-4px,-3px)" }, { transform: "translate(0,0)" }],
      { duration: 140, iterations: Math.ceil(FIRE / 140), fill: "none" });

    timers.push(setInterval(() => {
      const el = document.createElement("div");
      el.className = "gat-hole"; el.innerHTML = holeSvg();
      el.style.left = (6 + Math.random() * 88) + "%"; el.style.top = (8 + Math.random() * 80) + "%";
      el.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.7 + Math.random() * 0.7})`;
      holes.append(el);
      el.animate([{ opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1 }], { duration: 60 });
    }, 65));
    let side = 0;
    timers.push(setInterval(() => {
      const g = guns[side ^= 1].getBoundingClientRect(), dir = side ? 1 : -1;
      const s = document.createElement("div");
      s.className = "gat-shell";
      s.style.left = (g.left + g.width / 2) + "px"; s.style.top = (g.top + g.height * .2) + "px";
      root.append(s);
      const dx = dir * (60 + Math.random() * 160), up = -(80 + Math.random() * 140), spin = dir * (540 + Math.random() * 540);
      s.animate([{ transform: "translate(0,0) rotate(0deg)" }, { transform: `translate(${dx * .6}px, ${up}px) rotate(${spin * .5}deg)`, offset: .35 },
                 { transform: `translate(${dx}px, ${innerHeight}px) rotate(${spin}deg)` }],
                { duration: 800 + Math.random() * 300, easing: "cubic-bezier(.3,.6,.6,1)" }).onfinish = () => s.remove();
    }, 40));
    await wait(FIRE);
    timers.forEach(clearInterval);
  }

  // 4. reveal home: the scene drops away, the cracked glass lingers a moment
  swap();
  root.style.pointerEvents = "none";
  root.querySelectorAll(".gat-shell").forEach(s => s.remove());
  await scene.animate([{ transform: "translateY(0) rotate(0deg)" }, { transform: "translateY(115%) rotate(7deg)" }],
                      { duration: skipped ? 250 : 520, easing: "cubic-bezier(.55,0,.8,.3)", fill: "forwards" }).finished;
  root.querySelector(".gat-title").remove(); root.querySelector(".gat-skip").remove();
  await holes.animate([{ opacity: 1 }, { opacity: 0 }], { delay: skipped ? 0 : 350, duration: 450, fill: "forwards" }).finished;
  root.remove();
  busy = false;
}

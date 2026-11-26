// "Caught grilling": paper-cutout stop-motion scene. Henrik is frying Gilde grillpølser
// at the cabin stove when Herman bursts in. Photo heads flap open when they talk.
// Usage: import { playGrillScene } from "./grill-scene.js"; await playGrillScene();

const CSS = `
.grill { position: fixed; inset: 0; z-index: 1000; background: #c98c4f; overflow: hidden; cursor: pointer; }
.grill svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.grill-grain { position: absolute; inset: 0; pointer-events: none; opacity: .16;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
.grill-title { position: absolute; left: 50%; top: 6%; translate: -50% 0; z-index: 2; opacity: 0; white-space: nowrap;
  background: #fffef6; color: #111; padding: 10px 18px; font: 800 clamp(15px, 3.2vw, 28px) "Unbounded", sans-serif;
  box-shadow: 3px 4px 0 rgba(0,0,0,.3); }
.grill-skip { position: absolute; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 2;
  font: 600 12px "Inter", sans-serif; color: #2a1608; opacity: .65; }
.grill .steam { animation: grill-steam 1.4s linear infinite; transform-box: fill-box; transform-origin: center bottom; }
.grill .steam:nth-of-type(2) { animation-delay: -.45s; } .grill .steam:nth-of-type(3) { animation-delay: -.9s; }
@keyframes grill-steam { 0% { opacity: 0; transform: translateY(8px) scale(.6); } 30% { opacity: .9; }
  100% { opacity: 0; transform: translateY(-46px) scale(1.3); } }
.grill .flame { animation: grill-flame .18s steps(2) infinite alternate; transform-box: fill-box; transform-origin: center bottom; }
@keyframes grill-flame { to { transform: scaleY(1.35); } }
#g-h-top { transform-origin: 50px -122px; }
#g-m-top { transform-origin: 54px -126px; }
#g-h-head { transform-origin: 0 -170px; }
#g-door { transform-origin: 740px 280px; }
`;

const logs = () => Array.from({ length: 16 }, (_, k) =>
  `<rect x="0" y="${k * 26 - 26}" width="800" height="24" rx="11" fill="${k % 2 ? "#c48549" : "#b9783e"}"/>`).join("");

const MARKUP = `
<div class="grill-title">Meanwhile, in the cabin kitchen…</div>
<svg id="g-svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMax meet">
  <defs>
    <filter id="g-cut" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="2" dy="3" stdDeviation="0" flood-color="#000" flood-opacity=".28"/></filter>
    <g id="g-sausage">
      <rect x="-12" y="-4.5" width="24" height="9" rx="4.5" fill="#a8442a"/>
      <rect x="-9" y="-3.5" width="18" height="2" rx="1" fill="#d27a55"/>
      <path d="M-5,-4 l-2,8 M1,-4 l-2,8 M7,-4 l-2,8" stroke="#5a1e10" stroke-width="1.6"/>
    </g>
  </defs>
  <rect x="-400" y="-600" width="1600" height="1100" fill="#c98c4f"/>
  <g>${logs()}</g>
  <!-- window -->
  <g filter="url(#g-cut)">
    <rect x="62" y="122" width="146" height="124" fill="#6b4423"/>
    <rect x="70" y="130" width="130" height="108" fill="#9fd8f5"/>
    <polygon points="70,212 120,196 160,206 200,190 200,238 70,238" fill="#fff"/>
    <polygon points="150,206 162,172 174,206" fill="#2e6b3d"/><polygon points="98,214 108,188 118,214" fill="#357a45"/>
    <rect x="131" y="130" width="8" height="108" fill="#6b4423"/><rect x="70" y="180" width="130" height="8" fill="#6b4423"/>
  </g>
  <!-- floor -->
  <rect x="-400" y="390" width="1600" height="200" fill="#7a4b28"/>
  <path d="M-400,410 H1200 M-400,432 H1200" stroke="#653c1f" stroke-width="2"/>
  <!-- doorway + door (hinge on the right) -->
  <rect x="630" y="170" width="110" height="222" fill="#24150c"/>
  <g id="g-door" filter="url(#g-cut)">
    <rect x="630" y="170" width="110" height="222" fill="#8b5a2b"/>
    <rect x="642" y="184" width="86" height="88" fill="none" stroke="#6d4420" stroke-width="5"/>
    <rect x="642" y="286" width="86" height="92" fill="none" stroke="#6d4420" stroke-width="5"/>
    <circle cx="644" cy="280" r="5" fill="#e3c26a"/>
  </g>
  <!-- counter + Gilde box -->
  <g filter="url(#g-cut)">
    <rect x="356" y="300" width="214" height="92" fill="#a26a3a"/>
    <rect x="350" y="292" width="226" height="12" fill="#e2c193"/>
    <rect x="372" y="316" width="86" height="64" fill="none" stroke="#8a5530" stroke-width="4"/>
    <rect x="474" y="316" width="82" height="64" fill="none" stroke="#8a5530" stroke-width="4"/>
    <g transform="translate(500 270) rotate(-6)">
      <rect x="-36" y="-22" width="72" height="44" rx="4" fill="#d6162b"/>
      <rect x="-36" y="10" width="72" height="12" rx="0" fill="#ffd34d"/>
      <text x="0" y="2" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="900" font-size="15" fill="#fff">GILDE</text>
      <text x="0" y="19.5" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="8" fill="#7a0d18">grillpølser</text>
    </g>
  </g>
  <!-- stove -->
  <g filter="url(#g-cut)">
    <rect x="180" y="250" width="170" height="34" fill="#d9d3c6"/>
    <rect x="180" y="290" width="170" height="102" rx="4" fill="#ece7dc"/>
    <rect x="172" y="282" width="186" height="12" fill="#3a3a3a"/>
    <rect x="205" y="318" width="120" height="52" rx="6" fill="#2b2b2b"/>
    <g fill="#555"><circle cx="205" cy="266" r="6"/><circle cx="230" cy="266" r="6"/><circle cx="300" cy="266" r="6"/><circle cx="325" cy="266" r="6"/></g>
  </g>
  <g><polygon class="flame" points="284,282 290,270 296,282" fill="#3fa9ff"/><polygon class="flame" points="296,282 302,266 308,282" fill="#ff9d2e"/>
     <polygon class="flame" points="308,282 314,270 320,282" fill="#3fa9ff"/></g>
  <g filter="url(#g-cut)">
    <rect x="344" y="275" width="58" height="7" rx="3" fill="#1d1d1d"/>
    <ellipse cx="302" cy="280" rx="48" ry="10" fill="#2d2d2d"/><ellipse cx="302" cy="278" rx="42" ry="7" fill="#454545"/>
  </g>
  <g fill="#fff" opacity=".85">
    <path class="steam" d="M286,262 q-6,-10 0,-20 q6,-10 0,-20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path class="steam" d="M302,260 q-6,-10 0,-20 q6,-10 0,-20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path class="steam" d="M318,262 q-6,-10 0,-20 q6,-10 0,-20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <!-- Henrik (feet at 0,0) -->
  <g id="g-henrik" filter="url(#g-cut)" style="transform: translate(410px, 400px)">
    <g id="g-h-in">
      <rect x="-36" y="-22" width="28" height="18" fill="#2f3140"/><rect x="8" y="-22" width="28" height="18" fill="#2f3140"/>
      <ellipse cx="-24" cy="-4" rx="19" ry="7" fill="#151515"/><ellipse cx="24" cy="-4" rx="19" ry="7" fill="#151515"/>
      <path d="M-46,-92 L46,-92 L58,-20 L-58,-20 Z" fill="#1f2a44"/>
      <path d="M-30,-86 L30,-86 L40,-22 L-40,-22 Z" fill="#fbfbf7"/>
      <rect x="-14" y="-60" width="28" height="14" rx="3" fill="#ececE4"/>
      <path d="M-30,-86 L-14,-92 M30,-86 L14,-92" stroke="#fbfbf7" stroke-width="5"/>
      <g stroke="#1f2a44" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <polyline id="g-h-arm" points="-46,-84 -78,-96 -100,-108"/><polyline points="46,-84 60,-40"/>
      </g>
      <g id="g-spatula">
        <line x1="-100" y1="-108" x2="-124" y2="-118" stroke="#3a2a1a" stroke-width="5" stroke-linecap="round"/>
        <rect x="-138" y="-126" width="18" height="12" rx="2" fill="#9aa0a6" transform="rotate(22 -129 -120)"/>
        <circle cx="-100" cy="-108" r="9" fill="#f2c6ad"/>
      </g>
      <circle cx="60" cy="-36" r="9" fill="#f2c6ad"/>
      <g id="g-h-head">
        <rect x="-36" y="-133" width="80" height="12" rx="6" fill="#2a0606"/>
        <image href="crew/henrik-jaw.png" x="-65" y="-257" width="130" height="175"/>
        <g id="g-h-top">
          <image href="crew/henrik-top.png" x="-65" y="-257" width="130" height="175"/>
          <g transform="translate(4 -246)">
            <rect x="-30" y="-26" width="60" height="30" fill="#fff" stroke="#ddd" stroke-width="1.5"/>
            <circle cx="-22" cy="-30" r="16" fill="#fff"/><circle cx="0" cy="-38" r="19" fill="#fff"/><circle cx="22" cy="-30" r="16" fill="#fff"/>
          </g>
        </g>
      </g>
    </g>
  </g>

  <!-- Herman (feet at 0,0) -->
  <g id="g-herman" filter="url(#g-cut)" style="transform: translate(700px, 400px); opacity: 0">
    <g id="g-m-in">
      <rect x="-38" y="-30" width="76" height="26" rx="4" fill="#3b4a5c"/>
      <ellipse cx="-24" cy="-4" rx="19" ry="7" fill="#151515"/><ellipse cx="24" cy="-4" rx="19" ry="7" fill="#151515"/>
      <path d="M-48,-92 L48,-92 L52,-28 L-52,-28 Z" fill="#f0c2a6"/>
      <text x="0" y="-62" text-anchor="middle" font-family="'Comic Sans MS', 'Chalkboard SE', cursive" font-size="11" font-weight="700" fill="#2b3a8c" transform="rotate(-3 0 -62)">NO RAGRETS</text>
      <g stroke="#2b3a8c" stroke-width="1.6" fill="none"><circle cx="-24" cy="-44" r="2" fill="#2b3a8c"/><path d="M-30,-38 q6,5 12,0"/><path d="M-25,-36 q1,6 4,6 q2,-1 1,-6"/></g>
      <g stroke="#f0c2a6" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <polyline id="g-m-arm-down" points="-48,-84 -62,-40"/>
        <polyline id="g-m-arm-point" points="-48,-84 -90,-110 -128,-120" opacity="0"/>
        <polyline points="48,-84 62,-40"/>
      </g>
      <circle cx="-62" cy="-36" r="9" fill="#e9b496" id="g-m-hand-down"/>
      <circle cx="-130" cy="-121" r="9" fill="#e9b496" id="g-m-hand-point" opacity="0"/>
      <g id="g-m-head">
        <polygon points="-44,-148 42,-137 42,-128 -44,-139" fill="#2a0606"/>
        <image href="crew/herman-jaw.png" x="-62" y="-273" width="125" height="191"/>
        <g id="g-m-top"><image href="crew/herman-top.png" x="-62" y="-273" width="125" height="191"/></g>
      </g>
    </g>
  </g>

  <!-- sausages (on top so they can fly) -->
  <g id="g-sausages" filter="url(#g-cut)">
    <use href="#g-sausage" class="g-s" style="transform: translate(282px, 275px)"/>
    <use href="#g-sausage" class="g-s" style="transform: translate(296px, 272px)"/>
    <use href="#g-sausage" class="g-s" style="transform: translate(310px, 276px)"/>
    <use href="#g-sausage" class="g-s" style="transform: translate(324px, 273px)"/>
  </g>

  <text id="g-bang" x="404" y="118" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="900" font-size="64" fill="#e3132f" stroke="#111" stroke-width="3" opacity="0">!</text>
  <path id="g-sweat" d="M478,150 q-9,14 0,18 q9,-4 0,-18 Z" fill="#7fd0ff" stroke="#2a6f99" stroke-width="1.5" opacity="0"/>

  <g id="g-b1" opacity="0" filter="url(#g-cut)">
    <rect x="300" y="40" width="210" height="58" rx="16" fill="#fff" stroke="#111" stroke-width="3"/>
    <polygon points="384,96 404,96 396,116" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/><rect x="382" y="92" width="24" height="6" fill="#fff"/>
    <text font-family="Unbounded, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#111">
      <tspan x="405" y="64">Mmm… Gilde</tspan><tspan x="405" y="85">grillpølser 🤤</tspan></text>
  </g>
  <g id="g-b2" opacity="0" filter="url(#g-cut)">
    <rect x="452" y="12" width="236" height="84" rx="16" fill="#ffd23f" stroke="#111" stroke-width="3"/>
    <polygon points="606,94 626,94 612,116" fill="#ffd23f" stroke="#111" stroke-width="3" stroke-linejoin="round"/><rect x="604" y="90" width="24" height="6" fill="#ffd23f"/>
    <text font-family="Unbounded, sans-serif" font-weight="900" font-size="14" text-anchor="middle" fill="#111">
      <tspan x="570" y="38">HENRIK?!</tspan><tspan x="570" y="60">Are those GILDE</tspan><tspan x="570" y="82">grillpølser?!</tspan></text>
  </g>
  <g id="g-b3" opacity="0" filter="url(#g-cut)">
    <rect x="262" y="40" width="226" height="58" rx="16" fill="#fff" stroke="#111" stroke-width="3"/>
    <polygon points="384,96 404,96 396,116" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/><rect x="382" y="92" width="24" height="6" fill="#fff"/>
    <text font-family="Unbounded, sans-serif" font-weight="800" font-size="14" text-anchor="middle" fill="#111">
      <tspan x="375" y="64">It's not what</tspan><tspan x="375" y="85">it looks like!!</tspan></text>
  </g>
</svg>
<div class="grill-grain"></div>
<div class="grill-skip">tap to skip</div>`;

let busy = false;

export async function playGrillScene() {
  if (busy) return;
  busy = true;
  if (!document.getElementById("grill-css")) {
    const style = document.createElement("style");
    style.id = "grill-css"; style.textContent = CSS;
    document.head.append(style);
  }
  const root = document.createElement("div");
  root.className = "grill"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = MARKUP;
  document.body.append(root);

  const $ = id => root.querySelector("#" + id);
  // Fit the action (x ~205-685) on narrow screens; wide screens show the whole scene.
  const asp = innerWidth / innerHeight, w = Math.max(480, Math.min(800, 450 * asp)), h = Math.max(450, w / asp);
  $("g-svg").setAttribute("viewBox", `${Math.max(0, Math.min(800 - w, 445 - w / 2))} ${450 - h} ${w} ${h}`);

  const A = [];
  const a = (el, kf, o) => { const x = el.animate(kf, { fill: "forwards", ...o }); A.push(x); return x; };
  const P = (x, y, r = 0) => `translate(${x}px, ${y}px) rotate(${r}deg)`;
  const hold = (from, to) => [{ transform: from, offset: 0 }, { transform: from, offset: .5 }, { transform: to, offset: .5 }, { transform: to, offset: 1 }];
  const showFor = (el, delay, dur) => a(el, [{ opacity: 0 }, { opacity: 1, offset: .04 }, { opacity: 1, offset: .96 }, { opacity: 0 }], { delay, duration: dur });
  const flap = (el, delay, n, ms = 190) => a(el, hold("rotate(0deg)", "rotate(-22deg)"), { delay, duration: ms, iterations: n, fill: "none" });
  const pop = (el, delay) => a(el, [{ opacity: 0 }, { opacity: 1 }], { delay, duration: 1 });
  const unpop = (el, delay) => a(el, [{ opacity: 1 }, { opacity: 0 }], { delay, duration: 1 });

  root.onpointerdown = () => A.forEach(x => x.finish());
  await root.animate([{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(150% at 50% 50%)" }],
                     { duration: 380, easing: "cubic-bezier(.7,0,.3,1)" }).finished;

  const title = root.querySelector(".grill-title");
  a(title, [{ opacity: 0, transform: "rotate(-3deg) scale(.5)" }, { opacity: 1, transform: "rotate(-2deg) scale(1)" }], { duration: 240, easing: "steps(3)" });
  a(title, [{ opacity: 1 }, { opacity: 0 }], { delay: 800, duration: 120, easing: "steps(2)" });

  // 1. Henrik happily frying
  const sausages = [...root.querySelectorAll(".g-s")];
  const home = [[282, 275], [296, 272], [310, 276], [324, 273]];
  a($("g-spatula"), hold("rotate(0deg)", "rotate(-10deg)"), { duration: 300, iterations: 6, fill: "none" });
  sausages.forEach((s, k) => a(s, [
    { transform: P(...home[k]), offset: 0 }, { transform: P(...home[k]), offset: .35 },
    { transform: P(home[k][0], home[k][1] - 26, 90), offset: .45 }, { transform: P(home[k][0], home[k][1] - 26, 90), offset: .55 },
    { transform: P(...home[k], 180), offset: .65 }, { transform: P(...home[k], 180), offset: 1 }],
    { duration: 900, delay: 200 + k * 40, easing: "linear", fill: "none" }));
  showFor($("g-b1"), 900, 900);
  flap($("g-h-top"), 900, 4);

  // 2. door bursts open, Herman steps in
  a($("g-door"), [{ transform: "scaleX(1)" }, { transform: "scaleX(.12)" }], { delay: 1700, duration: 200, easing: "steps(2)" });
  pop($("g-herman"), 1850);
  a($("g-herman"), [{ transform: P(700, 400) }, { transform: P(600, 400) }], { delay: 1850, duration: 600, easing: "steps(5)" });
  a($("g-m-in"), hold("translateY(0) rotate(-5deg)", "translateY(-10px) rotate(5deg)"), { delay: 1850, duration: 240, iterations: 2.5, fill: "none" });

  // 3. "HENRIK?! Are those GILDE grillpølser?!" – point and flap
  unpop($("g-m-arm-down"), 2500); unpop($("g-m-hand-down"), 2500);
  pop($("g-m-arm-point"), 2500); pop($("g-m-hand-point"), 2500);
  showFor($("g-b2"), 2500, 1350);
  flap($("g-m-top"), 2500, 7, 180);

  // 4. Henrik jumps, sausages fly – one lands on Herman's head
  pop($("g-bang"), 2700); unpop($("g-bang"), 3500);
  a($("g-h-in"), [{ transform: "translateY(0)" }, { transform: "translateY(-34px)", offset: .3 }, { transform: "translateY(-34px)", offset: .6 }, { transform: "translateY(0)" }],
    { delay: 2700, duration: 500, easing: "steps(4)", fill: "none" });
  const flights = [
    [[200, 120, 300], [150, 392, 540]],
    [[320, 60, 400], [400, 390, 720]],
    [[480, 40, 520], [600, 142, 730]],     // Herman's head
    [[380, 90, 200], [250, 391, 600]],
  ];
  sausages.forEach((s, k) => {
    const [[mx, my, mr], [ex, ey, er]] = flights[k];
    a(s, [{ transform: P(...home[k]) }, { transform: P(mx, my, mr), offset: .5 }, { transform: P(ex, ey, er) }],
      { delay: 2750 + k * 50, duration: 700, easing: "steps(7)" });
  });

  // 5. "It's not what it looks like!!" – nervous head flips + sweat
  showFor($("g-b3"), 3900, 1200);
  flap($("g-h-top"), 3900, 6, 190);
  a($("g-h-head"), [
    { transform: "scaleX(1)", offset: 0 }, { transform: "scaleX(1)", offset: .25 }, { transform: "scaleX(-1)", offset: .25 },
    { transform: "scaleX(-1)", offset: .5 }, { transform: "scaleX(1)", offset: .5 }, { transform: "scaleX(1)", offset: .75 },
    { transform: "scaleX(-1)", offset: .75 }, { transform: "scaleX(-1)", offset: 1 }], { delay: 3950, duration: 1000, fill: "none" });
  a($("g-sweat"), [{ opacity: 0, transform: "translateY(0)" }, { opacity: 1, transform: "translateY(0)", offset: .1 }, { opacity: 1, transform: "translateY(40px)" }],
    { delay: 3950, duration: 1100, easing: "steps(5)" });

  await Promise.all(A.map(x => x.finished));
  await new Promise(r => setTimeout(r, 250));
  await root.animate([{ clipPath: "circle(150% at 50% 50%)" }, { clipPath: "circle(0% at 50% 50%)" }],
                     { duration: 450, easing: "cubic-bezier(.7,0,.3,1)" }).finished;
  root.remove();
  busy = false;
}

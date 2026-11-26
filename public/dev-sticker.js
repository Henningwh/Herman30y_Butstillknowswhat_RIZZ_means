export function mountDevSticker(container) {
  const art = container.querySelector(".dev-art");
  const trigger = container.querySelector(".dev-trigger");
  const chain = container.querySelector(".chain-trigger");
  const singularity = container.querySelector(".singularity-trigger");
  const swords = art.querySelectorAll(".dev-sword");
  const canvas = art.querySelector("canvas");
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = ["#ffd36b", "#ff6e42", "#ff46d5", "#57eeff", "#fff8d2"];
  const life = 1050;
  const collapseTime = 1050;
  let bursts = [];
  let frame = 0;
  let glowTimer;
  let swordAnimations = [];
  let collapse = null;

  function prepareCanvas() {
    const scale = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(art.clientWidth * scale);
    const height = Math.round(art.clientHeight * scale);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    bursts = [];
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function drawCollapse(progress) {
    const x = art.clientWidth / 2;
    const y = art.clientHeight / 2;
    const reach = Math.hypot(x, y) * 0.93;
    const rim = 12 + 32 * (1 - progress);

    // The dark center occludes the chip and sparks, leaving a bright rim.
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = Math.min(1, progress * 4);
    context.fillStyle = "#03030d";
    context.beginPath();
    context.arc(x, y, rim, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "lighter";
    for (let index = 0; index < 3; index++) {
      context.strokeStyle = ["#ec89ff", "#5ef3ff", "#dfd4ff"][index];
      context.globalAlpha = Math.min(0.74, progress * 2) / (1 + index * 0.5);
      context.lineWidth = 2 + index;
      context.beginPath();
      context.ellipse(x, y, rim + index * 22, rim * (1 - index * 0.17) + index * 8,
        progress * 2.8 + index * 0.64, 0, Math.PI * 2);
      context.stroke();
    }

    for (const star of collapse.stars) {
      const pull = Math.min(1, progress * star.speed);
      const orbit = rim + reach * star.depth * (1 - pull) ** 2;
      const angle = star.angle + 4.6 * pull + pull ** 3 * 3;
      context.strokeStyle = star.color;
      context.globalAlpha = Math.sin(Math.PI * pull) * 0.82;
      context.lineWidth = star.width;
      context.beginPath();
      context.arc(x, y, orbit, angle - (0.10 + pull * 0.48), angle);
      context.stroke();
    }
  }

  function drawFlames(x, y, progress, flames) {
    for (const flame of flames) {
      const travel = progress * 1.55 - flame.delay;
      if (travel < 0 || travel >= 1) continue;
      const px = x + flame.drift * travel + Math.sin(travel * 9 + flame.phase) * 10;
      const py = y - flame.rise * travel;
      const radius = Math.max(2, flame.size * (1 - travel * 0.9));
      const fire = context.createRadialGradient(px, py, 0, px, py, radius);
      fire.addColorStop(0, "#fff4a3");
      fire.addColorStop(0.27, "#ffbc28");
      fire.addColorStop(0.62, "#f74512aa");
      fire.addColorStop(1, "#ff350000");
      context.globalAlpha = Math.sin(travel * Math.PI) * 0.66;
      context.fillStyle = fire;
      context.fillRect(px - radius, py - radius, radius * 2, radius * 2);
    }
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, canvas.width, canvas.height);
    bursts = bursts.filter(burst => now - burst.start < life);
    context.globalCompositeOperation = "lighter";

    for (const { x, y, start, sparks, flames } of bursts) {
      const age = now - start;
      if (age < 0) continue;
      const progress = age / life;
      if (progress < 0.32) {
        const radius = 12 + progress * 220;
        const flare = context.createRadialGradient(x, y, 0, x, y, radius);
        flare.addColorStop(0, "#fff3b0");
        flare.addColorStop(0.3, "#ff8748");
        flare.addColorStop(1, "#ff3c9600");
        context.globalAlpha = 0.6 * (1 - progress / 0.32);
        context.fillStyle = flare;
        context.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
      }
      drawFlames(x, y, progress, flames);
      for (let ring = 0; ring < 4; ring++) {
        const wave = progress * 1.7 - ring * 0.13;
        if (wave < 0 || wave >= 1) continue;
        context.beginPath();
        context.ellipse(x, y, 10 + wave * 175, 7 + wave * 106, -0.17, 0, Math.PI * 2);
        context.strokeStyle = colors[ring];
        context.globalAlpha = (1 - wave) * 0.8;
        context.lineWidth = 1 + (1 - wave) * 3;
        context.stroke();
      }
      for (const spark of sparks) {
        const distance = (1 - (1 - progress) ** 2) * spark.distance;
        const px = x + Math.cos(spark.angle) * distance;
        const py = y + Math.sin(spark.angle) * distance + 55 * progress ** 2;
        const tail = spark.size * (1 - progress);
        context.beginPath();
        context.moveTo(px - Math.cos(spark.angle) * tail, py - Math.sin(spark.angle) * tail);
        context.lineTo(px, py);
        context.lineWidth = spark.width;
        context.strokeStyle = spark.color;
        context.globalAlpha = (1 - progress) ** 1.4;
        context.stroke();
      }
    }

    if (collapse) {
      const progress = Math.max(0, (now - collapse.start) / collapseTime);
      if (progress < 1 && !reducedMotion.matches) {
        drawCollapse(progress);
      } else {
        collapse = null;
        art.classList.remove("is-collapsing");
        singularity.removeAttribute("aria-disabled");
        clash();
        ignite(0.5, 0.5);
        if (!reducedMotion.matches) {
          const positions = [[0.24, 0.58], [0.76, 0.58], [0.38, 0.32], [0.62, 0.32], [0.5, 0.56]];
          positions.forEach(([x, y], index) => ignite(x, y, 110 + index * 75));
        }
      }
    }
    context.globalAlpha = 1;
    if (!frame && (bursts.length || collapse)) frame = requestAnimationFrame(draw);
  }

  function ignite(x, y, delay = 0) {
    art.classList.add("ignited");
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => art.classList.remove("ignited"), life + delay);
    if (!context || reducedMotion.matches) return;

    const width = art.clientWidth;
    const height = art.clientHeight;
    prepareCanvas();
    const sparks = Array.from({ length: 96 }, (_, index) => ({
      angle: (index + Math.random()) / 96 * Math.PI * 2,
      distance: 35 + Math.random() * Math.min(320, width * 0.55),
      size: 7 + Math.random() * 32,
      width: 1 + Math.random() * 3,
      color: colors[index % colors.length]
    }));
    const flames = Array.from({ length: 16 }, () => ({
      delay: Math.random() * 0.25,
      drift: (Math.random() - 0.5) * 150,
      rise: 55 + Math.random() * Math.min(height * 0.7, 170),
      size: 17 + Math.random() * 34,
      phase: Math.random() * Math.PI * 2
    }));
    bursts = [...bursts.slice(-8), { x: x * width, y: y * height, start: performance.now() + delay, sparks, flames }];
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function clash() {
    if (reducedMotion.matches) return;
    swordAnimations.forEach(animation => animation.cancel());
    swordAnimations = [...swords].map((sword, index) => {
      const angle = index === 0 ? -34 : 214;
      const direction = index === 0 ? 1 : -1;
      const pose = (turn, shift) => `translate(calc(-50% + ${shift}px), -50%) rotate(${turn}deg)`;
      return sword.animate([
        { transform: pose(angle + 72 * direction, -38 * direction) },
        { transform: pose(angle, 0), offset: 0.32 },
        { transform: pose(angle - 24 * direction, 17 * direction), offset: 0.60 },
        { transform: pose(angle, 0) }
      ], { duration: 720, easing: "cubic-bezier(.2,.7,.25,1)" });
    });
  }

  function position(event) {
    const rect = art.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  }

  art.addEventListener("pointermove", event => {
    if (reducedMotion.matches || event.pointerType === "touch") return;
    const [x, y] = position(event);
    art.style.setProperty("--aim-x", `${(x - 0.5) * 36}px`);
    art.style.setProperty("--aim-y", `${(y - 0.5) * 24}px`);
    art.style.setProperty("--tilt-x", `${(0.5 - y) * 30}deg`);
    art.style.setProperty("--tilt-y", `${(x - 0.5) * 36}deg`);
  });
  art.addEventListener("pointerleave", () => {
    for (const property of ["--aim-x", "--aim-y", "--tilt-x", "--tilt-y"]) art.style.removeProperty(property);
  });
  art.addEventListener("click", event => {
    clash();
    ignite(...position(event));
  });
  trigger.addEventListener("click", () => {
    clash();
    ignite(0.5, 0.5);
    if (reducedMotion.matches) return;
    ignite(0.27, 0.63, 145);
    ignite(0.73, 0.57, 215);
    ignite(0.5, 0.48, 360);
  });
  art.dataset.interactive = "";
  trigger.hidden = false;
  singularity.hidden = false;
  singularity.addEventListener("click", () => {
    if (collapse) return;
    if (!context || reducedMotion.matches) {
      ignite(0.5, 0.5);
      return;
    }
    prepareCanvas();
    collapse = {
      start: performance.now(),
      stars: Array.from({ length: 84 }, (_, index) => ({
        angle: Math.random() * Math.PI * 2,
        speed: 0.74 + Math.random() * 0.53,
        depth: 0.2 + Math.random() * 0.8,
        width: 0.5 + Math.random() * 2,
        color: ["#e493ff", "#61ebff", "#f6e8ff"][index % 3]
      }))
    };
    art.classList.add("is-collapsing");
    singularity.setAttribute("aria-disabled", "true");
    if (!frame) frame = requestAnimationFrame(draw);
  });

  if (chain) {
    chain.hidden = false;
    chain.addEventListener("click", () => {
      clash();
      ignite(0.5, 0.5);
      if (reducedMotion.matches) return;
      chain.disabled = true;
      const positions = [[0.28, 0.58], [0.72, 0.42], [0.4, 0.32], [0.62, 0.7], [0.5, 0.5]];
      positions.forEach(([x, y], index) => {
        ignite(x, y, (index + 1) * 145);
      });
      setTimeout(() => { chain.disabled = false; }, positions.length * 145 + life);
    });
  }
}

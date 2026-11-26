export function mountDevSticker(container) {
  const art = container.querySelector(".dev-art");
  const trigger = container.querySelector(".dev-trigger");
  const chain = container.querySelector(".chain-trigger");
  const canvas = art.querySelector("canvas");
  const context = canvas.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colors = ["#ffd36b", "#ff6e42", "#ff46d5", "#57eeff", "#fff8d2"];
  const life = 1050;
  let bursts = [];
  let frame = 0;
  let glowTimer;

  function draw(now) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    bursts = bursts.filter(burst => now - burst.start < life);
    context.globalCompositeOperation = "lighter";

    for (const { x, y, start, sparks } of bursts) {
      const age = now - start;
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
      for (let ring = 0; ring < 3; ring++) {
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

    context.globalAlpha = 1;
    frame = bursts.length ? requestAnimationFrame(draw) : 0;
  }

  function ignite(x, y) {
    art.classList.add("ignited");
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => art.classList.remove("ignited"), life);
    if (!context || reducedMotion.matches) return;

    const width = art.clientWidth;
    const height = art.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    const drawWidth = Math.round(width * scale);
    const drawHeight = Math.round(height * scale);
    if (canvas.width !== drawWidth || canvas.height !== drawHeight) {
      canvas.width = drawWidth;
      canvas.height = drawHeight;
      bursts = [];
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }
    const sparks = Array.from({ length: 96 }, (_, index) => ({
      angle: (index + Math.random()) / 96 * Math.PI * 2,
      distance: 35 + Math.random() * Math.min(320, width * 0.55),
      size: 7 + Math.random() * 32,
      width: 1 + Math.random() * 3,
      color: colors[index % colors.length]
    }));
    bursts = [...bursts.slice(-3), { x: x * width, y: y * height, start: performance.now(), sparks }];
    if (!frame) frame = requestAnimationFrame(draw);
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
  art.addEventListener("click", event => ignite(...position(event)));
  trigger.addEventListener("click", () => ignite(0.5, 0.5));
  art.dataset.interactive = "";
  trigger.hidden = false;

  if (chain) {
    chain.hidden = false;
    chain.addEventListener("click", () => {
      ignite(0.5, 0.5);
      if (reducedMotion.matches) return;
      chain.disabled = true;
      const positions = [[0.28, 0.58], [0.72, 0.42], [0.4, 0.32], [0.62, 0.7], [0.5, 0.5]];
      positions.forEach(([x, y], index) => {
        setTimeout(() => ignite(x, y), (index + 1) * 145);
      });
      setTimeout(() => { chain.disabled = false; }, positions.length * 145 + life);
    });
  }
}

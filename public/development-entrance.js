export function mountDevelopmentEntrance() {
  const link = document.getElementById("development-members");
  const overlay = document.getElementById("development-warp");
  const hole = overlay.querySelector(".warp-hole");
  const cards = [...document.querySelectorAll('#committees [data-committee]:not([data-committee="development"])')];
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let entering = false;

  function reset() {
    root.classList.remove("crew-warping");
    overlay.hidden = true;
    overlay.querySelectorAll(".warp-card").forEach(card => card.remove());
    overlay.getAnimations().forEach(animation => animation.cancel());
    hole.getAnimations().forEach(animation => animation.cancel());
    entering = false;
  }

  function pullCard(card, index, width, height) {
    const bounds = card.getBoundingClientRect();
    const isVisible = bounds.bottom > 0 && bounds.top < height;
    const left = Math.max(0, Math.min(bounds.left, width - bounds.width));
    const top = Math.max(-bounds.height * 0.24, Math.min(bounds.top, height - bounds.height * 0.76));
    const dx = width / 2 - (left + bounds.width / 2);
    const dy = height / 2 - (top + bounds.height / 2);
    const spin = index % 2 === 0 ? 1 : -1;
    const triesToEscape = ["transport", "party"].includes(card.dataset.committee);
    const copy = card.cloneNode(true);
    copy.inert = true;
    copy.classList.add("warp-card");
    Object.assign(copy.style, {
      left: `${left}px`, top: `${top}px`, width: `${bounds.width}px`, height: `${bounds.height}px`
    });
    overlay.append(copy);

    const pull = [
      { transform: "translate(0, 0)", opacity: isVisible ? 1 : 0 },
      { transform: `translate(${-dy * 0.14 * spin}px, ${dx * 0.14 * spin}px) rotate(${spin * -14}deg) scale(.94)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${dx * 0.57 - dy * 0.23 * spin}px, ${dy * 0.57 + dx * 0.23 * spin}px) rotate(${spin * 65}deg) scale(.56)`, opacity: 1, offset: 0.66 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin * 205}deg) scale(.025)`, opacity: 0 }
    ];
    if (triesToEscape) {
      const distance = Math.hypot(dx, dy) || 1;
      const escape = (away, sideways, tilt, offset) => ({
        transform: `translate(${(-dx * away - dy * sideways) / distance}px, ${(-dy * away + dx * sideways) / distance}px) rotate(${spin * tilt}deg)`,
        opacity: 1, offset
      });
      // They lurch away twice, then the same inward spiral catches them.
      pull.splice(1, 1,
        escape(32, 16 * spin, -13, 0.19),
        escape(17, -20 * spin, 10, 0.30),
        escape(45, 12 * spin, -19, 0.43)
      );
    }

    return copy.animate(pull, {
      duration: triesToEscape ? 1070 : 810,
      delay: 90 + index * 64,
      easing: "cubic-bezier(.35,0,.6,1)",
      fill: "both"
    }).finished;
  }

  link.addEventListener("click", async event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || reducedMotion.matches || !hole.animate) return;
    event.preventDefault();
    if (entering) return;

    entering = true;
    const destination = link.href;
    try {
      overlay.hidden = false;
      const pulls = cards.map((card, index) => pullCard(card, index, overlay.clientWidth, overlay.clientHeight));
      root.classList.add("crew-warping");
      await Promise.all(pulls);
      await hole.animate([
        { transform: "translate(-50%, -50%) scale(1)" },
        { transform: "translate(-50%, -50%) scale(.55)", offset: 0.32 },
        { transform: "translate(-50%, -50%) scale(20)" }
      ], { duration: 290, easing: "cubic-bezier(.45,0,.9,.4)", fill: "forwards" }).finished;
    } catch {
      // A canceled animation should never strand the roster link.
    } finally {
      if (entering) location.assign(destination);
    }
  });

  addEventListener("pagehide", reset);
}

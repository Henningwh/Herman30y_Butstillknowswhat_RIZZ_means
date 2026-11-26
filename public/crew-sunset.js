export async function playCrewSunset(swap) {
  const overlay = document.getElementById("crew-sunset");
  const portraits = [...overlay.querySelectorAll("img")];
  let deadline;
  let ready;
  try {
    ready = await Promise.race([
      Promise.all(portraits.map(image => image.decode())).then(() => true),
      new Promise(resolve => { deadline = setTimeout(() => resolve(false), 1600); })
    ]);
  } catch {
    ready = false;
  } finally {
    clearTimeout(deadline);
  }
  if (!ready) return swap();

  const animations = [];
  const fade = (from, to, duration) => {
    const animation = overlay.animate([{ opacity: from }, { opacity: to }], {
      duration, easing: "ease-in-out", fill: "both"
    });
    animations.push(animation);
    return animation.finished;
  };

  overlay.hidden = false;
  try {
    await fade(0, 1, 230);
    const reveal = overlay.querySelector(".crew-sunset-night").getAnimations()[0];
    if (reveal) await reveal.finished;
    swap();
    await fade(1, 0, 330);
  } finally {
    overlay.hidden = true;
    animations.forEach(animation => animation.cancel());
  }
}

import { mountDevSticker } from "./dev-sticker.js";
import { createAdmin } from "./committee-admin.js";

const team = new URLSearchParams(location.search).get("team");
const committees = await fetch("committee-data.json").then(r => r.json());

if (Object.hasOwn(committees, team)) {
  const { title, icon, accent, description, members: fallback } = committees[team];
  document.title = `${title} committee – Herman 30`;
  document.body.style.setProperty("--accent", accent);
  document.querySelector("h1").textContent = `${title} committee`;
  document.querySelector(".committee-icon").textContent = icon;
  document.getElementById("committee-description").textContent = description;
  const roster = document.getElementById("roster");
  roster.hidden = false;

  const list = document.getElementById("members");
  const template = document.getElementById("member-card");
  let members = fallback, admin = null;

  function render() {
    list.replaceChildren();
    for (const member of members) {
      const { name, photo, video, funFact, scene } = member;
      const card = template.content.cloneNode(true);
      const li = card.querySelector("li");
      const image = card.querySelector("img");
      if (video) {
        const player = document.createElement("video");
        player.controls = true;
        player.playsInline = true;
        player.preload = "none";
        player.poster = photo;
        player.src = video;
        player.setAttribute("aria-label", `${name}’s video`);
        image.replaceWith(player);
      } else if (photo) {
        image.src = photo;
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "member-initial";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = Array.from(name)[0];
        image.replaceWith(placeholder);
      }
      const heading = card.querySelector("h3");
      if (scene === "grill") {
        // Clicking the name plays the "caught grilling" cutout scene.
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "member-scene"; btn.textContent = name;
        btn.title = "Click me";
        btn.addEventListener("click", async () => (await import("./grill-scene.js")).playGrillScene());
        heading.append(btn);
      } else {
        heading.textContent = name;
      }
      const fact = card.querySelector("p");
      if (funFact) fact.querySelector("span").textContent = funFact;
      else fact.remove();
      if (admin?.isAdmin() && member.id) admin.decorateCard(li, member);
      list.append(card);
    }
    if (admin?.isAdmin()) admin.addMemberCard(list);
    const any = list.children.length > 0;
    list.hidden = !any;
    document.getElementById("roster-empty").hidden = any;
    admin?.setNames(members);
  }

  // Members come from the Worker's database; committee-data.json is the fallback (and the starting point).
  try {
    const res = await fetch(`/api/groups/${team}/members`);
    if (res.ok) {
      const data = await res.json();
      members = data.members;
      if (data.description) document.getElementById("committee-description").textContent = data.description;
      admin = createAdmin(team, { title, onMembers: m => { if (m) members = m; render(); } });
      admin.onChange(render);
    }
  } catch {}
  render();

  if (team === "development") {
    document.body.classList.add("development");
    const art = document.getElementById("development-art");
    roster.before(art.content.cloneNode(true));
    mountDevSticker(document.querySelector(".reactor"));
  }
} else {
  document.querySelector("h1").textContent = "Committee not found";
}

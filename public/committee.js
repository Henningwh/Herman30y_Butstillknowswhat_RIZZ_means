import { mountDevSticker } from "./dev-sticker.js";

const committees = {
  transport: {
    title: "Transport", icon: "🚚", accent: "#57e8ff",
    description: "Coordinates rides and gets everyone’s luggage to the cabin.",
    members: []
  },
  lunch: {
    title: "Lunch", icon: "🥪", accent: "#baef85",
    description: "Plans lunch and makes sure there’s enough for everyone.",
    members: []
  },
  party: {
    title: "Party", icon: "🎉", accent: "#ff89dc",
    description: "Runs the games, speeches and Saturday night program.",
    members: []
  },
  development: {
    title: "Sick Development", icon: "⚡", accent: "#ca9fff",
    description: "Builds the site and the weekend’s digital surprises.",
    members: [
      { name: "Henning", video: "crew/henning.mp4", photo: "crew/henning.jpg", funFact: "digger skillpadder" },
      { name: "Even", photo: "crew/even.jpg", funFact: "synes skillpadder er helt ok" }
    ]
  },
  dinner: {
    title: "Dinner", icon: "🍳", accent: "#ffc780",
    description: "Plans the dinner menu, shops and runs the kitchen.",
    members: []
  },
  bar: {
    title: "Bar", icon: "🍻", accent: "#e9dc79",
    description: "Keeps the bar stocked and the glasses full.",
    members: []
  }
};

const team = new URLSearchParams(location.search).get("team");
if (Object.hasOwn(committees, team)) {
  const { title, icon, accent, description, members } = committees[team];
  document.title = `${title} committee – Herman 30`;
  document.body.style.setProperty("--accent", accent);
  document.querySelector("h1").textContent = `${title} committee`;
  document.querySelector(".committee-icon").textContent = icon;
  document.getElementById("committee-description").textContent = description;
  const roster = document.getElementById("roster");
  roster.hidden = false;

  if (members.length) {
    const list = document.getElementById("members");
    const template = document.getElementById("member-card");
    for (const { name, photo, video, funFact } of members) {
      const card = template.content.cloneNode(true);
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
      } else {
        image.src = photo;
      }
      card.querySelector("h3").textContent = name;
      card.querySelector("span").textContent = funFact;
      list.append(card);
    }
    list.hidden = false;
    document.getElementById("roster-empty").hidden = true;
  }

  if (team === "development") {
    document.body.classList.add("development");
    const art = document.getElementById("development-art");
    roster.before(art.content.cloneNode(true));
    mountDevSticker(document.querySelector(".reactor"));
  }
} else {
  document.querySelector("h1").textContent = "Committee not found";
}

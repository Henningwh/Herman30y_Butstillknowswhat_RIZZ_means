export { GroupStore } from "./store.js";

// Cloudflare Worker: serves the static site (via the ASSETS binding) and one tiny endpoint,
// /api/songs/list, that reads the songs on the trip playlist.
//
// No Spotify login or API keys: it reads the public Spotify embed page for the playlist
// (the same page the player on the site shows) and pulls the track list out of it.
// SPOTIFY_PLAYLIST_ID is set in wrangler.jsonc.

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });

// Find the first array of track-like objects anywhere in the embed page's data.
function findTracks(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 12) return null;
  if (Array.isArray(node)) {
    if (node.length && node.every(t => t && typeof t === "object" && typeof t.title === "string" && typeof t.uri === "string")) return node;
    for (const v of node) { const r = findTracks(v, depth + 1); if (r) return r; }
    return null;
  }
  if (Array.isArray(node.trackList)) return node.trackList;
  for (const v of Object.values(node)) { const r = findTracks(v, depth + 1); if (r) return r; }
  return null;
}

// The object that owns the track list (the playlist entity) – has the playlist's name and cover.
function findEntity(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 12) return null;
  if (!Array.isArray(node) && Array.isArray(node.trackList)) return node;
  for (const v of Object.values(node)) { const r = findEntity(v, depth + 1); if (r) return r; }
  return null;
}

function nextData(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no data in embed page");
  return JSON.parse(m[1]);
}

export function parseEmbedMeta(html) {
  const e = findEntity(nextData(html)) || {};
  const pick = v => (typeof v === "string" ? v : "");
  const cover = e.coverArt?.sources?.[0]?.url || e.images?.[0]?.url || e.visualIdentity?.image?.[0]?.url || "";
  return { name: pick(e.name) || pick(e.title), owner: pick(e.subtitle) || pick(e.authors?.[0]?.name), cover: pick(cover) };
}

export function parseEmbed(html) {
  const tracks = findTracks(nextData(html)) || [];
  return tracks
    .filter(t => t && t.title)
    .map(t => {
      const id = String(t.uri || "").split(":").pop();
      return {
        id: /^[A-Za-z0-9]{22}$/.test(id) ? id : "",
        name: t.title,
        artists: t.subtitle || (t.artists || []).map(a => a.name).join(", "),
        ms: Number(t.duration) || 0,
        url: /^[A-Za-z0-9]{22}$/.test(id) ? `https://open.spotify.com/track/${id}` : "",
        image: t.images?.[0]?.url || t.coverArt?.sources?.[0]?.url || "",
      };
    });
}

const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const decode = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// Source 1: the embed page (what the player on the site shows) – has titles, artists and durations.
async function fromEmbed(id, log) {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, { headers: BROWSER_HEADERS });
  const html = await res.text();
  log.push({ source: "embed", status: res.status, bytes: html.length, hasNextData: html.includes("__NEXT_DATA__") });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  const tracks = parseEmbed(html);
  log.push({ source: "embed", tracks: tracks.length });
  if (!tracks.length) throw new Error("embed had no tracks");
  let meta = {};
  try { meta = parseEmbedMeta(html); } catch {}
  return { tracks, meta };
}

// Source 2: the normal playlist page lists each song as <meta name="music:song">; look up titles via oEmbed.
async function fromPlaylistPage(id, log) {
  const res = await fetch(`https://open.spotify.com/playlist/${id}`, { headers: BROWSER_HEADERS });
  const html = await res.text();
  const urls = [...new Set([...html.matchAll(/<meta[^>]+name="music:song"[^>]+content="([^"]+)"/g)].map(m => decode(m[1])))].slice(0, 100);
  log.push({ source: "playlist page", status: res.status, bytes: html.length, songs: urls.length });
  if (!urls.length) throw new Error("no songs on playlist page");
  const title = decode(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] || "");
  const cover = decode(html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1] || "");
  const tracks = await Promise.all(urls.slice(0, 40).map(async url => {
    const id = url.split("/").pop().split("?")[0];
    try {
      const o = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { headers: BROWSER_HEADERS }).then(r => r.json());
      return { id, name: o.title || "Unknown song", artists: "", ms: 0, url, image: o.thumbnail_url || "" };
    } catch {
      return { id, name: "Unknown song", artists: "", ms: 0, url, image: "" };
    }
  }));
  return { tracks, meta: { name: title, owner: "", cover } };
}

// Album art per song via Spotify's public oEmbed; remembered in the Durable Object so each is fetched once.
async function withThumbs(env, tracks) {
  const need = tracks.filter(t => t.id && !t.image);
  if (!need.length || !env.GROUPS) return tracks;
  const stub = env.GROUPS.get(env.GROUPS.idFromName("main"));
  const store = (method, body) => stub.fetch("https://store/api/internal/thumbs", { method, body: JSON.stringify(body) }).then(r => r.json());
  let known = {};
  try { known = await store("POST", { ids: need.map(t => t.id) }); } catch {}
  const missing = need.filter(t => !(t.id in known)).slice(0, 35);   // stay well under the subrequest limit
  const found = {};
  await Promise.all(missing.map(async t => {
    try {
      const o = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(t.url)}`, { headers: BROWSER_HEADERS }).then(r => r.json());
      if (o.thumbnail_url) found[t.id] = o.thumbnail_url;
    } catch {}
  }));
  if (Object.keys(found).length) { try { await store("PUT", found); } catch {} }
  return tracks.map(t => (t.image ? t : { ...t, image: known[t.id] || found[t.id] || "" }));
}

async function readPlaylist(env, log) {
  for (const source of [fromEmbed, fromPlaylistPage]) {
    try { return await source(env.SPOTIFY_PLAYLIST_ID, log); }
    catch (err) { log.push({ error: String(err.message || err) }); }
  }
  throw new Error("could not read playlist");
}

async function listTracks(env, ctx) {
  const cache = caches.default;
  const key = new Request(`https://cache.internal/playlist/${env.SPOTIFY_PLAYLIST_ID}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  const { tracks, meta } = await readPlaylist(env, []);
  const out = json({ tracks: await withThumbs(env, tracks), playlist: { id: env.SPOTIFY_PLAYLIST_ID, ...meta } }, 200,
                   { "cache-control": "public, max-age=60" });
  ctx.waitUntil(cache.put(key, out.clone()));
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === "/api/songs/list" && req.method === "GET") {
      try {
        return await listTracks(env, ctx);
      } catch (err) {
        console.error(err);
        return json({ error: "could not read playlist" }, 502, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/songs/debug") {
      // Open this in a browser to see what Spotify returned (no secrets here).
      const log = [];
      let tracks = null, meta = null;
      try { ({ tracks, meta } = await readPlaylist(env, log)); } catch {}
      return json({ playlist: env.SPOTIFY_PLAYLIST_ID, ok: Boolean(tracks), found: tracks?.length || 0, meta, first: tracks?.slice(0, 3), log },
                  200, { "cache-control": "no-store" });
    }
    if (url.pathname.startsWith("/api/groups/") || url.pathname.startsWith("/api/photos/")) {
      // Committee members, photos, planner and admin PINs live in one Durable Object.
      return env.GROUPS.get(env.GROUPS.idFromName("main")).fetch(req);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(req);
  },
};

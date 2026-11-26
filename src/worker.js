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

export function parseEmbed(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no data in embed page");
  const tracks = findTracks(JSON.parse(m[1])) || [];
  return tracks
    .filter(t => t && t.title)
    .map(t => {
      const id = String(t.uri || "").split(":").pop();
      return {
        name: t.title,
        artists: t.subtitle || (t.artists || []).map(a => a.name).join(", "),
        ms: Number(t.duration) || 0,
        url: /^[A-Za-z0-9]{22}$/.test(id) ? `https://open.spotify.com/track/${id}` : "",
      };
    });
}

async function listTracks(env, ctx) {
  const cache = caches.default;
  const key = new Request(`https://cache.internal/playlist/${env.SPOTIFY_PLAYLIST_ID}`);
  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await fetch(`https://open.spotify.com/embed/playlist/${env.SPOTIFY_PLAYLIST_ID}`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; playlist-reader)", "accept-language": "en" },
  });
  if (!res.ok) throw new Error(`embed fetch failed (${res.status})`);
  const out = json({ tracks: parseEmbed(await res.text()) }, 200, { "cache-control": "public, max-age=60" });
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
    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(req);
  },
};

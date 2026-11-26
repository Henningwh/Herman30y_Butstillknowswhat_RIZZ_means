// Cloudflare Worker: serves the static site (via the ASSETS binding) and a tiny Spotify API
// that lets visitors search tracks and add them to the trip playlist.
//
// Configuration (Cloudflare dashboard → Worker → Settings → Variables and Secrets):
//   SPOTIFY_CLIENT_ID      secret  – from your app at developer.spotify.com
//   SPOTIFY_CLIENT_SECRET  secret  – from the same app
//   SPOTIFY_REFRESH_TOKEN  secret  – get it once by visiting /api/spotify/login (see README)
//   SPOTIFY_PLAYLIST_ID    var     – set in wrangler.jsonc

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const SCOPES = "playlist-modify-public playlist-modify-private";

let cached = { token: null, expires: 0, refresh: null };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const html = (body, status = 200, headers = {}) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <meta name="robots" content="noindex"><title>Spotify setup</title>
     <body style="font:16px/1.5 system-ui;max-width:640px;margin:40px auto;padding:0 16px;background:#07070d;color:#f3f1ff">
     ${body}</body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers } }
  );

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function basicAuth(env) {
  return "Basic " + btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
}

async function accessToken(env) {
  if (cached.token && Date.now() < cached.expires - 60_000) return cached.token;
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { authorization: basicAuth(env), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: cached.refresh || env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status})`);
  const t = await res.json();
  cached = {
    token: t.access_token,
    expires: Date.now() + t.expires_in * 1000,
    // Spotify may hand back a new refresh token; keep using it for the life of this isolate.
    refresh: t.refresh_token || cached.refresh,
  };
  return cached.token;
}

const configured = env =>
  Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET && env.SPOTIFY_REFRESH_TOKEN && env.SPOTIFY_PLAYLIST_ID);

async function search(env, q) {
  const token = await accessToken(env);
  const url = `${API}/search?${new URLSearchParams({ q, type: "track", limit: "8" })}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`search failed (${res.status})`);
  const data = await res.json();
  return (data.tracks?.items || []).map(t => ({
    uri: t.uri,
    name: t.name,
    artists: t.artists.map(a => a.name).join(", "),
    album: t.album?.name || "",
    image: (t.album?.images || []).at(-1)?.url || "",
    ms: t.duration_ms,
  }));
}

async function addTrack(env, uri) {
  const token = await accessToken(env);
  const init = {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  };
  // Spotify has been renaming playlist "tracks" to "items"; try the newer path, then the classic one.
  let res = await fetch(`${API}/playlists/${env.SPOTIFY_PLAYLIST_ID}/items`, init);
  if (res.status === 404 || res.status === 405) {
    res = await fetch(`${API}/playlists/${env.SPOTIFY_PLAYLIST_ID}/tracks`, init);
  }
  if (!res.ok) throw new Error(`add failed (${res.status})`);
}


async function listTracks(env) {
  const token = await accessToken(env);
  const get = path => fetch(`${API}/playlists/${env.SPOTIFY_PLAYLIST_ID}/${path}?limit=100`, { headers: { authorization: `Bearer ${token}` } });
  // Newer API name first ("items"), then the classic one ("tracks").
  let res = await get("items");
  if (res.status === 404 || res.status === 405) res = await get("tracks");
  if (!res.ok) throw new Error(`list failed (${res.status})`);
  const data = await res.json();
  return (data.items || [])
    .map(it => ({ at: it.added_at, t: it.track || it.item }))
    .filter(x => x.t && x.t.name)
    .map(({ at, t }) => ({
      name: t.name,
      artists: (t.artists || []).map(a => a.name).join(", "),
      image: (t.album?.images || []).at(-1)?.url || "",
      ms: t.duration_ms || 0,
      added: at,
      url: t.external_urls?.spotify || "",
    }))
    .sort((a, b) => String(b.added).localeCompare(String(a.added)));
}

async function handleApi(req, env, url) {
  const path = url.pathname;

  if (path === "/api/songs/status") return json({ enabled: configured(env) });

  if (path === "/api/songs/list" && req.method === "GET") {
    if (!configured(env)) return json({ error: "not configured" }, 503);
    return json({ tracks: await listTracks(env) });
  }

  if (path === "/api/songs/search" && req.method === "GET") {
    if (!configured(env)) return json({ error: "not configured" }, 503);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    if (q.length < 2) return json({ tracks: [] });
    return json({ tracks: await search(env, q) });
  }

  if (path === "/api/songs/add" && req.method === "POST") {
    if (!configured(env)) return json({ error: "not configured" }, 503);
    const { uri } = await req.json().catch(() => ({}));
    if (typeof uri !== "string" || !/^spotify:track:[A-Za-z0-9]{22}$/.test(uri)) return json({ error: "bad track" }, 400);
    await addTrack(env, uri);
    return json({ ok: true });
  }

  // ---- One-time setup: the playlist owner logs in to get a refresh token ----
  if (path === "/api/spotify/login") {
    if (env.SPOTIFY_REFRESH_TOKEN) return html("<h1>Already set up ✅</h1><p>Remove the SPOTIFY_REFRESH_TOKEN secret first if you want to redo it.</p>", 403);
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) return html("<h1>Missing app keys</h1><p>Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET as secrets first.</p>", 503);
    const state = crypto.randomUUID();
    const auth = `${ACCOUNTS}/authorize?${new URLSearchParams({
      response_type: "code", client_id: env.SPOTIFY_CLIENT_ID, scope: SCOPES,
      redirect_uri: `${url.origin}/api/spotify/callback`, state,
    })}`;
    return new Response(null, {
      status: 302,
      headers: { location: auth, "set-cookie": `sp_state=${state}; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
    });
  }

  if (path === "/api/spotify/callback") {
    if (env.SPOTIFY_REFRESH_TOKEN) return html("<h1>Already set up ✅</h1>", 403);
    const state = url.searchParams.get("state");
    const cookie = (req.headers.get("cookie") || "").match(/(?:^|;\s*)sp_state=([^;]+)/)?.[1];
    if (!state || state !== cookie) return html("<h1>Login expired</h1><p>Start again at <a href='/api/spotify/login' style='color:#33e1ff'>/api/spotify/login</a>.</p>", 400);
    if (url.searchParams.get("error")) return html(`<h1>Spotify said no</h1><p>${esc(url.searchParams.get("error"))}</p>`, 400);
    const res = await fetch(`${ACCOUNTS}/api/token`, {
      method: "POST",
      headers: { authorization: basicAuth(env), "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code") || "", redirect_uri: `${url.origin}/api/spotify/callback` }),
    });
    if (!res.ok) return html(`<h1>Token exchange failed (${res.status})</h1><p>Check that the redirect URI in your Spotify app is exactly <code>${esc(url.origin)}/api/spotify/callback</code>.</p>`, 502);
    const t = await res.json();
    return html(
      `<h1>Almost done 🎉</h1>
       <p>Copy this refresh token and add it in Cloudflare as a <b>secret</b> named <code>SPOTIFY_REFRESH_TOKEN</code>
       (Worker → Settings → Variables and Secrets). Don't share it with anyone.</p>
       <textarea readonly style="width:100%;height:120px;font:13px monospace" onclick="this.select()">${esc(t.refresh_token)}</textarea>
       <p>Once it's saved, this page stops working and the song search on the site switches on.</p>`,
      200,
      { "set-cookie": "sp_state=; Path=/api/spotify; Max-Age=0" }
    );
  }

  return json({ error: "not found" }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(req, env, url);
      } catch (err) {
        console.error(err);
        return json({ error: "spotify error", detail: String(err.message || err) }, 502);
      }
    }
    return env.ASSETS.fetch(req);
  },
};

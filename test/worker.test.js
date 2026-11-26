import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";

const env = {
  SPOTIFY_CLIENT_ID: "id", SPOTIFY_CLIENT_SECRET: "secret",
  SPOTIFY_REFRESH_TOKEN: "refresh", SPOTIFY_PLAYLIST_ID: "PLAYLIST",
  ASSETS: { fetch: () => new Response("static") },
};
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/api/token")) return Response.json({ access_token: "AT", expires_in: 3600 });
    if (String(url).includes("/v1/search")) return Response.json({ tracks: { items: [
      { uri: "spotify:track:" + "a".repeat(22), name: "Song", artists: [{ name: "Band" }], album: { name: "LP", images: [{ url: "big" }, { url: "small" }] }, duration_ms: 1000 },
    ] } });
    if (String(url).includes("/items")) return new Response("", { status: 404 });
    if (String(url).includes("/tracks")) return Response.json({ snapshot_id: "x" }, { status: 201 });
    return new Response("?", { status: 500 });
  };
});
const call = (path, init) => worker.fetch(new Request("https://site.example" + path, init), env);

test("non-api paths are served from static assets", async () => {
  assert.equal(await (await call("/")).text(), "static");
});

test("status reports whether Spotify is configured", async () => {
  assert.deepEqual(await (await call("/api/songs/status")).json(), { enabled: true });
  const r = await worker.fetch(new Request("https://site.example/api/songs/status"), { ...env, SPOTIFY_REFRESH_TOKEN: "" });
  assert.deepEqual(await r.json(), { enabled: false });
});

test("search returns trimmed track info", async () => {
  const { tracks } = await (await call("/api/songs/search?q=song")).json();
  assert.equal(tracks[0].artists, "Band");
  assert.equal(tracks[0].image, "small");
});

test("add validates the uri and falls back to the classic tracks endpoint", async () => {
  assert.equal((await call("/api/songs/add", { method: "POST", body: JSON.stringify({ uri: "nope" }) })).status, 400);
  const r = await call("/api/songs/add", { method: "POST", body: JSON.stringify({ uri: "spotify:track:" + "a".repeat(22) }) });
  assert.equal(r.status, 200);
  assert.ok(calls.some(c => c.url.endsWith("/playlists/PLAYLIST/tracks")));
});

test("setup login is closed once a refresh token exists", async () => {
  assert.equal((await call("/api/spotify/login")).status, 403);
  const r = await worker.fetch(new Request("https://site.example/api/spotify/login"), { ...env, SPOTIFY_REFRESH_TOKEN: "" });
  assert.equal(r.status, 302);
  assert.match(r.headers.get("location"), /redirect_uri=https%3A%2F%2Fsite\.example%2Fapi%2Fspotify%2Fcallback/);
});

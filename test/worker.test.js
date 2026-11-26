import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker, { parseEmbed } from "../src/worker.js";

const page = data => `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
const sample = page({ props: { pageProps: { state: { data: { entity: { type: "playlist", trackList: [
  { uri: "spotify:track:" + "a".repeat(22), title: "Dancing Queen", subtitle: "ABBA", duration: 231000 },
  { uri: "spotify:track:" + "b".repeat(22), title: "Take On Me", subtitle: "a-ha", duration: 225000 },
] } } } } } });

const env = { SPOTIFY_PLAYLIST_ID: "PLAYLIST", ASSETS: { fetch: () => new Response("static") } };
const ctx = { waitUntil() {} };
let fetched;
beforeEach(() => {
  fetched = [];
  globalThis.caches = { default: { match: async () => undefined, put: async () => {} } };
  globalThis.fetch = async url => { fetched.push(String(url)); return new Response(sample); };
});
const call = path => worker.fetch(new Request("https://site.example" + path), env, ctx);

test("parses the track list out of the embed page", () => {
  assert.deepEqual(parseEmbed(sample)[0], {
    id: "a".repeat(22), name: "Dancing Queen", artists: "ABBA", ms: 231000, url: "https://open.spotify.com/track/" + "a".repeat(22), image: "",
  });
});

test("list endpoint reads the public embed page, no credentials", async () => {
  const { tracks } = await (await call("/api/songs/list")).json();
  assert.deepEqual(tracks.map(t => t.name), ["Dancing Queen", "Take On Me"]);
  assert.deepEqual(fetched, ["https://open.spotify.com/embed/playlist/PLAYLIST"]);
});

test("list endpoint reports an error when the page can't be parsed", async () => {
  globalThis.fetch = async () => new Response("<html>nope</html>");
  assert.equal((await call("/api/songs/list")).status, 502);
});

test("other paths are served from static assets", async () => {
  assert.equal(await (await call("/")).text(), "static");
  assert.equal((await call("/api/nope")).status, 404);
});

test("falls back to the playlist page's song list when the embed has no data", async () => {
  const tid = "c".repeat(22);
  globalThis.fetch = async url => {
    url = String(url);
    if (url.includes("/embed/")) return new Response("<html>no data</html>");
    if (url.includes("/oembed")) return Response.json({ title: "Levels" });
    return new Response(`<meta name="music:song" content="https://open.spotify.com/track/${tid}">`);
  };
  const { tracks } = await (await call("/api/songs/list")).json();
  assert.deepEqual(tracks, [{ id: tid, name: "Levels", artists: "", ms: 0, url: "https://open.spotify.com/track/" + tid, image: "" }]);
});

test("debug endpoint explains what happened", async () => {
  const d = await (await call("/api/songs/debug")).json();
  assert.equal(d.ok, true);
  assert.equal(d.found, 2);
  assert.equal(d.log[0].hasNextData, true);
});

test("album art comes from oEmbed and is remembered in the store", async () => {
  const saved = {};
  const stub = { fetch: async (url, init) => {
    const body = JSON.parse(init.body);
    if (init.method === "PUT") { Object.assign(saved, body); return Response.json({ ok: true }); }
    return Response.json(Object.fromEntries(body.ids.filter(id => saved[id]).map(id => [id, saved[id]])));
  } };
  const envT = { ...env, GROUPS: { idFromName: () => "x", get: () => stub } };
  let oembeds = 0;
  globalThis.fetch = async url => {
    if (String(url).includes("/oembed")) { oembeds++; return Response.json({ thumbnail_url: "https://i.scdn.co/image/" + oembeds }); }
    return new Response(sample);
  };
  const first = await (await worker.fetch(new Request("https://site.example/api/songs/list"), envT, ctx)).json();
  assert.equal(first.tracks[0].image.startsWith("https://i.scdn.co/image/"), true);
  assert.equal(oembeds, 2);
  await worker.fetch(new Request("https://site.example/api/songs/list"), envT, ctx);
  assert.equal(oembeds, 2, "thumbnails are not fetched again");
});

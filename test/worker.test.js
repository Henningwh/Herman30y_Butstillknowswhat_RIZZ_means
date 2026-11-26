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
    name: "Dancing Queen", artists: "ABBA", ms: 231000, url: "https://open.spotify.com/track/" + "a".repeat(22),
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

import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { GroupStore } from "../src/store.js";
import { PINS } from "../src/pins.js";

// Minimal stand-in for a Durable Object's ctx.storage.sql
function fakeCtx() {
  const db = new DatabaseSync(":memory:");
  return { storage: { sql: { exec(q, ...b) {
    const norm = b.map(v => (v instanceof ArrayBuffer ? new Uint8Array(v) : v));
    if (!norm.length && q.includes(";") && /CREATE/i.test(q)) { db.exec(q); return { toArray: () => [] }; }
    const st = db.prepare(q);
    const rows = /^\s*SELECT/i.test(q) ? st.all(...norm) : (st.run(...norm), []);
    return { toArray: () => rows };
  } } } };
}
const store = () => new GroupStore(fakeCtx(), {});
const req = (s, method, path, { body, token, headers = {} } = {}) => s.fetch(new Request("https://x" + path, {
  method, headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...(body && !(body instanceof Uint8Array) ? { "content-type": "application/json" } : {}), "cf-connecting-ip": "1.2.3.4", ...headers },
  body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
}));
const login = async (s, grp = "lunch") => (await (await req(s, "POST", `/api/groups/${grp}/login`, { body: { pin: PINS[grp] } })).json()).token;

test("members are seeded from committee-data.json", async () => {
  const { members } = await (await req(store(), "GET", "/api/groups/lunch/members")).json();
  assert.equal(members[0].name, "Henrik Buck Christoffersen");
  assert.equal(members[0].scene, "grill");
});

test("wrong PIN is refused and rate-limited; right PIN gives a token for that committee only", async () => {
  const s = store();
  assert.equal((await req(s, "POST", "/api/groups/lunch/login", { body: { pin: "nope" } })).status, 401);
  const token = await login(s);
  assert.ok(token);
  assert.equal((await req(s, "GET", "/api/groups/lunch/session", { token })).status, 200);
  assert.equal((await req(s, "GET", "/api/groups/bar/session", { token })).status, 401);
  for (let i = 0; i < 10; i++) await req(s, "POST", "/api/groups/bar/login", { body: { pin: "x" } });
  assert.equal((await req(s, "POST", "/api/groups/bar/login", { body: { pin: PINS.bar } })).status, 429);
});

test("admins can add, edit, re-photo and delete members", async () => {
  const s = store(), token = await login(s);
  assert.equal((await req(s, "POST", "/api/groups/lunch/members", { body: { name: "Nope" } })).status, 401);
  let { members } = await (await req(s, "POST", "/api/groups/lunch/members", { token, body: { name: "Kari", funFact: "liker brunost" } })).json();
  const kari = members.find(m => m.name === "Kari");
  ({ members } = await (await req(s, "PATCH", `/api/groups/lunch/members/${kari.id}`, { token, body: { funFact: "elsker brunost" } })).json());
  assert.equal(members.find(m => m.id === kari.id).funFact, "elsker brunost");
  const img = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
  ({ members } = await (await req(s, "PUT", `/api/groups/lunch/members/${kari.id}/photo`, { token, body: img, headers: { "content-type": "image/jpeg" } })).json());
  const photo = members.find(m => m.id === kari.id).photo;
  assert.match(photo, /^\/api\/photos\//);
  const got = await req(s, "GET", photo);
  assert.equal(got.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), img);
  ({ members } = await (await req(s, "DELETE", `/api/groups/lunch/members/${kari.id}`, { token })).json());
  assert.ok(!members.some(m => m.id === kari.id));
  assert.equal((await req(s, "GET", photo)).status, 404);
});

test("planner notes are private to the committee and editable", async () => {
  const s = store(), token = await login(s);
  assert.equal((await req(s, "GET", "/api/groups/lunch/notes")).status, 401);
  let { notes } = await (await req(s, "POST", "/api/groups/lunch/notes", { token, body: { title: "Buy bread", day: "friday", time: "12:00", color: "pink" } })).json();
  assert.equal(notes[0].day, "friday");
  ({ notes } = await (await req(s, "PATCH", `/api/groups/lunch/notes/${notes[0].id}`, { token, body: { done: true, day: "bogus" } })).json());
  assert.equal(notes[0].done, true);
  assert.equal(notes[0].day, "friday");
  ({ notes } = await (await req(s, "DELETE", `/api/groups/lunch/notes/${notes[0].id}`, { token })).json());
  assert.equal(notes.length, 0);
});

test("admins can edit the committee description", async () => {
  const s = store(), token = await login(s);
  let d = await (await req(s, "GET", "/api/groups/lunch/members")).json();
  assert.match(d.description, /lunch/i);
  assert.equal((await req(s, "PATCH", "/api/groups/lunch/info", { body: { description: "x" } })).status, 401);
  assert.equal((await req(s, "PATCH", "/api/groups/lunch/info", { token, body: { description: "Vi lager verdens beste lunsj." } })).status, 200);
  d = await (await req(s, "GET", "/api/groups/lunch/members")).json();
  assert.equal(d.description, "Vi lager verdens beste lunsj.");
});

test("master PIN 2244 unlocks any committee", async () => {
  const s = store();
  for (const grp of Object.keys(PINS)) {
    const r = await req(s, "POST", `/api/groups/${grp}/login`, { body: { pin: "2244" } });
    assert.equal(r.status, 200, grp);
  }
});

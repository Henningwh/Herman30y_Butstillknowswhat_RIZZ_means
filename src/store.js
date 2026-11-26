// GroupStore: one Durable Object (SQLite storage) holding committee members, their photos,
// each committee's activity planner, and admin sessions. Created automatically on deploy.
//
// Public:
//   GET    /api/groups/:g/members         -> { members, description }
//   GET    /api/photos/:id
//   POST   /api/groups/:g/login            { pin }          -> { token }
// Admin (Authorization: Bearer <token> for that committee):
//   GET    /api/groups/:g/session
//   PATCH  /api/groups/:g/info             { description }
//   DELETE /api/groups/:g/session
//   POST   /api/groups/:g/members          { name, funFact }
//   PATCH  /api/groups/:g/members/:id      { name?, funFact? }
//   DELETE /api/groups/:g/members/:id
//   PUT    /api/groups/:g/members/:id/photo   (body: image bytes)
//   GET    /api/groups/:g/notes
//   POST   /api/groups/:g/notes            { title, details?, day?, time?, who?, color? }
//   PATCH  /api/groups/:g/notes/:id        { ...any of the above, done? }
//   DELETE /api/groups/:g/notes/:id

import defaults from "../public/committee-data.json" with { type: "json" };
import { PINS, MASTER_PIN } from "./pins.js";

export const DAYS = ["before", "friday", "saturday", "sunday"];
export const COLORS = ["yellow", "pink", "blue", "green", "purple"];
const SESSION_DAYS = 60;
const MAX_TRIES = 10, TRY_WINDOW_MS = 15 * 60 * 1000;
const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const bad = (msg, status = 400) => json({ error: msg }, status);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export class GroupStore {
  constructor(ctx, env) {
    this.sql = ctx.storage.sql;
    this.env = env;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, grp TEXT NOT NULL, name TEXT NOT NULL, fun_fact TEXT NOT NULL DEFAULT '',
        photo TEXT NOT NULL DEFAULT '', video TEXT NOT NULL DEFAULT '', scene TEXT NOT NULL DEFAULT '', sort INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS seeded (grp TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS info (grp TEXT PRIMARY KEY, description TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, grp TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '',
        day TEXT NOT NULL DEFAULT 'before', time TEXT NOT NULL DEFAULT '', who TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT 'yellow',
        done INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, grp TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, since INTEGER NOT NULL);
    `);
  }

  rows(q, ...b) { return this.sql.exec(q, ...b).toArray(); }

  // First read of a committee copies its members from committee-data.json; after that the database is the source.
  seed(grp) {
    if (this.rows("SELECT 1 FROM seeded WHERE grp = ?", grp).length) return;
    (defaults[grp]?.members || []).forEach((m, k) => this.sql.exec(
      "INSERT INTO members (id, grp, name, fun_fact, photo, video, scene, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      crypto.randomUUID(), grp, m.name || "", m.funFact || "", m.photo || "", m.video || "", m.scene || "", k));
    this.sql.exec("INSERT INTO seeded (grp) VALUES (?)", grp);
  }

  members(grp) {
    this.seed(grp);
    return this.rows("SELECT id, name, fun_fact, photo, video, scene FROM members WHERE grp = ? ORDER BY sort, rowid", grp)
      .map(m => ({ id: m.id, name: m.name, funFact: m.fun_fact, photo: m.photo, video: m.video, scene: m.scene }));
  }

  description(grp) {
    return this.rows("SELECT description FROM info WHERE grp = ?", grp)[0]?.description ?? defaults[grp]?.description ?? "";
  }

  member(grp, id) { return this.rows("SELECT * FROM members WHERE grp = ? AND id = ?", grp, id)[0]; }

  authed(req, grp) {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return false;
    const s = this.rows("SELECT grp, expires FROM sessions WHERE token = ?", token)[0];
    return Boolean(s && s.grp === grp && s.expires > Date.now());
  }

  login(grp, pin, ip) {
    const key = `${ip}|${grp}`, now = Date.now();
    let a = this.rows("SELECT count, since FROM attempts WHERE key = ?", key)[0];
    if (a && now - a.since > TRY_WINDOW_MS) { this.sql.exec("DELETE FROM attempts WHERE key = ?", key); a = null; }
    if (a && a.count >= MAX_TRIES) return bad("Too many wrong PINs – wait 15 minutes.", 429);
    if (String(pin) !== PINS[grp] && String(pin) !== MASTER_PIN) {
      this.sql.exec("INSERT INTO attempts (key, count, since) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1", key, now);
      return bad("Wrong PIN.", 401);
    }
    this.sql.exec("DELETE FROM attempts WHERE key = ?", key);
    this.sql.exec("DELETE FROM sessions WHERE expires < ?", now);
    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    this.sql.exec("INSERT INTO sessions (token, grp, expires) VALUES (?, ?, ?)", token, grp, now + SESSION_DAYS * 864e5);
    return json({ token });
  }

  note(row) {
    return { id: row.id, title: row.title, details: row.details, day: row.day, time: row.time, who: row.who,
             color: row.color, done: Boolean(row.done), updated: row.updated };
  }

  cleanNote(body, base = {}) {
    const n = { ...base };
    if ("title" in body) n.title = str(body.title, 120);
    if ("details" in body) n.details = str(body.details, 1000);
    if ("day" in body && DAYS.includes(body.day)) n.day = body.day;
    if ("time" in body) n.time = str(body.time, 20);
    if ("who" in body) n.who = str(body.who, 80);
    if ("color" in body && COLORS.includes(body.color)) n.color = body.color;
    if ("done" in body) n.done = body.done ? 1 : 0;
    return n;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
    const method = req.method;

    if (parts[1] === "photos" && parts.length === 3 && method === "GET") {
      const p = this.rows("SELECT type, data FROM photos WHERE id = ?", parts[2])[0];
      if (!p) return bad("not found", 404);
      return new Response(p.data, { headers: { "content-type": p.type, "cache-control": "public, max-age=31536000, immutable" } });
    }

    if (parts[1] !== "groups" || !parts[2]) return bad("not found", 404);
    const grp = parts[2];
    if (!Object.hasOwn(PINS, grp) || !Object.hasOwn(defaults, grp)) return bad("unknown committee", 404);
    const [, , , section, id, sub] = parts;
    const body = ["POST", "PATCH"].includes(method) ? await req.json().catch(() => ({})) : {};

    if (section === "members" && !id && method === "GET") return json({ members: this.members(grp), description: this.description(grp) });
    if (section === "login" && method === "POST") return this.login(grp, body.pin, req.headers.get("cf-connecting-ip") || "?");

    if (!this.authed(req, grp)) return bad("PIN required", 401);

    if (section === "session") {
      if (method === "DELETE") {
        this.sql.exec("DELETE FROM sessions WHERE token = ?", (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
      }
      return json({ ok: true });
    }

    if (section === "info" && method === "PATCH") {
      const description = str(body.description, 400);
      if (!description) return bad("Description can't be empty.");
      this.sql.exec("INSERT INTO info (grp, description) VALUES (?, ?) ON CONFLICT(grp) DO UPDATE SET description = excluded.description", grp, description);
      return json({ description });
    }

    if (section === "members") {
      this.seed(grp);
      if (!id && method === "POST") {
        const name = str(body.name, 80);
        if (!name) return bad("Name is required.");
        const sort = (this.rows("SELECT MAX(sort) AS s FROM members WHERE grp = ?", grp)[0]?.s ?? -1) + 1;
        const newId = crypto.randomUUID();
        this.sql.exec("INSERT INTO members (id, grp, name, fun_fact, sort) VALUES (?, ?, ?, ?, ?)", newId, grp, name, str(body.funFact, 200), sort);
        return json({ members: this.members(grp) }, 201);
      }
      const m = id && this.member(grp, id);
      if (!m) return bad("member not found", 404);
      if (!sub && method === "PATCH") {
        const name = "name" in body ? str(body.name, 80) : m.name;
        if (!name) return bad("Name is required.");
        this.sql.exec("UPDATE members SET name = ?, fun_fact = ? WHERE id = ?", name, "funFact" in body ? str(body.funFact, 200) : m.fun_fact, id);
        return json({ members: this.members(grp) });
      }
      if (!sub && method === "DELETE") {
        this.sql.exec("DELETE FROM members WHERE id = ?", id);
        if (m.photo.startsWith("/api/photos/")) this.sql.exec("DELETE FROM photos WHERE id = ?", m.photo.split("/").pop());
        return json({ members: this.members(grp) });
      }
      if (sub === "photo" && method === "PUT") {
        const type = (req.headers.get("content-type") || "").split(";")[0];
        if (!PHOTO_TYPES.includes(type)) return bad("Upload a JPEG, PNG or WebP image.");
        const data = await req.arrayBuffer();
        if (!data.byteLength || data.byteLength > MAX_PHOTO_BYTES) return bad("Image is too big (max 1.5 MB).", 413);
        const photoId = crypto.randomUUID();
        this.sql.exec("INSERT INTO photos (id, type, data) VALUES (?, ?, ?)", photoId, type, data);
        if (m.photo.startsWith("/api/photos/")) this.sql.exec("DELETE FROM photos WHERE id = ?", m.photo.split("/").pop());
        // A new photo replaces any video for that member.
        this.sql.exec("UPDATE members SET photo = ?, video = '' WHERE id = ?", `/api/photos/${photoId}`, id);
        return json({ members: this.members(grp) });
      }
      return bad("not found", 404);
    }

    if (section === "notes") {
      const list = () => json({ notes: this.rows("SELECT * FROM notes WHERE grp = ? ORDER BY done, time = '', time, created", grp).map(r => this.note(r)) });
      if (!id && method === "GET") return list();
      if (!id && method === "POST") {
        const n = this.cleanNote(body, { title: "", details: "", day: "before", time: "", who: "", color: "yellow", done: 0 });
        if (!n.title) return bad("Give it a title.");
        const now = Date.now();
        this.sql.exec("INSERT INTO notes (id, grp, title, details, day, time, who, color, done, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          crypto.randomUUID(), grp, n.title, n.details, n.day, n.time, n.who, n.color, n.done, now, now);
        return list();
      }
      const row = id && this.rows("SELECT * FROM notes WHERE grp = ? AND id = ?", grp, id)[0];
      if (!row) return bad("note not found", 404);
      if (method === "PATCH") {
        const n = this.cleanNote(body, row);
        if (!n.title) return bad("Give it a title.");
        this.sql.exec("UPDATE notes SET title = ?, details = ?, day = ?, time = ?, who = ?, color = ?, done = ?, updated = ? WHERE id = ?",
          n.title, n.details, n.day, n.time, n.who, n.color, n.done, Date.now(), id);
        return list();
      }
      if (method === "DELETE") { this.sql.exec("DELETE FROM notes WHERE id = ?", id); return list(); }
    }

    return bad("not found", 404);
  }
}

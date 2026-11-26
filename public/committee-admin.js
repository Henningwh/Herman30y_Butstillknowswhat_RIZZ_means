// Committee admin: PIN login, member editing (photos, names, fun facts) and the activity planner.
// Talks to /api/groups/:team/* on the Worker (Durable Object storage).

const DAYS = [["before", "Before the trip"], ["friday", "Friday"], ["saturday", "Saturday"], ["sunday", "Sunday"]];
const COLORS = ["yellow", "pink", "blue", "green", "purple"];
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function createAdmin(team, { title, onMembers }) {
  const key = `admin-token:${team}`;
  const read = () => { try { return localStorage.getItem(key) || ""; } catch { return ""; } };
  const write = v => { try { v ? localStorage.setItem(key, v) : localStorage.removeItem(key); } catch {} };
  let token = read();
  const listeners = new Set();
  const isAdmin = () => Boolean(token);

  async function api(path, { method = "GET", body, raw, type } = {}) {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (raw) headers["content-type"] = type;
    else if (body) headers["content-type"] = "application/json";
    const res = await fetch(`/api/groups/${team}${path}`, { method, headers, body: raw || (body ? JSON.stringify(body) : undefined) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && path !== "/login") setToken("");
    if (!res.ok) throw new Error(data.error || `Something went wrong (${res.status})`);
    return data;
  }

  function setToken(t) { token = t; write(t); listeners.forEach(fn => fn(isAdmin())); }

  // ---------- PIN dialog ----------
  const dialog = document.getElementById("pin-dialog");
  const pinInput = document.getElementById("pin-input");
  const pinError = document.getElementById("pin-error");
  document.getElementById("pin-title").textContent = `${title} admin`;
  async function submitPin() {
    if (pinInput.value.length < 4) return;
    pinError.textContent = "";
    try {
      const { token: t } = await api("/login", { method: "POST", body: { pin: pinInput.value } });
      setToken(t);
      dialog.close();
    } catch (err) {
      pinError.textContent = err.message;
      pinInput.value = "";
      dialog.querySelector(".pin-box").animate([{ transform: "translateX(0)" }, { transform: "translateX(-10px)" }, { transform: "translateX(10px)" }, { transform: "translateX(0)" }], { duration: 300 });
    }
  }
  pinInput.addEventListener("input", () => { pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 4); if (pinInput.value.length === 4) submitPin(); });
  document.getElementById("pin-form").addEventListener("submit", e => { e.preventDefault(); submitPin(); });
  document.getElementById("pin-cancel").addEventListener("click", () => dialog.close());

  const adminBtn = document.getElementById("admin-button");
  adminBtn.hidden = false;
  adminBtn.addEventListener("click", async () => {
    if (isAdmin()) {
      api("/session", { method: "DELETE" }).catch(() => {});
      setToken("");
    } else {
      pinInput.value = ""; pinError.textContent = "";
      dialog.showModal();
      pinInput.focus();
    }
  });
  const renderButton = admin => {
    adminBtn.textContent = admin ? "🔓 Admin on · Log out" : "🔒 Admin";
    adminBtn.classList.toggle("on", admin);
    document.body.classList.toggle("is-admin", admin);
  };
  listeners.add(renderButton);
  renderButton(isAdmin());
  if (token) api("/session").catch(() => {});   // drops an expired token

  // ---------- committee description ----------
  const desc = document.getElementById("committee-description");
  const descBtn = document.getElementById("edit-description");
  descBtn.addEventListener("click", () => {
    const wrap = document.createElement("form");
    wrap.className = "member-edit desc-edit";
    wrap.innerHTML = `<label>Committee description<textarea name="description" maxlength="400" rows="3" required>${esc(desc.textContent)}</textarea></label>
      <div class="row"><button class="admin-btn primary">Save</button><button type="button" class="admin-btn" data-act="cancel">Cancel</button></div>`;
    desc.hidden = true; descBtn.hidden = true;
    desc.after(wrap);
    wrap.elements.description.focus();
    const close = () => { wrap.remove(); desc.hidden = false; descBtn.hidden = !isAdmin(); };
    wrap.querySelector('[data-act="cancel"]').addEventListener("click", close);
    wrap.addEventListener("submit", async e => {
      e.preventDefault();
      try { desc.textContent = (await api("/info", { method: "PATCH", body: { description: wrap.elements.description.value } })).description; close(); }
      catch (err) { alert(err.message); }
    });
  });
  listeners.add(admin => { descBtn.hidden = !admin; if (!admin) document.querySelector(".desc-edit [data-act=cancel]")?.click(); });
  descBtn.hidden = !isAdmin();

  // ---------- member editing ----------
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1100 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
  }

  function decorateCard(li, member) {
    const tools = document.createElement("div");
    tools.className = "admin-tools";
    tools.innerHTML = `
      <label class="admin-btn">📷 Photo<input type="file" accept="image/*" hidden></label>
      <button type="button" class="admin-btn" data-act="edit">✏️ Edit</button>
      <button type="button" class="admin-btn danger" data-act="del" aria-label="Remove ${esc(member.name)}">🗑</button>`;
    li.append(tools);
    tools.querySelector("input").addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      li.classList.add("busy");
      try {
        const blob = await shrink(file);
        onMembers((await api(`/members/${member.id}/photo`, { method: "PUT", raw: blob, type: "image/jpeg" })).members);
      } catch (err) {
        alert(/decod|bitmap|source image/i.test(err.message) ? "Couldn't read that image – try a JPEG or PNG." : err.message);
        li.classList.remove("busy"); e.target.value = "";
      }
    });
    tools.querySelector('[data-act="del"]').addEventListener("click", async () => {
      if (!confirm(`Remove ${member.name} from the committee?`)) return;
      try { onMembers((await api(`/members/${member.id}`, { method: "DELETE" })).members); } catch (err) { alert(err.message); }
    });
    tools.querySelector('[data-act="edit"]').addEventListener("click", () => {
      const box = li.querySelector(".member-text");
      box.innerHTML = `<form class="member-edit">
        <label>Name<input name="name" maxlength="80" required value="${esc(member.name)}"></label>
        <label>Fun fact<input name="funFact" maxlength="200" value="${esc(member.funFact)}"></label>
        <div class="row"><button class="admin-btn primary">Save</button><button type="button" class="admin-btn" data-act="cancel">Cancel</button></div></form>`;
      const form = box.querySelector("form");
      form.elements.name.focus();
      form.querySelector('[data-act="cancel"]').addEventListener("click", () => onMembers(null));
      form.addEventListener("submit", async e => {
        e.preventDefault();
        try { onMembers((await api(`/members/${member.id}`, { method: "PATCH", body: { name: form.elements.name.value, funFact: form.elements.funFact.value } })).members); }
        catch (err) { alert(err.message); }
      });
    });
  }

  function addMemberCard(list) {
    const li = document.createElement("li");
    li.className = "member-card add-member";
    li.innerHTML = `<form><h3>➕ Add member</h3>
      <label>Name<input name="name" maxlength="80" required placeholder="Name"></label>
      <label>Fun fact<input name="funFact" maxlength="200" placeholder="Something true-ish"></label>
      <button class="admin-btn primary">Add</button><p class="hint">Add a photo after with 📷.</p></form>`;
    const form = li.querySelector("form");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try { onMembers((await api("/members", { method: "POST", body: { name: form.elements.name.value, funFact: form.elements.funFact.value } })).members); }
      catch (err) { alert(err.message); }
    });
    list.append(li);
  }

  // ---------- activity planner ----------
  const planner = document.getElementById("planner");
  const board = document.getElementById("planner-board");
  const form = document.getElementById("planner-form");
  const whoSelect = form.elements.who;
  let notes = [], editing = null, poll = null, names = [];

  form.elements.day.innerHTML = DAYS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
  form.querySelector(".swatches").innerHTML = COLORS.map((c, k) =>
    `<label class="swatch note-${c}"><input type="radio" name="color" value="${c}"${k ? "" : " checked"}><span class="sr-only">${c}</span></label>`).join("");

  function setNames(members) {
    names = members.map(m => m.name);
    const cur = whoSelect.value;
    whoSelect.innerHTML = `<option value="">Anyone</option><option>Everyone</option>` + names.map(n => `<option>${esc(n)}</option>`).join("");
    whoSelect.value = cur;
  }

  function renderBoard() {
    board.innerHTML = DAYS.map(([day, label]) => {
      const items = notes.filter(n => n.day === day);
      return `<section class="day-col" data-day="${day}"><h3>${label} <small>${items.length || ""}</small></h3>
        ${items.map(n => `<article class="note note-${n.color}${n.done ? " done" : ""}" data-id="${n.id}" draggable="true">
          <div class="note-top">${n.time ? `<time>${esc(n.time)}</time>` : ""}${n.who ? `<span class="who">${esc(n.who)}</span>` : ""}</div>
          <h4>${esc(n.title)}</h4>${n.details ? `<p>${esc(n.details)}</p>` : ""}
          <div class="note-actions">
            <button type="button" data-act="done" title="${n.done ? "Not done" : "Done"}">${n.done ? "↺" : "✓"}</button>
            <button type="button" data-act="left" title="Earlier day"${day === DAYS[0][0] ? " disabled" : ""}>◀</button>
            <button type="button" data-act="right" title="Later day"${day === DAYS.at(-1)[0] ? " disabled" : ""}>▶</button>
            <button type="button" data-act="edit" title="Edit">✏️</button>
            <button type="button" data-act="del" title="Delete">🗑</button>
          </div></article>`).join("") || `<p class="empty">Nothing yet</p>`}
      </section>`;
    }).join("");
  }

  async function loadNotes() {
    try { notes = (await api("/notes")).notes; renderBoard(); } catch {}
  }
  const save = async (id, patch) => { try { notes = (await api(`/notes/${id}`, { method: "PATCH", body: patch })).notes; renderBoard(); } catch (err) { alert(err.message); } };

  board.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const note = notes.find(n => n.id === btn.closest(".note").dataset.id);
    const i = DAYS.findIndex(([d]) => d === note.day);
    if (btn.dataset.act === "done") save(note.id, { done: !note.done });
    if (btn.dataset.act === "left") save(note.id, { day: DAYS[i - 1][0] });
    if (btn.dataset.act === "right") save(note.id, { day: DAYS[i + 1][0] });
    if (btn.dataset.act === "del" && confirm(`Delete “${note.title}”?`)) {
      try { notes = (await api(`/notes/${note.id}`, { method: "DELETE" })).notes; renderBoard(); } catch (err) { alert(err.message); }
    }
    if (btn.dataset.act === "edit") {
      editing = note.id;
      form.elements.title.value = note.title; form.elements.details.value = note.details; form.elements.day.value = note.day;
      form.elements.time.value = note.time; whoSelect.value = note.who;
      form.querySelector(`input[name="color"][value="${note.color}"]`).checked = true;
      form.querySelector("button.primary").textContent = "Save changes";
      form.querySelector('[data-act="cancel-edit"]').hidden = false;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      form.elements.title.focus();
    }
  });
  // drag a note onto another day (desktop)
  board.addEventListener("dragstart", e => { const n = e.target.closest(".note"); if (n) e.dataTransfer.setData("text/plain", n.dataset.id); });
  board.addEventListener("dragover", e => { if (e.target.closest(".day-col")) e.preventDefault(); });
  board.addEventListener("drop", e => {
    const col = e.target.closest(".day-col"), id = e.dataTransfer.getData("text/plain");
    if (col && id) { e.preventDefault(); save(id, { day: col.dataset.day }); }
  });

  function resetForm() {
    editing = null; form.reset();
    form.querySelector("button.primary").textContent = "Add to planner";
    form.querySelector('[data-act="cancel-edit"]').hidden = true;
  }
  form.querySelector('[data-act="cancel-edit"]').addEventListener("click", resetForm);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const body = { title: form.elements.title.value, details: form.elements.details.value, day: form.elements.day.value, time: form.elements.time.value,
                   who: whoSelect.value, color: form.querySelector('input[name="color"]:checked')?.value || "yellow" };
    try {
      notes = (await api(editing ? `/notes/${editing}` : "/notes", { method: editing ? "PATCH" : "POST", body })).notes;
      renderBoard(); resetForm();
    } catch (err) { alert(err.message); }
  });

  listeners.add(admin => {
    planner.hidden = !admin;
    clearInterval(poll);
    if (admin) { loadNotes(); poll = setInterval(() => { if (!document.hidden && !editing) loadNotes(); }, 20000); }
  });
  planner.hidden = !isAdmin();
  if (isAdmin()) listeners.forEach(fn => fn(true));

  return { api, isAdmin, onChange: fn => listeners.add(fn), decorateCard, addMemberCard, setNames };
}

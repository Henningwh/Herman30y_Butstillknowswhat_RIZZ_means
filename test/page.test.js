import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("public/index.html", "utf8");
const rizz = readFileSync("public/rizz.html", "utf8");

test("main page has all sections", () => {
  for (const id of ["agenda", "music", "committees", "info", "luggage"]) {
    assert.match(html, new RegExp(`<section id="${id}"`));
  }
  assert.match(html, /Studenterhytta/);
});

test("pages have titles and are not indexed", () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(rizz, /<title>[^<]+<\/title>/);
  assert.match(readFileSync("public/_headers", "utf8"), /noindex/);
});

test("easter egg links to the Hard Rizz page", () => {
  assert.match(html, /rizz\.html/);
  assert.match(rizz, /Hard Rizz coming up\.\.\./);
});

test("the NO RAGRETS photo the easter egg references exists", () => {
  assert.match(rizz, /norag\.jpg/);
  assert.ok(readFileSync("public/norag.jpg").length > 1000);
});

test("idle easter egg opens the rizz page after a minute", () => {
  assert.match(html, /id="rizz-pop"/);
  assert.match(html, /\|\| 60\) \* 1000/);
  assert.match(html, /rizz-escaped/);
});

test("music transition uses the cut-out photo head", () => {
  assert.match(html, /thief-top\.png/);
  assert.match(html, /thief-jaw\.png/);
  assert.ok(readFileSync("public/thief-top.png").length > 1000);
  assert.ok(readFileSync("public/thief-jaw.png").length > 1000);
});

test("rizz page has the chicken game to escape", () => {
  assert.match(rizz, /const NEED = 3/);
  assert.match(rizz, /rizz-escaped/);
  assert.match(rizz, /ESCAPE THE RIZZ/);
});

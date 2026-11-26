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

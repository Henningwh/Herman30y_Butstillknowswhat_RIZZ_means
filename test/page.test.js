import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("public/index.html", "utf8");

test("page announces the incoming rizz", () => {
  assert.match(html, /Hard Rizz coming up\.\.\./);
});

test("page has a title and is not indexed", () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(readFileSync("public/_headers", "utf8"), /noindex/);
});

test("the NO RAGRETS photo the page references exists", () => {
  assert.match(html, /norag\.jpg/);
  assert.ok(readFileSync("public/norag.jpg").length > 1000);
});

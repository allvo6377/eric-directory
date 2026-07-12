#!/usr/bin/env node
/**
 * build-seed.js — regenerates public/api/seed.json from public/js/data.js.
 *
 * The server (api/parishes.php) copies seed.json into data/parishes.json on
 * first run, and "Reset to sample" in the admin restores from it. The seed is
 * pre-normalized with js/store.js normalize() and has the verified Wikimedia
 * Commons cathedral photos applied (js/imagesearch.js CURATED), so the site
 * looks complete out of the box with zero network calls at seed time.
 *
 * Run after editing data.js:   node scripts/build-seed.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const pub = path.join(__dirname, "..", "public");

// Minimal browser-ish sandbox so the plain-JS modules load untouched.
const sandbox = {
  window: {},
  console,
  // store.js hydrates from the network on load; give it a fetch that never
  // resolves so the module loads but stays quiet.
  fetch: () => new Promise(() => {}),
  alert: () => {},
  setTimeout, clearTimeout,
};
sandbox.window = sandbox; // modules assign to window.*; keep one namespace
vm.createContext(sandbox);

for (const file of ["js/data.js", "js/store.js", "js/imagesearch.js"]) {
  const code = fs.readFileSync(path.join(pub, file), "utf8");
  vm.runInContext(code, sandbox, { filename: file });
}

const { CHURCHES, ParishStore, ImageSearch } = sandbox;
if (!CHURCHES || !ParishStore || !ImageSearch) {
  console.error("Failed to load modules from public/js/");
  process.exit(1);
}

const taken = {};
const seed = CHURCHES.map((c) => {
  const rec = ParishStore.normalize(Object.assign({}, c, { source: "seed" }), taken);
  const curated = ImageSearch.curatedFor(rec);
  if (curated && !rec.heroImage) {
    rec.heroImage = curated.heroImage;
    rec.images = curated.images;
  }
  return rec;
});

const out = path.join(pub, "api", "seed.json");
fs.writeFileSync(out, JSON.stringify(seed, null, 2) + "\n");
console.log(`Wrote ${seed.length} parishes to ${path.relative(process.cwd(), out)}`);
console.log(`${seed.filter((c) => c.heroImage).length} have a curated photo.`);

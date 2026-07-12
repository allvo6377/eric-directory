/* store.js — live parish data store, backed by the server API (api/parishes.php).
   Plain JS (loaded before the Babel scripts, after data.js). Exposes window.ParishStore.

   Reads are served from an in-memory cache that is hydrated from the server on
   load. Mutations apply to the cache immediately (so the UI feels instant) and
   are then sent to the server, which returns the authoritative full list —
   the cache is replaced with that response, so client and server always
   converge. On failure the cache is re-synced from the server.

   The pure helpers (CSV parsing, normalize, validation) are unchanged from the
   design prototype and are also reused by scripts/build-seed.js. */
(function () {
  "use strict";
  var API = "api/parishes.php";

  /* ---------------- slug / id ---------------- */
  function slugify(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "parish";
  }
  function uniqueId(base, taken) {
    var id = base, n = 2;
    while (taken[id]) { id = base + "-" + n++; }
    taken[id] = true;
    return id;
  }

  /* ---------------- CSV parser (RFC-4180-ish) ---------------- */
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, ""); // strip BOM
    var rows = [], row = [], field = "", i = 0, inQ = false, c;
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return (x || "").trim() !== ""; }); });
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return (h || "").trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = (r[idx] || "").trim(); });
      return o;
    });
  }

  /* ---------------- field helpers ---------------- */
  function inferType(name) {
    var n = (name || "").toLowerCase();
    if (/basilica/.test(n)) return "Minor Basilica";
    if (/cathedral/.test(n)) return "Cathedral";
    if (/shrine/.test(n)) return "Shrine";
    if (/chapel|campus/.test(n)) return "Chapel";
    return "Parish Church";
  }

  var DIOCESE_MAP = {
    nairobi: "Archdiocese of Nairobi", mombasa: "Archdiocese of Mombasa",
    kisumu: "Archdiocese of Kisumu", nyeri: "Archdiocese of Nyeri",
  };
  function prettyDiocese(d) {
    if (!d) return "Archdiocese of Nairobi";
    var key = d.trim().toLowerCase();
    if (DIOCESE_MAP[key]) return DIOCESE_MAP[key];
    if (/^arch|^diocese/i.test(d)) return d.trim();
    return "Diocese of " + d.trim();
  }

  function parseCoords(str) {
    if (!str) return null;
    var m = str.replace(/[()]/g, "").split(",");
    if (m.length < 2) return null;
    var lat = parseFloat(m[0]), lng = parseFloat(m[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    // sanity check for Kenya-ish bounds
    if (lat < -5.2 || lat > 5.5 || lng < 33 || lng > 42.5) return null;
    return { lat: lat, lng: lng };
  }

  var LANG_KEYS = [
    [/kiswahili|kis\b|kis\./i, "Swahili"], [/swahili/i, "Swahili"],
    [/english|eng\b|eng\./i, "English"], [/kikuyu/i, "Kikuyu"],
    [/kimeru/i, "Kimeru"], [/kamba/i, "Kamba"], [/kipsigis/i, "Kipsigis"],
    [/latin/i, "Latin"], [/children'?s?/i, "Children's"],
  ];
  function detectLang(s) {
    for (var i = 0; i < LANG_KEYS.length; i++) if (LANG_KEYS[i][0].test(s)) return LANG_KEYS[i][1];
    return "";
  }
  var TIME_RE = /\d{1,2}(:\d{2})?\s*[ap]\.?m\.?/gi;

  function parseSchedule(str, defaultDay) {
    if (!str) return [];
    var out = [];
    str.split(/;/).forEach(function (part) {
      part = part.trim(); if (!part) return;
      var lang = detectLang(part);
      var times = part.match(TIME_RE);
      // day label = leading words before first time / language token
      var label = part.replace(TIME_RE, "").replace(/english|kiswahili|swahili|kikuyu|kimeru|kamba|kipsigis|latin|children'?s?|eng\.?|kis\.?|and|,/gi, "").trim();
      label = label.replace(/\s{2,}/g, " ").replace(/^[-–\s]+|[-–\s]+$/g, "");
      if (times) {
        times.forEach(function (t) {
          out.push({ day: label || defaultDay, time: t.replace(/\s+/g, " ").trim(), language: lang });
        });
      } else if (part) {
        out.push({ day: defaultDay, time: part, language: lang });
      }
    });
    return out;
  }

  function buildClergy(o) {
    var list = [];
    ["Asst. 1", "Asst. 2", "Asst. 3", "Asst. 4"].forEach(function (k) {
      if (o[k]) list.push({ name: o[k], title: "Assistant Priest" });
    });
    return list;
  }

  /* images keep their positions (page gallery slots address by index);
     trailing blanks are trimmed */
  function normalizeImages(arr) {
    if (!Array.isArray(arr)) return [];
    var out = arr.map(function (s) { return s == null ? "" : String(s).trim(); });
    while (out.length && out[out.length - 1] === "") out.pop();
    return out;
  }

  /* ---------------- normalize ANY record to full shape ---------------- */
  function normalize(rec, taken) {
    rec = rec || {};
    var name = (rec.name || "Unnamed Parish").trim();
    var area = (rec.city || rec.area || "").trim();
    var diocese = rec.diocese || "Archdiocese of Nairobi";
    var county = (rec.county || "").trim();
    var coords = rec.coords && typeof rec.coords.lat === "number" ? rec.coords : null;

    var base = slugify(name) + (area ? "-" + slugify(area) : "");
    var id = rec.id && !(taken && taken[rec.id]) ? rec.id : uniqueId(base, taken || {});
    if (taken && rec.id) taken[rec.id] = true;

    var gallery = (rec.gallery && rec.gallery.length) ? rec.gallery
      : ["parish exterior", "church interior", "altar & sanctuary", "parish community"];

    var description = rec.description || (name + " is a Catholic " +
      (rec.type ? rec.type.toLowerCase() : "parish") + (area ? " in " + area : "") +
      (rec.deanery ? ", " + rec.deanery + " Deanery" : "") + ", part of the " + diocese + ".");

    return {
      id: id,
      name: name,
      type: rec.type || inferType(name),
      patron: rec.patron || "",
      diocese: diocese,
      deanery: rec.deanery || "",
      city: area,
      county: county,
      address: (rec.address || "").trim(),
      poBox: rec.poBox || "",
      coords: coords,
      founded: rec.founded || null,
      tagline: rec.tagline || (area ? "A Catholic parish in " + area + "." : "A Catholic parish."),
      description: description,
      priest: rec.priest && rec.priest.name ? rec.priest : (rec.priestName ? { name: rec.priestName, title: "Parish Priest" } : null),
      clergy: rec.clergy || [],
      contact: {
        phone: (rec.contact && rec.contact.phone) || rec.phone || "",
        email: (rec.contact && rec.contact.email) || rec.email || "",
        website: (rec.contact && rec.contact.website) || rec.website || "",
      },
      socials: rec.socials || {},
      officeHours: rec.officeHours || [],
      massTimes: rec.massTimes || [],
      confessions: rec.confessions || "",
      adoration: rec.adoration || "",
      sacraments: rec.sacraments || ["Baptism", "Reconciliation", "Holy Eucharist", "Confirmation", "Holy Matrimony", "Anointing of the Sick"],
      services: rec.services || [],
      gallery: gallery,
      heroImage: rec.heroImage || "",
      images: normalizeImages(rec.images),
      events: rec.events || [],
      source: rec.source || "manual",
    };
  }

  /* ---------------- CSV row -> raw record (pre-normalize) ---------------- */
  function csvRowToRecord(o) {
    var name = o["Name"] || "";
    var massTimes = []
      .concat(parseSchedule(o["Sunday"], "Sunday"))
      .concat(parseSchedule(o["Weekdays"], "Weekdays"))
      .concat(parseSchedule(o["Public Holidays"], "Public Holidays"));
    var socials = {};
    ["Facebook", "Twitter", "Instagram", "Youtube"].forEach(function (k) { if (o[k]) socials[k.toLowerCase()] = o[k]; });
    var officeHours = o["Office Hours"] ? [{ days: "By appointment", hours: o["Office Hours"] }] : [];
    return {
      name: name,
      type: inferType(name),
      diocese: prettyDiocese(o["Diocese"]),
      deanery: o["Deanery"] || "",
      city: o["Area"] || "",
      county: o["County"] || (o["Diocese"] === "Nairobi" ? "Nairobi" : ""),
      address: o["Physical Address"] || (o["Road"] ? o["Road"] : ""),
      poBox: o["P. O. Box"] || "",
      coords: parseCoords(o["Coordinates"]),
      phone: o["Telephone"] || "",
      email: o["email"] || "",
      website: o["Website"] || "",
      socials: socials,
      massTimes: massTimes,
      confessions: o["Confession"] || "",
      adoration: o["Adoration"] || "",
      officeHours: officeHours,
      priestName: o["Parish Priest"] || "",
      clergy: buildClergy(o),
      heroImage: o["Image"] || o["Photo"] || o["Photo URL"] || "",
      images: (o["Gallery"] || o["Photos"] || "").split(/[;|]/).map(function (s) { return s.trim(); }).filter(Boolean),
      source: "import",
    };
  }

  /* validation flags for preview */
  function validateRaw(rec) {
    var flags = [];
    if (!rec.name) flags.push({ level: "error", msg: "Missing name" });
    if (!rec.coords) flags.push({ level: "warn", msg: "No coordinates" });
    if (!rec.phone && !rec.email) flags.push({ level: "warn", msg: "No contact" });
    if (!rec.massTimes.length) flags.push({ level: "warn", msg: "No Mass times" });
    return flags;
  }

  /* ---------------- server-backed store ---------------- */
  var subscribers = [];
  var working = [];
  var lastErrorAt = 0;

  function notify() { subscribers.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function takenMap() { var t = {}; working.forEach(function (c) { t[c.id] = true; }); return t; }

  function applyServer(j) {
    if (j && Array.isArray(j.parishes)) { working = j.parishes; notify(); }
  }

  function refresh() {
    return fetch(API, { credentials: "same-origin" })
      .then(function (r) { return r.json(); })
      .then(applyServer)
      .catch(function () { /* offline / server hiccup: keep current cache */ });
  }

  function post(body) {
    return fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.ok === false) throw new Error(j.error || ("HTTP " + r.status));
        return j;
      });
    });
  }

  /* optimistic mutation: cache already updated by caller; server response
     (the authoritative list) replaces the cache when it lands */
  function mutate(body) {
    return post(body).then(function (j) { applyServer(j); return j; }).catch(function (e) {
      var now = Date.now();
      if (now - lastErrorAt > 1500) {  // don't stack alerts during bulk runs
        lastErrorAt = now;
        alert("Saving to the server failed: " + e.message + "\nThe data shown will be re-loaded from the server.");
      }
      refresh();
      throw e;
    });
  }

  var ready = (typeof fetch === "function") ? refresh() : Promise.resolve();

  var ParishStore = {
    parseCSV: parseCSV,
    rowsToObjects: rowsToObjects,
    csvRowToRecord: csvRowToRecord,
    validateRaw: validateRaw,
    normalize: function (rec, taken) { return normalize(rec, taken || takenMap()); },

    ready: ready,
    refresh: refresh,

    getAll: function () { return working.map(function (c) { return c; }); },
    get: function (id) { return working.find(function (c) { return c.id === id; }) || null; },
    count: function () { return working.length; },

    add: function (rec) {
      var n = normalize(rec, takenMap());
      working.unshift(n); notify();
      mutate({ action: "add", record: n });
      return n;
    },
    update: function (id, rec) {
      var idx = working.findIndex(function (c) { return c.id === id; });
      if (idx < 0) return null;
      var merged = Object.assign({}, working[idx], rec, { id: id });
      working[idx] = normalize(merged, {});
      notify();
      mutate({ action: "update", id: id, record: working[idx] });
      return working[idx];
    },
    remove: function (id) {
      working = working.filter(function (c) { return c.id !== id; });
      notify();
      mutate({ action: "remove", id: id });
    },
    importRecords: function (rawRecs) {
      var taken = takenMap(), added = [];
      rawRecs.forEach(function (r) { var n = normalize(r, taken); working.push(n); added.push(n); });
      notify();
      mutate({ action: "import", records: added });
      return added;
    },
    importCSVText: function (text) {
      var objs = rowsToObjects(parseCSV(text));
      var recs = objs.map(csvRowToRecord);
      return this.importRecords(recs);
    },
    /* reset needs the server's seed copy, so it resolves asynchronously */
    reset: function () {
      return mutate({ action: "reset" });
    },
    subscribe: function (fn) {
      subscribers.push(fn);
      return function () { subscribers = subscribers.filter(function (f) { return f !== fn; }); };
    },
  };

  /* ---------------- SlotBridge ----------------
     Maps a parish-page image slot id (hero-<pid>, side1-<pid>, g0-<pid> …)
     to the right field on the parish record, so a drag-drop upload in
     <image-slot> persists through the normal store/API path. */
  function parseSlot(slotId) {
    var m;
    if ((m = /^hero-(.+)$/.exec(slotId))) return { kind: "hero", pid: m[1] };
    if ((m = /^side([12])-(.+)$/.exec(slotId))) return { kind: "img", index: +m[1], pid: m[2] };
    if ((m = /^g([0-9])-(.+)$/.exec(slotId))) return { kind: "img", index: +m[1], pid: m[2] };
    return null;
  }

  window.SlotBridge = {
    assign: function (slotId, url) {
      var s = parseSlot(slotId);
      if (!s) return;
      var c = ParishStore.get(s.pid);
      if (!c) return;
      if (s.kind === "hero") { ParishStore.update(c.id, { heroImage: url }); return; }
      var imgs = (c.images || []).slice();
      while (imgs.length <= s.index) imgs.push("");
      imgs[s.index] = url;
      ParishStore.update(c.id, { images: imgs });
    },
    clear: function (slotId) {
      var s = parseSlot(slotId);
      if (!s) return;
      var c = ParishStore.get(s.pid);
      if (!c) return;
      if (s.kind === "hero") { ParishStore.update(c.id, { heroImage: "" }); return; }
      var imgs = (c.images || []).slice();
      if (s.index < imgs.length) imgs[s.index] = "";
      ParishStore.update(c.id, { images: imgs });
    },
  };

  window.ParishStore = ParishStore;
})();

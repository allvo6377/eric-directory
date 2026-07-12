/* site.js — editable site content (brand text, hero copy, logo, theme colors),
   backed by api/site.php. Exposes window.SiteContent.

   Every piece of fixed page copy reads from here with a sensible default, so
   the admin can re-word the whole site from the Site settings modal without
   touching code. */
(function () {
  "use strict";
  var API = "api/site.php";

  var subs = [];
  var content = {};   // server copy (defaults are applied server-side)

  function notify() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  function apply(j) {
    if (j && j.site && typeof j.site === "object") { content = j.site; notify(); }
  }

  var ready = (typeof fetch === "function")
    ? fetch(API, { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(apply)
        .catch(function () {})
    : Promise.resolve();

  window.SiteContent = {
    ready: ready,
    get: function () { return content; },

    /* returns Promise<{ok, error?}> — admin only (enforced server-side) */
    update: function (partial) {
      return fetch(API, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify({ content: partial }),
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.ok === false) return { ok: false, error: (j && j.error) || ("HTTP " + r.status) };
          apply(j);
          return { ok: true };
        });
      }).catch(function () { return { ok: false, error: "Could not reach the server." }; });
    },

    subscribe: function (fn) {
      subs.push(fn);
      return function () { subs = subs.filter(function (f) { return f !== fn; }); };
    },
  };
})();

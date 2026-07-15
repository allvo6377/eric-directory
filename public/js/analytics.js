/* analytics.js — privacy-light usage pings (no cookies, no personal data).
   Sends aggregate-only counters to api/analytics.php: what visitors search for
   and which parishes they open. Admin sessions are never tracked, so browsing
   your own site while signed in doesn't skew the numbers. Exposes window.Analytics. */
(function () {
  "use strict";
  var API = "api/analytics.php";

  function send(body) {
    // don't record the admin's own browsing
    if (window.AdminAuth && window.AdminAuth.isAuthed && window.AdminAuth.isAuthed()) return;
    try {
      fetch(API, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,          // still delivered if the page is navigating away
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify(body),
      }).catch(function () {});    // metrics must never surface an error to the user
    } catch (e) { /* no-op */ }
  }

  window.Analytics = {
    search: function (q) { q = (q || "").trim(); if (q.length >= 2) send({ action: "search", q: q }); },
    view: function (id) { if (id) send({ action: "view", parishId: id }); },
  };
})();

/* auth.js — admin session gate, backed by SERVER-SIDE authentication.
   Plain JS, exposes window.AdminAuth.

   This replaces the prototype's in-browser password check. The password is
   verified by api/auth.php against a bcrypt hash stored on the server, and the
   signed-in state lives in a PHP session cookie (HttpOnly, SameSite=Lax).
   Nothing secret ships to the browser.

   The rest of the app calls only isAuthed() / login() / logout() / subscribe()
   — same contract as the prototype, except login() returns a Promise<bool>. */
(function () {
  "use strict";
  var API = "api/auth.php";

  var subs = [];
  var authed = false;
  var configured = true;

  function notify() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }

  function post(body) {
    return fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        j._status = r.status;
        return j;
      });
    });
  }

  /* hydrate session state on page load (the cookie may still be valid) */
  var ready = (typeof fetch === "function")
    ? fetch(API, { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          authed = !!(j && j.authed);
          configured = !(j && j.configured === false);
          if (authed) notify();
        })
        .catch(function () {})
    : Promise.resolve();

  window.AdminAuth = {
    ready: ready,
    isAuthed: function () { return authed; },
    isConfigured: function () { return configured; },

    /* returns Promise<bool> */
    login: function (pw) {
      return post({ action: "login", password: String(pw) }).then(function (j) {
        if (j && j.ok) { authed = true; notify(); return true; }
        if (j && j.error && j._status !== 401) alert(j.error);
        return false;
      }).catch(function () { alert("Could not reach the server. Check your connection."); return false; });
    },

    logout: function () {
      authed = false;
      notify();
      return post({ action: "logout" }).catch(function () {});
    },

    /* returns Promise<{ok, error?}> */
    changePassword: function (current, next) {
      return post({ action: "change_password", current: String(current), next: String(next) })
        .then(function (j) { return { ok: !!(j && j.ok), error: j && j.error }; })
        .catch(function () { return { ok: false, error: "Could not reach the server." }; });
    },

    subscribe: function (fn) {
      subs.push(fn);
      return function () { subs = subs.filter(function (f) { return f !== fn; }); };
    },
  };
})();

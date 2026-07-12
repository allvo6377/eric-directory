/* admin-login.jsx — sign-in gate for the admin area. Exports window.AdminLogin.
   Auth is checked SERVER-SIDE via api/auth.php (AdminAuth.login returns a Promise). */

function AdminLogin({ navigate }) {
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  function submit(e) {
    if (e) e.preventDefault();
    if (busy) return;
    setBusy(true);
    window.AdminAuth.login(pw).then((ok) => {
      setBusy(false);
      if (ok) {
        setErr(false);
        // App re-renders via auth subscription; nothing else needed.
      } else {
        setErr(true);
        setPw("");
        if (inputRef.current) inputRef.current.focus();
      }
    });
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark"><window.I.lock style={{ width: 24, height: 24 }} /></div>
        <div className="login-kicker">Restricted area</div>
        <h1 className="serif">Parish administration</h1>
        <p className="login-sub">Sign in to edit site content and add, edit, import and auto-fill parish records. Visitors can browse the directory without signing in.</p>

        <label className="login-field">
          <span>Admin password</span>
          <input
            ref={inputRef}
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(false); }}
            placeholder="••••••••••"
            className={err ? "err" : ""}
            autoComplete="current-password"
          />
        </label>
        {err && <div className="login-err"><window.I.warn style={{ width: 14, height: 14 }} /> Incorrect password. Try again.</div>}

        <button type="submit" className="btn btn-primary login-btn" disabled={busy}><window.I.lock style={{ width: 16, height: 16 }} /> {busy ? "Signing in…" : "Sign in"}</button>

        <button type="button" className="login-back" onClick={() => navigate("")}><window.I.back style={{ width: 15, height: 15 }} /> Back to directory</button>
      </form>
    </div>
  );
}

Object.assign(window, { AdminLogin });

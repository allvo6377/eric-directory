/* suggest.jsx — public "Suggest an update" modal on parish pages.
   Exports window.SuggestModal. Submissions go to api/suggestions.php and land
   in the admin's moderation queue — visitors never get edit rights. */

function SuggestModal({ church, onClose }) {
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [website, setWebsite] = React.useState(""); // honeypot — humans never see it
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [done, setDone] = React.useState(false);

  function submit(e) {
    if (e) e.preventDefault();
    if (busy) return;
    if (message.trim().length < 10) { setErr("Please describe the update (at least 10 characters)."); return; }
    setBusy(true);
    setErr("");
    fetch("api/suggestions.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ action: "create", parishId: church.id, name, contact, message, website }),
    }).then((r) => r.json().catch(() => ({})).then((j) => {
      setBusy(false);
      if (r.ok && j.ok) setDone(true);
      else setErr((j && j.error) || "Could not send your suggestion. Please try again.");
    })).catch(() => { setBusy(false); setErr("Could not reach the server. Check your connection."); });
  }

  return (
    <div className="modal-overlay" onMouseDown={() => onClose()}>
      <div className="modal modal-suggest" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Help us keep this accurate</div>
            <h2>Suggest an update</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {done ? (
            <div className="import-done">
              <div className="done-check"><window.I.check style={{ width: 34, height: 34 }} /></div>
              <h3 className="serif">Thank you!</h3>
              <p className="muted">Your suggestion for <b>{church.name}</b> has been sent to the directory administrators for review.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="muted" style={{ fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
                Spotted an outdated Mass time, a wrong phone number, or missing details for <b>{church.name}</b>?
                Describe the correction below — an administrator will review it before anything changes.
              </p>
              {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}
              <div className="form-grid">
                <FSuggestField label="Your name" hint="optional"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Wanjiku" /></FSuggestField>
                <FSuggestField label="Phone or email" hint="optional — in case we need to confirm"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. +254 7…" /></FSuggestField>
                <FSuggestField label="What should be updated?" full>
                  <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. The Sunday 9:00 am Mass is now at 9:30 am, in Kiswahili…" />
                </FSuggestField>
              </div>
              {/* honeypot — hidden from humans, tempting to bots */}
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} name="website"
                tabIndex={-1} autoComplete="off" aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            </form>
          )}
        </div>

        <div className="modal-foot">
          {done ? (
            <button className="btn btn-primary" onClick={() => onClose()}>Close</button>
          ) : (
            <React.Fragment>
              <button className="btn btn-ghost" onClick={() => onClose()}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                <window.I.mail style={{ width: 15, height: 15 }} /> {busy ? "Sending…" : "Send suggestion"}
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

function FSuggestField({ label, children, full, hint }) {
  return (
    <label className={"fld" + (full ? " fld-full" : "")}>
      <span className="fld-label">{label}{hint && <em className="fld-hint">{hint}</em>}</span>
      {children}
    </label>
  );
}

Object.assign(window, { SuggestModal });

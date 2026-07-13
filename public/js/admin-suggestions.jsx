/* admin-suggestions.jsx — moderation queue for visitor-submitted updates.
   Exports window.SuggestionsModal. */

function SuggestionsModal({ navigate, onClose }) {
  const [list, setList] = React.useState(null); // null = loading
  const [err, setErr] = React.useState("");

  function load() {
    fetch("api/suggestions.php", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => setList((j && j.suggestions) || []))
      .catch(() => setErr("Could not load suggestions."));
  }
  React.useEffect(load, []);

  function act(action, id) {
    fetch("api/suggestions.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ action, id }),
    }).then((r) => r.json()).then((j) => {
      if (j && j.suggestions) setList(j.suggestions);
    }).catch(() => setErr("Action failed — check your connection."));
  }

  const pending = (list || []).filter((s) => s.status === "new");
  const resolved = (list || []).filter((s) => s.status !== "new");

  function Row({ s }) {
    const date = (s.created || "").slice(0, 10);
    return (
      <div className={"sg-row" + (s.status !== "new" ? " sg-done" : "")}>
        <div className="sg-main">
          <div className="sg-top">
            <a className="sg-parish" href={"#" + s.parishId} onClick={(e) => { e.preventDefault(); onClose(pending.length === 0); navigate(s.parishId); }}>{s.parishName}</a>
            <span className="sg-date">{date}</span>
          </div>
          <div className="sg-msg">{s.message}</div>
          {(s.name || s.contact) && <div className="sg-from">From: {[s.name, s.contact].filter(Boolean).join(" · ")}</div>}
        </div>
        <div className="sg-actions">
          {s.status === "new" && (
            <button className="icon-btn" title="Mark as resolved" onClick={() => act("resolve", s.id)}><window.I.check style={{ width: 16, height: 16 }} /></button>
          )}
          <button className="icon-btn danger" title="Delete" onClick={() => act("remove", s.id)}><window.I.trash style={{ width: 16, height: 16 }} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={() => onClose()}>
      <div className="modal modal-import" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Visitor feedback</div>
            <h2>Suggested updates</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}
          {list === null && !err && <div className="muted" style={{ padding: "18px 4px" }}>Loading…</div>}
          {list !== null && list.length === 0 && (
            <div className="empty">No suggestions yet. The “Suggest an update” button on every parish page sends visitor corrections here.</div>
          )}
          {pending.length > 0 && (
            <React.Fragment>
              <div className="form-sec" style={{ marginTop: 0 }}>Pending <span className="num-badge">{pending.length}</span></div>
              {pending.map((s) => <Row key={s.id} s={s} />)}
            </React.Fragment>
          )}
          {resolved.length > 0 && (
            <React.Fragment>
              <div className="form-sec">Resolved</div>
              {resolved.map((s) => <Row key={s.id} s={s} />)}
            </React.Fragment>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-primary" onClick={() => onClose()}>Done</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SuggestionsModal });

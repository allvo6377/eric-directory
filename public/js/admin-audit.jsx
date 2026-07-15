/* admin-audit.jsx — read-only Activity log of admin changes.
   Exports window.ActivityLogModal. Data comes from api/audit.php. */

const AUDIT_LABELS = {
  "parish.add":            { label: "Added parish",     kind: "add" },
  "parish.edit":           { label: "Edited parish",    kind: "edit" },
  "parish.delete":         { label: "Deleted parish",   kind: "del" },
  "parish.import":         { label: "Imported parishes", kind: "add" },
  "parish.reset":          { label: "Reset to sample",  kind: "del" },
  "site.settings":         { label: "Site settings",    kind: "edit" },
  "auth.login":            { label: "Signed in",        kind: "auth" },
  "auth.password_change":  { label: "Password changed", kind: "auth" },
};

function auditWhen(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return "Today " + time;
  const yst = new Date(now); yst.setDate(now.getDate() - 1);
  if (d.toDateString() === yst.toDateString()) return "Yesterday " + time;
  return d.toLocaleDateString([], { day: "numeric", month: "short" }) + ", " + time;
}

function ActivityLogModal({ navigate, onClose }) {
  const [entries, setEntries] = React.useState(null); // null = loading
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    fetch("api/audit.php?limit=300", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => { if (j && j.ok) setEntries(j.entries || []); else setErr((j && j.error) || "Could not load the activity log."); })
      .catch(() => setErr("Could not load the activity log."));
  }, []);

  return (
    <div className="modal-overlay" onMouseDown={() => onClose()}>
      <div className="modal modal-import" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Accountability</div>
            <h2>Activity log</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}
          {entries === null && !err && <div className="muted" style={{ padding: "18px 4px" }}>Loading…</div>}
          {entries !== null && entries.length === 0 && (
            <div className="empty">No activity recorded yet. Every parish edit, import, settings change and sign-in will appear here.</div>
          )}
          {entries !== null && entries.length > 0 && (
            <div className="audit-list">
              {entries.map((e, i) => {
                const meta = AUDIT_LABELS[e.action] || { label: e.action, kind: "edit" };
                const target = (e.detail || e.target || "");
                const clickable = /^parish\.(add|edit)$/.test(e.action) && e.target;
                return (
                  <div className="audit-row" key={i}>
                    <span className={"audit-tag audit-" + meta.kind}>{meta.label}</span>
                    <div className="audit-main">
                      <div className="audit-detail">
                        {clickable
                          ? <a href={"#" + e.target} onClick={(ev) => { ev.preventDefault(); onClose(); navigate(e.target); }}>{target}</a>
                          : (target || <span className="muted">—</span>)}
                      </div>
                      <div className="audit-when">{auditWhen(e.t)}{e.ip ? " · " + e.ip : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div className="muted" style={{ fontSize: 12.5, marginRight: "auto" }}>Newest first · last 300 events</div>
          <button className="btn btn-primary" onClick={() => onClose()}>Done</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ActivityLogModal });

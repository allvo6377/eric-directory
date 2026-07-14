/* admin-locate.jsx — bulk "find map locations for parishes without coordinates".
   Exports window.LocateModal. Geocodes via the server (api/geocode.php →
   OpenStreetMap Nominatim); the client paces requests to respect usage limits. */

function LocateModal({ parishes, onClose }) {
  const [phase, setPhase] = React.useState("idle"); // idle | running | done
  const [rows, setRows] = React.useState([]);
  const [cursor, setCursor] = React.useState(0);
  const cancelRef = React.useRef(false);

  const targets = React.useMemo(
    () => (parishes || []).filter((c) => !c.coords),
    [parishes]
  );

  const found = rows.filter((r) => r.status === "exact" || r.status === "area").length;

  function geocode(c) {
    return fetch("api/geocode.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
      body: JSON.stringify({ name: c.name, city: c.city, county: c.county }),
    }).then((r) => r.json()).catch(() => ({ ok: false }));
  }

  async function run() {
    cancelRef.current = false;
    setPhase("running");
    const init = targets.map((c) => ({ id: c.id, name: c.name, city: c.city, status: "pending", precision: "" }));
    setRows(init);
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      setCursor(i);
      const c = targets[i];
      let res = null;
      try { res = await geocode(c); } catch (e) { res = null; }
      const ok = res && res.ok && typeof res.lat === "number";
      if (ok) {
        window.ParishStore.update(c.id, { coords: { lat: res.lat, lng: res.lng } });
      }
      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status: ok ? res.precision : "none" } : r)));
      // pace requests: Nominatim asks for ≤1 lookup/second
      await new Promise((r) => setTimeout(r, 1200));
    }
    setCursor(targets.length);
    setPhase("done");
  }

  function stop() { cancelRef.current = true; }

  const pct = targets.length ? Math.round((Math.min(cursor, targets.length) / targets.length) * 100) : 0;
  const statusMeta = {
    pending: { cls: "af-pending", label: "…" },
    exact: { cls: "af-ok", label: "Located" },
    area: { cls: "af-ok", label: "Approx." },
    none: { cls: "af-none", label: "Not found" },
  };

  return (
    <div className="modal-overlay" onMouseDown={() => phase !== "running" && onClose(found > 0)}>
      <div className="modal modal-autofill" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Map locations</div>
            <h2>Find missing parish locations</h2>
          </div>
          <button className="icon-btn" onClick={() => phase !== "running" && onClose(found > 0)} aria-label="Close" disabled={phase === "running"}>
            <window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} />
          </button>
        </div>

        <div className="modal-body">
          {phase === "idle" && (
            <div className="af-intro">
              <p className="af-lead">
                Coordinates are looked up from <b>OpenStreetMap</b> using each parish's name, area and
                county. Exact matches place the pin on the church; when only the town is found the pin is
                placed at the town centre (marked <b>Approx.</b>) — you can fine-tune it later in the parish
                editor.
              </p>
              <div className="af-count-note">
                <b>{targets.length}</b> {targets.length === 1 ? "parish has" : "parishes have"} no map location yet.
                Parishes already on the map are left untouched.
              </div>
              <div className="af-disclaimer">
                <window.I.warn style={{ width: 14, height: 14 }} /> Lookups run about one per second to respect
                OpenStreetMap's fair-use limits, so a large batch takes a few minutes. You can stop anytime;
                progress is saved as it goes.
              </div>
            </div>
          )}

          {phase !== "idle" && (
            <div className="af-progress-wrap">
              <div className="af-progress-top">
                <span>{phase === "done" ? "Complete" : "Looking up locations…"}</span>
                <span className="af-progress-num">{Math.min(cursor, targets.length)} / {targets.length}</span>
              </div>
              <div className="af-bar"><div className="af-bar-fill" style={{ width: pct + "%" }} /></div>
              <div className="af-summary">
                <span className="af-chip af-ok"><window.I.check style={{ width: 13, height: 13 }} /> {found} located</span>
                <span className="af-chip af-none">{rows.filter((r) => r.status === "none").length} not found</span>
              </div>
              <div className="af-list">
                {rows.map((r, idx) => {
                  const m = statusMeta[r.status] || statusMeta.pending;
                  return (
                    <div className="af-row" key={r.id}>
                      <div className="af-row-main">
                        <div className="af-row-name">{r.name}</div>
                        <div className="af-row-city">{r.city || "—"}</div>
                      </div>
                      <span className={"af-status " + m.cls}>
                        {r.status === "pending" && idx === cursor ? <span className="spinner" style={{ width: 12, height: 12 }} /> : m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {phase === "idle" && (
            <React.Fragment>
              <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={run} disabled={!targets.length}>
                <window.I.pin style={{ width: 16, height: 16 }} /> Find {targets.length} location{targets.length === 1 ? "" : "s"}
              </button>
            </React.Fragment>
          )}
          {phase === "running" && <button className="btn btn-ghost" onClick={stop}>Stop</button>}
          {phase === "done" && (
            <React.Fragment>
              <div className="af-done-note"><window.I.check style={{ width: 15, height: 15 }} /> Located {found} of {targets.length}.</div>
              <button className="btn btn-primary" onClick={() => onClose(found > 0)}>Done</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LocateModal });

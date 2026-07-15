/* mass-finder.jsx — "Mass near me now": combines the visitor's location with
   the parsed Mass schedule to answer "where's the next Mass I can get to?".
   Exports window.MassFinderModal. */

const NAIROBI_CBD = { lat: -1.28637, lng: 36.81724 };

function MassFinderModal({ parishes, userLoc: initialLoc, onClose, navigate }) {
  const [loc, setLoc] = React.useState(initialLoc || null);
  const [geo, setGeo] = React.useState(initialLoc ? "ok" : "locating");
  const [sortBy, setSortBy] = React.useState("soonest"); // "soonest" | "nearest"
  const now = React.useMemo(() => new Date(), []);

  // geolocate on open (unless the directory already had a fix), with the same
  // guard timer used elsewhere so "Locating…" can never hang forever
  React.useEffect(() => {
    if (loc) return;
    if (!navigator.geolocation) { setLoc(NAIROBI_CBD); setGeo("fallback"); return; }
    let settled = false;
    const settle = (l, g) => { if (settled) return; settled = true; setLoc(l); setGeo(g); };
    const guard = setTimeout(() => settle(NAIROBI_CBD, "fallback"), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(guard); settle({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "ok"); },
      () => { clearTimeout(guard); settle(NAIROBI_CBD, "fallback"); },
      { timeout: 6000 }
    );
    return () => clearTimeout(guard);
  }, []);

  const results = React.useMemo(() => {
    const rows = [];
    (parishes || []).forEach((c) => {
      const nm = window.nextMass(c.massTimes, now);
      if (!nm) return;
      const dist = loc && c.coords ? window.haversine(loc, c.coords) : null;
      rows.push({ c: c, nm: nm, dist: dist });
    });
    rows.sort((a, b) => {
      if (sortBy === "nearest") {
        const da = a.dist == null ? Infinity : a.dist, db = b.dist == null ? Infinity : b.dist;
        if (da !== db) return da - db;
        return a.nm.when - b.nm.when;
      }
      if (a.nm.when.getTime() !== b.nm.when.getTime()) return a.nm.when - b.nm.when;
      const da = a.dist == null ? Infinity : a.dist, db = b.dist == null ? Infinity : b.dist;
      return da - db;
    });
    return rows.slice(0, 24);
  }, [parishes, loc, sortBy, now]);

  const fmtDist = (d) => d == null ? null : (d < 1 ? "<1 km" : Math.round(d) + " km");

  return (
    <div className="modal-overlay" onMouseDown={() => onClose()}>
      <div className="modal modal-import mass-finder" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Next Mass near you</div>
            <h2>When &amp; where is the next Mass?</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          <div className="mf-head">
            <div className="mf-geo muted">
              {geo === "locating" && <React.Fragment><span className="spinner" style={{ width: 13, height: 13 }} /> Finding your location…</React.Fragment>}
              {geo === "ok" && <React.Fragment><window.I.route style={{ width: 14, height: 14 }} /> Ranked from your location</React.Fragment>}
              {geo === "fallback" && <React.Fragment><window.I.pin style={{ width: 14, height: 14 }} /> Location off — distances shown from Nairobi CBD</React.Fragment>}
            </div>
            <div className="mf-tabs">
              <button className={"mf-tab" + (sortBy === "soonest" ? " on" : "")} onClick={() => setSortBy("soonest")}>Soonest</button>
              <button className={"mf-tab" + (sortBy === "nearest" ? " on" : "")} onClick={() => setSortBy("nearest")}>Nearest</button>
            </div>
          </div>

          {results.length === 0 && (
            <div className="empty">No upcoming Masses could be scheduled — parishes need day &amp; time entries (e.g. “Sunday 7:00 AM”) for this to work.</div>
          )}

          <div className="mf-list">
            {results.map(({ c, nm, dist }, i) => (
              <button className="mf-row" key={c.id} onClick={() => { onClose(); navigate(c.id); }}>
                <div className="mf-rank">{i + 1}</div>
                <div className="mf-info">
                  <div className="mf-name">{c.name}</div>
                  <div className="mf-sub">{[c.city, c.diocese].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="mf-right">
                  <div className="mf-when">{window.massWhenLabel(nm, now)}</div>
                  <div className="mf-meta">
                    {nm.language ? <span className="chip chip-lang">{nm.language}</span> : null}
                    {fmtDist(dist) ? <span className="mf-dist"><window.I.pin style={{ width: 12, height: 12 }} /> {fmtDist(dist)}</span> : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-foot">
          <div className="muted" style={{ fontSize: 12.5, marginRight: "auto" }}>Based on listed Mass times — confirm with the parish before travelling.</div>
          <button className="btn btn-primary" onClick={() => onClose()}>Done</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MassFinderModal });

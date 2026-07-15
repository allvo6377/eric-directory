/* admin-analytics.jsx — privacy-light usage dashboard (top searches + most-viewed
   parishes). Exports window.AnalyticsModal. Data from api/analytics.php. */

function AnalyticsModal({ navigate, onClose }) {
  const [data, setData] = React.useState(null); // null = loading
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    fetch("api/analytics.php", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => { if (j && j.ok) setData(j); else setErr((j && j.error) || "Could not load analytics."); })
      .catch(() => setErr("Could not load analytics."));
  }, []);

  const searches = (data && data.searches) || [];
  const views = (data && data.views) || [];
  const totals = (data && data.totals) || {};
  const maxS = searches.reduce((m, s) => Math.max(m, s.count), 0) || 1;
  const maxV = views.reduce((m, v) => Math.max(m, v.count), 0) || 1;

  return (
    <div className="modal-overlay" onMouseDown={() => onClose()}>
      <div className="modal modal-import" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Privacy-light analytics</div>
            <h2>What visitors look for</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose()} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}
          {data === null && !err && <div className="muted" style={{ padding: "18px 4px" }}>Loading…</div>}

          {data !== null && !err && (
            <React.Fragment>
              <div className="an-totals">
                <div className="an-tot"><div className="an-num">{totals.searches || 0}</div><div className="an-lbl">Searches</div></div>
                <div className="an-tot"><div className="an-num">{totals.views || 0}</div><div className="an-lbl">Parish views</div></div>
                <div className="an-tot"><div className="an-num">{totals.distinctSearches || 0}</div><div className="an-lbl">Distinct terms</div></div>
              </div>
              <div className="muted" style={{ fontSize: 12.5, margin: "2px 0 14px" }}>
                Aggregate counts only — no cookies, no IP addresses, no personal data. Collecting since {data.since}. Your own admin browsing isn’t counted.
              </div>

              <div className="an-cols">
                <div className="an-col">
                  <div className="form-sec" style={{ marginTop: 0 }}>Top searches</div>
                  {searches.length === 0 && <div className="empty" style={{ margin: "6px 0" }}>No searches recorded yet.</div>}
                  {searches.map((s, i) => (
                    <div className="an-bar-row" key={i}>
                      <div className="an-bar-label" title={s.q}>{s.q}</div>
                      <div className="an-bar-track"><div className="an-bar" style={{ width: Math.max(6, Math.round(s.count / maxS * 100)) + "%" }} /></div>
                      <div className="an-bar-count">{s.count}</div>
                    </div>
                  ))}
                </div>

                <div className="an-col">
                  <div className="form-sec" style={{ marginTop: 0 }}>Most-viewed parishes</div>
                  {views.length === 0 && <div className="empty" style={{ margin: "6px 0" }}>No parish views recorded yet.</div>}
                  {views.map((v, i) => (
                    <div className="an-bar-row" key={i}>
                      <div className="an-bar-label">
                        <a href={"#" + v.parishId} onClick={(e) => { e.preventDefault(); onClose(); navigate(v.parishId); }}>{v.name}</a>
                      </div>
                      <div className="an-bar-track"><div className="an-bar an-bar-alt" style={{ width: Math.max(6, Math.round(v.count / maxV * 100)) + "%" }} /></div>
                      <div className="an-bar-count">{v.count}</div>
                    </div>
                  ))}
                </div>
              </div>
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

Object.assign(window, { AnalyticsModal });

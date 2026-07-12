/* admin-autofill.jsx — bulk "fetch parish photos from the web" modal. Exports window.AutofillModal */

function AutofillModal({ parishes, onClose }) {
  const onlyMissingDefault = false;
  const [onlyMissing, setOnlyMissing] = React.useState(onlyMissingDefault);
  const [phase, setPhase] = React.useState("idle"); // idle | running | done
  const [rows, setRows] = React.useState([]);
  const [cursor, setCursor] = React.useState(0);
  const cancelRef = React.useRef(false);

  const targets = React.useMemo(
    () => (parishes || []).filter((c) => (onlyMissing ? !c.heroImage : true)),
    [parishes, onlyMissing]
  );

  const found = rows.filter((r) => r.status === "web" || r.status === "archive").length;

  async function run() {
    cancelRef.current = false;
    setPhase("running");
    const init = targets.map((c) => ({ id: c.id, name: c.name, city: c.city, status: "pending", url: "" }));
    setRows(init);
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      setCursor(i);
      const c = targets[i];
      let res = null;
      try { res = await window.ImageSearch.findImages(c); } catch (e) { res = null; }
      const status = res && res.heroImage ? (res.source || "web") : "none";
      if (res && res.heroImage) {
        window.ParishStore.update(c.id, { heroImage: res.heroImage, images: (res.images || []).slice(0, 5) });
      }
      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, status, url: res ? res.heroImage : "" } : r)));
      // gentle pacing so we don't hammer the API
      await new Promise((r) => setTimeout(r, 140));
    }
    setCursor(targets.length);
    setPhase("done");
  }

  function stop() { cancelRef.current = true; }

  const pct = targets.length ? Math.round((Math.min(cursor, targets.length) / targets.length) * 100) : 0;

  const statusMeta = {
    pending: { cls: "af-pending", label: "…" },
    web: { cls: "af-ok", label: "Found" },
    archive: { cls: "af-ok", label: "Archive" },
    none: { cls: "af-none", label: "None" },
  };

  return (
    <div className="modal-overlay" onMouseDown={() => phase !== "running" && onClose(found > 0)}>
      <div className="modal modal-autofill" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Images</div>
            <h2>Auto-fill photos from the web</h2>
          </div>
          <button className="icon-btn" onClick={() => phase !== "running" && onClose(found > 0)} aria-label="Close" disabled={phase === "running"}>
            <window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} />
          </button>
        </div>

        <div className="modal-body">
          {phase === "idle" && (
            <div className="af-intro">
              <p className="af-lead">
                Photos are retrieved from <b>Wikimedia Commons</b> — a free, openly-licensed media archive —
                matched to each parish by name and town. Flagship cathedrals use hand-picked archive photos;
                the rest are searched live.
              </p>
              <label className="af-toggle">
                <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
                <span>Only parishes without a photo <em>({(parishes || []).filter((c) => !c.heroImage).length})</em></span>
              </label>
              <div className="af-count-note">
                Will search <b>{targets.length}</b> {targets.length === 1 ? "parish" : "parishes"}.
                Existing photos {onlyMissing ? "are kept" : "may be replaced"}.
              </div>
              <div className="af-disclaimer">
                <window.I.warn style={{ width: 14, height: 14 }} /> Live web results vary — not every parish has a
                photo on Commons, and matches are best-effort. Review and adjust in each parish’s editor.
              </div>
            </div>
          )}

          {phase !== "idle" && (
            <div className="af-progress-wrap">
              <div className="af-progress-top">
                <span>{phase === "done" ? "Complete" : "Fetching photos…"}</span>
                <span className="af-progress-num">{Math.min(cursor, targets.length)} / {targets.length}</span>
              </div>
              <div className="af-bar"><div className="af-bar-fill" style={{ width: pct + "%" }} /></div>
              <div className="af-summary">
                <span className="af-chip af-ok"><window.I.check style={{ width: 13, height: 13 }} /> {found} found</span>
                <span className="af-chip af-none">{rows.filter((r) => r.status === "none").length} not found</span>
              </div>
              <div className="af-list">
                {rows.map((r) => {
                  const m = statusMeta[r.status] || statusMeta.pending;
                  return (
                    <div className="af-row" key={r.id}>
                      <div className="af-thumb">
                        {r.url ? <img src={r.url} alt="" onError={(e) => { e.target.style.visibility = "hidden"; }} /> : <span className="af-thumb-ph" />}
                      </div>
                      <div className="af-row-main">
                        <div className="af-row-name">{r.name}</div>
                        <div className="af-row-city">{r.city || "—"}</div>
                      </div>
                      <span className={"af-status " + m.cls}>
                        {r.status === "pending" && r.id === rows[cursor] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : m.label}
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
                <window.I.globe style={{ width: 16, height: 16 }} /> Fetch {targets.length} photo{targets.length === 1 ? "" : "s"}
              </button>
            </React.Fragment>
          )}
          {phase === "running" && (
            <button className="btn btn-ghost" onClick={stop}>Stop</button>
          )}
          {phase === "done" && (
            <React.Fragment>
              <div className="af-done-note"><window.I.check style={{ width: 15, height: 15 }} /> Filled {found} of {targets.length} parishes.</div>
              <button className="btn btn-primary" onClick={() => onClose(found > 0)}>Done</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AutofillModal });

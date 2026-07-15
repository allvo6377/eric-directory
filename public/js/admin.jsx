/* admin.jsx — admin dashboard: parish management table + toolbar. Exports window.AdminView */

function AdminView({ navigate, parishes }) {
  const [q, setQ] = React.useState("");
  const [dioFilter, setDioFilter] = React.useState("All");
  const [srcFilter, setSrcFilter] = React.useState("All");
  const [editing, setEditing] = React.useState(null); // church record or "new"
  const [importing, setImporting] = React.useState(false);
  const [autofilling, setAutofilling] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);
  const [pendingSuggestions, setPendingSuggestions] = React.useState(0);

  const refreshSuggestionCount = React.useCallback(() => {
    fetch("api/suggestions.php", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => setPendingSuggestions(((j && j.suggestions) || []).filter((s) => s.status === "new").length))
      .catch(() => {});
  }, []);
  React.useEffect(refreshSuggestionCount, [refreshSuggestionCount]);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState(null);

  const all = parishes || window.ParishStore.getAll();
  const dioceses = React.useMemo(() => ["All", ...window.uniqueSorted(all.map((c) => c.diocese))], [all]);

  function flash(msg) { setToast(msg); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 2600); }

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all.filter((c) => {
      if (dioFilter !== "All" && c.diocese !== dioFilter) return false;
      if (srcFilter === "Imported" && c.source !== "import") return false;
      if (srcFilter === "Sample" && c.source !== "seed") return false;
      if (srcFilter === "Manual" && c.source !== "manual") return false;
      if (ql) {
        const hay = (c.name + " " + c.city + " " + c.diocese + " " + c.county).toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [all, q, dioFilter, srcFilter]);

  const stats = React.useMemo(() => ({
    total: all.length,
    mapped: all.filter((c) => c.coords).length,
    imported: all.filter((c) => c.source === "import").length,
    manual: all.filter((c) => c.source === "manual").length,
    withPhoto: all.filter((c) => c.heroImage).length,
  }), [all]);

  function onFormClose(saved) { setEditing(null); if (saved) flash("Parish saved."); }
  function onImportClose(done) { setImporting(false); if (done) flash("Import complete."); }
  function onAutofillClose(done) { setAutofilling(false); if (done) flash("Parish photos updated."); }
  function onLocateClose(done) { setLocating(false); if (done) flash("Parish locations updated."); }
  function onSettingsClose(saved) { setSettingsOpen(false); if (saved) flash("Site settings saved."); }
  function doDelete() {
    if (!deleteTarget) return;
    window.ParishStore.remove(deleteTarget.id);
    setDeleteTarget(null);
    flash("Parish removed.");
  }
  function doReset() {
    window.ParishStore.reset()
      .then(() => flash("Restored sample data."))
      .catch(() => {});
    setConfirmReset(false);
  }

  const srcLabel = { seed: "Sample", import: "Imported", manual: "Manual" };

  return (
    <div className="admin">
      <div className="admin-hero">
        <div className="admin-hero-inner">
          <div>
            <div className="eyebrow">Administration</div>
            <h1 className="serif">Manage parishes</h1>
            <p>Add, edit and import parish records, and edit the site's own text and images. Changes are saved on the server and appear instantly for every visitor.</p>
          </div>
          <div className="admin-hero-actions">
            <button className="btn btn-ghost" onClick={() => setSuggestionsOpen(true)}>
              <window.I.mail /> Suggestions{pendingSuggestions > 0 && <span className="sg-badge">{pendingSuggestions}</span>}
            </button>
            <button className="btn btn-ghost" onClick={() => setAnalyticsOpen(true)}><window.I.chart /> Analytics</button>
            <button className="btn btn-ghost" onClick={() => setActivityOpen(true)}><window.I.history /> Activity log</button>
            <button className="btn btn-ghost" onClick={() => setSettingsOpen(true)}><window.I.gear /> Site settings</button>
            <button className="btn btn-ghost" onClick={() => setLocating(true)}><window.I.pin /> Find locations</button>
            <button className="btn btn-ghost" onClick={() => setAutofilling(true)}><window.I.globe /> Auto-fill photos</button>
            <button className="btn btn-ghost" onClick={() => setImporting(true)}><window.I.upload /> Import CSV</button>
            <button className="btn btn-primary" onClick={() => setEditing("new")}><window.I.plus /> Add parish</button>
            <button className="btn btn-ghost btn-signout" onClick={() => { window.AdminAuth.logout(); navigate(""); }}><window.I.signout /> Sign out</button>
          </div>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-stats">
          <div className="astat"><div className="as-num">{stats.total}</div><div className="as-lbl">Total parishes</div></div>
          <div className="astat"><div className="as-num">{stats.mapped}</div><div className="as-lbl">On the map</div></div>
          <div className="astat"><div className="as-num">{stats.withPhoto}</div><div className="as-lbl">With a photo</div></div>
          <div className="astat"><div className="as-num">{stats.imported}</div><div className="as-lbl">Imported</div></div>
          <div className="astat"><div className="as-num">{stats.manual}</div><div className="as-lbl">Added manually</div></div>
        </div>

        <div className="admin-toolbar">
          <div className="search admin-search">
            <span className="s-icon"><window.I.search /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parishes…" />
          </div>
          <div className="select-wrap">
            <select value={dioFilter} onChange={(e) => setDioFilter(e.target.value)} aria-label="Filter by diocese">
              {dioceses.map((dd) => <option key={dd}>{dd === "All" ? "All dioceses" : dd}</option>)}
            </select><span className="chev"><window.I.chev /></span>
          </div>
          <div className="select-wrap">
            <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)} aria-label="Filter by record source">
              {["All", "Sample", "Imported", "Manual"].map((x) => <option key={x}>{x === "All" ? "All sources" : x}</option>)}
            </select><span className="chev"><window.I.chev /></span>
          </div>
          <div className="tb-spacer" />
          <button className="btn btn-ghost btn-sm danger-ghost" onClick={() => setConfirmReset(true)}><window.I.reset /> Reset to sample</button>
        </div>

        <div className="admin-count">{filtered.length} of {all.length} parishes</div>

        <div className="table-card">
          <table className="parish-table">
            <thead>
              <tr>
                <th>Parish</th><th className="col-type">Type</th><th className="col-dio">Diocese</th><th className="col-area">Area</th>
                <th className="ta-c col-map">Map</th><th className="ta-c col-times">Times</th><th className="col-source">Source</th><th className="ta-r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="pt-name"><a href={"#" + c.id} onClick={(e) => { e.preventDefault(); navigate(c.id); }}>{c.name}</a></td>
                  <td className="col-type"><span className="mini-chip">{c.type}</span></td>
                  <td className="pt-dim col-dio">{c.diocese}</td>
                  <td className="col-area">{[c.city, c.county].filter(Boolean).join(", ") || "—"}</td>
                  <td className="ta-c col-map">{c.coords ? <span className="dot-ok" /> : <span className="dot-no" />}</td>
                  <td className="ta-c col-times">{c.massTimes.length ? <span className="num-badge">{c.massTimes.length}</span> : <span className="pt-dim">—</span>}</td>
                  <td className="col-source"><span className={"src-tag src-" + c.source}>{srcLabel[c.source] || c.source}</span></td>
                  <td className="ta-r">
                    <div className="row-actions">
                      <button className="icon-btn" title="Edit" onClick={() => setEditing(c)}><window.I.edit style={{ width: 16, height: 16 }} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleteTarget(c)}><window.I.trash style={{ width: 16, height: 16 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty" style={{ margin: "18px 0" }}>No parishes match your filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <window.ParishForm church={editing === "new" ? null : editing} allDioceses={dioceses.filter((x) => x !== "All")} onClose={onFormClose} />}
      {importing && <window.ImportModal onClose={onImportClose} />}
      {autofilling && <window.AutofillModal parishes={all} onClose={onAutofillClose} />}
      {locating && <window.LocateModal parishes={all} onClose={onLocateClose} />}
      {settingsOpen && <window.SiteSettingsModal onClose={onSettingsClose} />}
      {suggestionsOpen && <window.SuggestionsModal navigate={navigate} onClose={() => { setSuggestionsOpen(false); refreshSuggestionCount(); }} />}
      {analyticsOpen && <window.AnalyticsModal navigate={navigate} onClose={() => setAnalyticsOpen(false)} />}
      {activityOpen && <window.ActivityLogModal navigate={navigate} onClose={() => setActivityOpen(false)} />}

      {deleteTarget && (
        <div className="modal-overlay" onMouseDown={() => setDeleteTarget(null)}>
          <div className="modal modal-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-icon danger"><window.I.trash style={{ width: 22, height: 22 }} /></div>
            <h3>Delete this parish?</h3>
            <p className="muted"><b>{deleteTarget.name}</b> will be removed from the directory. This can’t be undone (use “Reset to sample” to restore the original set).</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={doDelete}><window.I.trash style={{ width: 16, height: 16 }} /> Delete parish</button>
            </div>
          </div>
        </div>
      )}

      {confirmReset && (
        <div className="modal-overlay" onMouseDown={() => setConfirmReset(false)}>
          <div className="modal modal-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-icon"><window.I.reset style={{ width: 22, height: 22 }} /></div>
            <h3>Reset to sample data?</h3>
            <p className="muted">This removes all imported and manually-added parishes and restores the original sample set of {window.CHURCHES.length} parishes.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={doReset}><window.I.reset style={{ width: 16, height: 16 }} /> Reset everything</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><window.I.check style={{ width: 16, height: 16 }} /> {toast}</div>}
    </div>
  );
}

Object.assign(window, { AdminView });

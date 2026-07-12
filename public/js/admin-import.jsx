/* admin-import.jsx — CSV import modal with validation preview. Exports window.ImportModal */

function ImportModal({ onClose }) {
  const [stage, setStage] = React.useState("drop"); // drop | preview | done
  const [fileName, setFileName] = React.useState("");
  const [rows, setRows] = React.useState([]); // [{rec, flags}]
  const [drag, setDrag] = React.useState(false);
  const [importedCount, setImportedCount] = React.useState(0);
  const inputRef = React.useRef(null);

  function ingest(text, name) {
    const objs = window.ParishStore.rowsToObjects(window.ParishStore.parseCSV(text));
    const parsed = objs.map((o) => {
      const rec = window.ParishStore.csvRowToRecord(o);
      return { rec, flags: window.ParishStore.validateRaw(rec) };
    }).filter((r) => r.rec.name);
    setRows(parsed);
    setFileName(name || "pasted.csv");
    setStage("preview");
  }

  function onFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => ingest(String(e.target.result), file.name);
    reader.readAsText(file);
  }

  function loadSample() {
    fetch("sample/Nairobi Parish Data.csv")
      .then((r) => r.text())
      .then((t) => ingest(t, "Nairobi Parish Data.csv"))
      .catch(() => alert("Could not load the bundled sample. Try choosing a file instead."));
  }

  function doImport() {
    const recs = rows.map((r) => r.rec);
    const added = window.ParishStore.importRecords(recs);
    setImportedCount(added.length);
    setStage("done");
  }

  const stats = React.useMemo(() => {
    const total = rows.length;
    const withCoords = rows.filter((r) => r.rec.coords).length;
    const withContact = rows.filter((r) => r.rec.phone || r.rec.email).length;
    const withTimes = rows.filter((r) => r.rec.massTimes.length).length;
    return { total, withCoords, withContact, withTimes };
  }, [rows]);

  return (
    <div className="modal-overlay" onMouseDown={() => onClose(false)}>
      <div className="modal modal-import" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Bulk import</div>
            <h2>Import parishes from CSV</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose(false)} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {stage === "drop" && (
            <React.Fragment>
              <div
                className={"dropzone" + (drag ? " over" : "")}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current && inputRef.current.click()}
              >
                <div className="dz-icon"><window.I.upload style={{ width: 26, height: 26 }} /></div>
                <div className="dz-title">Drag &amp; drop a CSV file here</div>
                <div className="dz-sub">or <span className="link">browse to choose a file</span></div>
                <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files[0])} />
              </div>
              <div className="import-help">
                <div className="ih-row"><window.I.file style={{ width: 15, height: 15, color: "var(--primary)" }} /> Expected columns: <b>Name, Area, Deanery, Diocese, Coordinates, Telephone, email, Website, Sunday, Weekdays, Confession, Parish Priest…</b></div>
                <div className="ih-actions">
                  <button className="btn btn-soft btn-sm" onClick={loadSample}><window.I.download style={{ width: 15, height: 15 }} /> Use bundled sample (Nairobi, 117 parishes)</button>
                </div>
              </div>
            </React.Fragment>
          )}

          {stage === "preview" && (
            <React.Fragment>
              <div className="preview-summary">
                <div className="ps-file"><window.I.file style={{ width: 16, height: 16 }} /> {fileName}</div>
                <div className="ps-stats">
                  <span className="ps-stat ok"><b>{stats.total}</b> parishes</span>
                  <span className="ps-stat"><b>{stats.withCoords}</b> with map location</span>
                  <span className="ps-stat"><b>{stats.withContact}</b> with contact</span>
                  <span className="ps-stat"><b>{stats.withTimes}</b> with Mass times</span>
                </div>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr><th>Parish</th><th>Type</th><th>Area</th><th>Diocese</th><th>Map</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="pt-name">{r.rec.name}</td>
                        <td><span className="mini-chip">{r.rec.type}</span></td>
                        <td>{r.rec.city || "—"}</td>
                        <td className="pt-dim">{r.rec.diocese}</td>
                        <td>{r.rec.coords ? <span className="dot-ok" title="Has coordinates" /> : <span className="dot-no" title="No coordinates" />}</td>
                        <td>
                          {r.flags.length === 0
                            ? <span className="flag-ok"><window.I.check style={{ width: 13, height: 13 }} /> Complete</span>
                            : <span className="flag-warn"><window.I.warn style={{ width: 13, height: 13 }} /> {r.flags.map((f) => f.msg).join(", ")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="preview-note"><window.I.warn style={{ width: 14, height: 14 }} /> Rows with warnings will still import — you can fill in missing details afterwards by editing each parish.</div>
            </React.Fragment>
          )}

          {stage === "done" && (
            <div className="import-done">
              <div className="done-check"><window.I.check style={{ width: 34, height: 34 }} /></div>
              <h3>{importedCount} parishes imported</h3>
              <p className="muted">They're now saved on the server and live across the directory, map and dioceses views. Parishes missing coordinates won't appear on the map until you add them.</p>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {stage === "drop" && <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>}
          {stage === "preview" && (
            <React.Fragment>
              <button className="btn btn-ghost" onClick={() => setStage("drop")}><window.I.back style={{ width: 15, height: 15 }} /> Choose another file</button>
              <button className="btn btn-primary" onClick={doImport}><window.I.upload style={{ width: 16, height: 16 }} /> Import {rows.length} parishes</button>
            </React.Fragment>
          )}
          {stage === "done" && <button className="btn btn-primary" onClick={() => onClose(true)}>Done</button>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ImportModal });

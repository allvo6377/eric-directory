/* admin-settings.jsx — "Site settings" modal: every piece of fixed site text,
   the logo, brand color and heading font, plus admin password change.
   Exports window.SiteSettingsModal. */

const SETTINGS_FONTS = ["Newsreader", "Spectral", "Lora"];
const SETTINGS_COLORS = ["#1462b8", "#12a06a", "#1e3a5f", "#2f5d50", "#7c2d5e", "#8a5a12"];

function SField({ label, hint, children, full }) {
  return (
    <label className={"fld" + (full ? " fld-full" : "")}>
      <span className="fld-label">{label}{hint && <em className="fld-hint">{hint}</em>}</span>
      {children}
    </label>
  );
}

function SiteSettingsModal({ onClose }) {
  const site = window.SiteContent.get();
  const [d, setD] = React.useState(() => ({ ...site }));
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [logoBusy, setLogoBusy] = React.useState(false);
  // password change (optional)
  const [pwCurrent, setPwCurrent] = React.useState("");
  const [pwNext, setPwNext] = React.useState("");
  const [pwMsg, setPwMsg] = React.useState(null); // {ok, text}

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  function uploadLogo() {
    setLogoBusy(true);
    window.Uploads.pickAndUpload()
      .then((url) => { setLogoBusy(false); if (url) set("logoUrl", url); })
      .catch((e) => { setLogoBusy(false); setErr(e.message || "Logo upload failed."); });
  }

  function changePw() {
    setPwMsg(null);
    if (!pwCurrent || !pwNext) { setPwMsg({ ok: false, text: "Fill in both password fields." }); return; }
    window.AdminAuth.changePassword(pwCurrent, pwNext).then((res) => {
      if (res.ok) { setPwMsg({ ok: true, text: "Password changed." }); setPwCurrent(""); setPwNext(""); }
      else setPwMsg({ ok: false, text: res.error || "Could not change password." });
    });
  }

  function save() {
    setSaving(true);
    setErr("");
    window.SiteContent.update(d).then((res) => {
      setSaving(false);
      if (res.ok) onClose(true);
      else setErr(res.error || "Could not save settings.");
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={() => onClose(false)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">Site settings</div>
            <h2>Edit site text &amp; branding</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose(false)} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}

          <div className="form-sec">Brand</div>
          <div className="settings-grid">
            <SField label="Site name"><input value={d.siteName || ""} onChange={(e) => set("siteName", e.target.value)} /></SField>
            <SField label="Tagline" hint="under the name in the header"><input value={d.siteTagline || ""} onChange={(e) => set("siteTagline", e.target.value)} /></SField>
            <SField label="Logo" full hint="square image works best">
              <div className="upload-row">
                <input className="grow" value={d.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="assets/logo.jpg or https://…" />
                <button type="button" className="btn btn-soft btn-sm btn-upload" onClick={uploadLogo} disabled={logoBusy}>
                  {logoBusy ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <window.I.upload style={{ width: 14, height: 14 }} />} Upload
                </button>
              </div>
            </SField>
          </div>
          {d.logoUrl && (
            <div className="logo-preview">
              <img src={d.logoUrl} alt="" onError={(e) => { e.target.style.visibility = "hidden"; }} />
              <div className="lp-note">Logo preview — shown in the header and footer.</div>
            </div>
          )}
          <div className="settings-grid" style={{ marginTop: 14 }}>
            <SField label="Primary color" hint="buttons, links, pins">
              <div className="upload-row">
                <input className="grow" value={d.primaryColor || ""} onChange={(e) => set("primaryColor", e.target.value)} placeholder="#1462b8" />
                <div style={{ display: "flex", gap: 6 }}>
                  {SETTINGS_COLORS.map((c) => (
                    <button key={c} type="button" title={c} onClick={() => set("primaryColor", c)}
                      style={{ width: 26, height: 26, borderRadius: 8, border: d.primaryColor === c ? "2px solid var(--ink)" : "1px solid var(--line-2)", background: c, padding: 0 }} />
                  ))}
                </div>
              </div>
            </SField>
            <SField label="Heading font">
              <div className="select-wrap full">
                <select value={d.headingFont || "Newsreader"} onChange={(e) => set("headingFont", e.target.value)}>
                  {SETTINGS_FONTS.map((f) => <option key={f}>{f}</option>)}
                </select>
                <span className="chev"><window.I.chev /></span>
              </div>
            </SField>
          </div>

          <div className="form-sec">Home page</div>
          <div className="settings-grid">
            <SField label="Eyebrow" full hint="small uppercase line above the title"><input value={d.homeEyebrow || ""} onChange={(e) => set("homeEyebrow", e.target.value)} /></SField>
            <SField label="Headline" full><input value={d.homeTitle || ""} onChange={(e) => set("homeTitle", e.target.value)} /></SField>
            <SField label="Intro paragraph" full><textarea rows={3} value={d.homeLede || ""} onChange={(e) => set("homeLede", e.target.value)} /></SField>
          </div>

          <div className="form-sec">Map page</div>
          <div className="settings-grid">
            <SField label="Eyebrow" full><input value={d.mapEyebrow || ""} onChange={(e) => set("mapEyebrow", e.target.value)} /></SField>
            <SField label="Headline" full><input value={d.mapTitle || ""} onChange={(e) => set("mapTitle", e.target.value)} /></SField>
            <SField label="Intro paragraph" full><textarea rows={3} value={d.mapLede || ""} onChange={(e) => set("mapLede", e.target.value)} /></SField>
          </div>

          <div className="form-sec">Dioceses page</div>
          <div className="settings-grid">
            <SField label="Eyebrow" full><input value={d.diocesesEyebrow || ""} onChange={(e) => set("diocesesEyebrow", e.target.value)} /></SField>
            <SField label="Headline" full><input value={d.diocesesTitle || ""} onChange={(e) => set("diocesesTitle", e.target.value)} /></SField>
            <SField label="Intro paragraph" full><textarea rows={3} value={d.diocesesLede || ""} onChange={(e) => set("diocesesLede", e.target.value)} /></SField>
          </div>

          <div className="form-sec">Footer</div>
          <div className="settings-grid">
            <SField label="Footer note" full><textarea rows={2} value={d.footerNote || ""} onChange={(e) => set("footerNote", e.target.value)} /></SField>
          </div>

          <div className="form-sec">Admin password</div>
          <div className="settings-grid">
            <SField label="Current password"><input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" /></SField>
            <SField label="New password" hint="min 10 characters"><input type="password" value={pwNext} onChange={(e) => setPwNext(e.target.value)} autoComplete="new-password" /></SField>
          </div>
          {pwMsg && (
            <div className={pwMsg.ok ? "find-msg" : "form-error"} style={{ marginTop: 10 }}>
              {pwMsg.ok ? <window.I.check style={{ width: 14, height: 14 }} /> : <window.I.warn style={{ width: 15, height: 15 }} />} {pwMsg.text}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={changePw}><window.I.lock style={{ width: 14, height: 14 }} /> Change password</button>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <window.I.check style={{ width: 16, height: 16 }} /> {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SiteSettingsModal });

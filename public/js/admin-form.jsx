/* admin-form.jsx — add / edit parish form (modal). Exports window.ParishForm */

const FORM_TYPES = ["Parish Church", "Cathedral", "Minor Basilica", "Shrine", "Chapel"];
const FORM_DAYS = ["Sunday", "Weekdays", "Daily", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Public Holidays"];
const FORM_LANGS = ["", "English", "Swahili", "Kikuyu", "Kimeru", "Kamba", "Kipsigis", "Latin", "Children's"];

function FField({ label, children, full, hint }) {
  return (
    <label className={"fld" + (full ? " fld-full" : "")}>
      <span className="fld-label">{label}{hint && <em className="fld-hint">{hint}</em>}</span>
      {children}
    </label>
  );
}

function emptyDraft() {
  return {
    name: "", type: "Parish Church", patron: "", diocese: "Archdiocese of Nairobi", deanery: "",
    city: "", county: "", address: "", poBox: "", lat: "", lng: "", founded: "",
    description: "", phone: "", email: "", website: "",
    massTimes: [{ day: "Sunday", time: "", language: "English" }],
    officeHours: [], priestName: "", clergy: [], confessions: "", adoration: "",
    events: [], heroImage: "", images: [],
  };
}

function recordToDraft(c) {
  return {
    name: c.name || "", type: c.type || "Parish Church", patron: c.patron || "",
    diocese: c.diocese || "Archdiocese of Nairobi", deanery: c.deanery || "",
    city: c.city || "", county: c.county || "", address: c.address || "", poBox: c.poBox || "",
    lat: c.coords ? String(c.coords.lat) : "", lng: c.coords ? String(c.coords.lng) : "",
    founded: c.founded || "", description: c.description || "",
    phone: (c.contact && c.contact.phone) || "", email: (c.contact && c.contact.email) || "",
    website: (c.contact && c.contact.website) || "",
    massTimes: (c.massTimes && c.massTimes.length) ? c.massTimes.map((m) => ({ ...m })) : [{ day: "Sunday", time: "", language: "English" }],
    officeHours: (c.officeHours || []).map((o) => ({ ...o })),
    priestName: c.priest ? c.priest.name : "",
    clergy: (c.clergy || []).map((p) => ({ ...p })),
    confessions: c.confessions || "", adoration: c.adoration || "",
    events: (c.events || []).map((e) => ({ date: e.date || "", title: e.title || "", time: e.time || "" })),
    heroImage: c.heroImage || "", images: (c.images || []).slice(),
  };
}

/* an event's stored date may be ISO ("2026-06-08") or a legacy label
   ("Jun 8"); normalise to yyyy-mm-dd for the <input type="date"> control. */
const EV_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function eventISO(d) {
  if (!d) return "";
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^([A-Za-z]{3,})\s+(\d{1,2})$/.exec(s);
  if (m) {
    const mi = EV_MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mi >= 0) return new Date().getFullYear() + "-" + String(mi + 1).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
  }
  return "";
}

function ParishForm({ church, allDioceses, onClose }) {
  const editing = !!church;
  const [d, setD] = React.useState(() => (church ? recordToDraft(church) : emptyDraft()));
  const [err, setErr] = React.useState("");
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  // dynamic rows
  const addMass = () => set("massTimes", [...d.massTimes, { day: "Sunday", time: "", language: "English" }]);
  const setMass = (i, k, v) => set("massTimes", d.massTimes.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const delMass = (i) => set("massTimes", d.massTimes.filter((_, j) => j !== i));

  const addHours = () => set("officeHours", [...d.officeHours, { days: "Mon – Fri", hours: "" }]);
  const setHours = (i, k, v) => set("officeHours", d.officeHours.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const delHours = (i) => set("officeHours", d.officeHours.filter((_, j) => j !== i));

  const addClergy = () => set("clergy", [...d.clergy, { name: "", title: "Assistant Priest" }]);
  const setClergy = (i, k, v) => set("clergy", d.clergy.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const delClergy = (i) => set("clergy", d.clergy.filter((_, j) => j !== i));

  const addEvent = () => set("events", [...d.events, { date: "", title: "", time: "" }]);
  const setEvent = (i, k, v) => set("events", d.events.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const delEvent = (i) => set("events", d.events.filter((_, j) => j !== i));

  const addImage = () => set("images", [...d.images, ""]);
  const setImage = (i, v) => set("images", d.images.map((m, j) => (j === i ? v : m)));
  const delImage = (i) => set("images", d.images.filter((_, j) => j !== i));

  // server uploads (photos live in /uploads on the host)
  const [uploading, setUploading] = React.useState(null); // "hero" | index
  function uploadTo(target) {
    setUploading(target);
    window.Uploads.pickAndUpload().then((url) => {
      setUploading(null);
      if (!url) return;
      if (target === "hero") set("heroImage", url);
      else setImage(target, url);
    }).catch((e) => {
      setUploading(null);
      setErr(e.message || "Upload failed.");
    });
  }

  const [finding, setFinding] = React.useState(false);
  const [findMsg, setFindMsg] = React.useState("");
  function findOnline() {
    if (!d.name.trim()) { setErr("Enter a parish name first, then search for a photo."); return; }
    setFinding(true); setFindMsg("");
    const probe = { id: church ? church.id : "", name: d.name, city: d.city, county: d.county, type: d.type };
    window.ImageSearch.findImages(probe).then((res) => {
      setFinding(false);
      if (res && res.heroImage) {
        setD((p) => ({ ...p, heroImage: res.heroImage, images: (res.images || []).slice(0, 5) }));
        setFindMsg(res.source === "archive" ? "Found archive photos for this parish." : "Found " + (res.images ? res.images.length : 1) + " photo(s) from Wikimedia Commons.");
      } else {
        setFindMsg("No photo found online — upload one or paste a URL.");
      }
    }).catch(() => { setFinding(false); setFindMsg("Couldn't reach the image service. Try again, upload, or paste a URL."); });
  }

  function save() {
    if (!d.name.trim()) { setErr("Parish name is required."); window.scrollTo(0, 0); return; }
    let coords = null;
    if (d.lat !== "" && d.lng !== "") {
      const lat = parseFloat(d.lat), lng = parseFloat(d.lng);
      if (isNaN(lat) || isNaN(lng)) { setErr("Coordinates must be numbers (or leave both blank)."); return; }
      coords = { lat, lng };
    }
    const rec = {
      name: d.name.trim(), type: d.type, patron: d.patron.trim(), diocese: d.diocese,
      deanery: d.deanery.trim(), city: d.city.trim(), county: d.county.trim(),
      address: d.address.trim(), poBox: d.poBox.trim(), coords,
      founded: d.founded ? parseInt(d.founded, 10) || d.founded : null,
      description: d.description.trim(),
      contact: { phone: d.phone.trim(), email: d.email.trim(), website: d.website.trim() },
      massTimes: d.massTimes.filter((m) => m.time.trim()),
      officeHours: d.officeHours.filter((o) => o.hours.trim()),
      priest: d.priestName.trim() ? { name: d.priestName.trim(), title: "Parish Priest" } : null,
      clergy: d.clergy.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), title: p.title || "Assistant Priest" })),
      confessions: d.confessions.trim(), adoration: d.adoration.trim(),
      events: d.events
        .map((e) => ({ date: eventISO(e.date) || (e.date || "").trim(), title: (e.title || "").trim(), time: (e.time || "").trim() }))
        .filter((e) => e.title),
      heroImage: d.heroImage.trim(),
      images: d.images.map((s) => s.trim()).filter(Boolean),
      source: editing ? (church.source || "manual") : "manual",
    };
    if (editing) {
      // preserve rich seed fields not in the form
      rec.tagline = church.tagline; rec.sacraments = church.sacraments;
      rec.services = church.services; rec.gallery = church.gallery;
      rec.socials = church.socials;
      window.ParishStore.update(church.id, rec);
    } else {
      window.ParishStore.add(rec);
    }
    onClose(true);
  }

  const dioOptions = window.uniqueSorted([...(allDioceses || []), "Archdiocese of Nairobi", "Archdiocese of Mombasa", "Archdiocese of Kisumu", "Archdiocese of Nyeri", d.diocese].filter(Boolean));

  return (
    <div className="modal-overlay" onMouseDown={() => onClose(false)}>
      <div className="modal modal-form" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-kicker">{editing ? "Edit parish" : "Add a parish"}</div>
            <h2>{editing ? church.name : "New parish record"}</h2>
          </div>
          <button className="icon-btn" onClick={() => onClose(false)} aria-label="Close"><window.I.cross style={{ width: 18, height: 18, transform: "rotate(45deg)" }} /></button>
        </div>

        <div className="modal-body">
          {err && <div className="form-error"><window.I.warn style={{ width: 15, height: 15 }} /> {err}</div>}

          <div className="form-sec">Identity</div>
          <div className="form-grid">
            <FField label="Parish name" full><input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. St. Joseph the Worker" /></FField>
            <FField label="Type">
              <div className="select-wrap full"><select value={d.type} onChange={(e) => set("type", e.target.value)}>{FORM_TYPES.map((x) => <option key={x}>{x}</option>)}</select><span className="chev"><window.I.chev /></span></div>
            </FField>
            <FField label="Patron saint"><input value={d.patron} onChange={(e) => set("patron", e.target.value)} placeholder="e.g. St. Joseph" /></FField>
            <FField label="Year founded" hint="optional"><input value={d.founded} onChange={(e) => set("founded", e.target.value)} placeholder="e.g. 1955" /></FField>
            <FField label="Diocese">
              <div className="select-wrap full"><select value={d.diocese} onChange={(e) => set("diocese", e.target.value)}>{dioOptions.map((x) => <option key={x}>{x}</option>)}</select><span className="chev"><window.I.chev /></span></div>
            </FField>
            <FField label="Deanery" hint="optional"><input value={d.deanery} onChange={(e) => set("deanery", e.target.value)} placeholder="e.g. Ruaraka" /></FField>
          </div>

          <div className="form-sec">Location</div>
          <div className="form-grid">
            <FField label="Area / town"><input value={d.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Kangemi" /></FField>
            <FField label="County"><input value={d.county} onChange={(e) => set("county", e.target.value)} placeholder="e.g. Nairobi" /></FField>
            <FField label="Physical address" full><input value={d.address} onChange={(e) => set("address", e.target.value)} placeholder="Road / building / area" /></FField>
            <FField label="P.O. Box" hint="optional"><input value={d.poBox} onChange={(e) => set("poBox", e.target.value)} placeholder="e.g. 23408, 00625 Kangemi" /></FField>
            <FField label="Coordinates" hint="lat, lng — optional">
              <div className="coord-pair">
                <input value={d.lat} onChange={(e) => set("lat", e.target.value)} placeholder="-1.2750" />
                <input value={d.lng} onChange={(e) => set("lng", e.target.value)} placeholder="36.7403" />
              </div>
            </FField>
          </div>

          <div className="form-sec">Contact</div>
          <div className="form-grid">
            <FField label="Telephone"><input value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 7…" /></FField>
            <FField label="Email"><input value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="parish@example.org" /></FField>
            <FField label="Website" full><input value={d.website} onChange={(e) => set("website", e.target.value)} placeholder="www.parish.org" /></FField>
          </div>

          <div className="form-sec">
            Mass &amp; service times
            <button className="add-row" onClick={addMass}><window.I.plus style={{ width: 14, height: 14 }} /> Add time</button>
          </div>
          <div className="row-stack">
            {d.massTimes.map((m, i) => (
              <div className="dyn-row mass" key={i}>
                <div className="select-wrap"><select value={m.day} onChange={(e) => setMass(i, "day", e.target.value)}>{FORM_DAYS.map((x) => <option key={x}>{x}</option>)}</select><span className="chev"><window.I.chev /></span></div>
                <input value={m.time} onChange={(e) => setMass(i, "time", e.target.value)} placeholder="7:00 am" />
                <div className="select-wrap"><select value={m.language} onChange={(e) => setMass(i, "language", e.target.value)}>{FORM_LANGS.map((x) => <option key={x} value={x}>{x || "—"}</option>)}</select><span className="chev"><window.I.chev /></span></div>
                <button className="row-del" onClick={() => delMass(i)} aria-label="Remove"><window.I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            ))}
            {d.massTimes.length === 0 && <div className="muted" style={{ fontSize: 13.5 }}>No times added.</div>}
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <FField label="Confession"><input value={d.confessions} onChange={(e) => set("confessions", e.target.value)} placeholder="Saturdays 4–5 pm" /></FField>
            <FField label="Adoration" hint="optional"><input value={d.adoration} onChange={(e) => set("adoration", e.target.value)} placeholder="Thursdays 6 pm" /></FField>
          </div>

          <div className="form-sec">
            Office hours
            <button className="add-row" onClick={addHours}><window.I.plus style={{ width: 14, height: 14 }} /> Add hours</button>
          </div>
          <div className="row-stack">
            {d.officeHours.map((o, i) => (
              <div className="dyn-row hours" key={i}>
                <input value={o.days} onChange={(e) => setHours(i, "days", e.target.value)} placeholder="Mon – Fri" />
                <input value={o.hours} onChange={(e) => setHours(i, "hours", e.target.value)} placeholder="8:00 AM – 5:00 PM" />
                <button className="row-del" onClick={() => delHours(i)} aria-label="Remove"><window.I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            ))}
            {d.officeHours.length === 0 && <div className="muted" style={{ fontSize: 13.5 }}>No office hours added.</div>}
          </div>

          <div className="form-sec">
            Clergy
            <button className="add-row" onClick={addClergy}><window.I.plus style={{ width: 14, height: 14 }} /> Add assistant</button>
          </div>
          <div className="form-grid">
            <FField label="Parish priest" full><input value={d.priestName} onChange={(e) => set("priestName", e.target.value)} placeholder="e.g. Fr. John Mwangi" /></FField>
          </div>
          <div className="row-stack" style={{ marginTop: 10 }}>
            {d.clergy.map((p, i) => (
              <div className="dyn-row hours" key={i}>
                <input value={p.name} onChange={(e) => setClergy(i, "name", e.target.value)} placeholder="Fr. …" />
                <input value={p.title} onChange={(e) => setClergy(i, "title", e.target.value)} placeholder="Assistant Priest" />
                <button className="row-del" onClick={() => delClergy(i)} aria-label="Remove"><window.I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            ))}
          </div>

          <div className="form-sec">
            Upcoming events
            <button className="add-row" onClick={addEvent}><window.I.plus style={{ width: 14, height: 14 }} /> Add event</button>
          </div>
          <div className="row-stack">
            {d.events.map((e, i) => (
              <div className="dyn-row event" key={i} style={{ gridTemplateColumns: "150px 1fr 110px 40px" }}>
                <input type="date" value={eventISO(e.date)} onChange={(ev) => setEvent(i, "date", ev.target.value)} aria-label="Event date" />
                <input value={e.title} onChange={(ev) => setEvent(i, "title", ev.target.value)} placeholder="e.g. Harvest Mass" aria-label="Event title" />
                <input value={e.time} onChange={(ev) => setEvent(i, "time", ev.target.value)} placeholder="10:30 AM" aria-label="Event time" />
                <button className="row-del" onClick={() => delEvent(i)} aria-label="Remove"><window.I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            ))}
            {d.events.length === 0 && <div className="muted" style={{ fontSize: 13.5 }}>No events added — past dates hide themselves on the parish page.</div>}
          </div>

          <div className="form-sec">
            Photos
            <div style={{ display: "flex", gap: 8 }}>
              <button className="add-row find-row" onClick={findOnline} disabled={finding}>
                {finding ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <window.I.globe style={{ width: 14, height: 14 }} />}
                {finding ? "Searching…" : "Find photo online"}
              </button>
              <button className="add-row" onClick={addImage}><window.I.plus style={{ width: 14, height: 14 }} /> Add gallery image</button>
            </div>
          </div>
          {findMsg && <div className="find-msg"><window.I.sparkle style={{ width: 14, height: 14 }} /> {findMsg}</div>}
          <div className="form-grid">
            <FField label="Main / hero image" full hint="shown on the parish page & cards — paste a URL or upload">
              <div className="upload-row">
                <input className="grow" value={d.heroImage} onChange={(e) => set("heroImage", e.target.value)} placeholder="https://…/photo.jpg" />
                <button type="button" className="btn btn-soft btn-sm btn-upload" onClick={() => uploadTo("hero")} disabled={uploading !== null}>
                  {uploading === "hero" ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <window.I.upload style={{ width: 14, height: 14 }} />} Upload
                </button>
              </div>
            </FField>
          </div>
          {d.heroImage.trim() && (
            <div className="img-preview"><img src={d.heroImage} alt="" onError={(e) => { e.target.style.display = "none"; }} /><span>Hero preview</span></div>
          )}
          <div className="row-stack" style={{ marginTop: 10 }}>
            {d.images.map((url, i) => (
              <div className="dyn-row img" key={i} style={{ gridTemplateColumns: "1fr auto 40px" }}>
                <input value={url} onChange={(e) => setImage(i, e.target.value)} placeholder={"Gallery image " + (i + 1) + " URL"} />
                <button type="button" className="btn btn-soft btn-sm btn-upload" onClick={() => uploadTo(i)} disabled={uploading !== null}>
                  {uploading === i ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <window.I.upload style={{ width: 14, height: 14 }} />}
                </button>
                <button className="row-del" onClick={() => delImage(i)} aria-label="Remove"><window.I.trash style={{ width: 15, height: 15 }} /></button>
              </div>
            ))}
            {d.images.length === 0 && <div className="muted" style={{ fontSize: 13.5 }}>No gallery images — you can also drag photos onto the gallery frames on the parish page.</div>}
          </div>

          <div className="form-sec">Description</div>
          <div className="form-grid">
            <FField label="About this parish" full hint="optional — auto-generated if blank">
              <textarea value={d.description} onChange={(e) => set("description", e.target.value)} rows={4} placeholder="A short history or description…" />
            </FField>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><window.I.check style={{ width: 16, height: 16 }} /> {editing ? "Save changes" : "Add parish"}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ParishForm });

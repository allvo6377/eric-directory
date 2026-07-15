/* church.jsx — individual parish page (shared via window) */

function InfoCard({ label, icon, children }) {
  return (
    <div className="info-card">
      <div className="ic-label">{icon} {label}</div>
      {children}
    </div>
  );
}

function ContactRow({ icon, k, children }) {
  return (
    <div className="contact-row">
      <div className="ci">{icon}</div>
      <div className="cv"><div className="k">{k}</div>{children}</div>
    </div>
  );
}

/* image frame: drag-droppable slot for admins, static image/placeholder for
   visitors. `art` → use the branded church illustration as the empty fallback
   (used for the prominent hero); otherwise a light empty frame. */
function Frame({ id, src, label, className, admin, type, art }) {
  if (admin) return <window.Slot id={id} src={src} label={label} className={className} />;
  return (
    <div className={"slot-wrap " + (className || "")}>
      {src
        ? <img className="frame-img" src={src} alt={label || ""} loading="lazy" />
        : (art
            ? <img className="frame-img church-art" src={window.churchArtURI(type)} alt={label || ""} />
            : <window.PH label={label} />)}
    </div>
  );
}

/* Mass & service times — a striped table for visitors, an inline editor
   (add / edit / remove rows) for signed-in admins. */
const MASS_DAYS = ["Sunday", "Weekdays", "Daily", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Public Holidays"];
const MASS_LANGS = ["", "English", "Swahili", "Kikuyu", "Kimeru", "Kamba", "Kipsigis", "Latin", "Children's"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* parse an event date: ISO "2026-06-08" (from the admin date picker) or a
   legacy "Jun 8" label. Returns a Date at local midnight, or null. */
function eventDate(d) {
  if (!d) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d).trim());
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const legacy = new Date(String(d).trim() + " " + new Date().getFullYear());
  return isNaN(legacy.getTime()) ? null : legacy;
}
/* upcoming events only (today onward + any undated), soonest first */
function upcomingEvents(events) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (events || [])
    .map((e) => ({ e, d: eventDate(e.date) }))
    .filter((x) => !x.d || x.d >= today)
    .sort((a, b) => (a.d ? a.d.getTime() : Infinity) - (b.d ? b.d.getTime() : Infinity));
}
/* yyyy-mm-dd for the native <input type="date"> control */
function toISODate(d) {
  const dt = eventDate(d);
  if (!dt) return "";
  const p = (n) => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
}

function MassTimes({ church: c, admin, navigate }) {
  const [rows, setRows] = React.useState(() => (c.massTimes || []).map((m) => ({ ...m })));
  React.useEffect(() => { setRows((c.massTimes || []).map((m) => ({ ...m }))); }, [c.id]);

  function persist(next) {
    window.ParishStore.update(c.id, { massTimes: next.filter((m) => (m.time || "").trim()) });
  }
  const setLocal = (i, k, v) => setRows((r) => r.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
  const saveField = (i, k, v) => { const next = rows.map((m, j) => (j === i ? { ...m, [k]: v } : m)); setRows(next); persist(next); };
  const addRow = () => { const next = [...rows, { day: "Sunday", time: "", language: "English" }]; setRows(next); };
  const delRow = (i) => { const next = rows.filter((_, j) => j !== i); setRows(next); persist(next); };

  if (!admin) {
    if (!c.massTimes.length) return (
      <div className="empty" style={{ textAlign: "left", padding: "20px 22px" }}>Mass schedule not yet listed for this parish.</div>
    );
    return (
      <div className="mass-table">
        {c.massTimes.map((m, i) => (
          <div className="mass-row" key={i}>
            <div className="m-day">{m.day}</div>
            <div className="m-time">{m.time}</div>
            <div>{m.language ? <span className="chip chip-lang">{m.language}</span> : null}</div>
          </div>
        ))}
      </div>
    );
  }

  // admin — editable
  return (
    <div className="mass-edit">
      {rows.map((m, i) => (
        <div className="mass-edit-row" key={i}>
          <select value={m.day} onChange={(e) => saveField(i, "day", e.target.value)} aria-label="Day">
            {MASS_DAYS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <input value={m.time} onChange={(e) => setLocal(i, "time", e.target.value)} onBlur={() => persist(rows)} placeholder="7:00 AM" aria-label="Time" />
          <select value={m.language} onChange={(e) => saveField(i, "language", e.target.value)} aria-label="Language">
            {MASS_LANGS.map((l) => <option key={l} value={l}>{l || "—"}</option>)}
          </select>
          <button className="row-del" onClick={() => delRow(i)} aria-label="Remove time"><window.I.trash style={{ width: 15, height: 15 }} /></button>
        </div>
      ))}
      <button className="add-row" onClick={addRow}><window.I.plus style={{ width: 14, height: 14 }} /> Add Mass time</button>
    </div>
  );
}

/* Upcoming events — a dated calendar list for visitors (past events hide
   themselves), an inline editor (date / title / time; add & remove) for admins. */
function Events({ church: c, admin }) {
  const [rows, setRows] = React.useState(() => (c.events || []).map((e) => ({ ...e })));
  React.useEffect(() => { setRows((c.events || []).map((e) => ({ ...e }))); }, [c.id]);

  function persist(next) {
    window.ParishStore.update(c.id, { events: next.filter((e) => (e.title || "").trim()) });
  }
  const setLocal = (i, k, v) => setRows((r) => r.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const saveField = (i, k, v) => { const next = rows.map((e, j) => (j === i ? { ...e, [k]: v } : e)); setRows(next); persist(next); };
  const addRow = () => setRows((r) => [...r, { date: "", title: "", time: "" }]);
  const delRow = (i) => { const next = rows.filter((_, j) => j !== i); setRows(next); persist(next); };

  if (!admin) {
    const up = upcomingEvents(c.events);
    if (!up.length) return null;
    return (
      <div>
        {up.map(({ e, d }, i) => (
          <div className="event-row" key={i}>
            <div className="event-date">
              {d
                ? <React.Fragment><div className="ed-mo">{MONTHS[d.getMonth()]}</div><div className="ed-day">{d.getDate()}</div></React.Fragment>
                : <div className="ed-mo">TBA</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="ev-title">{e.title}</div>
              {e.time ? <div className="ev-time"><window.I.clock style={{ width: 13, height: 13, verticalAlign: "-2px", marginRight: 4 }} />{e.time}</div> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // admin — editable
  return (
    <div className="event-edit">
      {rows.map((e, i) => (
        <div className="event-edit-row" key={i}>
          <input type="date" value={toISODate(e.date)} onChange={(ev) => saveField(i, "date", ev.target.value)} aria-label="Event date" />
          <input value={e.title} onChange={(ev) => setLocal(i, "title", ev.target.value)} onBlur={() => persist(rows)} placeholder="Event title" aria-label="Event title" />
          <input value={e.time} onChange={(ev) => setLocal(i, "time", ev.target.value)} onBlur={() => persist(rows)} placeholder="10:30 AM" aria-label="Event time" />
          <button className="row-del" onClick={() => delRow(i)} aria-label="Remove event"><window.I.trash style={{ width: 15, height: 15 }} /></button>
        </div>
      ))}
      {rows.length === 0 && <div className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>No events yet — add upcoming parish events below.</div>}
      <button className="add-row" onClick={addRow}><window.I.plus style={{ width: 14, height: 14 }} /> Add event</button>
    </div>
  );
}

function ChurchPage({ church: c, navigate, admin }) {
  React.useEffect(() => { window.scrollTo(0, 0); }, [c.id]);
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [shareMsg, setShareMsg] = React.useState("");

  // per-parish browser title (bookmarks, history, tab bar)
  React.useEffect(() => {
    const site = window.SiteContent ? window.SiteContent.get() : {};
    const prev = document.title;
    document.title = c.name + " — " + (site.siteName || "Ecclesia Kenya");
    return () => { document.title = prev; };
  }, [c.id, c.name]);

  // share the server-rendered page (/p/<id>) — it carries the real
  // title/preview image when pasted into WhatsApp & friends
  function share() {
    const url = location.origin + "/p/" + c.id;
    const data = { title: c.name, text: c.tagline || c.name, url };
    if (navigator.share) {
      navigator.share(data).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => { setShareMsg("Link copied!"); setTimeout(() => setShareMsg(""), 2200); },
        () => { setShareMsg(url); }
      );
    }
  }

  const hasCoords = c.coords && typeof c.coords.lat === "number";
  const dirUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${c.coords.lat},${c.coords.lng}` : null;
  const mapsUrl = hasCoords ? `https://www.openstreetmap.org/?mlat=${c.coords.lat}&mlon=${c.coords.lng}#map=16/${c.coords.lat}/${c.coords.lng}` : null;

  const ct = c.contact || {};
  const hasContact = ct.phone || ct.email || ct.website || c.address || c.poBox;
  const clergyList = [].concat(c.priest ? [c.priest] : [], c.clergy || []);
  const subBits = [];
  if (c.city || c.county) subBits.push(<span key="loc"><window.I.pin /> {[c.city, c.county].filter(Boolean).join(", ")}</span>);
  subBits.push(<span key="dio"><window.I.cross style={{ width: 14, height: 14 }} /> {c.diocese}</span>);
  if (c.deanery) subBits.push(<span key="dean">{c.deanery} Deanery</span>);
  if (c.founded) subBits.push(<span key="est">Est. {c.founded}</span>);

  let si = 0;

  return (
    <div className="cp">
      <a className="cp-back" onClick={() => navigate(null)}><window.I.back /> All parishes</a>

      {admin && (
        <div className="admin-edit-hint">
          <window.I.edit style={{ width: 14, height: 14 }} /> You're signed in — click the name, description or any photo to edit it directly. Use <a href="#admin" onClick={(e) => { e.preventDefault(); navigate("admin"); }}>Admin</a> for the full editor.
        </div>
      )}

      {/* hero */}
      <div className="cp-hero">
        <div className="cp-hero-main">
          <Frame id={"hero-" + c.id} src={c.heroImage || c.images[0]} label={c.gallery[0]} className="hero-slot" admin={admin} type={c.type} art />
          <div className="cp-hero-overlay">
            <span className="chip chip-type">{c.type}</span>
            <window.EditableText tag="h1" admin={admin} value={c.name}
              onSave={(v) => v && window.ParishStore.update(c.id, { name: v })} />
            <div className="sub">{subBits}</div>
          </div>
        </div>
        <div className="cp-hero-side">
          <Frame id={"side1-" + c.id} src={c.images[1]} label={c.gallery[1]} admin={admin} />
          <Frame id={"side2-" + c.id} src={c.images[2]} label={c.gallery[2]} admin={admin} />
        </div>
      </div>

      <div className="cp-grid">
        {/* ---- main column ---- */}
        <div className="cp-main">
          <div className="section" style={{ "--i": si++ }}>
            <h2>About this parish</h2>
            <window.EditableText tag="p" className="lede" style={{ marginTop: 14 }} admin={admin} multiline
              value={c.description} placeholder="Add a short description of this parish…"
              onSave={(v) => window.ParishStore.update(c.id, { description: v })} />
          </div>

          <div className="section" style={{ "--i": si++ }}>
            <h2>Mass &amp; service times</h2>
            {admin ? (
              <div className="sec-sub">
                Confessions: <window.EditableText tag="span" admin value={c.confessions} placeholder="add confession times…" onSave={(v) => window.ParishStore.update(c.id, { confessions: v })} />
                {" · "}Adoration: <window.EditableText tag="span" admin value={c.adoration} placeholder="add adoration times…" onSave={(v) => window.ParishStore.update(c.id, { adoration: v })} />
              </div>
            ) : (
              c.confessions && <div className="sec-sub">Confessions: {c.confessions}{c.adoration ? " · Adoration: " + c.adoration : ""}</div>
            )}
            <MassTimes church={c} admin={admin} navigate={navigate} />
          </div>

          {(c.sacraments.length > 0 || c.services.length > 0) && (
            <div className="section" style={{ "--i": si++ }}>
              <h2>Sacraments &amp; services</h2>
              <div className="sec-sub">Celebrated and offered at {c.name}.</div>
              <div className="info-grid">
                {c.sacraments.length > 0 && (
                  <InfoCard label="Sacraments" icon={<window.I.cross style={{ width: 14, height: 14 }} />}>
                    <div className="tag-wrap" style={{ marginTop: 2 }}>
                      {c.sacraments.map((s) => <span key={s} className="chip"><window.I.check style={{ color: "var(--primary)" }} /> {s}</span>)}
                    </div>
                  </InfoCard>
                )}
                {c.services.length > 0 && (
                  <InfoCard label="Ministries & groups" icon={<window.I.people />}>
                    <div className="tag-wrap" style={{ marginTop: 2 }}>
                      {c.services.map((s) => <span key={s} className="chip chip-primary">{s}</span>)}
                    </div>
                  </InfoCard>
                )}
              </div>
            </div>
          )}

          <div className="section" style={{ "--i": si++ }}>
            <h2>Photo gallery</h2>
            <div className="sec-sub">{admin ? "Drag a photo onto any frame to upload it — or set image links in the editor." : "Images of the parish."}</div>
            <div className="gallery">
              <Frame id={"g0-" + c.id} src={c.images[0] || c.heroImage} label={c.gallery[0]} className="wide" admin={admin} />
              <Frame id={"g1-" + c.id} src={c.images[1]} label={c.gallery[1]} admin={admin} />
              <Frame id={"g2-" + c.id} src={c.images[2]} label={c.gallery[2]} admin={admin} />
              <Frame id={"g3-" + c.id} src={c.images[3]} label={c.gallery[3]} admin={admin} />
              <Frame id={"g4-" + c.id} src={c.images[4]} label={c.gallery[0] + " · detail"} admin={admin} />
              <Frame id={"g5-" + c.id} src={c.images[5]} label={c.gallery[3] + " · detail"} className="wide" admin={admin} />
            </div>
          </div>

          {clergyList.length > 0 && (
            <div className="section" style={{ "--i": si++ }}>
              <h2>Clergy</h2>
              <div className="sec-sub">Serving the parish community.</div>
              <div>
                {clergyList.map((p, i) => (
                  <div className="clergy-row" key={i}>
                    <div className="clergy-av">{window.initials(p.name)}</div>
                    <div>
                      <div className="cn">{p.name}</div>
                      <div className="ct">{p.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(admin || upcomingEvents(c.events).length > 0) && (
            <div className="section" style={{ "--i": si++, marginBottom: 0 }}>
              <h2>Upcoming events</h2>
              <div className="sec-sub">{admin ? "Post parish events with a date, title and time — past dates hide themselves automatically." : "Parish calendar highlights."}</div>
              <Events church={c} admin={admin} />
            </div>
          )}
        </div>

        {/* ---- sidebar ---- */}
        <aside className="cp-side">
          <div className="side-card">
            <h3>Contact</h3>
            {hasContact ? (
              <React.Fragment>
                {ct.phone && <ContactRow icon={<window.I.phone />} k="Phone"><a className="v" href={"tel:" + ct.phone.replace(/\s/g, "")}>{ct.phone}</a></ContactRow>}
                {ct.email && <ContactRow icon={<window.I.mail />} k="Email"><a className="v" href={"mailto:" + ct.email}>{ct.email}</a></ContactRow>}
                {ct.website && <ContactRow icon={<window.I.globe />} k="Website"><a className="v" href={(/^https?:/.test(ct.website) ? "" : "https://") + ct.website} target="_blank" rel="noreferrer">{ct.website.replace(/^https?:\/\//, "")}</a></ContactRow>}
                {(c.address || c.poBox) && <ContactRow icon={<window.I.pin />} k="Address"><div className="v" style={{ fontWeight: 500 }}>{c.address || ("P.O. Box " + c.poBox)}</div></ContactRow>}
              </React.Fragment>
            ) : (
              <div className="muted" style={{ fontSize: 13.5 }}>No contact details on file yet.</div>
            )}
            <div className="side-actions">
              {dirUrl
                ? <a className="btn btn-primary" href={dirUrl} target="_blank" rel="noreferrer"><window.I.route /> Get directions</a>
                : <button className="btn btn-ghost" disabled style={{ opacity: .55, cursor: "default" }}><window.I.pin /> Location not set</button>}
              {mapsUrl && <a className="btn btn-ghost" href={mapsUrl} target="_blank" rel="noreferrer"><window.I.pin /> View on map</a>}
              <button className="btn btn-ghost" onClick={share}><window.I.globe /> {shareMsg || "Share this parish"}</button>
            </div>
          </div>

          <div className="side-card">
            <h3>Something out of date?</h3>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 12px" }}>
              Mass times and contacts change. If you spot an error, let the directory team know.
            </p>
            <button className="btn btn-soft" style={{ width: "100%" }} onClick={() => setSuggestOpen(true)}>
              <window.I.edit style={{ width: 15, height: 15 }} /> Suggest an update
            </button>
          </div>

          <div className="side-card">
            <h3>Office hours</h3>
            {c.officeHours.length ? c.officeHours.map((o, i) => (
              <div className="office-row" key={i} style={{ borderBottom: i < c.officeHours.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span className="or-days">{o.days}</span>
                <span className="or-hours">{o.hours}</span>
              </div>
            )) : <div className="muted" style={{ fontSize: 13.5 }}>Contact the parish office for hours.</div>}
          </div>

          {hasCoords && (
            <div className="side-card">
              <h3>Location</h3>
              <div className="side-map"><window.MiniMap church={c} /></div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{c.diocese}</div>
            </div>
          )}
        </aside>
      </div>

      {suggestOpen && <window.SuggestModal church={c} onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}

Object.assign(window, { ChurchPage });

/* ui.jsx — icons, placeholder, small components, helpers (shared via window) */

/* ---------- icons (simple line glyphs) ---------- */
const I = {
  search: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>,
  pin: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s-6.5-5.6-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.4-6.5 10-6.5 10Z"/><circle cx="12" cy="11" r="2.3"/></svg>,
  clock: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg>,
  phone: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 4h3.2l1.5 4-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2 4 1.5V19a2 2 0 0 1-2.2 2A16 16 0 0 1 4 6.2 2 2 0 0 1 6 4Z"/></svg>,
  mail: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>,
  globe: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17"/></svg>,
  cal: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/></svg>,
  chev: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  back: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 6l-6 6 6 6"/></svg>,
  cross: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...p}><rect x="10.4" y="3" width="3.2" height="18" rx="1"/><rect x="6" y="8.2" width="12" height="3.2" rx="1"/></svg>,
  loc: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>,
  route: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8 18c5 0 5-5 8-12"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 4.5 4.5L19 7"/></svg>,
  sparkle: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2.5c.6 4.7 2.2 6.3 6.9 6.9-4.7.6-6.3 2.2-6.9 6.9-.6-4.7-2.2-6.3-6.9-6.9 4.7-.6 6.3-2.2 6.9-6.9Z"/></svg>,
  people: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.2a3 3 0 0 1 0 5.6M18 19c0-1.8-.7-3.4-1.8-4.5"/></svg>,
  gear: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>,
  upload: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3M12 16V4M7 9l5-5 5 5"/></svg>,
  plus: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  lock: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>,
  signout: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/></svg>,
  edit: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  trash: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>,
  file: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>,
  warn: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>,
  download: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3M7 10l5 5 5-5M12 15V3"/></svg>,
  reset: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/></svg>,
};

/* ---------- placeholder image ---------- */
function PH({ label, className = "", tall }) {
  return (
    <div className={"ph " + (tall ? "tall " : "") + className}>
      <span>{label}</span>
    </div>
  );
}

/* ---------- helpers ---------- */
function haversine(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function nextSunday(massTimes) {
  if (!massTimes || !massTimes.length) return null;
  const s = massTimes.find((m) => m.day === "Sunday");
  return s ? s : massTimes[0];
}
function initials(name) {
  // Fr. John Mwangi -> JM
  const parts = name.replace(/Rev\.?|Fr\.?|Sr\.?|Msgr\.?|,.*$/g, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function uniqueSorted(arr) { return [...new Set(arr)].sort(); }

/* image-slot wrapper: drag-and-drop target that also honors an Admin-supplied src URL */
function Slot({ id, src, label = "Drop an image", className = "", shape = "rect", radius, fit = "cover", style }) {
  const props = { id, shape, fit, placeholder: label };
  if (radius != null) props.radius = String(radius);
  if (src) props.src = src;
  return <div className={"slot-wrap " + className} style={style}>{React.createElement("image-slot", props)}</div>;
}

/* Wikimedia Commons serves any width on demand — ask for a small rendition for
   card/search thumbnails instead of the full 1100–1400px hero (saves ~3 MB on
   the directory page). Non-Commons URLs pass through untouched. */
function thumbUrl(src, w) {
  if (!src) return src;
  const m = /^(https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/[^?]+)\?width=\d+$/.exec(src);
  return m ? m[1] + "?width=" + (w || 320) : src;
}

/* plain image with placeholder fallback (for small thumbnails/cards) */
function Thumb({ src, label, className = "", width = 320 }) {
  if (src) return <img className={"thumb-img " + className} src={thumbUrl(src, width)} alt={label || ""} loading="lazy" />;
  return <PH label={label} className={className} />;
}

/* click-to-edit text: for admins, the text becomes editable in place (click →
   input/textarea → save on blur or Enter, Esc cancels). For visitors it renders
   as a plain element. `tag` is the wrapper element for the read view. */
function EditableText({ value, onSave, admin, tag = "div", className = "", multiline = false, placeholder = "Click to add…", style }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || "");
  React.useEffect(() => { if (!editing) setDraft(value || ""); }, [value, editing]);

  if (!admin) {
    return React.createElement(tag, { className, style }, value);
  }

  function commit() {
    setEditing(false);
    const v = draft.trim();
    if (v !== (value || "").trim()) onSave(v);
  }
  function cancel() { setEditing(false); setDraft(value || ""); }

  if (editing) {
    const common = {
      autoFocus: true,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      className: "inline-edit-field " + className,
      style,
      onKeyDown: (e) => {
        if (e.key === "Escape") { e.preventDefault(); cancel(); }
        else if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
        else if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      },
    };
    return multiline
      ? <textarea rows={6} {...common} />
      : <input type="text" {...common} />;
  }

  return React.createElement(
    tag,
    { className: className + " inline-editable", style, title: "Click to edit", onClick: () => setEditing(true), role: "button", tabIndex: 0,
      onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); setEditing(true); } } },
    value ? value : <span className="inline-empty">{placeholder}</span>
  );
}

Object.assign(window, { I, PH, Slot, Thumb, thumbUrl, EditableText, haversine, nextSunday, initials, uniqueSorted });

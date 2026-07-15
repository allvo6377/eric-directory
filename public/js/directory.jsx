/* directory.jsx — homepage: hero, filters, church list + map (shared via window) */

/* Does this device actually have a hover pointer (mouse/trackpad)? On touch
   screens hover doesn't exist, and binding onMouseEnter there is harmful: a tap
   fires a synthetic mouseenter that re-renders the card (setting the "active"
   highlight) mid-gesture, which swallows the tap's click — so the parish only
   opens on the SECOND tap. We only wire the hover→map-highlight on real pointers. */
var CAN_HOVER = !(typeof window !== "undefined" && window.matchMedia)
  ? true
  : window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* highlight matched substring within text */
function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return [text.slice(0, i), <mark key="m">{text.slice(i, i + q.length)}</mark>, text.slice(i + q.length)];
}

/* ---------- Live typeahead search ---------- */
function LiveSearch({ all, query, setQuery, onPick }) {
  const [focused, setFocused] = React.useState(false);
  const [kbd, setKbd] = React.useState(0);
  const q = query.trim();

  // the parish list is already in memory — results are computed instantly
  const results = React.useMemo(() => {
    if (!q) return [];
    const ql = q.toLowerCase();
    return all.
    map((c) => {
      const hay = (c.name + " " + c.city + " " + c.diocese + " " + c.county + " " + c.patron).toLowerCase();
      const idx = hay.indexOf(ql);
      return idx < 0 ? null : { c, score: c.name.toLowerCase().indexOf(ql) >= 0 ? idx : idx + 100 };
    }).
    filter(Boolean).
    sort((a, b) => a.score - b.score).
    slice(0, 6).
    map((x) => x.c);
  }, [q, all]);

  React.useEffect(() => { setKbd(0); }, [q]);

  const open = focused && q.length > 0;

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {e.preventDefault();setKbd((k) => Math.min(k + 1, results.length - 1));} else
    if (e.key === "ArrowUp") {e.preventDefault();setKbd((k) => Math.max(k - 1, 0));} else
    if (e.key === "Enter") {if (results[kbd]) {e.preventDefault();onPick(results[kbd].id);}} else
    if (e.key === "Escape") {e.target.blur();}
  }

  return (
    <div className="search">
      <span className="s-icon"><window.I.search /></span>
      <input
        className={query ? "has-clear" : ""}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 130)}
        onKeyDown={onKeyDown}
        placeholder="Search by parish, town or diocese…" />

      {query &&
      <button className="s-clear" onMouseDown={(e) => {e.preventDefault();setQuery("");}} aria-label="Clear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      }

      {open &&
      <div className="search-dropdown">
          {results.length === 0 ?
        <div className="sd-empty">No parishes match “<b>{q}</b>”.</div> :

        <React.Fragment>
              <div className="sd-head"><span>Parishes</span><span>{results.length} {results.length === 1 ? "result" : "results"}</span></div>
              {results.map((c, i) => {
            const s = window.nextSunday(c.massTimes);
            return (
              <div
                key={c.id}
                className={"sd-row " + (i === kbd ? "kbd" : "")}
                style={{ animationDelay: i * 32 + "ms" }}
                onMouseEnter={() => setKbd(i)}
                onMouseDown={(e) => {e.preventDefault();onPick(c.id);}}>

                    <div className="sd-ic"><window.Thumb src={c.heroImage || c.images[0]} label={c.type} type={c.type} width={96} /></div>
                    <div className="sd-main">
                      <div className="sd-name">{highlight(c.name, q)}</div>
                      <div className="sd-meta"><window.I.pin style={{ width: 13, height: 13 }} /> {[c.city, c.diocese].filter(Boolean).join(" · ")}{s ? " · Sun " + s.time : ""}</div>
                    </div>
                    <span className="sd-go"><window.I.chev style={{ transform: "rotate(-90deg)" }} /></span>
                  </div>);

          })}
              <div className="sd-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>↵</kbd> open parish</span>
                <span><kbd>esc</kbd> close</span>
              </div>
            </React.Fragment>
        }
        </div>
      }
    </div>);

}

function ChurchCard({ c, active, onHover, onOpen, dist, cardStyle, index }) {
  const s = window.nextSunday(c.massTimes);
  const langs = window.uniqueSorted(c.massTimes.map((m) => m.language).filter(Boolean)).slice(0, 3);
  return (
    <div
      className={"ch-card " + (active ? "active " : "") + (cardStyle === "soft" ? "softshadow" : "")}
      style={{ "--i": index }}
      onMouseEnter={CAN_HOVER ? () => onHover(c.id) : undefined}
      onClick={() => onOpen(c.id)}>

      <div className="ch-thumb"><window.Thumb src={c.heroImage || c.images[0]} label={c.gallery[0]} type={c.type} width={200} /></div>
      <div className="ch-main">
        <div className="ch-top">
          <span className="chip chip-type">{c.type}</span>
          <span className="ch-dio">{c.diocese}</span>
        </div>
        <h3>{c.name}</h3>
        <div className="ch-loc"><window.I.pin /> {c.address || [c.city, c.county].filter(Boolean).join(", ") || "Location to be confirmed"}</div>
        <div className="ch-foot">
          {s ? <span className="ch-next"><window.I.clock style={{ color: "var(--primary)" }} /> {s.day === "Sunday" ? "Sun" : s.day} <b>{s.time}</b></span> :
          <span className="ch-next muted" style={{ fontStyle: "italic" }}>Schedule not listed</span>}
          {langs.map((l) => <span key={l} className="chip chip-lang">{l}</span>)}
          {dist != null && <span className="ch-dist">{dist < 1 ? "<1" : Math.round(dist)} km</span>}
        </div>
      </div>
    </div>);

}

function DirectoryView({ navigate, tweaks, mode, parishes }) {
  const all = parishes || window.ParishStore.getAll();
  const mapMode = mode === "map";
  const site = window.SiteContent ? window.SiteContent.get() : {};
  const [query, setQuery] = React.useState("");
  const [diocese, setDiocese] = React.useState("All");
  const [lang, setLang] = React.useState("All");
  const [nearest, setNearest] = React.useState(false);
  const [userLoc, setUserLoc] = React.useState(null);
  const [activeId, setActiveId] = React.useState(null);
  const [geoState, setGeoState] = React.useState("idle");
  const [finderOpen, setFinderOpen] = React.useState(false);

  // record settled search terms (1.2s after typing stops) for privacy-light analytics
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => { if (window.Analytics) window.Analytics.search(q); }, 1200);
    return () => clearTimeout(t);
  }, [query]);

  const dioceses = React.useMemo(() => ["All", ...window.uniqueSorted(all.map((c) => c.diocese))], [all]);
  const languages = React.useMemo(() => ["All", ...window.uniqueSorted(all.flatMap((c) => c.massTimes.map((m) => m.language)))], [all]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = all.filter((c) => {
      if (diocese !== "All" && c.diocese !== diocese) return false;
      if (lang !== "All" && !c.massTimes.some((m) => m.language === lang)) return false;
      if (q) {
        const hay = (c.name + " " + c.city + " " + c.diocese + " " + c.county + " " + c.patron).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (nearest && userLoc) {
      list = list.map((c) => ({ c, d: c.coords ? window.haversine(userLoc, c.coords) : Infinity })).
      sort((a, b) => a.d - b.d).map((x) => x.c);
    }
    return list;
  }, [all, query, diocese, lang, nearest, userLoc]);

  const distOf = (c) => userLoc && c.coords ? window.haversine(userLoc, c.coords) : null;

  function findNearest() {
    setNearest(true);
    if (userLoc) return;
    setGeoState("locating");
    const fallback = { lat: -1.28637, lng: 36.81724 }; // Nairobi CBD
    if (!navigator.geolocation) {setUserLoc(fallback);setGeoState("fallback");return;}
    // Browsers only start the geolocation timeout AFTER the permission prompt
    // is answered — if the user ignores the prompt, no callback ever fires.
    // Race our own timer so "Locating…" can never hang forever.
    let settled = false;
    const settle = (loc, state) => { if (settled) return; settled = true; setUserLoc(loc); setGeoState(state); };
    const guard = setTimeout(() => settle(fallback, "fallback"), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(guard); settle({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "ok"); },
      () => { clearTimeout(guard); settle(fallback, "fallback"); },
      { timeout: 6000 }
    );
  }

  const layout = mapMode ? "mapfirst" : tweaks.homeLayout || "split";

  return (
    <div>
      <div className="dir-hero">
        {mapMode ?
        <React.Fragment>
            <div className="eyebrow">{site.mapEyebrow || "Interactive Map · Kenya"}</div>
            <h1 className="serif">{site.mapTitle || "Explore parishes on the map."}</h1>
            <p>{site.mapLede || "Every parish in the directory, plotted across Kenya. Click a pin for details and Mass times, or filter the set below — the map updates as you search."}</p>
          </React.Fragment> :

        <React.Fragment>
            <div className="eyebrow" style={{ padding: "0px 0px 5px" }}>{site.homeEyebrow || "Catholic Directory · Kenya"}</div>
            <h1 className="serif" style={{ padding: "50px 0px 0px" }}>{site.homeTitle || "Find a Catholic parish anywhere in Kenya."}</h1>
            <p>{site.homeLede || "Browse cathedrals, basilicas and parishes across the dioceses of Kenya with Mass times, contacts and locations on the map. Search by name, filter by diocese or language, or find the parish nearest you."}
          </p>
          </React.Fragment>
        }
      </div>

      <div className="toolbar">
        <LiveSearch all={all} query={query} setQuery={setQuery} onPick={navigate} />
        <div className="filter-group">
          <div className="select-wrap">
            <select value={diocese} onChange={(e) => setDiocese(e.target.value)} aria-label="Filter by diocese">
              {dioceses.map((d) => <option key={d} value={d}>{d === "All" ? "All dioceses" : d}</option>)}
            </select>
            <span className="chev"><window.I.chev /></span>
          </div>
          <div className="select-wrap">
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Filter by Mass language">
              {languages.map((l) => <option key={l} value={l}>{l === "All" ? "Any language" : "Mass in " + l}</option>)}
            </select>
            <span className="chev"><window.I.chev /></span>
          </div>
          <button className={"btn " + (nearest ? "btn-primary" : "btn-ghost")} onClick={findNearest}>
            <window.I.loc /> {geoState === "locating" ? "Locating…" : "Nearest to me"}
          </button>
          <button className="btn btn-soft mass-now-btn" onClick={() => setFinderOpen(true)}>
            <window.I.clock style={{ width: 15, height: 15 }} /> Next Mass near me
          </button>
        </div>
      </div>

      <div className={"dir-body " + layout}>
        <div className="list-col">
          <div className="list-head">
            <div className="count"><b>{filtered.length}</b> {filtered.length === 1 ? "parish" : "parishes"}{diocese !== "All" ? " · " + diocese : ""}</div>
            {nearest && userLoc && <div className="count" style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><window.I.route /> sorted by distance{geoState === "fallback" ? " from Nairobi" : ""}</div>}
          </div>
          <div className="card-list" key={diocese + "|" + lang + "|" + nearest}>
            {filtered.length === 0 &&
            <div className="empty">No parishes match your search. Try clearing a filter.</div>
            }
            {filtered.map((c, i) =>
            <ChurchCard key={c.id} c={c} active={c.id === activeId} index={i}
            onHover={setActiveId} onOpen={navigate}
            dist={nearest ? distOf(c) : null} cardStyle={tweaks.cardStyle} />
            )}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Tip: hover a parish to highlight it on the map · click to open its page.</p>
        </div>

        <div className="map-col">
          <div className="map-panel">
            <window.DirectoryMap
              churches={filtered.filter((c) => c.coords)} activeId={activeId}
              onSelect={setActiveId} onOpen={navigate} userLoc={userLoc} />
          </div>
        </div>
      </div>

      {finderOpen && <window.MassFinderModal parishes={all} userLoc={userLoc} navigate={navigate} onClose={() => setFinderOpen(false)} />}
    </div>);

}

Object.assign(window, { DirectoryView });

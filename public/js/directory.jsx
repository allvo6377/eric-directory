/* directory.jsx — homepage: hero, filters, church list + map (shared via window) */

/* highlight matched substring within text */
function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return [text.slice(0, i), <mark key="m">{text.slice(i, i + q.length)}</mark>, text.slice(i + q.length)];
}

/* ---------- Live (AJAX-style) typeahead search ---------- */
function LiveSearch({ all, query, setQuery, onPick }) {
  const [focused, setFocused] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [kbd, setKbd] = React.useState(0);
  const timer = React.useRef(null);
  const q = query.trim();

  // simulate an async fetch: debounce + latency + loading state
  React.useEffect(() => {
    if (!q) {setResults([]);setLoading(false);clearTimeout(timer.current);return;}
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const ql = q.toLowerCase();
      const matches = all.
      map((c) => {
        const hay = (c.name + " " + c.city + " " + c.diocese + " " + c.county + " " + c.patron).toLowerCase();
        const idx = hay.indexOf(ql);
        return idx < 0 ? null : { c, score: c.name.toLowerCase().indexOf(ql) >= 0 ? idx : idx + 100 };
      }).
      filter(Boolean).
      sort((a, b) => a.score - b.score).
      slice(0, 6).
      map((x) => x.c);
      setResults(matches);
      setKbd(0);
      setLoading(false);
    }, 260 + Math.random() * 160);
    return () => clearTimeout(timer.current);
  }, [q, all]);

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

      {loading && <span className="s-spin"><span className="spinner" /></span>}
      {!loading && query &&
      <button className="s-clear" onMouseDown={(e) => {e.preventDefault();setQuery("");}} aria-label="Clear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      }

      {open &&
      <div className="search-dropdown">
          {loading ?
        <React.Fragment>
              <div className="sd-head"><span>Searching…</span></div>
              {[0, 1, 2].map((i) =>
          <div className="sd-row" key={i} style={{ pointerEvents: "none" }}>
                  <div className="sd-ic skel" />
                  <div className="sd-main">
                    <div className="skel" style={{ height: 13, width: "62%", marginBottom: 7 }} />
                    <div className="skel" style={{ height: 10, width: "40%" }} />
                  </div>
                </div>
          )}
            </React.Fragment> :
        results.length === 0 ?
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

                    <div className="sd-ic"><window.Thumb src={c.heroImage || c.images[0]} label={c.type} /></div>
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

function ChurchCard({ c, active, onHover, onSelect, onOpen, dist, cardStyle, index }) {
  const s = window.nextSunday(c.massTimes);
  const langs = window.uniqueSorted(c.massTimes.map((m) => m.language).filter(Boolean)).slice(0, 3);
  return (
    <div
      className={"ch-card " + (active ? "active " : "") + (cardStyle === "soft" ? "softshadow" : "")}
      style={{ "--i": index }}
      onMouseEnter={() => onHover(c.id)}
      onClick={() => onSelect(c.id)}
      onDoubleClick={() => onOpen(c.id)}>

      <div className="ch-thumb"><window.Thumb src={c.heroImage || c.images[0]} label={c.gallery[0]} /></div>
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
    navigator.geolocation.getCurrentPosition(
      (pos) => {setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });setGeoState("ok");},
      () => {setUserLoc(fallback);setGeoState("fallback");},
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
            <select value={diocese} onChange={(e) => setDiocese(e.target.value)}>
              {dioceses.map((d) => <option key={d} value={d}>{d === "All" ? "All dioceses" : d}</option>)}
            </select>
            <span className="chev"><window.I.chev /></span>
          </div>
          <div className="select-wrap">
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {languages.map((l) => <option key={l} value={l}>{l === "All" ? "Any language" : "Mass in " + l}</option>)}
            </select>
            <span className="chev"><window.I.chev /></span>
          </div>
          <button className={"btn " + (nearest ? "btn-primary" : "btn-ghost")} onClick={findNearest}>
            <window.I.loc /> {geoState === "locating" ? "Locating…" : "Nearest to me"}
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
            onHover={setActiveId} onSelect={setActiveId} onOpen={navigate}
            dist={nearest ? distOf(c) : null} cardStyle={tweaks.cardStyle} />
            )}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Tip: click a parish to locate it on the map · double-click or “View parish” to open its page.</p>
        </div>

        <div className="map-col">
          <div className="map-panel">
            <window.DirectoryMap
              churches={filtered.filter((c) => c.coords)} activeId={activeId}
              onSelect={setActiveId} onOpen={navigate} userLoc={userLoc} />
          </div>
          {filtered.some((c) => !c.coords) &&
          <div className="map-note"><window.I.pin style={{ width: 13, height: 13 }} /> {filtered.filter((c) => !c.coords).length} of {filtered.length} parishes have no map location yet — add coordinates in Admin.</div>
          }
        </div>
      </div>
    </div>);

}

Object.assign(window, { DirectoryView });

/* app.jsx — root: routing, chrome, theme (production build).

   Differences from the design prototype:
   - The tweaks panel is gone; theme (primary color + heading font) comes from
     the server-side Site settings, editable in the admin area.
   - All fixed copy (brand name, hero text, footer) reads from SiteContent.
   - The Admin link is HIDDEN from the public navigation. Admins open the
     site with  #admin  in the address bar (e.g. https://your-site/#admin);
     once signed in, an Admin link appears in the nav for convenience. */

/* hex helpers for derived shades */
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r, g, b) { return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join(""); }
function mix(hex, target, t) { const a = hexToRgb(hex), b = hexToRgb(target); return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t); }

function applyTheme(site) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(site.primaryColor || "") ? site.primaryColor : "#1462b8";
  const font = site.headingFont || "Newsreader";
  const r = document.documentElement;
  r.style.setProperty("--primary", primary);
  r.style.setProperty("--primary-deep", mix(primary, "#000000", 0.22));
  r.style.setProperty("--primary-soft", mix(primary, "#ffffff", 0.88));
  r.style.setProperty("--primary-tint", mix(primary, "#ffffff", 0.95));
  r.style.setProperty("--serif", `"${font}", Georgia, serif`);
}

function Topbar({ route, onNav, count, authed, site }) {
  const is = (r) => (route === r ? "nav-link active" : "nav-link");
  return (
    <header className="topbar">
      <div className="brand-bar" />
      <div className="topbar-inner">
        <div className="brand" onClick={() => onNav("")}>
          <div className="brand-mark"><img src={site.logoUrl || "assets/logo.jpg"} alt={(site.siteName || "Ecclesia Kenya") + " logo"} /></div>
          <div className="brand-text">
            <div className="t1">{site.siteName || "Ecclesia Kenya"}</div>
            <div className="t2">{site.siteTagline || "Catholic Parish Directory"}</div>
          </div>
        </div>
        <nav className="nav-links">
          <a className={is("")} href="#" onClick={(e) => { e.preventDefault(); onNav(""); }}>Directory</a>
          <a className={is("map")} href="#map" onClick={(e) => { e.preventDefault(); onNav("map"); }}>Map</a>
          <a className={is("dioceses")} href="#dioceses" onClick={(e) => { e.preventDefault(); onNav("dioceses"); }}>Dioceses</a>
          {authed && (
            <a className={is("admin") + " nav-admin"} href="#admin" onClick={(e) => { e.preventDefault(); onNav("admin"); }}>
              <window.I.lock style={{ width: 14, height: 14 }} /> Admin
            </a>
          )}
        </nav>
        <div className="topbar-spacer" />
        <div className="topbar-count">{count} parishes listed</div>
      </div>
    </header>
  );
}

function useParishes() {
  const [list, setList] = React.useState(() => window.ParishStore.getAll());
  React.useEffect(() => window.ParishStore.subscribe(() => setList(window.ParishStore.getAll())), []);
  return list;
}

function useSite() {
  const [site, setSite] = React.useState(() => window.SiteContent.get());
  React.useEffect(() => window.SiteContent.subscribe(() => setSite(window.SiteContent.get())), []);
  return site;
}

function App() {
  const [route, setRoute] = React.useState(() => (location.hash || "").replace("#", ""));
  const parishes = useParishes();
  const site = useSite();
  const [authed, setAuthed] = React.useState(() => window.AdminAuth.isAuthed());
  React.useEffect(() => window.AdminAuth.subscribe(() => setAuthed(window.AdminAuth.isAuthed())), []);

  React.useEffect(() => { applyTheme(site); }, [site.primaryColor, site.headingFont]);
  React.useEffect(() => {
    if (site.siteName) document.title = site.siteName + " — " + (site.siteTagline || "Catholic Parish Directory");
  }, [site.siteName, site.siteTagline]);

  React.useEffect(() => {
    const onHash = () => setRoute((location.hash || "").replace("#", ""));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (target) => {
    if (target) location.hash = target;
    else { history.pushState("", document.title, location.pathname + location.search); }
    setRoute(target || "");
    window.scrollTo(0, 0);
  };

  const RESERVED = { "": 1, map: 1, dioceses: 1, admin: 1 };
  const church = !RESERVED[route] ? parishes.find((c) => c.id === route) : null;

  let body;
  if (church) body = <window.ChurchPage church={church} navigate={navigate} admin={authed} />;
  else if (route === "admin") body = authed
    ? <window.AdminView navigate={navigate} parishes={parishes} />
    : <window.AdminLogin navigate={navigate} />;
  else if (route === "dioceses") body = <window.DiocesesView navigate={navigate} parishes={parishes} />;
  else body = <window.DirectoryView navigate={navigate} tweaks={{ homeLayout: "split", cardStyle: "border" }} parishes={parishes} mode={route === "map" ? "map" : "directory"} />;

  return (
    <div className="app">
      <Topbar route={church ? "" : route} onNav={navigate} count={parishes.length} authed={authed} site={site} />
      <main style={{ flex: 1 }}>
        <div className="view-anim" key={route || "home"}>
          {body}
        </div>
      </main>
      <footer className="foot">
        <div className="foot-inner">
          <div className="brand" style={{ cursor: "default" }}>
            <div className="brand-mark" style={{ width: 32, height: 32 }}><img src={site.logoUrl || "assets/logo.jpg"} alt={(site.siteName || "Ecclesia Kenya") + " logo"} /></div>
            <div className="brand-text"><div className="t1" style={{ fontSize: 16 }}>{site.siteName || "Ecclesia Kenya"}</div></div>
          </div>
          <div className="f-note">{site.footerNote || "A directory of Catholic parishes, cathedrals and shrines across the dioceses of Kenya."}</div>
          {authed && (
            <a className="f-admin" href="#admin" onClick={(e) => { e.preventDefault(); navigate("admin"); }}><window.I.gear style={{ width: 14, height: 14 }} /> Parish administration</a>
          )}
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

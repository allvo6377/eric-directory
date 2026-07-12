/* dioceses.jsx — browse parishes grouped by diocese (shared via window) */

function DioParishCard({ c, navigate }) {
  const s = window.nextSunday(c.massTimes);
  return (
    <div className="dio-card" onClick={() => navigate(c.id)}>
      <div className="dio-card-thumb"><window.Thumb src={c.heroImage || c.images[0]} label={c.gallery[0]} /></div>
      <div className="dio-card-body">
        <div className="dio-card-type">{c.type}</div>
        <div className="dio-card-name">{c.name}</div>
        <div className="dio-card-meta"><window.I.pin style={{ width: 12, height: 12 }} /> {c.city || c.county || "—"}</div>
        {s && <div className="dio-card-meta"><window.I.clock style={{ width: 12, height: 12, color: "var(--primary)" }} /> {s.day === "Sunday" ? "Sun" : s.day} {s.time}{s.language ? " · " + s.language : ""}</div>}
      </div>
      <span className="dio-card-go"><window.I.chev style={{ transform: "rotate(-90deg)" }} /></span>
    </div>
  );
}

function DiocesesView({ navigate, parishes }) {
  const all = parishes || window.ParishStore.getAll();
  const site = window.SiteContent ? window.SiteContent.get() : {};

  const groups = React.useMemo(() => {
    const map = {};
    all.forEach((c) => { (map[c.diocese] = map[c.diocese] || []).push(c); });
    return Object.entries(map)
      .map(([name, churches]) => {
        const seat = churches.find((c) => /Cathedral|Basilica/i.test(c.type)) || churches[0];
        const counties = window.uniqueSorted(churches.map((c) => c.county).filter(Boolean));
        return { name, churches, seat, counties, isArch: /^Archdiocese/i.test(name) };
      })
      .sort((a, b) => (a.isArch === b.isArch ? a.name.localeCompare(b.name) : a.isArch ? -1 : 1));
  }, [all]);

  const counties = window.uniqueSorted(all.map((c) => c.county).filter(Boolean)).length;

  return (
    <div className="dio-page">
      <div className="dir-hero">
        <div className="eyebrow">{site.diocesesEyebrow || "Ecclesiastical map · Kenya"}</div>
        <h1 className="serif">{site.diocesesTitle || "Browse by diocese."}</h1>
        <p>{site.diocesesLede || "The Catholic Church in Kenya is organised into archdioceses and dioceses, each led by a bishop from its cathedral. Explore the parishes within each jurisdiction below."}</p>
      </div>

      <div className="dio-stats">
        <div className="dio-stat"><div className="ds-num">{groups.length}</div><div className="ds-lbl">Dioceses &amp; archdioceses</div></div>
        <div className="dio-stat"><div className="ds-num">{all.length}</div><div className="ds-lbl">Parishes listed</div></div>
        <div className="dio-stat"><div className="ds-num">{counties}</div><div className="ds-lbl">Counties covered</div></div>
        <div className="dio-stat"><div className="ds-num">{groups.filter((g) => g.isArch).length}</div><div className="ds-lbl">Archdioceses</div></div>
      </div>

      <div className="dio-wrap">
        {groups.map((g, gi) => (
          <section className="dio-group" key={g.name} style={{ "--i": gi }}>
            <div className="dio-group-head">
              <div>
                <div className="dgh-kicker">{g.isArch ? "Archdiocese" : "Diocese"}</div>
                <h2>{g.name.replace(/^(Arch)?diocese of /i, "")}</h2>
                <div className="dgh-sub">
                  <span><window.I.cross style={{ width: 13, height: 13 }} /> Seat: {g.seat.name}{g.seat.city ? ", " + g.seat.city : ""}</span>
                  {g.counties.length > 0 && <span><window.I.pin style={{ width: 13, height: 13 }} /> {g.counties.join(", ")} County</span>}
                </div>
              </div>
              <div className="dgh-count">{g.churches.length} <span>{g.churches.length === 1 ? "parish" : "parishes"}</span></div>
            </div>
            <div className="dio-grid">
              {g.churches.map((c) => <DioParishCard key={c.id} c={c} navigate={navigate} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { DiocesesView });

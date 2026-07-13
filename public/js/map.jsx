/* map.jsx — Leaflet map components (shared via window) */

const KENYA_CENTER = [-0.6, 37.3];
const pinHTML = (active) =>
  `<div class="pin ${active ? "active" : ""}"><div class="dot"></div></div>`;

function makeIcon(active) {
  return L.divIcon({
    className: "pin-wrap",
    html: pinHTML(active),
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });
}

function popupHTML(c) {
  const s = window.nextSunday(c.massTimes);
  const meta = [c.city, s ? "Sun " + s.time + (s.language ? " (" + s.language + ")" : "") : null].filter(Boolean).join(" · ");
  const img = window.thumbUrl(c.heroImage || c.images[0], 480);
  const imgHTML = img
    ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />`
    : `<div class="ph"><span>${c.gallery[0]}</span></div>`;
  return `
    <div class="pop">
      <div class="pop-img">${imgHTML}</div>
      <div class="pop-body">
        <div class="pop-dio">${c.diocese}</div>
        <h4>${c.name}</h4>
        <div class="pop-meta">${meta || c.type}</div>
        <a class="pop-btn" data-open="${c.id}" href="#${c.id}">View parish</a>
      </div>
    </div>`;
}

/* ---------- Directory map ---------- */
function DirectoryMap({ churches, activeId, onSelect, onOpen, userLoc }) {
  const elRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const markersRef = React.useRef({});
  const userRef = React.useRef(null);

  // init
  React.useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(elRef.current, {
      center: KENYA_CENTER,
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    mapRef.current = map;
    const sizeTimer = setTimeout(() => map.invalidateSize(), 100);
    return () => {
      clearTimeout(sizeTimer);
      try { map.stop(); } catch (e) {}  // cancel in-flight pan/zoom animations
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // rebuild markers when church set changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    const bounds = [];
    churches.forEach((c) => {
      const m = L.marker([c.coords.lat, c.coords.lng], { icon: makeIcon(c.id === activeId) }).addTo(map);
      m.bindPopup(popupHTML(c), { closeButton: true, maxWidth: 260, minWidth: 240 });
      m.on("click", () => onSelect(c.id));
      m.on("popupopen", (e) => {
        const btn = e.popup.getElement().querySelector("[data-open]");
        if (btn) btn.addEventListener("click", (ev) => { ev.preventDefault(); onOpen(c.id); });
      });
      markersRef.current[c.id] = m;
      bounds.push([c.coords.lat, c.coords.lng]);
    });
    // animate:false — an animated initial fit can outlive the map when the
    // user navigates away immediately (Leaflet "_leaflet_pos" crash)
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [44, 44], maxZoom: 11, animate: false });
    else if (bounds.length === 1) map.setView(bounds[0], 13, { animate: false });
    // eslint-disable-next-line
  }, [churches.map((c) => c.id).join(",")]);

  // user location marker
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userRef.current) { userRef.current.remove(); userRef.current = null; }
    if (userLoc) {
      const ic = L.divIcon({
        className: "user-wrap",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.3)"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      userRef.current = L.marker([userLoc.lat, userLoc.lng], { icon: ic, zIndexOffset: -10 }).addTo(map);
    }
  }, [userLoc]);

  // reflect active selection
  React.useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, m]) => {
      m.setIcon(makeIcon(id === activeId));
    });
    const map = mapRef.current;
    if (map && activeId && markersRef.current[activeId]) {
      const m = markersRef.current[activeId];
      try {
        map.panTo(m.getLatLng(), { animate: true, duration: 0.4 });
        m.openPopup();
      } catch (e) { /* map mid-teardown during fast navigation */ }
    }
  }, [activeId]);

  return <div ref={elRef} className="map-canvas" />;
}

/* ---------- Mini map (single church) ---------- */
function MiniMap({ church }) {
  const elRef = React.useRef(null);
  React.useEffect(() => {
    const map = L.map(elRef.current, {
      center: [church.coords.lat, church.coords.lng],
      zoom: 14,
      zoomControl: false, scrollWheelZoom: false, dragging: true, attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    L.marker([church.coords.lat, church.coords.lng], { icon: makeIcon(true) }).addTo(map);
    const sizeTimer = setTimeout(() => map.invalidateSize(), 120);
    return () => {
      clearTimeout(sizeTimer);
      try { map.stop(); } catch (e) {}
      map.remove();
    };
  }, [church.id]);
  return <div ref={elRef} style={{ width: "100%", height: "100%" }} />;
}

Object.assign(window, { DirectoryMap, MiniMap });

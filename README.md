# Ecclesia Kenya — Catholic Parish Directory

A public directory of Catholic parishes, cathedrals, basilicas and shrines across the
dioceses of Kenya: live search, diocese/language filters, "nearest to me", an interactive
map, rich parish pages — plus a **hidden, server-authenticated admin area** where every
piece of content (text *and* images) can be edited.

Built from the high-fidelity design in the Claude Design project
(*Church Directory.html*), productionized for **Truehost.co.ke shared hosting**
(plain PHP 8 + JSON-file storage — no database or build step required).

| | |
|---|---|
| Public site | `https://caap.or.ke/` |
| Per-parish share/SEO pages | `https://caap.or.ke/p/<parish-id>` *(server-rendered: real titles, OpenGraph previews, schema.org data)* |
| Sitemap / robots | `https://caap.or.ke/sitemap.xml` · `/robots.txt` |
| Hidden admin sign-in | `https://caap.or.ke/#admin` *(no visible link — bookmark it)* |
| One-time setup | `https://caap.or.ke/api/setup.php` *(sets the admin password, then locks itself)* |

> The canonical domain lives in one place: `CANONICAL_BASE` in `public/api/bootstrap.php`
> (plus the static tags in `public/index.html` and `public/robots.txt`).

## Feature summary

**Visitors**
- Browse/search parishes with instant typeahead (keyboard-navigable)
- Filter by diocese and Mass language; sort by distance ("Nearest to me")
- Interactive Leaflet map (CARTO tiles) synced with the result list
- Browse by diocese/archdiocese with stats
- Parish pages: Mass times, confessions/adoration, sacraments & ministries,
  photo gallery, clergy, events, contacts, office hours, mini-map, directions
- **Share** any parish (WhatsApp-ready `/p/<id>` link with photo preview)
- **Suggest an update** on any parish page — corrections go to a moderated
  admin queue (honeypot + rate-limited, no accounts needed)
- Mobile menu (hamburger) for phone-size screens

**Admin (hidden behind `#admin`, server-side sessions)**
- Add / edit / delete parishes (full-schema form)
- Bulk **CSV import** with validation preview (sample: 117 Nairobi parishes bundled)
- **Auto-fill photos** from Wikimedia Commons (curated + relevance-filtered live search)
- **Upload images** anywhere: parish hero/gallery (buttons or drag-and-drop onto the
  page itself), and the site logo
- **Site settings**: every fixed text on the site (brand name, tagline, hero copy for all
  three views, footer), logo, primary color, heading font
- Change the admin password from the UI

## Repository layout

```
public/                    ← DEPLOY THIS FOLDER (contents → public_html on Truehost)
  index.html               entry point (React 18 + Babel standalone + Leaflet, all vendored)
  styles.css               design tokens + public styling (from the design handoff)
  styles-admin.css         admin styling
  image-slot.js            <image-slot> web component: admin drag-drop → server upload
  js/
    data.js                sample dataset (seed source only — live data is server-side)
    store.js               ParishStore: server-backed cache + CSV parse + normalize
    auth.js                AdminAuth: fetch-based session auth (replaces prototype gate)
    site.js                SiteContent: editable site text/branding
    upload.js              client-side image compression + upload helper
    imagesearch.js         Wikimedia Commons photo search
    ui.jsx …​ app.jsx       React views (directory, map, dioceses, parish, admin)
  api/
    bootstrap.php          shared: sessions, JSON storage w/ locking, normalization
    auth.php               login / logout / change password (bcrypt, rate-limited)
    parishes.php           parish CRUD + import + reset (admin-gated writes)
    site.php               editable site content (admin-gated writes)
    upload.php             image upload (validated, non-executable directory)
    setup.php              one-time admin password setup
    seed.json              pre-normalized sample data (regenerate: node scripts/build-seed.js)
  data/                    runtime JSON (auto-created; protected by .htaccess; gitignored)
  uploads/                 admin-uploaded images (script execution disabled; gitignored)
  vendor/                  self-hosted React, Babel, Leaflet (no CDN dependency)
  sample/                  sample CSV for the import feature
  assets/logo.jpg          default logo (replaceable in Site settings)
scripts/build-seed.js      regenerates api/seed.json from js/data.js
docs/                      full documentation (see below)
```

## Documentation

| Doc | What's inside |
|---|---|
| [docs/PROJECT-WORKFLOW.md](docs/PROJECT-WORKFLOW.md) | The entire project workflow: design → implementation → verification → deployment → content operations |
| [docs/DEPLOYMENT-TRUEHOST.md](docs/DEPLOYMENT-TRUEHOST.md) | Step-by-step Truehost.co.ke (cPanel) deployment, SSL, backups, troubleshooting |
| [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) | Non-technical guide for the site administrator: how to edit everything |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Suggested additions & improvements, prioritized |

## Run locally

```bash
cd public
php -S localhost:8080
# open http://localhost:8080          → public site
# open http://localhost:8080/api/setup.php   → set an admin password (first run)
# open http://localhost:8080/#admin   → sign in
```

Requires PHP 8.0+. No composer, no npm.

**Editing the front-end:** production loads a precompiled bundle
(`js/build/app.bundle.js`) so visitors never download Babel. After changing any
`.jsx` file, rebuild it (uses the vendored Babel — no npm install):

```bash
node scripts/build-js.js
```

For build-free live editing, open `index-dev.html` instead — it compiles the raw
`.jsx` in the browser exactly like the design prototype.
(`node scripts/build-seed.js` regenerates the sample-data seed after editing `js/data.js`.)

## Security model (summary)

- Password verified **server-side** (`password_hash`/`password_verify`, bcrypt);
  stored in `data/admin.json`, which Apache/LiteSpeed refuses to serve.
- Sessions: HttpOnly, SameSite=Lax cookie; regenerated on login; login rate-limited
  (8 failures → 15-minute lock per IP).
- All writes require the session **and** an `X-Requested-With: fetch` header (CSRF guard).
- Uploads: bytes verified as a real image server-side, random filename, whitelisted
  extension, stored in a directory with script execution disabled.
- The admin UI is hidden (no public link) — but hiding is *convenience*, the session
  check is the actual security boundary; every write endpoint enforces it.

## Data

⚠️ The bundled sample data mixes real parish names/locations with **AI-generated
placeholder** Mass times, contacts and clergy (`*.example` domains mark fakes).
Replace with verified data via the admin (CSV import / editing) before launch.
Parish photos come from Wikimedia Commons (CC-licensed — keep attribution in mind).

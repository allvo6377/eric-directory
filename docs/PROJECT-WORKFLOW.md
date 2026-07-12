# Project Workflow — Ecclesia Kenya Parish Directory

This document records the **entire workflow** of the project, end to end: where the
design came from, every implementation decision and why it was made, how the result
was verified, how it gets deployed to Truehost, and how content is operated after
launch. Read this first if you are new to the project.

---

## 1. Overview

| Stage | Output |
|---|---|
| 1. Design | High-fidelity prototype in Claude Design (*Church Directory.html* + handoff bundle) |
| 2. Architecture | Decision: keep the prototype front-end, add a PHP + JSON backend suited to Truehost shared hosting |
| 3. Implementation | Server-side auth, server-side data, editable site content, real image uploads |
| 4. Verification | PHP dev server + scripted Chromium run through every user journey |
| 5. Deployment | Upload `public/` to Truehost cPanel, run one-time setup |
| 6. Content operations | Admin replaces sample data with verified parish data |

---

## 2. Stage 1 — Design (Claude Design project)

The design lives in the Claude Design project
(`https://claude.ai/design/p/e67d1e69-13ec-4adc-80c1-a6e0a83e09a0`, file
*Church Directory.html*) and shipped as a handoff bundle
(`design_handoff_church_directory/`) containing:

- A **working React prototype** (React 18 UMD + Babel standalone, hash-routed SPA)
- `styles.css` / `styles-admin.css` with the complete design-token system
  (cobalt `#1462b8` + emerald `#12a06a` brand, Newsreader/Hanken Grotesk type,
  radius/shadow scales, all animations)
- A complete **parish data schema** (see §4.3)
- A 12-parish sample dataset + a 117-row Nairobi CSV for the import feature
- The Ecclesia Kenya logo
- A README that explicitly flagged two things as **prototype-only**:
  1. the client-side password gate (`auth.js` checked the password *in the browser*), and
  2. `localStorage` persistence (edits only existed in the editor's own browser).

Everything in the design was imported into this repo **verbatim where possible** —
views, styling, animations, icons, interactions are pixel-identical to the design.
The only changed files are the ones the design itself said must change for
production (auth, storage) plus the additions the client asked for (editable site
text/images, hidden login, uploads).

## 3. Stage 2 — Architecture decisions

### 3.1 Constraint: hosting on Truehost.co.ke

Truehost Kenya's standard offering is **cPanel shared hosting: Apache/LiteSpeed +
PHP + MySQL**. There is no Node.js runtime on the common plans, so a Next.js
rewrite (the handoff's "greenfield" suggestion) would have forced a VPS and a much
bigger budget. The chosen architecture fits the actual constraint:

| Layer | Choice | Why |
|---|---|---|
| Front-end | The design's React SPA, served as static files; libraries **vendored** into `public/vendor/` | Zero build step; pixel-identical to the approved design; no CDN dependency (resilient on Kenyan connections, works even if unpkg is unreachable) |
| Backend | Plain **PHP 8** endpoints in `public/api/` | Runs on every cPanel plan out of the box; nothing to install |
| Storage | **JSON files** in `public/data/` (atomic writes + file locking), directory blocked by `.htaccess` | One admin, low write volume — a database adds setup friction with no benefit at this scale. Backup = download one folder. A MySQL upgrade path is documented in DEPLOYMENT-TRUEHOST.md §8 |
| Auth | PHP sessions + bcrypt (`password_hash`) | Replaces the prototype's browser-side gate, exactly as the design handoff instructed |
| Images | Browser-side downscale (canvas → WebP ≤1600px) → `api/upload.php` → `public/uploads/` | Phone photos become ~200 KB before they ever leave the admin's device — fast on mobile data, light on shared-hosting disk |

### 3.2 Why not localStorage / why every visitor sees edits

The prototype stored edits in the browser's `localStorage`, so an edit made by the
admin was invisible to everyone else. Now the server's `data/parishes.json` +
`data/site.json` are the single source of truth: the client keeps an in-memory
cache, applies mutations optimistically for a snappy UI, sends them to the API, and
**replaces its cache with the server's authoritative response** — client and server
always converge.

### 3.3 The "hidden admin" requirement

- No **Admin** link is rendered anywhere on the public site (nav and footer both).
- The admin opens `https://your-domain/#admin` directly (bookmark). Once signed
  in, an Admin link appears in the nav for convenience and disappears on sign-out.
- Hiding the door is UX, not security: the real boundary is that **every write
  endpoint checks the server-side session** — even someone who finds `#admin` or
  calls the API directly can read only what is already public.

## 4. Stage 3 — Implementation

### 4.1 What was kept verbatim from the design

`styles.css`, `styles-admin.css` (plus ~20 added lines for upload buttons/settings
modal), `ui.jsx`, `map.jsx`, `church.jsx`, `dioceses.jsx`, `admin-import.jsx`,
`admin-autofill.jsx`, `imagesearch.js`, `data.js`, the sample CSV, and the logo.

### 4.2 What changed, file by file

| File | Change |
|---|---|
| `js/auth.js` | Rewritten: fetch-based `login()/logout()/subscribe()` against `api/auth.php`; password never in the page source. Same interface, so callers barely changed |
| `js/store.js` | Persistence layer swapped from localStorage to the server API (see §3.2). Pure helpers (CSV parser, `normalize()`, validation) untouched. Added `SlotBridge`, which maps page image-slots (`hero-<id>`, `g0-<id>`…) onto parish record fields |
| `js/admin-login.jsx` | Async login; demo-password note removed |
| `js/admin.jsx` | Added **Site settings** button; async reset; copy updated ("saved on the server") |
| `js/admin-form.jsx` | Added **Upload** buttons on hero + gallery images (URL paste still works) |
| `js/app.jsx` | Tweaks panel removed (design-tool aid); theme + all fixed copy now come from Site settings; Admin nav link rendered only when signed in |
| `image-slot.js` | Rewritten: same element API, but a drop now compresses → uploads to the server → persists on the parish record. Interactive only for signed-in admins |
| **New** `js/site.js` | `SiteContent` store for editable site text/branding |
| **New** `js/upload.js` | Shared compress-and-upload helper (slots, form, settings) |
| **New** `js/admin-settings.jsx` | Site settings modal: brand, logo upload, colors, fonts, all hero copy, footer, password change |
| **New** `api/*.php` | The entire backend (bootstrap, auth, parishes, site, upload, setup) |
| **New** `scripts/build-seed.js` | Regenerates `api/seed.json` from `js/data.js` with curated cathedral photos baked in |

### 4.3 Data model

The canonical Parish shape (enforced by `normalize()` in JS **and**
`normalize_parish()` in PHP — records are normalized on both sides):

```ts
type Parish = {
  id: string;            // slug, unique ("holy-family-basilica")
  name: string;
  type: "Parish Church" | "Cathedral" | "Minor Basilica" | "Shrine" | "Chapel";
  patron: string; diocese: string; deanery: string;
  city: string; county: string; address: string; poBox: string;
  coords: { lat: number; lng: number } | null;   // null = not on map yet
  founded: number | null; tagline: string; description: string;
  priest: { name: string; title: string } | null;
  clergy: { name: string; title: string }[];
  contact: { phone: string; email: string; website: string };
  socials: Record<string, string>;
  officeHours: { days: string; hours: string }[];
  massTimes: { day: string; time: string; language: string }[];
  confessions: string; adoration: string;
  sacraments: string[]; services: string[];
  gallery: string[];     // placeholder captions
  heroImage: string;     // URL
  images: string[];      // gallery URLs (position-stable; slots address by index)
  events: { date: string; title: string; time: string }[];
  source: "seed" | "import" | "manual";
};
```

Editable **site content** keys (in `data/site.json`): `siteName`, `siteTagline`,
`logoUrl`, `footerNote`, `primaryColor`, `headingFont`, and
`{home,map,dioceses}{Eyebrow,Title,Lede}`.

### 4.4 API surface

| Endpoint | GET (public) | POST (admin session + `X-Requested-With` required) |
|---|---|---|
| `api/auth.php` | `{authed, configured}` | `login`, `logout`, `change_password` |
| `api/parishes.php` | full parish list | `add`, `update`, `remove`, `import`, `reset` — each returns the full saved list |
| `api/site.php` | site content | `{content:{…}}` whitelist-merged |
| `api/upload.php` | — | multipart image → `{url}` |
| `api/setup.php` | HTML form | one-time password creation; refuses once configured |

## 5. Stage 4 — Verification (what was actually tested)

Run locally with `php -S` and driven by scripted Chromium:

1. Home renders 12 parish cards + synced map; **no admin link** for visitors.
2. Server-edited site text and brand color visibly drive the public UI
   (headline and theme changed via the API appeared on the page).
3. Parish page: visitors get static images (0 interactive slots); a signed-in
   admin gets 9 drag-drop slots on the same page.
4. `#admin` shows the login card; wrong password → error; correct → dashboard.
5. Add parish via the form → appears in table → **confirmed present in
   `api/parishes.php` server response**. Delete → confirmed gone server-side.
6. Site settings modal edits the footer → confirmed persisted server-side.
7. Sign out → session destroyed server-side, admin link disappears.
8. API security: write without session → 401; write without the CSRF header →
   403; a PHP file disguised as PNG → rejected; `setup.php` re-run → refused;
   invalid `primaryColor` → ignored.

Re-run any time: see the commands in README §Run locally; the browser script lives
in the session scratchpad and is easy to recreate from §5's list.

## 6. Stage 5 — Deployment

Full step-by-step guide with screenshots-level detail:
**[DEPLOYMENT-TRUEHOST.md](DEPLOYMENT-TRUEHOST.md)**. Short version:

1. Zip the **contents** of `public/` → upload into `public_html` via cPanel File
   Manager → extract.
2. Visit `https://your-domain/api/setup.php`, set a strong admin password (this
   also self-locks the setup page).
3. Enable AutoSSL (Let's Encrypt) in cPanel; verify `https://` works.
4. Sign in at `https://your-domain/#admin`, open **Site settings**, set the real
   name/logo/colors, and start replacing sample data.

## 7. Stage 6 — Content operations (after launch)

The non-technical admin manual is **[ADMIN-GUIDE.md](ADMIN-GUIDE.md)**. The main loop:

1. **Replace sample data.** The bundled dataset mixes real parish names/locations
   with AI-generated placeholder schedules/contacts (`*.example` domains). Import
   the diocese's verified CSV, or edit parish by parish. Delete anything not verified.
2. **Photos.** Prefer the parish's own photos (Upload buttons / drag-and-drop).
   The Wikimedia auto-fill is a best-effort helper — review each match; keep
   attribution (CC-BY-SA) in mind for Commons photos.
3. **Backups.** Download `public_html/data/` and `public_html/uploads/`
   periodically from cPanel (that's the entire live state).

## 8. Suggested next steps

Prioritized list with effort estimates: **[ROADMAP.md](ROADMAP.md)**.

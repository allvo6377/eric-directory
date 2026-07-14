# Deploying to Truehost.co.ke (cPanel shared hosting)

This guide takes the site from this repository to a live domain on Truehost Kenya.
It assumes the common Truehost setup: a cPanel account on shared hosting with
Apache/LiteSpeed and PHP. No database is required.

---

## 1. What you need

- A Truehost hosting plan with **cPanel** and **PHP 8.0 or newer**
  (all current Truehost shared plans qualify — even the entry "Silver" tiers).
- A domain (e.g. `ecclesiakenya.co.ke`) pointed at the hosting account.
  If you bought the domain from Truehost with the hosting, this is automatic;
  otherwise point the domain's nameservers at the ones in your Truehost welcome
  email (typically `ns1.truehost.co.ke` / `ns2.truehost.co.ke`).
- The contents of this repo's `public/` folder.

## 2. Prepare the upload

On your computer, make a zip **of the contents of `public/`** (not the folder
itself): `index.html`, `styles.css`, `styles-admin.css`, `image-slot.js`,
`js/`, `api/`, `assets/`, `vendor/`, `sample/`, `data/`, `uploads/`, `.htaccess`.

> Tip (from a repo checkout): `cd public && zip -r ../site.zip . -x "data/*.json" "uploads/img_*"`
> — this keeps the folder structure but leaves out any local test data.

## 3. Upload via cPanel

1. Log in to cPanel (link + credentials are in your Truehost welcome email,
   usually `https://your-domain:2083` or via the Truehost client area).
2. Open **File Manager** → `public_html`.
   *(If this is a fresh account, delete any default placeholder `index.html`.)*
3. **Upload** → select `site.zip`.
4. Back in File Manager, right-click `site.zip` → **Extract** into `public_html`.
5. Delete `site.zip`.
6. Confirm `public_html/.htaccess` exists (File Manager → *Settings* →
   **Show hidden files (dotfiles)** if you don't see it). Also confirm
   `public_html/data/.htaccess` and `public_html/uploads/.htaccess` arrived.

## 4. Check the PHP version

cPanel → **Select PHP Version** (or *MultiPHP Manager*): choose **PHP 8.1+**
(8.0 minimum). The default extensions (json, session, fileinfo, gd) are all that's
needed and are enabled by default.

## 5. One-time admin setup

1. Visit `https://your-domain/api/setup.php`.
2. Choose a strong admin password (minimum 10 characters — use a passphrase).
3. Submit. The page confirms and **permanently disables itself**.
4. Optional hardening: delete `api/setup.php` from the server afterwards.

> Forgot the password later? In File Manager delete `public_html/data/admin.json`,
> then re-run setup.php (re-upload it first if you deleted it).

## 6. Enable HTTPS

cPanel → **SSL/TLS Status** → tick your domain → **Run AutoSSL**
(Truehost includes free Let's Encrypt certificates). When it turns green, test
`https://your-domain/`. To force HTTPS, add at the **top** of
`public_html/.htaccess`:

```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

HTTPS matters here: the admin session cookie is marked `Secure` automatically
when the site is served over HTTPS.

## 7. Smoke-test the live site

| Check | Expect |
|---|---|
| `https://caap.or.ke/` | Directory renders with sample parishes and the map |
| `https://caap.or.ke/api/parishes.php` | JSON (`{"ok":true,...}`) — auto-seeds on first hit |
| `https://caap.or.ke/data/parishes.json` | **403/404 Forbidden** (protected!) |
| `https://caap.or.ke/#admin` | Sign-in card; your password works |
| `https://caap.or.ke/p/holy-family-basilica` | Server-rendered parish page (title, photo, Mass times) |
| `https://caap.or.ke/sitemap.xml` | XML listing `/` and every `/p/…` parish page |
| Paste a `/p/…` link into WhatsApp | Preview shows the parish name + photo |
| Admin → add a test parish → view in another browser | The change is visible to everyone |
| Admin → Site settings → change the headline | Homepage updates for everyone |

**Then register with Google:** [Search Console](https://search.google.com/search-console)
→ add property `caap.or.ke` → submit `https://caap.or.ke/sitemap.xml`. Parishes
become findable for searches like *"Mass times Kangemi"* within days.

> If the domain ever changes, update `CANONICAL_BASE` in `api/bootstrap.php`,
> the OG/canonical tags in `index.html`, and the Sitemap line in `robots.txt`.

If `data/parishes.json` is **downloadable**, your host is ignoring `.htaccess` —
contact Truehost support to enable it, or move the data directory above the web
root (adjust `DATA_DIR` in `api/bootstrap.php`).

## 7b. Multiple domains → one canonical site (caap.or.ke)

If you own several domains (a secondary domain, a `.com` as well as the
`.or.ke`, `www`, an old name…) and want them all to land on **one** site,
there are two halves: **cPanel** (make the domains reach this hosting) and the
**`.htaccess`** (redirect them to the canonical address). The redirect is
already built into `public/.htaccess` — you only need the cPanel half.

### The important cPanel choice: Alias, not Addon

When you attach an extra domain in cPanel you pick a type, and it matters:

| Type | Document root | Use it when |
|---|---|---|
| **Alias** (a.k.a. *Parked domain*) | **Same** `public_html` as the main site | ✅ You want the domain to **redirect to caap.or.ke**. It hits the main `.htaccess`, so the redirect below just works. **This is what you want.** |
| **Addon domain** | A **separate** subfolder (e.g. `public_html/otherdomain.com/`) | You want that domain to host a *different* site. It does **not** hit the main `.htaccess`, so the redirect won't fire unless you add a redirect in its own folder. |

**So: add every funnel-to-caap domain as an _Alias_** — cPanel → **Aliases**
(older cPanel: *Parked Domains*) → type the domain → **Add Domain**. Point the
domain's nameservers/DNS at Truehost first if it isn't already.

### Then: SSL for every domain (one-time, required)

A browser visiting `https://otherdomain.com` completes the TLS handshake
**before** any redirect runs, so each domain needs its own certificate or the
redirect is never reached. cPanel → **SSL/TLS Status** → tick **all** domains →
**Run AutoSSL**. Wait for every row to go green. (The `.htaccess` deliberately
excludes `/.well-known/` so AutoSSL validation is never redirected away.)

### What the redirect does (already in `.htaccess`)

Once the domains are Aliases with SSL, `public/.htaccess` sends everything to
`https://caap.or.ke` in a single 301 hop:

- `http://caap.or.ke/…` → `https://caap.or.ke/…` (forces HTTPS)
- `http(s)://www.caap.or.ke/…` → `https://caap.or.ke/…`
- `http(s)://any-other-domain.com/foo` → `https://caap.or.ke/foo` (path kept)
- `https://caap.or.ke/…` → served (no redirect)

301 = "permanent", so Google transfers ranking to the canonical domain and
stops indexing the duplicates.

### If a domain is already an Addon (separate folder)

Either remove it and re-add it as an Alias, **or** drop a one-line
`.htaccess` into its folder (`public_html/otherdomain.com/.htaccess`):

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^ https://caap.or.ke%{REQUEST_URI} [L,R=301]
```

### Changing the canonical domain later

If caap.or.ke is ever replaced, update the domain in **four** places:
`public/.htaccess` (two `caap.or.ke` lines), `CANONICAL_BASE` in
`api/bootstrap.php`, the `<link rel="canonical">`/`og:*` tags in
`index.html`, and the `Sitemap:` line in `robots.txt`.

### Verify

| Try in a browser | Expect |
|---|---|
| `http://caap.or.ke` | jumps to `https://caap.or.ke` |
| `https://www.caap.or.ke` | jumps to `https://caap.or.ke` |
| `https://<secondary-domain>/p/holy-family-basilica` | jumps to `https://caap.or.ke/p/holy-family-basilica` |
| Browser padlock on every domain | valid (AutoSSL done) |

## 8. Deploying updates

**Content updates need no deployment at all.** Parishes, site text, photos,
colors — the admin edits them live at `/#admin` and they're stored on the
server. Deployment only applies to **code** changes (files in this repository).

### 8.1 The pre-deploy checklist (on your computer)

1. Make the code change.
2. If you touched any `.jsx` file → `node scripts/build-js.js`
   (regenerates `public/js/build/app.bundle.js`).
   If you touched `js/data.js` → `node scripts/build-seed.js`.
3. **Bump the cache version** in `public/index.html`: change every `?v=2` to
   `?v=3` (one search-and-replace). Static assets are browser-cached for 7
   days; without the bump, returning visitors keep the old CSS/JS.
4. Test locally: `cd public && php -S localhost:8080`.
5. Commit and push to GitHub.

### 8.2 Getting it onto Truehost — pick one

**A. cPanel Git deployment (recommended — one-time setup, then two clicks).**

One-time setup (exact values for this project):

1. cPanel → **Git™ Version Control** → **Create**.
2. Turn ON *Clone a Repository* and enter:
   - **Clone URL:** `https://github.com/allvo6377/eric-directory.git`
     (the repo is public — no deploy key or password needed)
   - **Repository Path:** `repositories/eric-directory` (cPanel prefixes your home dir)
   - **Repository Name:** `eric-directory`
3. **Create.** cPanel clones the repo and checks out the default branch —
   make sure it is on **`main`** (Manage → Checked-Out Branch → `main`).
   `main` is the stable deploy branch; day-to-day work happens on feature
   branches and is merged into `main` only when it's ready to go live.

Deploying after that, every time:

1. cPanel → Git™ Version Control → **Manage** next to `eric-directory`.
2. **Pull or Deploy** tab → **Update from Remote** (fetches the latest `main`).
3. **Deploy HEAD Commit** — this runs the bundled `.cpanel.yml`, which rsyncs
   `public/` into `public_html` and **never touches** the live `data/` and
   `uploads/` folders.

**B. Zip re-upload (no git on the server).**
`cd public && zip -r ../site.zip . -x "data/*" "uploads/*"` → File Manager →
upload into `public_html` → Extract → overwrite. The exclusions protect live
content.

**C. Single-file edits.**
For a one-line fix, File Manager (or FTP) → replace just that file. Fine
occasionally; easy to drift from the repo if it becomes a habit — always
mirror the same change in git.

**The one rule for all methods:** never overwrite `public_html/data/` or
`public_html/uploads/` — that's the live database and photo store. (Method A
and the zip exclusions in B enforce this for you.)

## 8b. Ongoing operations

- **Backups:** cPanel → File Manager → compress and download
  `public_html/data` and `public_html/uploads` (that's the entire live state);
  or use cPanel's **Backup** tool. Do this after any big content session, and at
  least monthly. Truehost's own backups exist, but keep your own copy.
- **Password change:** Admin → Site settings → *Admin password* section.
- **Disk usage:** uploads are auto-compressed to ≤1600px WebP (~100–300 KB each),
  so even hundreds of photos stay small.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| Blank page | Browser dev-tools console; usually a partially-uploaded `vendor/` — re-extract the zip |
| "Admin account is not set up yet" on login | Run `api/setup.php` (step 5) |
| 500 errors from `api/*` | Check PHP version ≥ 8.0 (step 4); check cPanel → *Errors* log |
| Login always "Too many failed attempts" | Wait 15 min, or delete `data/ratelimit.json` in File Manager |
| Images upload but don't display | Confirm `uploads/` extracted with its `.htaccess`; check file permissions are 644 (File Manager → Permissions) |
| Map tiles don't load | The map uses CARTO's free tile service — verify the browser can reach `basemaps.cartocdn.com` (rarely blocked); consider an alternate OSM tile URL in `js/map.jsx` |
| Slow first paint on 3G | Expected cost of Babel-standalone (~3 MB, cached after first visit). See ROADMAP §"Precompile JSX" for the fix that removes it |

## 10. Optional: MySQL upgrade path

JSON files are deliberate (simple, portable, zero-config) and fine for one admin
and a few thousand parishes. If the site later needs multiple concurrent editors
or heavy write traffic:

1. Create a database + user in cPanel → **MySQL® Databases**.
2. Add a small PDO layer replacing `load_parishes()/save_parishes()` in
   `api/bootstrap.php` (one `parishes` table with a JSON column keyed by `id`
   is enough — the normalize step already guarantees the shape).
3. One-time migration: `json_decode(data/parishes.json)` → INSERT loop.

Nothing in the front-end changes — it only ever talks to the same API endpoints.

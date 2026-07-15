# Roadmap — Suggested Additions & Improvements

Prioritized suggestions for evolving the directory beyond the delivered scope.
Effort: **S** = hours, **M** = a few days, **L** = a week or more.

---

## Quick wins (do these first)

| # | Suggestion | Why | Effort |
|---|---|---|---|
| 1 | ~~**Precompile the JSX**~~ ✅ **DONE** — `scripts/build-js.js` builds `js/build/app.bundle.js` (146 KB replaces 3 MB Babel); `index-dev.html` keeps the no-build dev flow | Biggest single performance win | — |
| 2 | **Photo credits/attribution field** per image | Wikimedia Commons photos are CC-BY-SA — a small caption ("Photo: A. Author, CC BY-SA") displayed on the gallery satisfies the license cleanly | S |
| 3 | ~~**SEO & sharing tags**~~ ✅ **DONE** — server-rendered `/p/<id>` pages with OG + schema.org CatholicChurch data, live `sitemap.xml`, `robots.txt`, canonical/OG on the homepage, Share button in the app | Parishes findable on Google; WhatsApp previews | — |
| 4 | ~~**"Suggest an update" button**~~ ✅ **DONE** — public form (honeypot + rate limit) → admin Suggestions queue with resolve/delete | Crowdsourced corrections, no edit rights given away | — |
| 5 | **Audit log** (`data/audit.log`: timestamp + action + parish id) | Cheap accountability and debugging for content changes | S |

## Product features

| # | Suggestion | Why | Effort |
|---|---|---|---|
| 6 | **"Mass near me now"** — combine geolocation with parsed Mass times to answer "where can I attend the next Mass?" | Turns the directory from reference into a daily-use tool; the data is already structured (day/time/language) | M |
| 7 | **Events calendar** — per-parish events are now real, dated and admin-editable (date picker + auto-hide of past events, on the parish page and in the form) ✅. *Remaining:* an all-parishes calendar view + iCal feed | Feasts, harambees, confirmations; drives repeat visits | M |
| 8 | **Swahili UI toggle** — the site-content system already externalizes copy; add a second language set and a switcher | Serves the actual congregation better | M |
| 9 | **Printable parish page / QR poster** — print stylesheet + a QR code linking to the parish page | Parishes pin these on notice boards; free marketing loop | S |
| 10 | **Diocese/deanery landing pages** with their own editable intro text (reuse the site-content mechanism per diocese) | Dioceses will want to own their section's voice | M |
| 11 | **WhatsApp share/contact buttons** on parish pages | WhatsApp is the dominant channel in Kenya; one-tap "share this parish" | S |

## Platform & operations

| # | Suggestion | Why | Effort |
|---|---|---|---|
| 12 | **Multiple admin accounts with roles** (per-diocese editors, one super-admin) | Scales content maintenance beyond one person; needs the MySQL upgrade (DEPLOYMENT-TRUEHOST.md §10) first | L |
| 13 | **Scheduled off-site backups** — cPanel cron: nightly zip of `data/` + `uploads/` emailed or pushed to Google Drive | Protects live content beyond manual backups | S |
| 14 | **Image optimization pass on the server** (GD re-encode + thumbnail sizes) | Serve 92px thumbs on cards instead of the 1600px hero; snappier lists on mobile data | M |
| 15 | **Progressive Web App** (manifest + service worker caching the shell & data) | "Install" on phones; browsing works offline after first visit — valuable with intermittent connectivity | M |
| 16 | **Analytics** (self-hosted Plausible/GoatCounter or Truehost's AWStats) | Learn what people search for; informs which parishes need data attention | S |

## Longer-term

| # | Suggestion | Why | Effort |
|---|---|---|---|
| 17 | **Cover all 26+ Kenyan (arch)dioceses** via a data-collection drive using the CSV import + suggestion queue (#4) | The real moat is complete, verified data — the tooling for it is already built | L (ongoing) |
| 18 | **Public REST/JSON feed** (documented, read-only) | Lets diocesan websites and apps embed their own parish lists; positions the directory as national infrastructure | S |
| 19 | **Framework migration** (Next.js + Postgres, as the design handoff sketched) | Only worth it if requirements outgrow shared hosting (SSR SEO at scale, many editors, search API). The parish schema and API shapes carry over unchanged | L |

## Explicitly out of scope (and why)

- **User accounts for visitors** — no visitor-facing feature needs them; they add
  GDPR/Kenya DPA obligations for no benefit.
- **Comments/reviews** — moderation burden on a volunteer admin; the suggestion
  queue (#4) captures the useful part safely.
- **Heavy CMS (WordPress etc.)** — would discard the bespoke design and add a
  plugin-security treadmill; the built-in admin already covers the editing needs.

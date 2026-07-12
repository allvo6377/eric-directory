# Administrator's Guide — Ecclesia Kenya

A practical manual for the person who runs the directory. No technical knowledge
needed beyond using a web browser.

---

## 1. Signing in (the hidden door)

There is **no "Admin" link on the website** — visitors never see one. To sign in:

1. Go to **`https://your-domain/#admin`** (bookmark this address).
2. Enter the admin password → **Sign in**.

While you're signed in, an **Admin** link appears in the top navigation for quick
access, and every parish page becomes editable for you. It all disappears again
when you sign out (top right of the admin page). Closing the browser also signs
you out.

> After 8 wrong password attempts the login locks for 15 minutes — this protects
> against guessing. If you've genuinely forgotten the password, see
> DEPLOYMENT-TRUEHOST.md §5.

## 2. The dashboard

`#admin` shows:

- **Stats** — total parishes, how many are on the map, have photos, were imported.
- **The parish table** — search box + diocese/source filters. Click a parish name
  to view its public page; use the pencil to **edit**, the bin to **delete**.
- **Action buttons** (top right):
  - **Site settings** — edit the site's own text, logo, colors (see §4)
  - **Auto-fill photos** — fetch parish photos from Wikimedia Commons (see §6)
  - **Import CSV** — bulk-add parishes from a spreadsheet (see §5)
  - **Add parish** — create one parish with the full form
  - **Sign out**

## 3. Editing a parish (text)

**Add parish** or the pencil icon opens the same form. Everything is optional
except the name:

- **Identity** — name, type (parish/cathedral/basilica/shrine/chapel), patron
  saint, year founded, diocese, deanery.
- **Location** — area/town, county, address, P.O. Box, and **coordinates**.
  Coordinates put the parish on the map: in Google Maps, right-click the church →
  the first menu row shows numbers like `-1.28837, 36.82334` — click to copy,
  then paste the first number into *lat*, the second into *lng*.
- **Contact** — phone, email, website.
- **Mass & service times** — one row per Mass: day, time, language.
  *Add time* for more rows. Confession and Adoration have their own fields.
- **Office hours**, **Clergy** — add rows the same way.
- **Photos** — see §6.
- **Description** — a paragraph about the parish. If left blank, a simple
  sentence is generated automatically.

**Save changes** — the edit is live for every visitor immediately.

## 4. Editing the site's own text and branding

**Admin → Site settings** lets you change everything "fixed" on the site:

- **Site name and tagline** (shown in the header, footer, and browser tab)
- **Logo** — paste an image address or click **Upload** (a square image looks best)
- **Primary color** — the buttons/links/map-pins color (pick a swatch or paste a
  hex code like `#1462b8`)
- **Heading font** — Newsreader, Spectral, or Lora
- **Headline, eyebrow and intro paragraph** for each of the three public pages
  (Directory, Map, Dioceses)
- **Footer note**

**Save settings** applies instantly, site-wide. The **Admin password** section at
the bottom lets you change your password (you need the current one).

## 5. Importing many parishes at once (CSV)

If the diocese has a spreadsheet of parishes:

1. In Excel/Google Sheets, keep one parish per row with headers like:
   `Name, Area, Deanery, Diocese, County, P. O. Box, Physical Address,
   Coordinates, Telephone, email, Website, Sunday, Weekdays, Confession,
   Adoration, Parish Priest, Office Hours`
   — *Sunday*/*Weekdays* cells can hold text like `7:00 am English; 9:00 am Kiswahili`
   and the times/languages are split automatically. *Coordinates* looks like
   `-1.28837, 36.82334`.
2. Download/export as **CSV**.
3. **Admin → Import CSV** → drag the file in.
4. Review the **preview** (rows with warnings still import — you can complete
   them later by editing).
5. **Import**. A bundled example (117 Nairobi parishes) is available via
   *"Use bundled sample"* to see the expected format.

## 6. Photos

Three ways, all end up saved on the server and visible to everyone:

1. **Drag & drop on the parish page** *(easiest)* — while signed in, open any
   parish page. Every photo frame (big hero, side images, the gallery) accepts a
   dragged-in image file, or click an empty frame to browse. Hover a filled frame
   for **Replace / Remove**. Photos are automatically shrunk for the web before
   uploading, so phone photos are fine.
2. **Upload buttons in the parish form** — next to the hero image and each
   gallery row.
3. **Auto-fill from the web** — *Admin → Auto-fill photos* searches Wikimedia
   Commons (a free, openly licensed photo archive) for each parish. Matches are
   best-effort: **review them**, and replace any that look wrong. Commons photos
   are typically CC-licensed; if you keep them, it's good practice to credit the
   photographer (see ROADMAP for a built-in credits feature).

## 7. Replacing the sample data (important, before launch)

The site ships with 12 sample parishes. Their names, dioceses and locations are
real, but **Mass times, phone numbers, emails and clergy names are illustrative
placeholders** (fake addresses end in `.example`). Before going live:

1. Import or enter your verified data (§3, §5).
2. Delete or correct every sample entry you haven't verified —
   or use **Reset to sample** *only* if you want to start over from the samples.

## 8. Safety notes

- Deleting a parish can't be undone (except by re-entering it or restoring a backup).
- **Reset to sample** wipes *all* your edits and restores the original 12 samples —
  it asks for confirmation; be sure.
- Ask whoever manages the hosting to download a backup of the `data` and
  `uploads` folders after big editing sessions (DEPLOYMENT-TRUEHOST.md §8).

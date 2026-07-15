<?php
/**
 * parish.php — server-rendered parish page at /p/<id> (see .htaccess rewrite).
 *
 * The React app uses hash routes (#holy-family-basilica), which crawlers and
 * link-preview scrapers cannot see. These pages give every parish a REAL URL:
 *  - Google indexes them ("Mass times <parish> <town>")
 *  - WhatsApp/Facebook show a proper title + photo when a parish is shared
 *  - schema.org CatholicChurch structured data for rich results
 * Each page links (and offers a button) into the full interactive app.
 */

require __DIR__ . '/api/bootstrap.php';

$id = $_GET['id'] ?? '';
$parish = null;
if (preg_match('/^[a-z0-9-]{1,80}$/', (string)$id)) {
    foreach (load_parishes() as $c) {
        if (($c['id'] ?? '') === $id) { $parish = $c; break; }
    }
}

$site = load_json_file(data_path('site.json'), []);
$siteName = is_array($site) && !empty($site['siteName']) ? $site['siteName'] : 'Ecclesia Kenya';
$logo = is_array($site) && !empty($site['logoUrl']) ? $site['logoUrl'] : 'assets/logo.jpg';
// a site-relative logo needs a leading slash here (this page lives at /p/<id>);
// an absolute http(s) logo is used as-is.
$logoSrc = preg_match('#^https?://#i', $logo) ? $logo : '/' . ltrim($logo, '/');

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

if (!$parish) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Parish not found — ' . h($siteName) . '</title>'
       . '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="3;url=/">'
       . '</head><body style="font-family:system-ui;text-align:center;padding:80px 20px">'
       . '<h1>Parish not found</h1><p>Taking you to <a href="/">the directory</a>…</p></body></html>';
    exit;
}

$name    = $parish['name'] ?? '';
$type    = $parish['type'] ?? 'Parish Church';
$diocese = $parish['diocese'] ?? '';
$city    = $parish['city'] ?? '';
$county  = $parish['county'] ?? '';
$address = $parish['address'] ?? '';
$coords  = $parish['coords'] ?? null;
$contact = $parish['contact'] ?? [];
$mass    = $parish['massTimes'] ?? [];
$hero    = absolute_url($parish['heroImage'] ?? '');
$pageUrl = CANONICAL_BASE . '/p/' . $parish['id'];

$sundayBits = [];
foreach ($mass as $m) {
    if (($m['day'] ?? '') === 'Sunday') $sundayBits[] = trim(($m['time'] ?? '') . (!empty($m['language']) ? ' (' . $m['language'] . ')' : ''));
}
$desc = $name . ' — ' . $type . ' in ' . ($city ?: $county ?: 'Kenya') . ', ' . $diocese . '.'
      . ($sundayBits ? ' Sunday Mass: ' . implode(', ', array_slice($sundayBits, 0, 4)) . '.' : '')
      . ' Mass times, contacts and directions.';
$desc = mb_substr($desc, 0, 300);

/* schema.org structured data */
$ld = [
    '@context' => 'https://schema.org',
    '@type'    => 'CatholicChurch',
    'name'     => $name,
    'url'      => $pageUrl,
];
if ($hero) $ld['image'] = $hero;
if (!empty($contact['phone'])) $ld['telephone'] = $contact['phone'];
if (!empty($contact['email'])) $ld['email'] = $contact['email'];
if (!empty($contact['website'])) $ld['sameAs'] = (preg_match('#^https?://#', $contact['website']) ? '' : 'https://') . $contact['website'];
$addr = array_filter(['streetAddress' => $address, 'addressLocality' => $city, 'addressRegion' => $county]);
if ($addr) $ld['address'] = ['@type' => 'PostalAddress', 'addressCountry' => 'KE'] + $addr;
if (is_array($coords) && isset($coords['lat'], $coords['lng'])) {
    $ld['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => $coords['lat'], 'longitude' => $coords['lng']];
}

header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= h($name) ?> — Mass Times &amp; Contacts | <?= h($siteName) ?></title>
  <meta name="description" content="<?= h($desc) ?>" />
  <link rel="canonical" href="<?= h($pageUrl) ?>" />
  <link rel="icon" type="image/jpeg" href="<?= h($logoSrc) ?>" />
  <meta name="theme-color" content="#1462b8" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="<?= h($siteName) ?>" />
  <meta property="og:title" content="<?= h($name) ?> — <?= h($type) ?>, <?= h($city ?: 'Kenya') ?>" />
  <meta property="og:description" content="<?= h($desc) ?>" />
  <meta property="og:url" content="<?= h($pageUrl) ?>" />
  <?php if ($hero): ?><meta property="og:image" content="<?= h($hero) ?>" /><?php endif; ?>
  <meta name="twitter:card" content="<?= $hero ? 'summary_large_image' : 'summary' ?>" />

  <script type="application/ld+json"><?= json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css?v=10" />
  <style>
    .sp-wrap { max-width: 760px; margin: 0 auto; padding: 28px 24px 64px; }
    .sp-hero { border-radius: 20px; overflow: hidden; border: 1px solid var(--line); background: var(--bg-sink); margin: 18px 0 26px; }
    .sp-hero img { width: 100%; max-height: 380px; object-fit: cover; display: block; }
    .sp-open { display: flex; gap: 10px; flex-wrap: wrap; margin: 26px 0; }
    .sp-meta { color: var(--ink-3); font-size: 15px; margin-top: 6px; }
    .sp-sec { font-family: var(--serif); font-size: 21px; margin: 30px 0 12px; }
    .sp-kv { font-size: 15px; padding: 6px 0; }
    .sp-kv b { display: inline-block; min-width: 110px; color: var(--ink-3); font-weight: 600; }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="brand-bar"></div>
      <div class="topbar-inner">
        <a class="brand" href="/" style="text-decoration:none">
          <div class="brand-mark"><img src="<?= h($logoSrc) ?>" alt="<?= h($siteName) ?> logo" /></div>
          <div class="brand-text">
            <div class="t1"><?= h($siteName) ?></div>
            <div class="t2">Catholic Parish Directory</div>
          </div>
        </a>
      </div>
    </header>

    <main class="sp-wrap">
      <span class="chip chip-type"><?= h($type) ?></span>
      <h1 class="serif" style="font-size:clamp(28px,5vw,40px);margin-top:12px"><?= h($name) ?></h1>
      <div class="sp-meta"><?= h(implode(' · ', array_filter([$city, $county ? $county . ' County' : '', $diocese]))) ?></div>

      <?php if ($hero): ?><div class="sp-hero"><img src="<?= h($hero) ?>" alt="<?= h($name) ?>" /></div><?php endif; ?>

      <p style="font-size:16.5px;line-height:1.7;color:var(--ink-2)"><?= h($parish['description'] ?? '') ?></p>

      <div class="sp-open">
        <a class="btn btn-primary" href="/#<?= h($parish['id']) ?>">Open in the interactive directory</a>
        <?php if (is_array($coords)): ?>
          <a class="btn btn-ghost" href="https://www.google.com/maps/dir/?api=1&amp;destination=<?= h($coords['lat']) ?>,<?= h($coords['lng']) ?>" target="_blank" rel="noreferrer">Get directions</a>
        <?php endif; ?>
      </div>

      <?php if ($mass): ?>
        <h2 class="sp-sec">Mass &amp; service times</h2>
        <div class="mass-table">
          <?php foreach ($mass as $m): ?>
            <div class="mass-row">
              <div class="m-day"><?= h($m['day'] ?? '') ?></div>
              <div class="m-time"><?= h($m['time'] ?? '') ?></div>
              <div><?php if (!empty($m['language'])): ?><span class="chip chip-lang"><?= h($m['language']) ?></span><?php endif; ?></div>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <h2 class="sp-sec">Contact</h2>
      <?php if (!empty($contact['phone'])): ?><div class="sp-kv"><b>Phone</b> <a href="tel:<?= h(preg_replace('/\s+/', '', $contact['phone'])) ?>"><?= h($contact['phone']) ?></a></div><?php endif; ?>
      <?php if (!empty($contact['email'])): ?><div class="sp-kv"><b>Email</b> <a href="mailto:<?= h($contact['email']) ?>"><?= h($contact['email']) ?></a></div><?php endif; ?>
      <?php if (!empty($contact['website'])): ?><div class="sp-kv"><b>Website</b> <a href="<?= h((preg_match('#^https?://#', $contact['website']) ? '' : 'https://') . $contact['website']) ?>" target="_blank" rel="noreferrer"><?= h($contact['website']) ?></a></div><?php endif; ?>
      <?php if ($address): ?><div class="sp-kv"><b>Address</b> <?= h($address) ?></div><?php endif; ?>
      <?php if (empty($contact['phone']) && empty($contact['email']) && !$address): ?><p class="muted">No contact details on file yet.</p><?php endif; ?>
    </main>

    <footer class="foot">
      <div class="foot-inner">
        <div class="f-note">Part of <a href="/" style="color:var(--primary);font-weight:600"><?= h($siteName) ?></a> — Catholic parishes, cathedrals and shrines across the dioceses of Kenya.</div>
      </div>
    </footer>
  </div>
</body>
</html>

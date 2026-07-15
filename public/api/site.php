<?php
/**
 * site.php — editable site content (text, branding, theme).
 *
 *   GET  api/site.php                      → { ok, site: {...} }   (public)
 *   POST { content: {...} }  (admin only)  → { ok, site: {...} }
 *
 * Only whitelisted keys are stored; everything is a plain string. This is what
 * makes the page copy, logo and colors editable without touching code.
 */

require __DIR__ . '/bootstrap.php';

const SITE_KEYS = [
    // brand
    'siteName', 'siteTagline', 'logoUrl', 'footerNote',
    // theme
    'primaryColor', 'headingFont',
    // home hero
    'homeEyebrow', 'homeTitle', 'homeLede',
    // map hero
    'mapEyebrow', 'mapTitle', 'mapLede',
    // dioceses hero
    'diocesesEyebrow', 'diocesesTitle', 'diocesesLede',
];

function site_defaults(): array {
    return [
        'siteName'        => 'Ecclesia Kenya',
        'siteTagline'     => 'Catholic Parish Directory',
        'logoUrl'         => 'assets/logo.jpg',
        'footerNote'      => 'A directory of Catholic parishes, cathedrals and shrines across the dioceses of Kenya.',
        'primaryColor'    => '#1462b8',
        'headingFont'     => 'Newsreader',
        'homeEyebrow'     => 'Catholic Directory · Kenya',
        'homeTitle'       => 'Find a Catholic parish anywhere in Kenya.',
        'homeLede'        => 'Browse cathedrals, basilicas and parishes across the dioceses of Kenya with Mass times, contacts and locations on the map. Search by name, filter by diocese or language, or find the parish nearest you.',
        'mapEyebrow'      => 'Interactive Map · Kenya',
        'mapTitle'        => 'Explore parishes on the map.',
        'mapLede'         => 'Every parish in the directory, plotted across Kenya. Click a pin for details and Mass times, or filter the set below — the map updates as you search.',
        'diocesesEyebrow' => 'Ecclesiastical map · Kenya',
        'diocesesTitle'   => 'Browse by diocese.',
        'diocesesLede'    => 'The Catholic Church in Kenya is organised into archdioceses and dioceses, each led by a bishop from its cathedral. Explore the parishes within each jurisdiction below.',
    ];
}

function load_site(): array {
    $stored = load_json_file(data_path('site.json'), []);
    $stored = is_array($stored) ? $stored : [];
    return array_merge(site_defaults(), array_intersect_key($stored, array_flip(SITE_KEYS)));
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_out(['ok' => true, 'site' => load_site()]);
}

if ($method !== 'POST') fail('Method not allowed.', 405);

require_write_headers();
require_admin();

$body = read_json_body();
$content = is_array($body['content'] ?? null) ? $body['content'] : null;
if ($content === null) fail('content object is required.');

$site = load_site();
$changed = [];
foreach (SITE_KEYS as $k) {
    if (!array_key_exists($k, $content)) continue;
    $v = $content[$k];
    if (!is_scalar($v)) continue;
    $v = trim((string)$v);
    if (mb_strlen($v) > 2000) $v = mb_substr($v, 0, 2000);
    if ($k === 'primaryColor' && $v !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $v)) continue;
    $newVal = $v !== '' ? $v : site_defaults()[$k];
    if (($site[$k] ?? null) !== $newVal) $changed[] = $k;
    $site[$k] = $newVal;
}

save_json_file(data_path('site.json'), $site);
if ($changed) audit_log('site.settings', '', 'Updated: ' . implode(', ', $changed));
json_out(['ok' => true, 'site' => $site]);

<?php
/**
 * analytics.php — privacy-light usage counters.
 *
 *   POST { action:"search", q }        (public) → { ok }   records a search term
 *   POST { action:"view",   parishId } (public) → { ok }   records a parish view
 *   GET                                (admin)  → { ok, searches:[…], views:[…], totals, since }
 *
 * What makes it "privacy-light": we store ONLY aggregate counts. No cookies, no
 * IP addresses, no per-user history, no timestamps beyond the "collecting since"
 * date. The file is just { "nairobi": 12 } style tallies, so nothing here can
 * identify a visitor. It answers "what do people look for / which parishes are
 * popular" and nothing more.
 */

require __DIR__ . '/bootstrap.php';

const ANALYTICS_FILE   = 'analytics.json';
const MAX_SEARCH_TERMS = 3000;   // distinct queries kept (lowest counts dropped past this)

function load_analytics(): array {
    $a = load_json_file(data_path(ANALYTICS_FILE), []);
    if (!is_array($a)) $a = [];
    $a['searches'] = isset($a['searches']) && is_array($a['searches']) ? $a['searches'] : [];
    $a['views']    = isset($a['views'])    && is_array($a['views'])    ? $a['views']    : [];
    $a['searchTotal'] = (int)($a['searchTotal'] ?? 0);
    $a['viewTotal']   = (int)($a['viewTotal'] ?? 0);
    $a['since']       = as_str($a['since'] ?? '') ?: date('Y-m-d');
    return $a;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------------- admin read ---------------- */
if ($method === 'GET') {
    require_admin();
    $a = load_analytics();

    arsort($a['searches']);
    arsort($a['views']);

    $searches = [];
    foreach (array_slice($a['searches'], 0, 60, true) as $q => $n) $searches[] = ['q' => $q, 'count' => $n];

    // resolve parish ids to names for the "most viewed" table
    $names = [];
    foreach (load_parishes() as $c) $names[$c['id'] ?? ''] = $c['name'] ?? '';
    $views = [];
    foreach (array_slice($a['views'], 0, 100, true) as $id => $n) {
        $views[] = ['parishId' => $id, 'name' => $names[$id] ?? $id, 'count' => $n];
    }

    json_out([
        'ok' => true,
        'searches' => $searches,
        'views' => $views,
        'totals' => ['searches' => $a['searchTotal'], 'views' => $a['viewTotal'],
                     'distinctSearches' => count($a['searches'])],
        'since' => $a['since'],
    ]);
}

if ($method !== 'POST') fail('Method not allowed.', 405);

require_write_headers();   // same-origin fetch header required (no admin needed — public metric)

$body   = read_json_body();
$action = as_str($body['action'] ?? '');
$a = load_analytics();

if ($action === 'search') {
    // normalize: lowercase, collapse whitespace, strip control chars
    $q = mb_strtolower(trim((string)($body['q'] ?? '')));
    $q = preg_replace('/\s+/u', ' ', $q);
    $q = preg_replace('/[\x00-\x1f]/u', '', (string)$q);
    if (mb_strlen($q) < 2 || mb_strlen($q) > 60) json_out(['ok' => true]);   // ignore noise silently

    $a['searches'][$q] = (int)($a['searches'][$q] ?? 0) + 1;
    $a['searchTotal']++;

    // cap distinct terms: when too many, drop the lowest-count ones
    if (count($a['searches']) > MAX_SEARCH_TERMS) {
        arsort($a['searches']);
        $a['searches'] = array_slice($a['searches'], 0, MAX_SEARCH_TERMS, true);
    }
} elseif ($action === 'view') {
    $id = as_str($body['parishId'] ?? '');
    if (!preg_match('/^[a-z0-9-]{1,80}$/', $id)) json_out(['ok' => true]);
    $a['views'][$id] = (int)($a['views'][$id] ?? 0) + 1;
    $a['viewTotal']++;
} else {
    json_out(['ok' => true]);   // unknown action: never error a fire-and-forget beacon
}

save_json_file(data_path(ANALYTICS_FILE), $a);
json_out(['ok' => true]);

<?php
/**
 * geocode.php — look up coordinates for a parish (admin only).
 *
 *   POST { name?, city?, county? }  →  { ok:true, lat, lng, precision, label }
 *                                   |  { ok:false }              (no confident hit)
 *
 * Uses OpenStreetMap's Nominatim service. It is called SERVER-side (not from
 * the browser) so we can send the User-Agent Nominatim's usage policy requires
 * and keep the lookup admin-only. The client paces requests (~1/sec) for bulk
 * runs; this endpoint additionally sleeps between its own fallback attempts.
 *
 * Fallback order (first Kenya-bounds hit wins):
 *   1. "<name>, <city>, Kenya"     → exact church, if Nominatim knows it
 *   2. "<city>, <county>, Kenya"   → town/area centre (precision: "area")
 *   3. "<county>, Kenya"           → county centre  (precision: "area")
 */

require __DIR__ . '/bootstrap.php';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_UA = 'EcclesiaKenya/1.0 (+' . CANONICAL_BASE . ')';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Method not allowed.', 405);
require_write_headers();
require_admin();

$body   = read_json_body();
$name   = as_str($body['name'] ?? '');
$city   = as_str($body['city'] ?? '');
$county = as_str($body['county'] ?? '');

if ($name === '' && $city === '' && $county === '') fail('Nothing to geocode.');

/* build the ordered candidate queries */
$candidates = [];
if ($name !== '' && $city !== '') $candidates[] = [$name . ', ' . $city . ', Kenya', 'exact'];
if ($city !== '')                 $candidates[] = [$city . ($county !== '' ? ', ' . $county : '') . ', Kenya', 'area'];
if ($county !== '')               $candidates[] = [$county . ', Kenya', 'area'];
if ($name !== '' && $city === '') $candidates[] = [$name . ', Kenya', 'exact'];

/** one Nominatim request; returns [lat,lng] within Kenya bounds or null */
function nominatim_lookup(string $q): ?array {
    $url = NOMINATIM . '?' . http_build_query([
        'format'       => 'jsonv2',
        'q'            => $q,
        'countrycodes' => 'ke',
        'limit'        => 1,
    ]);

    $raw = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 12,
            CURLOPT_USERAGENT      => GEOCODE_UA,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => [
            'method'  => 'GET',
            'header'  => "User-Agent: " . GEOCODE_UA . "\r\nAccept: application/json\r\n",
            'timeout' => 12,
        ]]);
        $raw = @file_get_contents($url, false, $ctx);
    }
    if (!$raw) return null;

    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data[0]['lat'], $data[0]['lon'])) return null;
    $coords = as_coords(['lat' => $data[0]['lat'], 'lng' => $data[0]['lon']]); // reuses Kenya-bounds check
    if (!$coords) return null;
    $coords['label'] = as_str($data[0]['display_name'] ?? '');
    return $coords;
}

$first = true;
foreach ($candidates as [$q, $precision]) {
    if (!$first) usleep(1000000); // ≥1s between Nominatim calls (usage policy)
    $first = false;
    $hit = nominatim_lookup($q);
    if ($hit) {
        json_out([
            'ok'        => true,
            'lat'       => $hit['lat'],
            'lng'       => $hit['lng'],
            'precision' => $precision,
            'label'     => $hit['label'] ?? '',
        ]);
    }
}

json_out(['ok' => false]);

<?php
/**
 * bootstrap.php — shared plumbing for the Ecclesia Kenya API.
 *
 * Storage is flat JSON files in ../data/ (protected by .htaccess), written
 * atomically under an exclusive lock. This suits Truehost/cPanel shared
 * hosting: no database to provision, trivial to back up (download the folder).
 * A MySQL upgrade path is documented in docs/DEPLOYMENT-TRUEHOST.md.
 */

declare(strict_types=1);

const DATA_DIR    = __DIR__ . '/../data';
const UPLOADS_DIR = __DIR__ . '/../uploads';
const SEED_FILE   = __DIR__ . '/seed.json';

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak stack traces to visitors

/* ---------------- session ---------------- */
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('ecclesia_sess');
    session_set_cookie_params([
        'lifetime' => 0,          // session cookie: gone when browser closes
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/* ---------------- responses ---------------- */
function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void {
    json_out(['ok' => false, 'error' => $msg], $code);
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/* ---------------- write protection ----------------
 * Mutating requests must carry the X-Requested-With header set by our own
 * fetch() calls. Combined with the SameSite=Lax session cookie this blocks
 * cross-site request forgery from third-party pages. */
function require_write_headers(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') return;
    $h = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if ($h !== 'fetch') fail('Bad request origin.', 403);
}

/* ---------------- auth ---------------- */
function is_authed(): bool {
    start_session();
    return !empty($_SESSION['ecclesia_admin']);
}

function require_admin(): void {
    if (!is_authed()) fail('Not signed in.', 401);
}

/* ---------------- JSON file storage (locked, atomic) ---------------- */
function data_path(string $name): string {
    return DATA_DIR . '/' . $name;
}

function load_json_file(string $path, $fallback) {
    if (!is_file($path)) return $fallback;
    $fh = fopen($path, 'rb');
    if (!$fh) return $fallback;
    flock($fh, LOCK_SH);
    $raw = stream_get_contents($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    $data = json_decode((string)$raw, true);
    return $data === null && trim((string)$raw) !== 'null' ? $fallback : $data;
}

function save_json_file(string $path, $data): void {
    $dir = dirname($path);
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $tmp = $path . '.tmp.' . bin2hex(random_bytes(4));
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if (file_put_contents($tmp, $json, LOCK_EX) === false) fail('Could not write data file.', 500);
    if (!rename($tmp, $path)) { @unlink($tmp); fail('Could not save data file.', 500); }
}

/* ---------------- parish normalization (mirror of js/store.js) ---------------- */
function slugify(string $s): string {
    $s = strtolower(trim($s));
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if ($t !== false) $s = $t;
    }
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim((string)$s, '-');
    return substr($s !== '' ? $s : 'parish', 0, 60);
}

function unique_id(string $base, array &$taken): string {
    $id = $base;
    $n = 2;
    while (isset($taken[$id])) $id = $base . '-' . $n++;
    $taken[$id] = true;
    return $id;
}

function as_str($v): string { return is_scalar($v) ? trim((string)$v) : ''; }

function as_str_list($v): array {
    if (!is_array($v)) return [];
    $out = [];
    foreach ($v as $x) { $s = as_str($x); if ($s !== '') $out[] = $s; }
    return $out;
}

function as_pairs($v, array $keys): array {
    if (!is_array($v)) return [];
    $out = [];
    foreach ($v as $row) {
        if (!is_array($row)) continue;
        $o = [];
        $any = false;
        foreach ($keys as $k) { $o[$k] = as_str($row[$k] ?? ''); if ($o[$k] !== '') $any = true; }
        if ($any) $out[] = $o;
    }
    return $out;
}

function as_coords($v): ?array {
    if (!is_array($v)) return null;
    $lat = $v['lat'] ?? null;
    $lng = $v['lng'] ?? null;
    if (!is_numeric($lat) || !is_numeric($lng)) return null;
    $lat = (float)$lat; $lng = (float)$lng;
    if ($lat < -5.2 || $lat > 5.5 || $lng < 33 || $lng > 42.5) return null; // Kenya-ish bounds
    return ['lat' => $lat, 'lng' => $lng];
}

function infer_type(string $name): string {
    $n = strtolower($name);
    if (str_contains($n, 'basilica')) return 'Minor Basilica';
    if (str_contains($n, 'cathedral')) return 'Cathedral';
    if (str_contains($n, 'shrine')) return 'Shrine';
    if (str_contains($n, 'chapel') || str_contains($n, 'campus')) return 'Chapel';
    return 'Parish Church';
}

/** Coerce an incoming record to the canonical Parish shape (schema in docs). */
function normalize_parish(array $rec, array &$taken): array {
    $name    = as_str($rec['name'] ?? '') ?: 'Unnamed Parish';
    $area    = as_str($rec['city'] ?? ($rec['area'] ?? ''));
    $diocese = as_str($rec['diocese'] ?? '') ?: 'Archdiocese of Nairobi';
    $coords  = as_coords($rec['coords'] ?? null);

    $base = slugify($name) . ($area !== '' ? '-' . slugify($area) : '');
    $reqId = as_str($rec['id'] ?? '');
    if ($reqId !== '' && !isset($taken[$reqId]) && preg_match('/^[a-z0-9-]{1,80}$/', $reqId)) {
        $id = $reqId;
        $taken[$id] = true;
    } else {
        $id = unique_id($base, $taken);
    }

    $gallery = as_str_list($rec['gallery'] ?? null);
    if (!$gallery) $gallery = ['parish exterior', 'church interior', 'altar & sanctuary', 'parish community'];

    $type = as_str($rec['type'] ?? '') ?: infer_type($name);

    $desc = as_str($rec['description'] ?? '');
    if ($desc === '') {
        $desc = $name . ' is a Catholic ' . strtolower($type)
            . ($area !== '' ? ' in ' . $area : '')
            . (as_str($rec['deanery'] ?? '') !== '' ? ', ' . as_str($rec['deanery']) . ' Deanery' : '')
            . ', part of the ' . $diocese . '.';
    }

    $priest = null;
    if (is_array($rec['priest'] ?? null) && as_str($rec['priest']['name'] ?? '') !== '') {
        $priest = ['name' => as_str($rec['priest']['name']), 'title' => as_str($rec['priest']['title'] ?? '') ?: 'Parish Priest'];
    }

    $contactIn = is_array($rec['contact'] ?? null) ? $rec['contact'] : [];
    $socials = [];
    if (is_array($rec['socials'] ?? null)) {
        foreach ($rec['socials'] as $k => $v) {
            $k = as_str($k); $v = as_str($v);
            if ($k !== '' && $v !== '') $socials[$k] = $v;
        }
    }

    $founded = $rec['founded'] ?? null;
    $founded = is_numeric($founded) ? (int)$founded : (as_str($founded) !== '' ? as_str($founded) : null);

    $source = as_str($rec['source'] ?? '');
    if (!in_array($source, ['seed', 'import', 'manual'], true)) $source = 'manual';

    // images keep their positions (gallery slots address by index); trim trailing blanks
    $images = [];
    if (is_array($rec['images'] ?? null)) {
        foreach ($rec['images'] as $x) $images[] = as_str($x);
        while ($images && end($images) === '') array_pop($images);
    }

    return [
        'id'          => $id,
        'name'        => $name,
        'type'        => $type,
        'patron'      => as_str($rec['patron'] ?? ''),
        'diocese'     => $diocese,
        'deanery'     => as_str($rec['deanery'] ?? ''),
        'city'        => $area,
        'county'      => as_str($rec['county'] ?? ''),
        'address'     => as_str($rec['address'] ?? ''),
        'poBox'       => as_str($rec['poBox'] ?? ''),
        'coords'      => $coords,
        'founded'     => $founded,
        'tagline'     => as_str($rec['tagline'] ?? '') ?: ($area !== '' ? "A Catholic parish in $area." : 'A Catholic parish.'),
        'description' => $desc,
        'priest'      => $priest,
        'clergy'      => as_pairs($rec['clergy'] ?? null, ['name', 'title']),
        'contact'     => [
            'phone'   => as_str($contactIn['phone'] ?? ($rec['phone'] ?? '')),
            'email'   => as_str($contactIn['email'] ?? ($rec['email'] ?? '')),
            'website' => as_str($contactIn['website'] ?? ($rec['website'] ?? '')),
        ],
        'socials'     => (object)$socials,
        'officeHours' => as_pairs($rec['officeHours'] ?? null, ['days', 'hours']),
        'massTimes'   => as_pairs($rec['massTimes'] ?? null, ['day', 'time', 'language']),
        'confessions' => as_str($rec['confessions'] ?? ''),
        'adoration'   => as_str($rec['adoration'] ?? ''),
        'sacraments'  => as_str_list($rec['sacraments'] ?? null) ?: ['Baptism', 'Reconciliation', 'Holy Eucharist', 'Confirmation', 'Holy Matrimony', 'Anointing of the Sick'],
        'services'    => as_str_list($rec['services'] ?? null),
        'gallery'     => $gallery,
        'heroImage'   => as_str($rec['heroImage'] ?? ''),
        'images'      => $images,
        'events'      => as_pairs($rec['events'] ?? null, ['date', 'title', 'time']),
        'source'      => $source,
    ];
}

/* ---------------- parish collection ---------------- */
function load_parishes(): array {
    $list = load_json_file(data_path('parishes.json'), null);
    if (is_array($list)) return $list;
    // first run: seed from the bundled dataset
    $seed = load_json_file(SEED_FILE, []);
    $seed = is_array($seed) ? $seed : [];
    save_json_file(data_path('parishes.json'), $seed);
    return $seed;
}

function save_parishes(array $list): void {
    save_json_file(data_path('parishes.json'), array_values($list));
}

function taken_map(array $list): array {
    $t = [];
    foreach ($list as $c) if (is_array($c) && isset($c['id'])) $t[$c['id']] = true;
    return $t;
}

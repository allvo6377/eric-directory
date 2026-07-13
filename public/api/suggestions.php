<?php
/**
 * suggestions.php — public "suggest an update" queue with admin moderation.
 *
 *   POST { action:"create", parishId, name?, contact?, message, website }  (public)
 *     — `website` is a honeypot field: real users never fill it; bots do.
 *     — rate-limited per IP (5 per hour) so the queue can't be flooded.
 *   GET                                    (admin) → { ok, suggestions:[...] }
 *   POST { action:"resolve"|"remove", id } (admin) → { ok, suggestions:[...] }
 */

require __DIR__ . '/bootstrap.php';

const SUGGEST_MAX_PER_HOUR = 5;
const SUGGEST_CAP = 500;

function load_suggestions(): array {
    $l = load_json_file(data_path('suggestions.json'), []);
    return is_array($l) ? $l : [];
}
function save_suggestions(array $l): void {
    save_json_file(data_path('suggestions.json'), array_values($l));
}

start_session();
require_write_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    require_admin();
    json_out(['ok' => true, 'suggestions' => load_suggestions()]);
}

if ($method !== 'POST') fail('Method not allowed.', 405);

$body = read_json_body();
$action = as_str($body['action'] ?? '');

if ($action === 'create') {
    // honeypot: silently accept and drop bot submissions
    if (as_str($body['website'] ?? '') !== '') json_out(['ok' => true]);

    // per-IP hourly rate limit
    $key = sha1(($_SERVER['REMOTE_ADDR'] ?? '') . '-suggest');
    $rates = load_json_file(data_path('suggest-rate.json'), []);
    $rates = is_array($rates) ? $rates : [];
    $now = time();
    $mine = array_values(array_filter($rates[$key] ?? [], fn($t) => $now - $t < 3600));
    if (count($mine) >= SUGGEST_MAX_PER_HOUR) fail('Too many suggestions from this connection — please try again later.', 429);
    $mine[] = $now;
    $rates[$key] = $mine;
    if (count($rates) > 1000) $rates = array_slice($rates, -500, null, true);
    save_json_file(data_path('suggest-rate.json'), $rates);

    $message = trim((string)($body['message'] ?? ''));
    if (mb_strlen($message) < 10) fail('Please describe the update (at least 10 characters).');
    if (mb_strlen($message) > 2000) $message = mb_substr($message, 0, 2000);

    $parishId = as_str($body['parishId'] ?? '');
    $parishName = '';
    foreach (load_parishes() as $c) {
        if (($c['id'] ?? '') === $parishId) { $parishName = $c['name'] ?? ''; break; }
    }
    if ($parishName === '') fail('Unknown parish.', 404);

    $list = load_suggestions();
    $list[] = [
        'id'         => bin2hex(random_bytes(6)),
        'parishId'   => $parishId,
        'parishName' => $parishName,
        'name'       => mb_substr(as_str($body['name'] ?? ''), 0, 120),
        'contact'    => mb_substr(as_str($body['contact'] ?? ''), 0, 160),
        'message'    => $message,
        'created'    => date('c'),
        'status'     => 'new',
    ];
    // keep the file bounded: drop oldest resolved entries first, then oldest
    while (count($list) > SUGGEST_CAP) {
        $idx = null;
        foreach ($list as $i => $s) if (($s['status'] ?? '') === 'resolved') { $idx = $i; break; }
        array_splice($list, $idx ?? 0, 1);
    }
    save_suggestions($list);
    json_out(['ok' => true]);
}

/* moderation actions */
require_admin();
$id = as_str($body['id'] ?? '');
$list = load_suggestions();

switch ($action) {
    case 'resolve':
        foreach ($list as &$s) if (($s['id'] ?? '') === $id) $s['status'] = 'resolved';
        unset($s);
        break;
    case 'remove':
        $list = array_values(array_filter($list, fn($s) => ($s['id'] ?? '') !== $id));
        break;
    default:
        fail('Unknown action.');
}

save_suggestions($list);
json_out(['ok' => true, 'suggestions' => $list]);

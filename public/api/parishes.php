<?php
/**
 * parishes.php — parish data API.
 *
 *   GET  api/parishes.php  → { ok, parishes: [...] }          (public)
 *   POST (admin only)      → { ok, parishes: [...] }          (full list back)
 *     { action: "add",    record: {...} }
 *     { action: "update", id, record: {...} }
 *     { action: "remove", id }
 *     { action: "import", records: [{...}, ...] }
 *     { action: "reset" }                    — restore bundled sample data
 *
 * Every mutation returns the complete saved list so the client cache always
 * converges with the server, whatever order requests land in.
 */

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_out(['ok' => true, 'parishes' => load_parishes()]);
}

if ($method !== 'POST') fail('Method not allowed.', 405);

require_write_headers();
require_admin();

$body   = read_json_body();
$action = as_str($body['action'] ?? '');
$list   = load_parishes();

switch ($action) {
    case 'add': {
        $rec = is_array($body['record'] ?? null) ? $body['record'] : null;
        if (!$rec || as_str($rec['name'] ?? '') === '') fail('A parish record with a name is required.');
        $taken = taken_map($list);
        $n = normalize_parish($rec, $taken);
        array_unshift($list, $n);
        break;
    }

    case 'update': {
        $id = as_str($body['id'] ?? '');
        $rec = is_array($body['record'] ?? null) ? $body['record'] : null;
        if ($id === '' || !$rec) fail('id and record are required.');
        $idx = null;
        foreach ($list as $i => $c) if (($c['id'] ?? '') === $id) { $idx = $i; break; }
        if ($idx === null) fail('No parish with that id.', 404);
        $merged = array_merge($list[$idx], $rec, ['id' => $id]);
        $taken = [];                       // empty map ⇒ the existing id is kept
        $list[$idx] = normalize_parish($merged, $taken);
        break;
    }

    case 'remove': {
        $id = as_str($body['id'] ?? '');
        if ($id === '') fail('id is required.');
        $before = count($list);
        $list = array_values(array_filter($list, fn($c) => ($c['id'] ?? '') !== $id));
        if (count($list) === $before) fail('No parish with that id.', 404);
        break;
    }

    case 'import': {
        $records = is_array($body['records'] ?? null) ? $body['records'] : null;
        if (!$records) fail('records array is required.');
        if (count($records) > 2000) fail('Import too large (max 2000 rows).');
        $taken = taken_map($list);
        foreach ($records as $rec) {
            if (!is_array($rec) || as_str($rec['name'] ?? '') === '') continue;
            $list[] = normalize_parish($rec, $taken);
        }
        break;
    }

    case 'reset': {
        $seed = load_json_file(SEED_FILE, []);
        $list = is_array($seed) ? $seed : [];
        break;
    }

    default:
        fail('Unknown action.');
}

save_parishes($list);
json_out(['ok' => true, 'parishes' => array_values($list)]);

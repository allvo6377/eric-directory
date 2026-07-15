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
        audit_log('parish.add', $n['id'], $n['name']);
        break;
    }

    case 'update': {
        $id = as_str($body['id'] ?? '');
        $rec = is_array($body['record'] ?? null) ? $body['record'] : null;
        if ($id === '' || !$rec) fail('id and record are required.');
        $idx = null;
        foreach ($list as $i => $c) if (($c['id'] ?? '') === $id) { $idx = $i; break; }
        if ($idx === null) fail('No parish with that id.', 404);
        $before = $list[$idx];
        $merged = array_merge($list[$idx], $rec, ['id' => $id]);
        $taken = [];                       // empty map ⇒ the existing id is kept
        $list[$idx] = normalize_parish($merged, $taken);
        audit_log('parish.edit', $id, $list[$idx]['name'] . changed_fields_note($before, $list[$idx]));
        break;
    }

    case 'remove': {
        $id = as_str($body['id'] ?? '');
        if ($id === '') fail('id is required.');
        $removed = null;
        foreach ($list as $c) if (($c['id'] ?? '') === $id) { $removed = $c; break; }
        $before = count($list);
        $list = array_values(array_filter($list, fn($c) => ($c['id'] ?? '') !== $id));
        if (count($list) === $before) fail('No parish with that id.', 404);
        audit_log('parish.delete', $id, $removed['name'] ?? $id);
        break;
    }

    case 'import': {
        $records = is_array($body['records'] ?? null) ? $body['records'] : null;
        if (!$records) fail('records array is required.');
        if (count($records) > 2000) fail('Import too large (max 2000 rows).');
        $taken = taken_map($list);
        $n = 0;
        foreach ($records as $rec) {
            if (!is_array($rec) || as_str($rec['name'] ?? '') === '') continue;
            $list[] = normalize_parish($rec, $taken);
            $n++;
        }
        audit_log('parish.import', '', $n . ' parish record(s) imported');
        break;
    }

    case 'reset': {
        $seed = load_json_file(SEED_FILE, []);
        $list = is_array($seed) ? $seed : [];
        audit_log('parish.reset', '', 'Restored ' . count($list) . ' sample parishes (all edits cleared)');
        break;
    }

    default:
        fail('Unknown action.');
}

save_parishes($list);
json_out(['ok' => true, 'parishes' => array_values($list)]);

/* a short "(massTimes, contact)" note of which top-level fields changed */
function changed_fields_note(array $before, array $after): string {
    $keys = ['name','type','diocese','deanery','city','county','address','poBox','coords',
             'founded','description','contact','massTimes','officeHours','priest','clergy',
             'confessions','adoration','events','heroImage','images','sacraments','services'];
    $changed = [];
    foreach ($keys as $k) {
        if (json_encode($before[$k] ?? null) !== json_encode($after[$k] ?? null)) $changed[] = $k;
    }
    return $changed ? ' — changed: ' . implode(', ', $changed) : '';
}

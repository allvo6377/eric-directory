<?php
/**
 * audit.php — admin activity log viewer (read-only).
 *
 *   GET api/audit.php?limit=250   (admin only) → { ok, entries:[{t,action,target,detail,ip}, …] }
 *
 * Entries are written by audit_log() in bootstrap.php on every admin content
 * change (parish add/edit/delete/import/reset, site settings, login, password
 * change). The log file lives in data/ and is never served directly.
 */

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') fail('Method not allowed.', 405);

require_admin();

$limit = (int)($_GET['limit'] ?? 250);
if ($limit < 1) $limit = 250;
if ($limit > 1000) $limit = 1000;

json_out(['ok' => true, 'entries' => read_audit($limit)]);

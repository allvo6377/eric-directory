<?php
/**
 * auth.php — server-side admin authentication.
 *
 *   GET  api/auth.php                    → { authed: bool, configured: bool }
 *   POST { action: "login", password }   → { ok } | 401
 *   POST { action: "logout" }            → { ok }
 *   POST { action: "change_password", current, next } → { ok } | error
 *
 * The password is stored as a password_hash() bcrypt hash in data/admin.json
 * (never in the page source — this replaces the prototype's client-side gate).
 * Failed logins are rate-limited per IP: 8 failures locks login for 15 minutes.
 */

require __DIR__ . '/bootstrap.php';

const MAX_FAILS = 8;
const LOCK_SECS = 15 * 60;

function admin_config(): ?array {
    $cfg = load_json_file(data_path('admin.json'), null);
    return (is_array($cfg) && !empty($cfg['password_hash'])) ? $cfg : null;
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function rate_key(): string { return sha1(client_ip()); }

function rate_state(): array {
    $all = load_json_file(data_path('ratelimit.json'), []);
    return is_array($all) ? $all : [];
}

function rate_check(): void {
    $all = rate_state();
    $e = $all[rate_key()] ?? null;
    if ($e && ($e['fails'] ?? 0) >= MAX_FAILS && time() < ($e['until'] ?? 0)) {
        $mins = (int)ceil((($e['until'] ?? 0) - time()) / 60);
        fail("Too many failed attempts. Try again in about {$mins} minute(s).", 429);
    }
}

function rate_fail(): void {
    $all = rate_state();
    $k = rate_key();
    $e = $all[$k] ?? ['fails' => 0, 'until' => 0];
    if (time() > ($e['until'] ?? 0) && ($e['fails'] ?? 0) >= MAX_FAILS) $e = ['fails' => 0, 'until' => 0];
    $e['fails'] = ($e['fails'] ?? 0) + 1;
    if ($e['fails'] >= MAX_FAILS) $e['until'] = time() + LOCK_SECS;
    $all[$k] = $e;
    // keep the file from growing forever
    foreach ($all as $key => $v) {
        if (($v['fails'] ?? 0) < MAX_FAILS && count($all) > 500) unset($all[$key]);
    }
    save_json_file(data_path('ratelimit.json'), $all);
}

function rate_clear(): void {
    $all = rate_state();
    unset($all[rate_key()]);
    save_json_file(data_path('ratelimit.json'), $all);
}

start_session();
require_write_headers();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_out(['authed' => is_authed(), 'configured' => admin_config() !== null]);
}

if ($method !== 'POST') fail('Method not allowed.', 405);

$body = read_json_body();
$action = as_str($body['action'] ?? '');

switch ($action) {
    case 'login': {
        $cfg = admin_config();
        if (!$cfg) fail('Admin account is not set up yet. Run api/setup.php first.', 409);
        rate_check();
        $pw = (string)($body['password'] ?? '');
        if ($pw === '' || !password_verify($pw, $cfg['password_hash'])) {
            rate_fail();
            fail('Incorrect password.', 401);
        }
        rate_clear();
        session_regenerate_id(true);
        $_SESSION['ecclesia_admin'] = true;
        audit_log('auth.login', '', 'Admin signed in');
        json_out(['ok' => true]);
        break;
    }

    case 'logout': {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        json_out(['ok' => true]);
        break;
    }

    case 'change_password': {
        require_admin();
        $cfg = admin_config();
        if (!$cfg) fail('Admin account is not set up.', 409);
        $current = (string)($body['current'] ?? '');
        $next    = (string)($body['next'] ?? '');
        if (!password_verify($current, $cfg['password_hash'])) fail('Current password is incorrect.', 403);
        if (strlen($next) < 10) fail('New password must be at least 10 characters.');
        $cfg['password_hash'] = password_hash($next, PASSWORD_DEFAULT);
        $cfg['updated_at'] = date('c');
        save_json_file(data_path('admin.json'), $cfg);
        audit_log('auth.password_change', '', 'Admin password changed');
        json_out(['ok' => true]);
        break;
    }

    default:
        fail('Unknown action.');
}

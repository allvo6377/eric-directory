<?php
/**
 * setup.php — ONE-TIME admin account initialization.
 *
 * Visit /api/setup.php in a browser right after uploading the site, choose the
 * admin password, and submit. Once data/admin.json exists this script refuses
 * to run again (so it cannot be used to hijack a configured site).
 *
 * After setup, sign in at:  https://your-domain/#admin
 */

require __DIR__ . '/bootstrap.php';

$already = load_json_file(data_path('admin.json'), null);
$configured = is_array($already) && !empty($already['password_hash']);

$msg = '';
$done = false;

if (!$configured && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $pw  = (string)($_POST['password'] ?? '');
    $pw2 = (string)($_POST['password2'] ?? '');
    if (strlen($pw) < 10) {
        $msg = 'Password must be at least 10 characters.';
    } elseif ($pw !== $pw2) {
        $msg = 'The two passwords do not match.';
    } else {
        save_json_file(data_path('admin.json'), [
            'password_hash' => password_hash($pw, PASSWORD_DEFAULT),
            'created_at'    => date('c'),
        ]);
        $done = true;
    }
}

header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ecclesia Kenya — Admin setup</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#f6f7f9;color:#15181c;display:grid;place-items:center;min-height:100vh;margin:0}
  .card{background:#fff;border:1px solid #e4e8ed;border-radius:16px;box-shadow:0 4px 18px rgba(21,30,45,.08);padding:34px 32px;max-width:420px;width:calc(100% - 40px)}
  h1{font-size:22px;margin:0 0 8px}
  p{font-size:14px;color:#6a717b;line-height:1.6}
  label{display:block;font-size:13px;font-weight:600;margin:16px 0 6px}
  input{width:100%;box-sizing:border-box;height:44px;border:1px solid #d6dbe2;border-radius:10px;padding:0 14px;font-size:15px}
  button{margin-top:20px;width:100%;height:46px;border:0;border-radius:10px;background:#1462b8;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
  button:hover{background:#0f4d92}
  .err{background:#fdf2f2;color:#b4232a;border:1px solid #f0d4d6;border-radius:10px;padding:10px 14px;font-size:13.5px;margin-top:14px}
  .ok{background:#e6f4ec;color:#12834f;border-radius:10px;padding:12px 14px;font-size:14px;margin-top:14px}
  a{color:#1462b8;font-weight:600;text-decoration:none}
</style>
</head>
<body>
<div class="card">
<?php if ($done): ?>
  <h1>Admin account created ✓</h1>
  <div class="ok">You can now sign in to the hidden admin area.</div>
  <p style="margin-top:16px">Open <a href="../#admin">the admin sign-in page</a> and use the password you just set.
     Bookmark that address — there is no visible link to it on the public site.</p>
  <p><b>Tip:</b> for extra safety you may delete <code>api/setup.php</code> from the server now.</p>
<?php elseif ($configured): ?>
  <h1>Already configured</h1>
  <p>The admin account has already been set up, so this page is disabled.</p>
  <p>Sign in at <a href="../#admin">/#admin</a>. To reset a forgotten password, delete
     <code>data/admin.json</code> on the server (via cPanel File Manager) and reload this page.</p>
<?php else: ?>
  <h1>Set the admin password</h1>
  <p>This one-time step creates the administrator account for the parish directory.
     The password is stored only as a secure hash on the server.</p>
  <?php if ($msg): ?><div class="err"><?= htmlspecialchars($msg) ?></div><?php endif; ?>
  <form method="post" autocomplete="off">
    <label>Admin password (min 10 characters)</label>
    <input type="password" name="password" minlength="10" required>
    <label>Repeat password</label>
    <input type="password" name="password2" minlength="10" required>
    <button type="submit">Create admin account</button>
  </form>
<?php endif; ?>
</div>
</body>
</html>

<?php
/**
 * upload.php — admin image upload.
 *
 *   POST multipart/form-data, field "file"  (admin only)
 *     → { ok, url: "uploads/img_xxxxxxxx.webp" }
 *
 * The browser already downscales/re-encodes images before upload (js/upload.js),
 * so files arriving here are small. We still verify server-side that the bytes
 * are a real raster image and only ever write a whitelisted extension, into a
 * directory where script execution is disabled (uploads/.htaccess).
 */

require __DIR__ . '/bootstrap.php';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Method not allowed.', 405);
require_write_headers();
require_admin();

if (empty($_FILES['file']) || !is_array($_FILES['file'])) fail('No file uploaded.');
$f = $_FILES['file'];

if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('Upload failed (code ' . $f['error'] . ').');
if (($f['size'] ?? 0) <= 0 || $f['size'] > MAX_BYTES) fail('Image must be under 8 MB.');
if (!is_uploaded_file($f['tmp_name'])) fail('Invalid upload.');

// Verify the actual bytes, not the client-supplied name/type
$info = @getimagesize($f['tmp_name']);
if ($info === false) fail('That file is not a valid image.');
$mime = $info['mime'] ?? '';

$ext = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
    default      => null,
};
if ($ext === null) fail('Only JPEG, PNG, WebP or GIF images are allowed.');

if (!is_dir(UPLOADS_DIR)) @mkdir(UPLOADS_DIR, 0755, true);

$name = 'img_' . bin2hex(random_bytes(8)) . '.' . $ext;
$dest = UPLOADS_DIR . '/' . $name;

if (!move_uploaded_file($f['tmp_name'], $dest)) fail('Could not store the image on the server.', 500);
@chmod($dest, 0644);

json_out(['ok' => true, 'url' => 'uploads/' . $name]);

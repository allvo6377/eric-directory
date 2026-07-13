<?php
/**
 * sitemap.php — XML sitemap generated from the live parish data.
 * Served as /sitemap.xml via the .htaccess rewrite, so it is always current:
 * add a parish in the admin and it appears here immediately.
 */

require __DIR__ . '/api/bootstrap.php';

header('Content-Type: application/xml; charset=utf-8');

$parishesFile = data_path('parishes.json');
$lastmod = is_file($parishesFile) ? date('Y-m-d', (int)filemtime($parishesFile)) : date('Y-m-d');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

echo "  <url><loc>" . CANONICAL_BASE . "/</loc><lastmod>{$lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n";

foreach (load_parishes() as $c) {
    $id = $c['id'] ?? '';
    if (!preg_match('/^[a-z0-9-]{1,80}$/', $id)) continue;
    echo "  <url><loc>" . CANONICAL_BASE . "/p/" . htmlspecialchars($id, ENT_XML1) . "</loc>"
       . "<lastmod>{$lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n";
}

echo "</urlset>\n";

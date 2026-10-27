<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/Config.php';
require dirname(__DIR__).'/src/Api.php';
header('X-Content-Type-Options: nosniff');
$cfg=\AdminSys\Config::load();
try {
    (new \AdminSys\Api($cfg))->run();
} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    $message = ($cfg['env'] ?? '') === 'development' ? $e->getMessage() : 'Service indisponible';
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
}

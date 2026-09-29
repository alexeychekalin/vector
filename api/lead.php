<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'error' => 'Метод не поддерживается',
    ]);
}

$contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
$rawBody = file_get_contents('php://input');

if (strlen($rawBody ?: '') > 32768) {
    respond(413, ['success' => false, 'error' => 'Слишком большой запрос']);
}

$allowedOrigins = ['https://zolotoy-vektor.ru', 'https://www.zolotoy-vektor.ru'];
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && !in_array(rtrim($origin, '/'), $allowedOrigins, true)) {
    respond(403, ['success' => false, 'error' => 'Запрос запрещён']);
}

if (str_contains($contentType, 'application/json')) {
    $data = json_decode($rawBody ?: '', true);
    if (!is_array($data)) {
        respond(400, [
            'success' => false,
            'error' => 'Некорректный формат данных',
        ]);
    }
} else {
    $data = $_POST;
}

$honeypot = trim((string)($data['website'] ?? ''));
if ($honeypot !== '') {
    respond(200, ['success' => true]);
}

$submittedAt = (int)($data['form_started_at'] ?? 0);
if ($submittedAt > 0 && (time() - $submittedAt) < 2) {
    respond(200, ['success' => true]);
}

$name = preg_replace('/[\x00-\x1F\x7F\r\n]+/u', ' ', $name) ?? '';
$phone = preg_replace('/[\x00-\x1F\x7F\r\n]+/u', ' ', $phone) ?? '';
$email = preg_replace('/[\x00-\x1F\x7F\r\n]+/u', ' ', $email) ?? '';
$comment = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $comment) ?? '';

$trackingFields = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'gbraid', 'wbraid', 'openstat', 'from', 'landing_page', 'referrer', 'first_utm_source', 'first_utm_medium', 'first_utm_campaign', 'last_utm_source', 'last_utm_medium', 'last_utm_campaign'] as $key) {
    $trackingFields[$key] = mb_substr(trim((string)($data[$key] ?? '')), 0, 255);
}

$source = $trackingFields['last_utm_source'] !== '' ? $trackingFields['last_utm_source'] : 'website';


$rateLimitDir = sys_get_temp_dir() . '/zv-lead-rate';
$clientKey = hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$rateLimitFile = $rateLimitDir . '/' . $clientKey;
if (@is_dir($rateLimitDir) || @mkdir($rateLimitDir, 0700, true)) {
    $now = time();
    $window = 600;
    $limit = 5;
    $handle = @fopen($rateLimitFile, 'c+');
    if ($handle !== false) {
        if (flock($handle, LOCK_EX)) {
            $contents = stream_get_contents($handle);
            $timestamps = json_decode($contents ?: '[]', true);
            if (!is_array($timestamps)) $timestamps = [];
            $timestamps = array_values(array_filter($timestamps, static fn($timestamp) => is_int($timestamp) && $timestamp > $now - $window));
            if (count($timestamps) >= $limit) {
                flock($handle, LOCK_UN);
                fclose($handle);
                respond(429, ['success' => false, 'error' => 'Слишком много попыток. Повторите позже.']);
            }
            $timestamps[] = $now;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($timestamps));
            fflush($handle);
            flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

if ($name === '' || mb_strlen($name) > 150) {
    respond(422, [
        'success' => false,
        'error' => 'Укажите корректное имя',
    ]);
}

$phoneDigits = preg_replace('/\D+/', '', $phone) ?? '';
if (mb_strlen($phoneDigits) < 10 || mb_strlen($phoneDigits) > 15) {
    respond(422, [
        'success' => false,
        'error' => 'Укажите корректный номер телефона',
    ]);
}

if ($email !== '' && (mb_strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL))) {
    respond(422, [
        'success' => false,
        'error' => 'Укажите корректный адрес почты',
    ]);
}

$source = preg_replace('/[^\p{L}\p{N}_.,:;=+&?\/-]/u', ' ', $source) ?? 'website';
$source = mb_substr(trim($source), 0, 1000);
$comment = mb_substr($comment, 0, 2000);

$token = getenv('ALFACRM_TOKEN');
if (!is_string($token) || $token === '') {
    error_log('AlfaCRM integration error: ALFACRM_TOKEN is not configured');
    respond(500, [
        'success' => false,
        'error' => 'Интеграция временно недоступна',
    ]);
}

$fields = [
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
    'source' => $source !== '' ? $source : 'website',
    'note' => trim($comment . "\n" . http_build_query($trackingFields, '', '&', PHP_QUERY_RFC3986)),
];

$url = 'https://zolotoyvektor.s20.online/api/1/lead/create?token=' . rawurlencode($token);

$ch = curl_init($url);
if ($ch === false) {
    respond(500, [
        'success' => false,
        'error' => 'Интеграция временно недоступна',
    ]);
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($fields, '', '&', PHP_QUERY_RFC3986),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
        'Accept: application/json',
    ],
]);

$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($responseBody === false || $curlError !== '' || $statusCode < 200 || $statusCode >= 300) {
    error_log(sprintf(
        'AlfaCRM request failed: status=%d error=%s',
        $statusCode,
        $curlError !== '' ? $curlError : 'HTTP error'
    ));

    respond(502, [
        'success' => false,
        'error' => 'Не удалось отправить заявку',
    ]);
}

$telegramToken = getenv('TELEGRAM_BOT_TOKEN');
$telegramChatId = getenv('TELEGRAM_CHANNEL_ID') ?: getenv('TELEGRAM_CHAT_ID');

if (is_string($telegramToken) && $telegramToken !== '' && is_string($telegramChatId) && $telegramChatId !== '') {
$telegramText = implode("\n", [
         'Новая заявка с сайта',
         '',
         'Имя: ' . $name,
         'Телефон: ' . $phone,
         'Email: ' . ($email !== '' ? $email : 'не указан'),
         'Источник: ' . ($source !== '' ? $source : 'website'),
         'Комментарий: ' . ($comment !== '' ? $comment : 'не указан'),
         'Страница: ' . ($trackingFields['landing_page'] !== '' ? $trackingFields['landing_page'] : 'не указана'),
     ]);

    $telegramCh = curl_init('https://api.telegram.org/bot' . rawurlencode($telegramToken) . '/sendMessage');
    if ($telegramCh !== false) {
        curl_setopt_array($telegramCh, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'chat_id' => $telegramChatId,
                'text' => $telegramText,
            ], '', '&', PHP_QUERY_RFC3986),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            ],
        ]);

        $telegramResponse = curl_exec($telegramCh);
        $telegramError = curl_error($telegramCh);
        $telegramStatus = (int)curl_getinfo($telegramCh, CURLINFO_HTTP_CODE);
        curl_close($telegramCh);

        $telegramData = is_string($telegramResponse) ? json_decode($telegramResponse, true) : null;
        if (
            $telegramResponse === false
            || $telegramError !== ''
            || $telegramStatus < 200
            || $telegramStatus >= 300
            || !is_array($telegramData)
            || ($telegramData['ok'] ?? false) !== true
        ) {
            error_log(sprintf(
                'Telegram notification failed: status=%d curl_error=%s response=%s',
                $telegramStatus,
                $telegramError !== '' ? $telegramError : 'none',
                is_string($telegramResponse) ? mb_substr($telegramResponse, 0, 1000) : 'no response'
            ));
        } else {
            error_log(sprintf(
                'Telegram notification sent: message_id=%s',
                (string)($telegramData['result']['message_id'] ?? 'unknown')
            ));
        }
    }
} else {
    error_log('Telegram integration skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured');
}

respond(200, ['success' => true]);

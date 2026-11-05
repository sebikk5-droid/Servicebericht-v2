<?php
header("Content-Type: text/plain; charset=utf-8");
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
$allow = ($origin === "https://sebikk5-droid.github.io")
  || (bool)preg_match('#^http://(127\\.0\\.0\\.1|localhost)(:\\d+)?$#', $origin);
if ($allow) {
  header("Access-Control-Allow-Origin: ".$origin);
  header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Private-Network: true");
header("Access-Control-Max-Age: 86400");
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if ($method === "OPTIONS") {
  http_response_code(204);
  exit;
}
if ($origin !== "" && !$allow) {
  http_response_code(403);
  echo "origin";
  exit;
}

$SB_USER = "";
$SB_PASS = "";
$reqUser = isset($_SERVER["PHP_AUTH_USER"]) ? $_SERVER["PHP_AUTH_USER"] : "";
$reqPass = isset($_SERVER["PHP_AUTH_PW"]) ? $_SERVER["PHP_AUTH_PW"] : "";
if ($SB_USER !== "") {
  if (!hash_equals($SB_USER, $reqUser) || !hash_equals($SB_PASS, $reqPass)) {
    header('WWW-Authenticate: Basic realm="Servicebericht"');
    http_response_code(401);
    echo "auth";
    exit;
  }
}

if ($method === "GET") {
  echo "ok";
  exit;
}
if ($method !== "POST") {
  http_response_code(405);
  echo "POST";
  exit;
}

$raw = file_get_contents("php://input");
if ($raw === false || strlen($raw) > 2000000) {
  http_response_code(413);
  echo "size";
  exit;
}
$j = json_decode($raw, true);
if (!is_array($j) || empty($j["filename"]) || !isset($j["json"])) {
  http_response_code(400);
  echo "bad";
  exit;
}
$name = basename(str_replace("\\", "/", (string)$j["filename"]));
$name = preg_replace("/[^A-Za-z0-9._-]+/", "_", $name);
if ($name === "" || $name === "." || $name === "..") $name = "bericht.json";
if (!preg_match("/\\.json$/i", $name)) $name .= ".json";

$dir = __DIR__.DIRECTORY_SEPARATOR."historie";
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
  http_response_code(500);
  echo "mkdir";
  exit;
}
$body = $j["json"];
if (!is_string($body)) $body = json_encode($body);
if ($body === false) {
  http_response_code(400);
  echo "json";
  exit;
}
if (file_put_contents($dir.DIRECTORY_SEPARATOR.$name, $body) === false) {
  http_response_code(500);
  echo "write";
  exit;
}
http_response_code(201);
echo "ok";

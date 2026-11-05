<?php
ini_set("display_errors", "0");
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
if ($origin === "https://sebikk5-droid.github.io") {
  header("Access-Control-Allow-Origin: ".$origin);
  header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Private-Network: true");
$method = isset($_SERVER["REQUEST_METHOD"]) ? $_SERVER["REQUEST_METHOD"] : "GET";
if ($method === "OPTIONS") {
  http_response_code(204);
  exit;
}
if ($method === "GET") {
  header("Content-Type: text/html; charset=utf-8");
  echo "<!doctype html><meta charset=utf-8><title>ok</title>";
  echo "<p style=\"font:28px sans-serif;margin:48px\">ok</p>";
  exit;
}
if ($method !== "POST") {
  http_response_code(405);
  echo "POST";
  exit;
}
$filename = "";
$json = "";
if (isset($_POST["filename"])) {
  $filename = $_POST["filename"];
  $json = isset($_POST["json"]) ? $_POST["json"] : "";
} else {
  $raw = file_get_contents("php://input");
  $j = json_decode($raw, true);
  if (is_array($j)) {
    $filename = isset($j["filename"]) ? $j["filename"] : "";
    $json = isset($j["json"]) ? $j["json"] : "";
  }
}
$name = basename(str_replace("\\", "/", (string)$filename));
$name = preg_replace("/[^A-Za-z0-9._-]+/", "_", $name);
if ($name === "" || $name === "." || $name === "..") $name = "bericht.json";
if (!preg_match("/\\.json$/i", $name)) $name .= ".json";
if (!is_string($json)) $json = json_encode($json);
if ($json === false) $json = "";
$dir = __DIR__;
$hist = $dir.DIRECTORY_SEPARATOR."historie";
if (is_dir($hist) || @mkdir($hist, 0755, true)) $dir = $hist;
$path = $dir.DIRECTORY_SEPARATOR.$name;
if (@file_put_contents($path, $json) === false) {
  http_response_code(500);
  header("Content-Type: text/plain; charset=utf-8");
  echo "write";
  exit;
}
http_response_code(201);
header("Content-Type: text/html; charset=utf-8");
echo "<!doctype html><meta charset=utf-8><title>ok</title>";
echo "<p style=\"font:28px sans-serif;margin:48px\">ok</p>";
echo "<script>try{if(window.opener)window.opener.postMessage({type:'put-result',ok:true,status:201},'https://sebikk5-droid.github.io');}catch(e){}</script>";

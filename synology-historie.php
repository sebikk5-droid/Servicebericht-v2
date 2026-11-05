<?php
header("Content-Type: text/plain; charset=utf-8");
function sb_host($s) {
  $s = strtolower(trim((string)$s));
  if ($s === "") return "";
  if (strpos($s, "://") !== false) {
    $p = parse_url($s);
    return isset($p["host"]) ? $p["host"] : "";
  }
  return explode(":", $s)[0];
}
function sb_html_ok($kind) {
  header("Content-Type: text/html; charset=utf-8");
  echo "<!doctype html><meta charset=utf-8><title>ok</title>";
  echo "<p style=\"font:28px/1.4 -apple-system,sans-serif;margin:48px\">ok</p>";
  echo "<script>(function(){var A='https://sebikk5-droid.github.io';";
  echo "function send(m){try{if(window.opener)window.opener.postMessage(m,A);}catch(e){}}";
  if ($kind === "ready") {
    echo "send({type:'ready'});";
    echo "window.addEventListener('message',function(e){";
    echo "if(e.origin!==A)return;var d=e.data||{};";
    echo "if(d.type==='put'&&d.filename){";
    echo "var b=new FormData();b.append('filename',d.filename);b.append('json',d.json||'');";
    echo "fetch(location.href,{method:'POST',body:b,credentials:'same-origin'}).then(function(r){";
    echo "send({type:'put-result',ok:!!(r.ok||r.status===201),status:r.status});";
    echo "}).catch(function(){send({type:'put-result',ok:false});});";
    echo "}});";
  } else {
    echo "send({type:'put-result',ok:true,status:201});";
    echo "setTimeout(function(){try{window.close();}catch(e){}},800);";
  }
  echo "})();</script>";
}
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
$httpHost = isset($_SERVER["HTTP_HOST"]) ? $_SERVER["HTTP_HOST"] : "";
$allow = ($origin === "https://sebikk5-droid.github.io")
  || (sb_host($origin) !== "" && sb_host($origin) === sb_host($httpHost))
  || (bool)preg_match('#^http://(127\\.0\\.0\\.1|localhost)(:\\d+)?$#', $origin);
if ($allow) {
  header("Access-Control-Allow-Origin: ".$origin);
  header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Private-Network: true");
header("Access-Control-Max-Age: 86400");
$method = isset($_SERVER["REQUEST_METHOD"]) ? $_SERVER["REQUEST_METHOD"] : "GET";
if ($method === "OPTIONS") {
  http_response_code(204);
  exit;
}
if ($origin !== "" && !$allow) {
  http_response_code(403);
  echo "origin";
  exit;
}
if ($method === "GET") {
  http_response_code(200);
  sb_html_ok("ready");
  exit;
}
if ($method !== "POST") {
  http_response_code(405);
  echo "POST";
  exit;
}

$j = null;
if (isset($_POST["filename"])) {
  $j = array(
    "filename" => $_POST["filename"],
    "json" => isset($_POST["json"]) ? $_POST["json"] : ""
  );
} else {
  $raw = file_get_contents("php://input");
  if ($raw === false || strlen($raw) > 2000000) {
    http_response_code(413);
    echo "size";
    exit;
  }
  $j = json_decode($raw, true);
}
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
if (isset($_POST["filename"])) {
  sb_html_ok("saved");
  exit;
}
echo "ok";

<?php
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
if ($origin === "https://sebikk5-droid.github.io") {
  header("Access-Control-Allow-Origin: ".$origin);
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Access-Control-Allow-Private-Network: true");
$method = isset($_SERVER["REQUEST_METHOD"]) ? $_SERVER["REQUEST_METHOD"] : "GET";
if ($method === "OPTIONS") { http_response_code(204); exit; }
if ($method === "GET") {
  header("Content-Type: text/html; charset=utf-8");
  echo "<!doctype html><meta charset=utf-8><title>ok</title>";
  echo "<p style=\"font:18px sans-serif;margin:16px\">ok</p>";
  echo "<script>\n";
  echo "var A='https://sebikk5-droid.github.io';\n";
  echo "function send(m){try{if(window.opener)window.opener.postMessage(m,A);}catch(e){}try{if(window.parent&&window.parent!==window)window.parent.postMessage(m,A);}catch(e){}}\n";
  echo "send({type:'ready'});\n";
  echo "window.addEventListener('message',function(e){\n";
  echo "if(e.origin!==A)return;\n";
  echo "var d=e.data||{};\n";
  echo "if(d.type!=='put')return;\n";
  echo "var x=new XMLHttpRequest();\n";
  echo "x.open('POST',location.href,true);\n";
  echo "x.onload=function(){send({type:'put-result',ok:(x.status===201||x.status===200),status:x.status});if(window.parent===window)setTimeout(function(){try{window.close();}catch(e){}},200);};\n";
  echo "x.onerror=function(){send({type:'put-result',ok:false});};\n";
  echo "x.setRequestHeader('Content-Type','application/x-www-form-urlencoded');\n";
  echo "x.send('filename='+encodeURIComponent(d.filename||'')+'&json='+encodeURIComponent(d.json||''));\n";
  echo "});\n";
  echo "</script>";
  exit;
}
if ($method !== "POST") { http_response_code(405); echo "POST"; exit; }
$filename = isset($_POST["filename"]) ? $_POST["filename"] : "";
$json = isset($_POST["json"]) ? $_POST["json"] : "";
if ($filename === "") {
  $j = json_decode(file_get_contents("php://input"), true);
  if (is_array($j)) {
    $filename = isset($j["filename"]) ? $j["filename"] : "";
    $json = isset($j["json"]) ? $j["json"] : "";
  }
}
$name = preg_replace("/[^A-Za-z0-9._-]+/", "_", basename(str_replace("\\", "/", $filename)));
if ($name === "" || $name === "." || $name === "..") $name = "bericht.json";
if (!preg_match("/\\.json$/i", $name)) $name .= ".json";
if (!is_string($json)) $json = json_encode($json);
$dir = __DIR__;
$hist = $dir.DIRECTORY_SEPARATOR."historie";
if (is_dir($hist) || @mkdir($hist, 0755, true)) $dir = $hist;
if (@file_put_contents($dir.DIRECTORY_SEPARATOR.$name, $json) === false) {
  http_response_code(500);
  echo "write";
  exit;
}
http_response_code(201);
echo "ok";

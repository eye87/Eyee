<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond(int $status,array $data): void {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
function publicScores(array $records): array {
  return array_map(static fn($item)=>['name'=>$item['name'],'score'=>(int)$item['score'],'level'=>(int)$item['level']],array_slice($records,0,5));
}
$path=__DIR__.'/game-data/leaderboard.php';
$prefix='<?php exit; ?>'."\n";
$file=@fopen($path,'c+');
if (!$file||!flock($file,LOCK_EX)) respond(503,['error'=>'Leaderboard temporarily unavailable']);
$raw=stream_get_contents($file);
$records=json_decode(substr($raw,0,strlen($prefix))===$prefix?substr($raw,strlen($prefix)):'[]',true);
if (!is_array($records)) $records=[];
if ($_SERVER['REQUEST_METHOD']==='GET' && ($_GET['action']??'')==='list') respond(200,['scores'=>publicScores($records)]);
if ($_SERVER['REQUEST_METHOD']!=='POST') respond(405,['error'=>'POST required']);
$request=json_decode(file_get_contents('php://input'),true);
if (!is_array($request)) respond(400,['error'=>'Invalid request']);
$name=trim((string)($request['name']??''));
$name=preg_replace('/[\x00-\x1F\x7F<>]/u','',$name);
$name=trim(preg_replace('/\s+/u',' ',$name));
if ($name===''||strlen($name)>72 || preg_match_all('/./u',$name)>24) respond(400,['error'=>'Use a name of no more than 24 characters']);
$roomId=$request['room']??'';$token=$request['token']??'';$run=$request['run']??null;
if (!is_string($roomId)||!preg_match('/^[a-f0-9]{12}$/',$roomId)||!is_string($token)||!preg_match('/^[a-f0-9]{32}$/',$token)||!is_int($run)) respond(400,['error'=>'Invalid game data']);
$roomPath=sys_get_temp_dir().'/eyee-game-'.sha1(__DIR__).'.json';
$roomFile=@fopen($roomPath,'r');
if (!$roomFile||!flock($roomFile,LOCK_SH)) respond(404,['error'=>'Game session not found']);
$rooms=json_decode(stream_get_contents($roomFile)?:'{}',true);
flock($roomFile,LOCK_UN);fclose($roomFile);
$room=$rooms[$roomId]??null;
if (!is_array($room)||!isset($room['players'][$token])||(int)$room['run']!==$run) respond(404,['error'=>'Game session expired']);
$score=(int)($room['baseScore']??0)+(int)($room['levelScore']??(count($room['eaten']??[])*10));
$level=(int)($room['level']??1);
if ($score<=0) respond(400,['error'=>'Score some points first']);
$runKey=hash('sha256',$roomId.':'.$run.':'.$token);
$existing=null;
foreach ($records as $i=>$record) if (($record['runKey']??'')===$runKey) {$existing=$i;break;}
if ($existing===null && count($records)>=5 && $score<=(int)$records[4]['score']) respond(409,['error'=>'You need a higher score to reach the Top 5']);
if ($existing!==null) {
  $records[$existing]['score']=max((int)$records[$existing]['score'],$score);
  $records[$existing]['level']=max((int)$records[$existing]['level'],$level);
  $records[$existing]['name']=$name;
} else {
  $records[]=['name'=>$name,'score'=>$score,'level'=>$level,'runKey'=>$runKey,'time'=>time()];
}
usort($records,static fn($a,$b)=>((int)$b['score']<=>(int)$a['score']) ?: ((int)$a['time']<=>(int)$b['time']));
$records=array_slice($records,0,5);
rewind($file);ftruncate($file,0);fwrite($file,$prefix.json_encode($records,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));fflush($file);flock($file,LOCK_UN);fclose($file);
respond(200,['scores'=>publicScores($records)]);

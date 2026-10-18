<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function reply(int $status, array $payload): void { http_response_code($status); echo json_encode($payload, JSON_UNESCAPED_SLASHES); exit; }
function pickBonusCell(array $room, int $cols, int $rows): ?array {
  $candidates=[];$near=[];
  for ($y=3;$y<$rows-3;$y++) for ($x=3;$x<$cols-3;$x++) {
    if ($y%4===3 && $x%8>=3 && $x%8<=7) continue;
    if ($x===intdiv($cols,2) && $y%8>=2 && $y%8<=5) continue;
    if (isset($room['eaten'][$x.','.$y])) continue;
    $distance=PHP_INT_MAX;
    foreach ($room['players'] as $member) $distance=min($distance,abs($x-(int)$member['x'])+abs($y-(int)$member['y']));
    if ($distance<2) continue;
    $cell=[$x,$y];$candidates[]=$cell;
    if ($distance<=6) $near[]=$cell;
  }
  $choices=$near?:$candidates;
  return $choices ? $choices[random_int(0,count($choices)-1)] : null;
}
function totalDots(int $cols, int $rows): int {
  $total=0;
  for ($y=1;$y<$rows-1;$y++) for ($x=1;$x<$cols-1;$x++) {
    if ($x===1 && $y===1) continue;
    $wall=($x>2 && $x<$cols-3 && $y>2 && $y<$rows-3 && $y%4===3 && $x%8>=3 && $x%8<=7)
      || ($x===intdiv($cols,2) && $y%8>=2 && $y%8<=5);
    if (!$wall) $total++;
  }
  return $total;
}
function boardSize(int $level): array {
  return $level===1 ? [17,13] : [17+2*$level,13+2*$level];
}
function finalBossShieldActive(array $room, float $now): bool {
  if ((int)$room['level']!==5 || $room['phase']!=='boss' || (int)($room['bossStage']??1)!==1) return false;
  if ((float)($room['rageUntil']??0)>$now) return false;
  $elapsed=max(0,$now-(float)($room['bossStartedAt']??$now));
  return fmod($elapsed+7.0,8.0)<2.5;
}
function bossPosition(array $room, int $cols, int $rows, float $now): array {
  if ((int)($room['bossStage']??1)===2) {
    $elapsed=max(0,$now-(float)($room['bossStage2StartedAt']??$now));
    $cycle=min(3,(int)floor($elapsed/3.6));$within=$elapsed-$cycle*3.6;
    $x=(int)($room['bossStage2X']??intdiv($cols,2));
    if ($cycle===0 && $within<.65) {
      $entryY=max(3,intdiv($rows,2)-2);$t=$within/.65;
      $y=$entryY+(2-$entryY)*(1-pow(1-$t,3));
    }
    elseif ($within<1.6) $y=2;
    elseif ($within<2.2) $y=2+($rows-4)*($within-1.6)/.6;
    elseif ($cycle===3) $y=$rows-2+5*min(1,($within-2.2)/1.4);
    else $y=$rows-2-($rows-4)*min(1,($within-2.2)/1.4);
    return ['x'=>$x,'y'=>$y,'dx'=>0];
  }
  $middle=intdiv($cols,2);$distance=max(2,min(4,$middle-4));$stepSeconds=((int)$room['level']===5)?0.448:0.672;$steps=(int)floor(max(0,$now-(float)($room['bossStartedAt']??$now))/$stepSeconds);
  $period=$distance*4;$part=$steps%$period;
  $offset=$part<=$distance ? $part : ($part<=$distance*3 ? $distance*2-$part : $part-$distance*4);
  return ['x'=>$middle+$offset,'y'=>max(3,intdiv($rows,2)-2),'dx'=>$part<$distance || $part>=$distance*3 ? 1:-1];
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['error'=>'POST required']);
$request=json_decode(file_get_contents('php://input'),true);
if (!is_array($request)) reply(400,['error'=>'Invalid JSON']);
$action=$request['action']??'';
if (!in_array($action,['join','sync','leave','reserve'],true)) reply(400,['error'=>'Invalid action']);
$path=sys_get_temp_dir().'/eyee-game-'.sha1(__DIR__).'.json';
$file=@fopen($path,'c+');
if (!$file || !flock($file,LOCK_EX)) reply(503,['error'=>'Game room unavailable']);
$rooms=json_decode(stream_get_contents($file)?:'{}',true);
if (!is_array($rooms)) $rooms=[];
$now=microtime(true);
foreach ($rooms as $roomId=>&$room) {
  if (!is_array($room) || !isset($room['players']) || !is_array($room['players'])) {unset($rooms[$roomId]);continue;}
  foreach ($room['players'] as $token=>$player) if (!is_array($player)||$now-(float)($player['seen']??0)>12) unset($room['players'][$token]);
  if (!$room['players']) unset($rooms[$roomId]);
}
unset($room);
$status=200;$result=[];
if ($action==='join') {
  $roomId=null;
  $requestedRoom=$request['room']??null;
  if ($requestedRoom!==null) {
    if (!is_string($requestedRoom)||!preg_match('/^[a-f0-9]{12}$/',$requestedRoom)) { $status=400;$result=['error'=>'Invalid room']; }
    elseif (!isset($rooms[$requestedRoom])) { $status=404;$result=['error'=>'Invitation expired']; }
    elseif (count($rooms[$requestedRoom]['players'])>=2) { $status=409;$result=['error'=>'Game room is full']; }
    else $roomId=$requestedRoom;
  } elseif (empty($request['newRoom'])) {
    foreach ($rooms as $id=>$candidate) if (empty($candidate['private'])&&count($candidate['players'])===1) {$roomId=$id;break;}
  }
  if ($status===200) {
    if ($roomId===null) {
      $roomId=bin2hex(random_bytes(6));
      $rooms[$roomId]=['generation'=>1,'run'=>1,'level'=>1,'baseScore'=>0,'levelScore'=>0,'earnedScore'=>0,'eaten'=>[],'removedWalls'=>[],'ghostAwards'=>[],'purchases'=>[],'players'=>[],'private'=>false,'bonus'=>null,'nextBonusAt'=>$now+random_int(5,7),'multiplier'=>1,'multiplierUntil'=>0,'rageUntil'=>0,'nextRageAt'=>$now+random_int(18,26),'bossRageWave'=>0,'bossMinionKills'=>[],'phase'=>'dots','bossHp'=>0,'bossMaxHp'=>0,'bossHits'=>[],'bossStage'=>1,'floorDamage'=>0,'hasKey'=>false,'droppedKey'=>null];
    }
    $token=bin2hex(random_bytes(16));
    $slots=array_column($rooms[$roomId]['players'],'slot');
    $slot=in_array(1,$slots,true)?2:1;
    [, $row]=boardSize((int)$rooms[$roomId]['level']);
    $rooms[$roomId]['players'][$token]=['slot'=>$slot,'x'=>1,'y'=>$slot===1?1:$row-2,'blasterLevel'=>0,'bossBlaster'=>false,'wallEaterLevel'=>0,'wallEaterUntil'=>0,'seen'=>$now];
    $result=['room'=>$roomId,'token'=>$token,'slot'=>$slot];
  }
} else {
  $roomId=$request['room']??'';$token=$request['token']??'';
  if (!is_string($roomId)||!preg_match('/^[a-f0-9]{12}$/',$roomId)||!is_string($token)||!preg_match('/^[a-f0-9]{32}$/',$token)||!isset($rooms[$roomId]['players'][$token])) {
    $status=404;$result=['error'=>'Game room expired'];
  } elseif ($action==='reserve') {
    $rooms[$roomId]['private']=true;
    $rooms[$roomId]['players'][$token]['seen']=$now;
    $result=['ok'=>true,'room'=>$roomId,'players'=>count($rooms[$roomId]['players'])];
  } elseif ($action==='leave') {
    unset($rooms[$roomId]['players'][$token]);
    if (!$rooms[$roomId]['players']) unset($rooms[$roomId]);
    $result=['ok'=>true];
  } else {
    $room=&$rooms[$roomId];
    if (!empty($request['restart'])) {
      $room['run']=(int)($room['run']??1)+1;$room['generation']++;
      $room['level']=1;$room['baseScore']=0;$room['levelScore']=0;$room['earnedScore']=0;$room['eaten']=[];$room['removedWalls']=[];$room['ghostAwards']=[];$room['purchases']=[];
      $room['bonus']=null;$room['nextBonusAt']=$now+random_int(5,7);$room['multiplier']=1;$room['multiplierUntil']=0;
      $room['rageUntil']=0;$room['nextRageAt']=$now+random_int(18,26);$room['bossRageWave']=0;$room['bossMinionKills']=[];
      $room['phase']='dots';$room['bossHp']=0;$room['bossMaxHp']=0;$room['bossHits']=[];$room['bossStage']=1;$room['floorDamage']=0;$room['floorImpacts']=[];$room['bossStage2StartedAt']=null;$room['bossStage2X']=null;$room['floorBreakX']=null;$room['hasKey']=false;$room['droppedKey']=null;$room['bossStartedAt']=null;
      foreach ($room['players'] as &$p) {$p['x']=1;$p['y']=$p['slot']===1?1:11;$p['blasterLevel']=0;$p['bossBlaster']=false;$p['wallEaterLevel']=0;$p['wallEaterUntil']=0;}
      unset($p);
    }
    $generation=(int)($request['generation']??0);
    $sameGeneration=$generation===(int)$room['generation'];
    [$cols,$rows]=boardSize((int)$room['level']);
    if (!isset($room['levelScore'])) $room['levelScore']=count($room['eaten'])*10;
    if (!isset($room['earnedScore'])) $room['earnedScore']=(int)$room['baseScore']+(int)$room['levelScore'];
    if (!isset($room['purchases']) || !is_array($room['purchases'])) $room['purchases']=[];
    if (!isset($room['phase'])) $room['phase']='dots';
    if (!isset($room['bossStage'])) $room['bossStage']=1;
    if (!isset($room['floorDamage'])) $room['floorDamage']=0;
    if (!isset($room['floorImpacts'])) $room['floorImpacts']=[];
    if (!isset($room['bossHits']) || !is_array($room['bossHits'])) $room['bossHits']=[];
    if ($room['phase']==='boss' && !isset($room['bossMaxHp'])) {
      $room['bossMaxHp']=(int)$room['level']===5?32:max(5,(int)$room['level']+4);
      $room['bossHp']=$room['bossMaxHp'];
    }
    if ($room['phase']==='boss' && empty($room['bossStartedAt'])) $room['bossStartedAt']=$now;
    if (!isset($room['removedWalls']) || !is_array($room['removedWalls'])) $room['removedWalls']=[];
    if (!isset($room['multiplier'])) $room['multiplier']=1;
    if (($room['multiplierUntil']??0)<=$now) {$room['multiplier']=1;$room['multiplierUntil']=0;}
    if (!isset($room['rageUntil'])) $room['rageUntil']=0;
    if (!isset($room['nextRageAt'])) $room['nextRageAt']=$now+random_int(18,26);
    if (!isset($room['bossRageWave'])) $room['bossRageWave']=0;
    if (!isset($room['bossMinionKills'])) $room['bossMinionKills']=[];
    if (!empty($room['bonus']) && ($room['bonus']['expiresAt']??0)<=$now) {
      $room['bonus']=null;$room['nextBonusAt']=$now+random_int(12,18);
    }
    $player=&$room['players'][$token];
    $purchaseResults=[];
    if ($sameGeneration) {
      $player['x']=max(1,min($cols-2,(int)($request['x']??$player['x'])));
      $player['y']=max(1,min($rows-2,(int)($request['y']??$player['y'])));
      $claim=$request['claimBonus']??null;
      if (is_string($claim) && !empty($room['bonus']) && $claim===$room['bonus']['x'].','.$room['bonus']['y']) {
        $room['multiplier']=(int)$room['bonus']['multiplier'];$room['multiplierUntil']=$now+7;
        $room['bonus']=null;$room['nextBonusAt']=$now+random_int(12,18);
      }
      if (isset($request['eaten']) && is_array($request['eaten'])) {
        foreach (array_slice($request['eaten'],0,255) as $cell) {
          if (!is_string($cell)||!preg_match('/^(\d{1,3}),(\d{1,3})$/',$cell,$match)) continue;
          $x=(int)$match[1];$y=(int)$match[2];
          if ($x>0&&$x<$cols-1&&$y>0&&$y<$rows-1&&!isset($room['eaten'][$cell])) {
            $room['eaten'][$cell]=true;
            $points=10*(int)$room['multiplier'];
            if ($room['rageUntil']>$now) $points=(int)round($points*1.2);
            $room['levelScore']+=$points;$room['earnedScore']+=$points;
          }
        }
      }
      if ($room['phase']==='dots' && count($room['eaten'])>=totalDots($cols,$rows)) {
        $room['phase']='boss';$room['bossStage']=1;$room['floorDamage']=0;$room['floorImpacts']=[];$room['bossStartedAt']=$now;$room['bossMaxHp']=(int)$room['level']===5?32:max(5,(int)$room['level']+4);$room['bossHp']=$room['bossMaxHp'];
        foreach ($room['players'] as &$p) $p['bossBlaster']=false;
        unset($p);
        $room['bonus']=null;$room['rageUntil']=0;$room['bossRageWave']=0;$room['bossMinionKills']=[];
        if ((int)$room['level']===5) $room['nextRageAt']=$now+4.5;
      }
      if ($room['phase']==='dots' && $room['rageUntil']<=$now && $room['nextRageAt']<=$now) {
        $room['rageUntil']=$now+5;
        $room['nextRageAt']=$room['rageUntil']+random_int(30,42);
      }
      if ($room['phase']==='boss' && (int)$room['level']===5 && (int)$room['bossStage']===1 && $room['rageUntil']<=$now && $room['nextRageAt']<=$now) {
        $room['rageUntil']=$now+8;$room['nextRageAt']=$room['rageUntil']+12;
        $room['bossRageWave']++;$room['bossMinionKills']=[];
      }
      if ($room['phase']==='boss' && !empty($request['pickupBlaster']) && empty($player['bossBlaster']) && $player['x']===3 && $player['y']===$rows-4) {
        $player['bossBlaster']=true;
        $player['blasterLevel']=min(5,(int)($player['blasterLevel']??0)+1);
      }
      if ($room['phase']==='boss' && (int)$room['bossStage']===1 && isset($request['bossHits']) && is_array($request['bossHits'])) {
        foreach (array_slice($request['bossHits'],0,16) as $hit) {
          if (!is_string($hit)||!preg_match('/^\d{1,6}$/',$hit)) continue;
          $hitKey=$token.':'.$hit;
          if (isset($room['bossHits'][$hitKey]) || $now-(float)($player['lastBossHitAt']??0)<.24 || finalBossShieldActive($room,$now) || empty($player['bossBlaster']) && empty($player['blasterLevel'])) continue;
          $room['bossHits'][$hitKey]=true;$player['lastBossHitAt']=$now;
          $room['bossHp']=max(0,(int)$room['bossHp']-max(1,(int)($player['blasterLevel']??0)));
          if ($room['bossHp']===0) {
            if ((int)$room['level']===5) {
              $room['bossStage']=2;$room['bossStage2StartedAt']=$now;$room['bossStage2X']=intdiv($cols,2);
              $room['floorDamage']=0;$room['floorImpacts']=[];$room['floorBreakX']=intdiv($cols,2);$room['rageUntil']=0;$room['nextRageAt']=$now+3600;
            }
            else {$position=bossPosition($room,$cols,$rows,$now);$room['droppedKey']=['x'=>$position['x'],'y'=>$position['y']];$room['phase']='key';}
            if ((int)$room['level']!==5) {$room['levelScore']+=500;$room['earnedScore']+=500;}
            break;
          }
        }
      }
      if ($room['phase']==='boss' && (int)$room['bossStage']===2) {
        $elapsed=max(0,$now-(float)$room['bossStage2StartedAt']);
        if ($elapsed>=14.4) {
          $room['phase']='won';$room['levelScore']+=500;$room['earnedScore']+=500;
        } else {
          $cycle=min(3,(int)floor($elapsed/3.6));$within=$elapsed-$cycle*3.6;
          if ($within<1.6) {
            $difference=$player['x']-(int)$room['bossStage2X'];
            $room['bossStage2X']=max(3,min($cols-4,(int)$room['bossStage2X']+max(-2,min(2,$difference))));
          }
          if ($within>=2.2 && (int)$room['floorDamage']<$cycle+1) {
            $room['floorDamage']=$cycle+1;$room['floorBreakX']=$room['bossStage2X'];
            $room['floorImpacts'][]=['x'=>(int)$room['bossStage2X'],'level'=>$cycle+1];
          }
        }
      }
      if ($room['phase']==='key' && !empty($request['claimKey']) && is_array($room['droppedKey'])
        && abs($player['x']-$room['droppedKey']['x'])+abs($player['y']-$room['droppedKey']['y'])<=1) {
        $room['phase']='door';$room['hasKey']=true;$room['droppedKey']=null;
      }
      if (!isset($room['ghostAwards']) || !is_array($room['ghostAwards'])) $room['ghostAwards']=[];
      if (isset($request['ghostKills']) && is_array($request['ghostKills'])) {
        foreach (array_slice($request['ghostKills'],0,16) as $kill) {
          if (!is_string($kill)||!preg_match('/^(\d{1,3}):(\d{1,2}):(\d{1,4})$/',$kill,$match)) continue;
          $minion=$room['phase']==='boss' && (int)$room['level']===5;
          if ((int)$match[1] !== (int)$room['level'] || (int)$match[2]>=($minion?3:max(2,(int)$room['level']))) continue;
          if ($minion && ($room['rageUntil']<=$now || isset($room['bossMinionKills'][(int)$match[2]]))) continue;
          if (!$minion && $room['phase']!=='dots') continue;
          $awardKey=$minion?'boss-minion:'.$room['bossRageWave'].':'.$match[2]:$token.':'.$kill;
          if (isset($room['ghostAwards'][$awardKey])) continue;
          $room['ghostAwards'][$awardKey]=true;
          if ($minion) $room['bossMinionKills'][(int)$match[2]]=true;
          $points=$minion?100:((int)$match[2]===2 ? 500 : (int)$room['level']*100);
          $room['levelScore']+=$points;$room['earnedScore']+=$points;
        }
      }
      if (isset($request['purchases']) && is_array($request['purchases'])) {
        foreach (array_slice($request['purchases'],0,16) as $purchase) {
          if (!is_array($purchase)) continue;
          $id=$purchase['id']??null;$type=$purchase['type']??null;
          if (!is_string($id)||!preg_match('/^\d{1,5}$/',$id)||!in_array($type,['life','pause','magnet','blaster','wallEater'],true)) continue;
          $purchaseKey=$token.':'.$id;
          if (isset($room['purchases'][$purchaseKey])) {$purchaseResults[$id]=true;continue;}
          $tier=(int)($player['blasterLevel']??0);
          $cost=$type==='life'||$type==='wallEater'?500:($type==='pause'||$type==='magnet'?300:($tier<5?300*($tier+1):PHP_INT_MAX));
          if ($type==='wallEater' && (int)($player['wallEaterLevel']??0)===(int)$room['level']) {$purchaseResults[$id]=false;continue;}
          if ((int)$room['baseScore']+(int)$room['levelScore']<$cost) {$purchaseResults[$id]=false;continue;}
          $room['levelScore']-=$cost;
          if ($type==='blaster') $player['blasterLevel']=$tier+1;
          if ($type==='wallEater') {$player['wallEaterLevel']=$room['level'];$player['wallEaterUntil']=$now+20;}
          $room['purchases'][$purchaseKey]=$type;
          $purchaseResults[$id]=true;
        }
      }
      if ((int)($player['wallEaterLevel']??0)===(int)$room['level'] && (float)($player['wallEaterUntil']??0)>$now && isset($request['brokenWalls']) && is_array($request['brokenWalls'])) {
        foreach (array_slice($request['brokenWalls'],0,255) as $cell) {
          if (!is_string($cell)||!preg_match('/^(\d{1,3}),(\d{1,3})$/',$cell,$match)) continue;
          $x=(int)$match[1];$y=(int)$match[2];
          $isInnerWall=($x>2 && $x<$cols-3 && $y>2 && $y<$rows-3 && $y%4===3 && $x%8>=3 && $x%8<=7)
            || ($x===intdiv($cols,2) && $y%8>=2 && $y%8<=5);
          if ($x>0 && $x<$cols-1 && $y>0 && $y<$rows-1 && $isInnerWall) $room['removedWalls'][$cell]=true;
        }
      }
      if (!empty($request['advance']) && (int)$room['level']<5 && $room['phase']==='door' && !empty($room['hasKey'])
        && $player['x']===intdiv($cols,2) && $player['y']===$rows-2) {
        $room['baseScore']=(int)$room['baseScore']+(int)$room['levelScore'];
        $room['level']=(int)$room['level']+1;$room['generation']++;$room['eaten']=[];$room['removedWalls']=[];$room['ghostAwards']=[];$room['levelScore']=0;
        $room['bonus']=null;$room['multiplier']=1;$room['multiplierUntil']=0;
        $room['rageUntil']=0;$room['nextRageAt']=$now+random_int(18,26);$room['bossRageWave']=0;$room['bossMinionKills']=[];
        $room['nextBonusAt']=$now+random_int(5,7);
        $room['phase']='dots';$room['bossHp']=0;$room['bossMaxHp']=0;$room['bossHits']=[];$room['bossStage']=1;$room['floorDamage']=0;$room['floorImpacts']=[];$room['bossStage2StartedAt']=null;$room['bossStage2X']=null;$room['floorBreakX']=null;$room['hasKey']=false;$room['droppedKey']=null;$room['bossStartedAt']=null;
        [, $rows]=boardSize((int)$room['level']);
        foreach ($room['players'] as &$p) {$p['x']=1;$p['y']=$p['slot']===1?1:$rows-2;$p['bossBlaster']=false;$p['wallEaterLevel']=0;$p['wallEaterUntil']=0;}
        unset($p);
      }
    }
    if ($room['phase']==='dots' && empty($room['bonus']) && (float)($room['nextBonusAt']??0)<=$now && (int)$room['multiplier']===1) {
      [$bonusCols,$bonusRows]=boardSize((int)$room['level']);
      $position=pickBonusCell($room,$bonusCols,$bonusRows);
      if ($position) $room['bonus']=['x'=>$position[0],'y'=>$position[1],'multiplier'=>random_int(1,100)<=28?3:2,'expiresAt'=>$now+10];
      else $room['nextBonusAt']=$now+10;
    }
    $player['seen']=$now;unset($player);
    $players=[];
    foreach ($room['players'] as $id=>$member) $players[]=['slot'=>$member['slot'],'x'=>$member['x'],'y'=>$member['y'],'self'=>$id===$token,'blasterLevel'=>$id===$token?(int)($member['blasterLevel']??0):null,'bossBlaster'=>$id===$token?!empty($member['bossBlaster']):null,'wallEaterLevel'=>$id===$token?(int)($member['wallEaterLevel']??0):null,'wallEaterRemainingMs'=>$id===$token?(int)round(max(0,(float)($member['wallEaterUntil']??0)-$now)*1000):null];
    [$bossCols,$bossRows]=boardSize((int)$room['level']);
    $boss=$room['phase']==='boss'?bossPosition($room,$bossCols,$bossRows,$now):null;
    $result=['generation'=>$room['generation'],'run'=>$room['run'],'level'=>$room['level'],'eaten'=>array_keys($room['eaten']),'removedWalls'=>array_keys($room['removedWalls']),'score'=>(int)$room['baseScore']+(int)$room['levelScore'],'earnedScore'=>(int)$room['earnedScore'],'purchaseResults'=>$purchaseResults,'players'=>$players,'bonus'=>!empty($room['bonus'])?['x'=>$room['bonus']['x'],'y'=>$room['bonus']['y'],'multiplier'=>$room['bonus']['multiplier'],'remainingMs'=>(int)round(max(0,(float)$room['bonus']['expiresAt']-$now)*1000)]:null,'multiplier'=>$room['multiplier'],'multiplierRemainingMs'=>(int)round(max(0,(float)($room['multiplierUntil']??0)-$now)*1000),'rageRemainingMs'=>(int)round(max(0,(float)$room['rageUntil']-$now)*1000),'rageNextMs'=>(int)round(max(0,(float)$room['nextRageAt']-$now)*1000),'bossRageWave'=>(int)$room['bossRageWave'],'bossMinionKills'=>array_map('intval',array_keys($room['bossMinionKills'])),'phase'=>$room['phase'],'bossStage'=>(int)$room['bossStage'],'floorDamage'=>(int)$room['floorDamage'],'floorBreakX'=>(int)($room['floorBreakX']??intdiv($bossCols,2)),'floorImpacts'=>$room['floorImpacts'],'bossStage2ElapsedMs'=>(int)round(max(0,$now-(float)($room['bossStage2StartedAt']??$now))*1000),'bossHp'=>(int)($room['bossHp']??0),'bossMaxHp'=>(int)($room['bossMaxHp']??0),'bossElapsedMs'=>$room['phase']==='boss'?(int)round(max(0,$now-(float)($room['bossStartedAt']??$now))*1000):0,'hasKey'=>!empty($room['hasKey']),'droppedKey'=>$room['droppedKey']??null,'boss'=>$boss];
    unset($room);
  }
}
rewind($file);ftruncate($file,0);fwrite($file,json_encode($rooms,JSON_UNESCAPED_SLASHES));fflush($file);flock($file,LOCK_UN);fclose($file);
reply($status,$result);

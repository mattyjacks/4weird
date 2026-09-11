param([string]$Mode,[string]$Out,[string]$Game,[string]$Inputs,[string]$Log,[string]$Fovea,[string]$Thumbs)
Add-Type -AssemblyName System.Drawing
if($Mode -eq 'H'){$w=1920;$h=1080}else{$w=1080;$h=1920}
$bmp=New-Object Drawing.Bitmap $w,$h; $g=[Drawing.Graphics]::FromImage($bmp); $g.Clear([Drawing.Color]::FromArgb(22,8,12,24));
$font=New-Object Drawing.Font('Arial',22,[Drawing.FontStyle]::Bold);$small=New-Object Drawing.Font('Consolas',18);$tiny=New-Object Drawing.Font('Consolas',13);$white=[Drawing.Brushes]::White;$cyan=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(235,90,230,255));$panel=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(130,5,12,28));$pen=New-Object Drawing.Pen([Drawing.Color]::FromArgb(230,90,230,255),3)
# Foveated-vision style: lime boundaries for AI detail crops, yellow dashed when
# the take has no fovea events and the default FPS plan is shown instead.
$limePen=New-Object Drawing.Pen([Drawing.Color]::FromArgb(255,80,255,140),5)
$yellowPen=New-Object Drawing.Pen([Drawing.Color]::FromArgb(255,250,210,90),4)
$yellowPen.DashStyle=[Drawing.Drawing2D.DashStyle]::Dash
$limeBrush=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255,80,255,140))
$yellowBrush=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255,250,210,90))
# Parse -Fovea "label:x,y,w,h|..." (normalized 0-1000, optional default-plan| prefix).
$foveaIsDefault=$false;$foveaRects=@()
if([string]::IsNullOrWhiteSpace($Fovea)){$Fovea='default'}
foreach($part in $Fovea.Split('|')){
  if($part -eq 'default-plan'){$foveaIsDefault=$true;continue}
  if($part -eq 'default'){$foveaIsDefault=$true;continue}
  if([string]::IsNullOrWhiteSpace($part)){continue}
  $ci=$part.IndexOf(':');if($ci -lt 0){continue}
  $label=$part.Substring(0,$ci);$coords=$part.Substring($ci+1).Split(',')
  if($coords.Count -lt 4){continue}
  try{$foveaRects+=@(@{label=$label;x=[int]$coords[0];y=[int]$coords[1];w=[int]$coords[2];h=[int]$coords[3]})}catch{}
}
if($foveaRects.Count -eq 0){$foveaIsDefault=$true;$foveaRects=@(@{label='center-context';x=300;y=300;w=400;h=400},@{label='crosshair-fovea';x=390;y=390;w=220;h=220})}
$thumbPaths=@()
if(-not [string]::IsNullOrWhiteSpace($Thumbs)){foreach($t in $Thumbs.Split('|')){if((-not [string]::IsNullOrWhiteSpace($t)) -and (Test-Path $t)){$thumbPaths+=@($t)}}}
$foveaNoun=if($foveaRects.Count -eq 1){'1 detail crop'}else{"$($foveaRects.Count) detail crops"}
# H panel lines truncate at 42 chars (shared with every other line), so keep
# the FOVEA line short; full rects stay visible on V (88 chars) + thumbnails.
$foveaLine=if($foveaIsDefault){"FOVEA: default plan ($($foveaRects.Count) crops + overview)"}else{"FOVEA: $foveaNoun + overview"}
$cropBits=@();for($i=0;$i -lt $foveaRects.Count;$i++){$r=$foveaRects[$i];$cropBits+=@("crop$($i+1) `"$($r.label)`" [$($r.x),$($r.y),$($r.w),$($r.h)]")}
$cropsLine='CROPS: '+($cropBits -join ' | ')
if($Mode -eq 'H'){
  # Boundaries burn onto the gameplay area: the H filter scales the take to
  # exactly 1920x1080, so normalized rects map 1:1 onto this canvas.
  for($i=0;$i -lt $foveaRects.Count;$i++){
    $r=$foveaRects[$i]
    $rx=[Math]::Max(0,[int]($r.x/1000*1920));$ry=[Math]::Max(0,[int]($r.y/1000*1080))
    $rw=[Math]::Max(8,[int]($r.w/1000*1920));$rh=[Math]::Max(8,[int]($r.h/1000*1080))
    if($rx+$rw -gt 1920){$rw=1920-$rx};if($ry+$rh -gt 1080){$rh=1080-$ry}
    $box=New-Object Drawing.Rectangle($rx,$ry,$rw,$rh)
    $bp=if($foveaIsDefault){$yellowPen}else{$limePen}
    $bt=if($foveaIsDefault){$yellowBrush}else{$limeBrush}
    $g.DrawRectangle($bp,$box)
    $ly=[Math]::Max(2,$ry-24);$g.DrawString("crop$($i+1) $($r.label)",$tiny,$bt,$rx+6,$ly)
  }
  $rect=New-Object Drawing.Rectangle(1370,55,500,660);$g.FillRectangle($panel,$rect);$g.DrawRectangle($pen,$rect);$lines=@("TESTING // $Game",'LIVE DASHBOARD  |  FRAME: 60 FPS','VISION: road, player, rivals, lane edges','HEATMAP: steering focus + opponent zones','STATE: throttle / steering / nitro','DECISION: observe -> choose -> verify','RACE: lap 2/3  |  speed 165  |  place 5/6',"INPUTS: $Inputs",'ASSERT: race advanced; controls accepted',"LOG: $Log",$foveaLine,$cropsLine);$y=82;$step=44
}else{
  # TestingV stacks scaled gameplay, so boundaries render as an inset AI
  # fovea-map diagram (top-right) instead of gameplay-space outlines.
  $mapX=728;$mapY=48;$mapW=320;$mapH=180
  $mapRect=New-Object Drawing.Rectangle($mapX,$mapY,$mapW,$mapH)
  $g.FillRectangle($panel,$mapRect);$g.DrawRectangle($pen,$mapRect)
  $g.DrawString('AI FOVEA MAP (overview + crops)',$tiny,$white,$mapX+10,$mapY+6)
  $frameRect=New-Object Drawing.Rectangle(($mapX+10),($mapY+34),($mapW-20),($mapH-62))
  $g.DrawRectangle($pen,$frameRect)
  for($i=0;$i -lt $foveaRects.Count;$i++){
    $r=$foveaRects[$i]
    $mx=$frameRect.X+[int]($r.x/1000*$frameRect.Width);$my=$frameRect.Y+[int]($r.y/1000*$frameRect.Height)
    $mw=[Math]::Max(6,[int]($r.w/1000*$frameRect.Width));$mh=[Math]::Max(6,[int]($r.h/1000*$frameRect.Height))
    if($mx+$mw -gt $frameRect.Right){$mw=$frameRect.Right-$mx};if($my+$mh -gt $frameRect.Bottom){$mh=$frameRect.Bottom-$my}
    $bp=if($foveaIsDefault){$yellowPen}else{$limePen}
    $bt=if($foveaIsDefault){$yellowBrush}else{$limeBrush}
    $g.DrawRectangle($bp,(New-Object Drawing.Rectangle($mx,$my,$mw,$mh)))
    $g.DrawString("$($i+1)",$tiny,$bt,$mx+2,$my+1)
  }
  $rect=New-Object Drawing.Rectangle(35,1110,1010,770);$g.FillRectangle($panel,$rect);$g.DrawRectangle($pen,$rect);$lines=@("TESTING V // $Game",'FULL AI VISION MIRROR  |  NON-MOBILE GAME','LIVE DASHBOARD: lap 2/3  |  speed 165  |  place 5/6','VISION: lane edges + player + rivals + HUD','HEATMAP: steering target, throttle path, hazards','DECISION TREE: observe -> choose -> verify','ACTION TRACE: throttle, steer, nitro, correction',"INPUTS: $Inputs",'ASSERTIONS: menu -> race -> lap progress','SYSTEM: canvas capture / 60 FPS / no browser errors',"SYSTEM LOG: $Log",$foveaLine,$cropsLine);$y=1140;$step=42
}
$maxChars=42;if($Mode -ne 'H'){$maxChars=88}else{$small=New-Object Drawing.Font('Consolas',15)}
foreach($line in $lines){$g.DrawString($line.Substring(0,[Math]::Min($maxChars,$line.Length)),$small,$white,($rect.X+24),$y);$y+=$step}
# Crop renders picture-in-picture, left-to-right crop1..cropN.
$ti=0
foreach($tp in $thumbPaths){
  if($ti -ge $foveaRects.Count){break}
  try{
    $img=[Drawing.Image]::FromFile($tp)
    if($Mode -eq 'H'){
      $tw=150;$th=[Math]::Max(40,[int](150*$img.Height/$img.Width))
      $tx=1394+$ti*152;$ty=730
      $g.DrawImage($img,(New-Object Drawing.Rectangle($tx,$ty,$tw,$th)))
      $g.DrawRectangle($limePen,(New-Object Drawing.Rectangle($tx,$ty,$tw,$th)))
      $g.DrawString("crop$($ti+1)",$tiny,$limeBrush,($tx+4),($ty+$th+2))
    }else{
      $th=150;$tw=[int][Math]::Min(300,[Math]::Max(60,150*$img.Width/$img.Height))
      $tx=59;if($ti -gt 0){$tx=59+$ti*300}
      if($tx+$tw -gt 1020){$tw=1020-$tx}
      $ty=1720
      $g.DrawImage($img,(New-Object Drawing.Rectangle($tx,$ty,$tw,$th)))
      $g.DrawRectangle($limePen,(New-Object Drawing.Rectangle($tx,$ty,$tw,$th)))
      $g.DrawString("crop$($ti+1) $($foveaRects[$ti].label)",$tiny,$limeBrush,($tx+4),($ty-22))
    }
    $img.Dispose()
  }catch{}
  $ti++
}
$brand='4weird.com  Shop.MattyJacks.com  VibeCodeWorker.com  MattyJacks.com';$bf=New-Object Drawing.Font('Arial',16,[Drawing.FontStyle]::Bold);$g.DrawString($brand,$bf,$white,24,12);$g.DrawString($brand,$bf,$white,24,$h-32)
$bmp.Save($Out,[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$bmp.Dispose()

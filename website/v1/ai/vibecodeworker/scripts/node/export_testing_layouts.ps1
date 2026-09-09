param([string]$Mode,[string]$Out,[string]$Game,[string]$Inputs,[string]$Log)
Add-Type -AssemblyName System.Drawing
if($Mode -eq 'H'){$w=1920;$h=1080}else{$w=1080;$h=1920}
$bmp=New-Object Drawing.Bitmap $w,$h; $g=[Drawing.Graphics]::FromImage($bmp); $g.Clear([Drawing.Color]::FromArgb(22,8,12,24));
$font=New-Object Drawing.Font('Arial',22,[Drawing.FontStyle]::Bold);$small=New-Object Drawing.Font('Consolas',18);$white=[Drawing.Brushes]::White;$cyan=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(235,90,230,255));$panel=New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(130,5,12,28));$pen=New-Object Drawing.Pen([Drawing.Color]::FromArgb(230,90,230,255),3)
if($Mode -eq 'H'){$rect=New-Object Drawing.Rectangle(1450,70,420,410);$g.FillRectangle($panel,$rect);$g.DrawRectangle($pen,$rect);$lines=@("TESTING // $Game",'VISION: ROAD | PLAYER | OPPONENTS','STATE: throttle / steering / nitro','DECISION: observe -> choose -> verify',"INPUTS: $Inputs","LOG: $Log");$y=95}else{$rect=New-Object Drawing.Rectangle(50,1200,980,600);$g.FillRectangle($panel,$rect);$g.DrawRectangle($pen,$rect);$lines=@("TESTING V // $Game",'VISION: lane + car objects tracked','DECISION TREE: observe -> act -> assert',"INPUTS: $Inputs","SYSTEM LOG: $Log");$y=1230}
foreach($line in $lines){$g.DrawString($line.Substring(0,[Math]::Min(70,$line.Length)),$small,$white,($rect.X+24),$y);$y+=52}
$brand='4weird.com  Shop.MattyJacks.com  VibeCodeWorker.com  MattyJacks.com';$bf=New-Object Drawing.Font('Arial',16,[Drawing.FontStyle]::Bold);$g.DrawString($brand,$bf,$white,24,12);$g.DrawString($brand,$bf,$white,24,$h-32)
$bmp.Save($Out,[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$bmp.Dispose()

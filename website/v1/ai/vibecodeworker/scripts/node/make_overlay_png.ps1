param([string]$Out,[string]$Game,[string]$Inputs,[string]$Log)
Add-Type -AssemblyName System.Drawing
$bmp=New-Object Drawing.Bitmap 500,270; $g=[Drawing.Graphics]::FromImage($bmp); $g.Clear([Drawing.Color]::FromArgb(235,7,19,13)); $pen=New-Object Drawing.Pen([Drawing.Color]::Lime,4); $g.DrawRectangle($pen,2,2,496,266); $font=New-Object Drawing.Font('Consolas',15); $brush=[Drawing.Brushes]::White
$lines=@("TESTING // $Game",'MACHINE VISION: canvas + HUD tracked','DECISION: observe -> choose -> verify',"INPUTS: $Inputs","LOG: $Log")
for($i=0;$i -lt $lines.Count;$i++){ $g.DrawString($lines[$i].Substring(0,[Math]::Min(58,$lines[$i].Length)),$font,$brush,14,(18+$i*48)) }
$bmp.Save($Out,[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$bmp.Dispose()

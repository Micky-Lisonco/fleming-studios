# quick-probe.ps1 - the minimal fallback.
#
# analyse-footage.ps1 does far more, but it is a file, and a file can
# arrive stale or mis-encoded. This is small enough to paste straight
# into a PowerShell window, which removes both failure modes.
#
# Reads headers only - no decoding - so it returns in seconds even over
# tens of gigabytes. It prints to the console as well as writing a file,
# so the output can simply be copied out of the terminal.
#
# Pure ASCII on purpose: Windows PowerShell 5.1 reads .ps1 as the system
# ANSI codepage, so anything outside ASCII risks arriving mojibaked.
#
# Usage: edit $src if the footage lives elsewhere, then run or paste.

$src = "D:\OXIGEN"
$out = "$src\footage-report.txt"
$ff = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter ffprobe.exe -Recurse -EA 0 | Select-Object -First 1).FullName
if (-not $ff) { $ff = "ffprobe" }
$r = foreach ($f in (Get-ChildItem -LiteralPath $src -Recurse -File | Where-Object { $_.Extension -match '^\.(mp4|mov|mkv|avi|m4v|mxf)$' } | Sort-Object FullName)) {
  $j = & $ff -v error -print_format json -show_format -show_streams $f.FullName 2>$null | Out-String | ConvertFrom-Json
  $v = $j.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
  $a = $j.streams | Where-Object { $_.codec_type -eq 'audio' } | Select-Object -First 1
  $fps = 0; if ($v.r_frame_rate -match '^(\d+)/(\d+)$' -and [int]$Matches[2] -gt 0) { $fps = [math]::Round([double]$Matches[1]/[double]$Matches[2],2) }
  "{0} | {1} {2}x{3} {4}fps {5} | trc={6} | {7}s | {8}MB | audio={9}" -f $f.Name,$v.codec_name,$v.width,$v.height,$fps,$v.pix_fmt,$(if($v.color_transfer){$v.color_transfer}else{'unset'}),[math]::Round([double]$j.format.duration),[math]::Round($f.Length/1MB),$(if($a){"$($a.codec_name)/$($a.channels)ch"}else{'NONE'})
}
$r | Out-File -FilePath $out -Encoding utf8
$r
"--"
"Saved to $out"

<#
.SYNOPSIS
  Turn heavy camera masters into light editing proxies, plus audio and
  filmstrips.

.DESCRIPTION
  The masters stay where they are and are never modified. This writes:

    public\media-proxy\   small stand-ins, same framing and length
    out\audio\            mono mp3 per clip, for transcription
    out\lookbook\         a six-frame filmstrip per clip, plus manifest.json

  The proxies keep the masters' framing and duration, so every frame
  number in remotion\edit.ts maps straight onto the full-resolution file.
  When the cut is locked you render against the masters by setting one
  environment variable - no relinking, no recutting.

.PARAMETER SourcePath
  Folder holding the footage, e.g. E:\oxygen-shoot

.PARAMETER Quality
  'normal' (640p) or 'low' (480p), if a proxy lands over 30 MB.

.EXAMPLE
  .\scripts\make-proxies.ps1 -SourcePath "E:\oxygen-shoot"

.NOTES
  Needs ffmpeg:  winget install Gyan.FFmpeg
  Written for Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $SourcePath,

    [ValidateSet('normal', 'low')]
    [string] $Quality = 'normal'
)

$ErrorActionPreference = 'Stop'

function Invoke-Native {
    <#
      Runs a native command and returns everything it printed, including
      stderr, as a plain string.

      ffmpeg writes progress and warnings to stderr. PowerShell surfaces
      native stderr as a NativeCommandError, which under
      ErrorActionPreference = Stop terminates the script - so a harmless
      warning from a camera edit list would end an otherwise fine run.
    #>
    param(
        [Parameter(Mandatory = $true)] [string]   $Exe,
        [Parameter(Mandatory = $true)] [string[]] $Arguments
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $Exe @Arguments 2>&1 | Out-String
    } finally {
        $ErrorActionPreference = $previous
    }
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
    Write-Error "Folder not found: $SourcePath"
    exit 1
}

function Find-Tool {
    param([string] $Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $guesses = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\$Name.exe",
        "$env:ProgramFiles\ffmpeg\bin\$Name.exe",
        "C:\ffmpeg\bin\$Name.exe"
    )
    foreach ($g in $guesses) { if (Test-Path -LiteralPath $g) { return $g } }
    return $null
}

$ffmpeg  = Find-Tool 'ffmpeg'
$ffprobe = Find-Tool 'ffprobe'
if (-not $ffmpeg -or -not $ffprobe) {
    Write-Host ""
    Write-Host "ffmpeg not found. Install it with:" -ForegroundColor Yellow
    Write-Host "    winget install Gyan.FFmpeg"
    Write-Host ""
    Write-Host "Then close this window, open a new one, and run this again."
    exit 1
}

if ($Quality -eq 'low') { $height = 480; $vbr = '500k'; $maxrate = '700k' }
else                    { $height = 640; $vbr = '900k'; $maxrate = '1200k' }

# Works inside the repo or dropped anywhere on its own.
$parent = Split-Path -Parent $PSScriptRoot
$inRepo = ((Split-Path -Leaf $PSScriptRoot) -eq 'scripts') -and
          (Test-Path -LiteralPath (Join-Path $parent 'package.json'))

if ($inRepo) {
    $proxyDir = Join-Path $parent 'public\media-proxy'
    $audioDir = Join-Path $parent 'out\audio'
    $lookDir  = Join-Path $parent 'out\lookbook'
} else {
    $base     = Join-Path $PSScriptRoot 'footage-prep'
    $proxyDir = Join-Path $base 'media-proxy'
    $audioDir = Join-Path $base 'audio'
    $lookDir  = Join-Path $base 'lookbook'
}
foreach ($d in @($proxyDir, $audioDir, $lookDir)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
}

$extensions = @('.mp4', '.mov', '.m4v', '.mxf', '.avi', '.mkv', '.insv')
$files = Get-ChildItem -LiteralPath $SourcePath -File -Recurse |
         Where-Object { $extensions -contains $_.Extension.ToLower() } |
         Where-Object { $_.FullName -notlike "$proxyDir*" } |
         Sort-Object FullName

if ($files.Count -eq 0) { Write-Error "No video files found under $SourcePath"; exit 1 }

Write-Host ""
Write-Host "Proxying $($files.Count) clips at ${height}p"
Write-Host ""

$manifest = New-Object System.Collections.Generic.List[object]
$n = 0
$oversize = 0

foreach ($file in $files) {
    $n++
    # Stable, sortable, filesystem-safe names.
    $clean = ($file.BaseName -replace '[^\w\-]', '-')
    if ($clean.Length -gt 40) { $clean = $clean.Substring(0, 40) }
    $stem  = '{0:D2}-{1}' -f $n, $clean

    Write-Host ("[{0}/{1}] {2}" -f $n, $files.Count, $file.Name)

    $probeRaw = Invoke-Native $ffprobe @('-v','error','-print_format','json','-show_format','-show_streams',$file.FullName)
    try {
        $meta = $probeRaw | ConvertFrom-Json
    } catch {
        Write-Host "    skipped - metadata would not parse" -ForegroundColor Yellow
        continue
    }
    $v    = $meta.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1

    $fps = 0.0
    if ($v -and $v.r_frame_rate -match '^(\d+)/(\d+)$') {
        $den = [double]$Matches[2]
        if ($den -gt 0) { $fps = [math]::Round([double]$Matches[1] / $den, 3) }
    }
    $durationSec = 0.0
    if ($meta.format.duration) { $durationSec = [double]$meta.format.duration }

    # -- the proxy: same framing, same length, just small --
    $proxyPath = Join-Path $proxyDir "$stem.mp4"
    $null = Invoke-Native $ffmpeg @(
        '-nostdin','-y','-loglevel','error','-i',$file.FullName,
        '-vf',"scale=-2:$height",
        '-c:v','libx264','-preset','veryfast','-b:v',$vbr,'-maxrate',$maxrate,'-bufsize','2M',
        '-pix_fmt','yuv420p','-movflags','+faststart',
        '-c:a','aac','-b:a','64k','-ac','1',
        $proxyPath)

    if (Test-Path -LiteralPath $proxyPath) {
        $proxyMB = [math]::Round((Get-Item -LiteralPath $proxyPath).Length / 1MB, 1)
        if ($proxyMB -gt 30) {
            Write-Host ("    proxy is {0} MB - re-run with -Quality low" -f $proxyMB) -ForegroundColor Yellow
            $oversize++
        }
    }

    # -- audio, because this is interview footage and the words decide the cut --
    $null = Invoke-Native $ffmpeg @(
        '-nostdin','-y','-loglevel','error','-i',$file.FullName,
        '-vn','-c:a','libmp3lame','-b:a','64k','-ac','1','-ar','16000',
        (Join-Path $audioDir "$stem.mp3"))

    # -- filmstrip: six frames across the clip, one small jpeg --
    # Sampled by time rather than by frame index: ffmpeg's select filter
    # has no n_frames variable, so the obvious mod(n, n_frames/6) silently
    # matches nothing and writes no file.
    if ($durationSec -gt 0.5) {
        $stripRate = [math]::Round(6.5 / $durationSec, 6)
        $null = Invoke-Native $ffmpeg @(
            '-nostdin','-y','-loglevel','error','-i',$file.FullName,
            '-vf',"fps=$stripRate,scale=-2:240,tile=6x1",
            '-frames:v','1','-q:v','4',(Join-Path $lookDir "$stem.jpg"))
    }

    $manifest.Add([pscustomobject]@{
        id          = $stem
        master      = $file.Name
        masterPath  = $file.FullName
        proxy       = "media-proxy/$stem.mp4"
        width       = $v.width
        height      = $v.height
        fps         = $fps
        durationSec = [math]::Round($durationSec, 2)
        masterMB    = [math]::Round($file.Length / 1MB)
    })
}

$manifest | ConvertTo-Json -Depth 4 |
    Out-File -FilePath (Join-Path $lookDir 'manifest.json') -Encoding utf8

Write-Host ""
Write-Host "Proxies:    $proxyDir"    -ForegroundColor Green
Write-Host "Audio:      $audioDir"    -ForegroundColor Green
Write-Host "Filmstrips: $lookDir"     -ForegroundColor Green
if ($oversize -gt 0) {
    Write-Host ""
    Write-Host "$oversize proxies are over 30 MB - re-run with -Quality low" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "NEXT: transcribe. This is interview footage, so the words decide"
Write-Host "the cut - filmstrips alone cannot show what Fien actually says."
Write-Host ""
Write-Host "    .\scripts\transcribe.ps1"

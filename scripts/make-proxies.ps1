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
    [string] $Quality = 'normal',

    # Path to a .cube LUT, e.g. a Canon C-Log to Rec.709 conversion. This is
    # the correct way to handle log footage - use it whenever one exists.
    # One LUT for everything, when the whole shoot is one camera.
    [string] $Lut,

    # Per-camera LUTs, keyed by filename pattern. A shoot with a Canon
    # body and a drone needs two different conversions - their log
    # encodings are not the same, and using one for both looks wrong in a
    # way that is hard to pin down later.
    #
    #   -LutMap @{ "6E8A*" = "D:\luts\canon.cube"; "DJI_*" = "D:\luts\dlog.cube" }
    #
    # First matching pattern wins. A file matching nothing is left
    # ungraded and reported, rather than silently taking the wrong look.
    [hashtable] $LutMap,

    # Fallback when the footage is log but no .cube is to hand. Approximate,
    # not a substitute for the real conversion, but far better than leaving
    # it flat.
    [switch] $LogFootage
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

function Get-GradeFor {
    <#
      Picks the grade for one file: its pattern match from -LutMap, else
      the single -Lut, else the approximation, else nothing.
    #>
    param(
        [string] $FileName,
        [hashtable] $Map,
        [string] $SingleLut,
        [bool] $Approximate
    )
    if ($Map) {
        foreach ($pattern in $Map.Keys) {
            if ($FileName -like $pattern) {
                $path = $Map[$pattern]
                if (-not (Test-Path -LiteralPath $path)) {
                    throw "LUT not found for pattern '$pattern': $path"
                }
                return "lut3d=file='$(ConvertTo-FilterPath (Resolve-Path -LiteralPath $path).Path)'"
            }
        }
        return ''
    }
    if ($SingleLut) {
        return "lut3d=file='$(ConvertTo-FilterPath (Resolve-Path -LiteralPath $SingleLut).Path)'"
    }
    if ($Approximate) {
        return "curves=all='0/0 0.2/0.06 0.5/0.45 0.8/0.88 1/1',eq=saturation=1.5"
    }
    return ''
}

function ConvertTo-FilterPath {
    <#
      Rewrites a Windows path so it survives an ffmpeg filter argument.

      Inside a filter, ':' separates options and '\' escapes, so a path like
      D:\luts\canon.cube is parsed as gibberish and lut3d fails with
      "Invalid argument". Forward slashes and an escaped colon fix it.
    #>
    param([string] $Path)
    $p = $Path -replace '\\', '/'
    $p = $p -replace ':', '\:'
    return $p
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

# The grade has to be baked into the proxies. Cutting log footage ungraded
# means judging every shot through flat grey, and the choices that come out
# of that do not survive contact with the finished grade.
if ($LutMap) {
    Write-Host "Grade: per camera"
    foreach ($pattern in $LutMap.Keys) { Write-Host ("  {0,-12} {1}" -f $pattern, $LutMap[$pattern]) }
} elseif ($Lut) {
    if (-not (Test-Path -LiteralPath $Lut)) { Write-Error "LUT not found: $Lut"; exit 1 }
    Write-Host "Grade: $Lut (applied to every clip)"
} elseif ($LogFootage) {
    Write-Host "Grade: built-in log approximation (supply -Lut or -LutMap for the real conversion)"
} else {
    Write-Host "Grade: none - correct when the camera recorded a normal picture profile."
    Write-Host "Only add -Lut or -LogFootage if the report shows the footage is flat;"
    Write-Host "converting already-Rec.709 footage crushes it and cannot be undone."
}

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
$failed = 0
$ungraded = 0

foreach ($file in $files) {
    $n++
    # Stable, sortable, filesystem-safe names.
    $clean = ($file.BaseName -replace '[^\w\-]', '-')
    if ($clean.Length -gt 40) { $clean = $clean.Substring(0, 40) }
    $stem  = '{0:D2}-{1}' -f $n, $clean

    Write-Host ("[{0}/{1}] {2}" -f $n, $files.Count, $file.Name)

    $grade = Get-GradeFor -FileName $file.Name -Map $LutMap -SingleLut $Lut -Approximate:$LogFootage
    if ($LutMap -and -not $grade) {
        Write-Host "    no LUT pattern matches this file - leaving it ungraded" -ForegroundColor Yellow
        $ungraded++
    }

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
    $proxyLog = Invoke-Native $ffmpeg @(
        '-nostdin','-y','-loglevel','error','-i',$file.FullName,
        '-vf',$(if ($grade) { "scale=-2:$height,$grade" } else { "scale=-2:$height" }),
        '-c:v','libx264','-preset','veryfast','-b:v',$vbr,'-maxrate',$maxrate,'-bufsize','2M',
        '-pix_fmt','yuv420p','-movflags','+faststart',
        '-c:a','aac','-b:a','64k','-ac','1',
        $proxyPath)

    # A silent ffmpeg failure used to leave an empty proxy and say nothing,
    # which is the worst outcome: the cut then gets built against footage
    # that is not there. Surface it loudly instead.
    if (-not (Test-Path -LiteralPath $proxyPath) -or (Get-Item -LiteralPath $proxyPath).Length -eq 0) {
        Write-Host "    FAILED to write a proxy for this clip" -ForegroundColor Red
        if ($proxyLog.Trim()) {
            Write-Host ("    ffmpeg said: " + ($proxyLog.Trim() -split "`n" | Select-Object -First 3 | Out-String).Trim()) -ForegroundColor Red
        }
        $failed++
        continue
    }

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
            '-vf',$(if ($grade) { "fps=$stripRate,scale=-2:240,$grade,tile=6x1" } else { "fps=$stripRate,scale=-2:240,tile=6x1" }),
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
if ($ungraded -gt 0) {
    Write-Host ""
    Write-Host "$ungraded clips matched no LUT pattern and are ungraded" -ForegroundColor Yellow
}
if ($failed -gt 0) {
    Write-Host ""
    Write-Host "$failed clips produced no proxy - see the messages above" -ForegroundColor Red
}
if ($oversize -gt 0) {
    Write-Host ""
    Write-Host "$oversize proxies are over 30 MB - re-run with -Quality low" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "NEXT: transcribe. This is interview footage, so the words decide"
Write-Host "the cut - filmstrips alone cannot show what Fien actually says."
Write-Host ""
Write-Host "    .\scripts\transcribe.ps1"

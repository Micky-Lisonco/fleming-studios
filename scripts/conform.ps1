<#
.SYNOPSIS
  Pull only the pieces of the masters the cut actually uses, graded, at
  full quality.

.DESCRIPTION
  This is what makes the delivered video correct. The proxies are graded
  so the edit can be judged honestly, but rendering from the ungraded
  masters would deliver the flat log picture back again. Conform closes
  that loop: it reads out\cut.json, takes exactly the range each shot
  uses, applies the same grade the proxies got, and writes one clip per
  shot into public\media\.

  Only the footage in the cut is touched - roughly twenty seconds of it,
  not the whole 17 GB - so this finishes quickly even over USB 2.

  Clips keep their native resolution on purpose. The vertical cut crops
  9:16 out of 16:9 footage, so it needs every line of the 4K original;
  conforming to 1080p first would force an upscale and soften it.

  IMPORTANT: pass the same -Lut or -LogFootage used for the proxies. A
  different grade here means the delivered film does not match the cut
  that was approved.

.EXAMPLE
  .\scripts\conform.ps1 -SourcePath "D:\OXIGEN" -Lut "D:\luts\canon.cube"

.NOTES
  Run npm run cut:export first, so out\cut.json reflects the current edit.
  Written for Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $SourcePath,

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
    [switch] $LogFootage,

    # Lower is better quality and a bigger file. 18 is visually lossless
    # for this purpose; the delivery encode happens later in Remotion.
    [int] $Crf = 18,

    # Social platforms play at about -14 LUFS. The Canon clips arrive at
    # -15 to -18 and peaking just above 0 dBTP, so they are both too quiet
    # and clipping - which sounds like distortion on a phone speaker.
    [double] $TargetLufs = -14.0,

    # Ceiling for the limiter, in dB below full scale. -1.4 leaves room for
    # the encoder, which can push peaks slightly higher than the samples
    # it was given.
    [double] $PeakCeilingDb = -1.4,

    # Skip the audio treatment and pass the original through untouched.
    [switch] $NoAudioFix
)

$ErrorActionPreference = 'Stop'

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)] [string]   $Exe,
        [Parameter(Mandatory = $true)] [string[]] $Arguments
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Exe @Arguments 2>&1 | Out-String } finally { $ErrorActionPreference = $previous }
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
    $packages = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    if (Test-Path -LiteralPath $packages) {
        $found = Get-ChildItem -LiteralPath $packages -Filter "$Name.exe" -Recurse -ErrorAction SilentlyContinue |
                 Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

$ffmpeg = Find-Tool 'ffmpeg'
if (-not $ffmpeg) {
    Write-Host "ffmpeg not found. Install it with: winget install Gyan.FFmpeg" -ForegroundColor Yellow
    exit 1
}

$root   = Split-Path -Parent $PSScriptRoot
$cutPath = Join-Path $root 'out\cut.json'
$mediaDir = Join-Path $root 'public\media'

if (-not (Test-Path -LiteralPath $cutPath)) {
    Write-Host "No out\cut.json - run 'npm run cut:export' first." -ForegroundColor Yellow
    exit 1
}

$cut = Get-Content -LiteralPath $cutPath -Raw | ConvertFrom-Json
if (-not $cut.shots -or $cut.shots.Count -eq 0) {
    Write-Host "cut.json has no shots with footage assigned yet." -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Force -Path $mediaDir | Out-Null

if ($LutMap) {
    Write-Host "Grade: per camera"
    foreach ($pattern in $LutMap.Keys) { Write-Host ("  {0,-12} {1}" -f $pattern, $LutMap[$pattern]) }
} elseif ($Lut) {
    if (-not (Test-Path -LiteralPath $Lut)) { Write-Error "LUT not found: $Lut"; exit 1 }
    Write-Host "Grade: $Lut (applied to every clip)"
} elseif ($LogFootage) {
    Write-Host "Grade: built-in log approximation"
} else {
    Write-Host "Grade: none" -ForegroundColor Yellow
    Write-Host "If the proxies were graded, pass the same option here or the" -ForegroundColor Yellow
    Write-Host "delivered film will not match the cut that was approved." -ForegroundColor Yellow
}

# Loudness measured per clip by analyse-footage.ps1. Using the real
# figure means a fixed, predictable gain rather than letting a normaliser
# guess from two seconds of speech - which on short clips it does badly.
$measured = @{}
$analysisPath = Join-Path $root 'out\analysis\footage.json'
if (Test-Path -LiteralPath $analysisPath) {
    foreach ($row in (Get-Content -LiteralPath $analysisPath -Raw | ConvertFrom-Json)) {
        if ($row.lufs) { $measured[$row.file] = [double]$row.lufs }
    }
    Write-Host "Loudness: measured figures for $($measured.Count) clips"
} elseif (-not $NoAudioFix) {
    Write-Host "Loudness: no analysis found - levels left alone, peaks still limited" -ForegroundColor Yellow
}

$total = ($cut.shots | Measure-Object -Property durationSec -Sum).Sum
Write-Host ""
Write-Host "Conforming $($cut.shots.Count) shots - $([math]::Round($total,1))s of footage"
Write-Host ""

$n = 0
$failed = 0
foreach ($shot in $cut.shots) {
    $n++
    $master = Join-Path $SourcePath $shot.file
    if (-not (Test-Path -LiteralPath $master)) {
        $found = Get-ChildItem -LiteralPath $SourcePath -Filter $shot.file -Recurse -ErrorAction SilentlyContinue |
                 Select-Object -First 1
        if ($found) { $master = $found.FullName }
        else {
            Write-Host "[$n/$($cut.shots.Count)] $($shot.id) - master not found: $($shot.file)" -ForegroundColor Red
            $failed++
            continue
        }
    }

    $dest = Join-Path $mediaDir "$($shot.id).mp4"
    Write-Host ("[{0}/{1}] {2}  <- {3} @ {4}s for {5}s" -f $n, $cut.shots.Count, $shot.id, $shot.file, $shot.startSec, $shot.durationSec)

    # A little tail beyond the shot length absorbs rounding between the
    # frame count here and the frame count Remotion asks for, so the last
    # frame never comes up short.
    $grab = [math]::Round($shot.durationSec + 0.5, 3)

    # The grade must match what the proxies got, per camera. A shot graded
    # differently here than in the cut that was approved is the whole point
    # of conforming, undone.
    $grade = Get-GradeFor -FileName $shot.file -Map $LutMap -SingleLut $Lut -Approximate:$LogFootage

    $args = @(
        '-nostdin','-y','-loglevel','error',
        '-ss',"$($shot.startSec)",
        '-i',$master,
        '-t',"$grab"
    )
    if ($grade) { $args += @('-vf',$grade) }
    $args += @(
        '-c:v','libx264','-preset','slow','-crf',"$Crf",
        '-pix_fmt','yuv420p','-movflags','+faststart'
    )
    # Silent shots lose their audio track here rather than at render time.
    if ($shot.audible) {
        $args += @('-c:a','aac','-b:a','192k')
        if (-not $NoAudioFix) {
            # A fixed gain from the measured loudness, then a limiter to
            # catch the peaks. Order matters: gain first, limit second, so
            # the limiter only touches what actually exceeds the ceiling.
            $chain = @()
            if ($measured.ContainsKey($shot.file)) {
                $gain = [math]::Round($TargetLufs - $measured[$shot.file], 2)
                if ([math]::Abs($gain) -gt 0.1) { $chain += "volume=${gain}dB" }
            }
            $ceiling = [math]::Round([math]::Pow(10, $PeakCeilingDb / 20.0), 4)
            $chain += "alimiter=limit=${ceiling}:attack=5:release=50:level=false"
            $args += @('-af', ($chain -join ','))
        }
    } else { $args += @('-an') }
    $args += $dest

    $log = Invoke-Native $ffmpeg $args

    if (-not (Test-Path -LiteralPath $dest) -or (Get-Item -LiteralPath $dest).Length -eq 0) {
        Write-Host "    FAILED" -ForegroundColor Red
        if ($log.Trim()) {
            Write-Host ("    ffmpeg said: " + (($log.Trim() -split "`n" | Select-Object -First 3) -join ' ')) -ForegroundColor Red
        }
        $failed++
    }
}

Write-Host ""
if ($failed -gt 0) {
    Write-Host "$failed shots failed - see above" -ForegroundColor Red
} else {
    Write-Host "All shots conformed into $mediaDir" -ForegroundColor Green
}
Write-Host ""
Write-Host "Now render the finished films:"
Write-Host ""
Write-Host '    $env:REMOTION_MEDIA_DIR = "media"'
Write-Host "    npm run video:render:all"

<#
.SYNOPSIS
  Turn the interview audio into timed transcripts (.srt).

.DESCRIPTION
  This footage is an interview: the cameraman asks, Fien answers. The cut
  is decided by what is said and exactly when, so every clip needs a
  transcript with timecodes before a single edit is chosen.

  Writes one .srt per clip to out\transcripts\. They are plain text and a
  few KB each, so they travel anywhere.

.PARAMETER Model
  Whisper model. 'medium' is a good balance; 'large-v3' is slower and
  better on Flemish.

.PARAMETER Language
  Spoken language. 'nl' for Dutch/Flemish. Forcing it stops whisper
  guessing wrong on short or noisy clips, which it does often enough to
  matter.

.EXAMPLE
  .\scripts\transcribe.ps1
  .\scripts\transcribe.ps1 -Model large-v3

.NOTES
  Needs whisper. With Python installed:
      pip install -U openai-whisper
  Whisper also needs ffmpeg on PATH, which you already have.

  Written for Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
    [string] $Model = 'medium',
    [string] $Language = 'nl',

    # cpu by default, and deliberately so. The ctranslate2 build defaults
    # to "auto", which picks a GPU whenever a driver is present and then
    # fails with "Library cublas64_12.dll is not found" if the CUDA
    # runtime is not also installed - a failure that looks like a bug in
    # the transcription rather than a missing dependency.
    #
    # With an NVIDIA card, this makes it several times faster again:
    #     pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
    #     .\transcribe.ps1 -Device cuda
    [ValidateSet('cpu', 'cuda', 'auto')]
    [string] $Device = 'cpu'
)

$ErrorActionPreference = 'Stop'

$parent = Split-Path -Parent $PSScriptRoot
$inRepo = ((Split-Path -Leaf $PSScriptRoot) -eq 'scripts') -and
          (Test-Path -LiteralPath (Join-Path $parent 'package.json'))

if ($inRepo) {
    $audioDir = Join-Path $parent 'out\audio'
    $srtDir   = Join-Path $parent 'out\transcripts'
} else {
    $audioDir = Join-Path $PSScriptRoot 'footage-prep\audio'
    $srtDir   = Join-Path $PSScriptRoot 'footage-prep\transcripts'
}

if (-not (Test-Path -LiteralPath $audioDir)) {
    Write-Error "No audio yet - run make-proxies.ps1 first."
    exit 1
}

# Two engines, because the Python one needs Python. Faster-Whisper-XXL is
# a standalone Windows executable - unzip and run, nothing to install -
# and it is considerably faster on the same model.
$engine = $null
$exe = $null

# Preferred on a machine with no GPU. Same models, same arguments, but
# the CTranslate2 runtime underneath - several times quicker than the
# reference implementation on CPU, and int8 makes it quicker again at no
# meaningful cost to the timestamps, which is what the cut is chosen on.
$ct2 = Get-Command whisper-ctranslate2 -ErrorAction SilentlyContinue
if ($ct2) {
    $engine = 'ct2'
    $exe = $ct2.Source
}

$xxl = if ($engine) { $null } else { Get-Command faster-whisper-xxl -ErrorAction SilentlyContinue }
if (-not $xxl) {
    $found = Get-ChildItem "$env:USERPROFILE\Downloads","C:\","D:\" -Filter 'faster-whisper-xxl.exe' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
             Select-Object -First 1
    if ($found) { $xxl = $found }
}
if (-not $engine -and $xxl) {
    $engine = 'xxl'
    $exe = if ($xxl.Source) { $xxl.Source } else { $xxl.FullName }
} elseif (-not $engine) {
    $py = Get-Command whisper -ErrorAction SilentlyContinue
    if ($py) { $engine = 'python'; $exe = $py.Source }
}

if (-not $engine) {
    Write-Host ""
    Write-Host "No transcription engine found. Either works:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. pip install whisper-ctranslate2   (best on a CPU-only"
    Write-Host "     machine - same models, several times quicker)"
    Write-Host ""
    Write-Host "  2. Faster-Whisper-XXL - a standalone exe, no Python needed."
    Write-Host "     Download the Windows build, unzip it anywhere, and run"
    Write-Host "     this script again. It will find the exe by itself."
    Write-Host ""
    Write-Host "  3. pip install -U openai-whisper   (the reference build,"
    Write-Host "     slowest on CPU)"
    Write-Host ""
    Write-Host "Or use any service that exports .srt - drop the files in"
    Write-Host "the transcripts folder named to match the clips, and"
    Write-Host "everything downstream is identical."
    exit 1
}

Write-Host "Engine: $engine  ($exe)"

New-Item -ItemType Directory -Force -Path $srtDir | Out-Null

$audio = Get-ChildItem -LiteralPath $audioDir -Filter '*.mp3' | Sort-Object Name
if ($audio.Count -eq 0) {
    Write-Error "No audio files in $audioDir - run make-proxies.ps1 first."
    exit 1
}

Write-Host ""
Write-Host "Transcribing $($audio.Count) clips - model $Model, language $Language"
Write-Host "The first run downloads the model, so it takes a while."
Write-Host ""

$n = 0
foreach ($file in $audio) {
    $n++
    # The drone clips carry no audio, so their extracted mp3 is empty or
    # near-empty. Feeding those to whisper costs minutes per clip and
    # returns nothing, or worse, hallucinated speech from silence.
    if ($file.Length -lt 20KB) {
        Write-Host ("[{0}/{1}] {2} - no audio, skipping" -f $n, $audio.Count, $file.BaseName) -ForegroundColor DarkGray
        continue
    }

    $srtPath = Join-Path $srtDir "$($file.BaseName).srt"
    if (Test-Path -LiteralPath $srtPath) {
        Write-Host ("[{0}/{1}] {2} - already done" -f $n, $audio.Count, $file.BaseName)
        continue
    }

    Write-Host ("[{0}/{1}] {2}" -f $n, $audio.Count, $file.BaseName)
    if ($engine -eq 'ct2') {
        $computeType = if ($Device -eq 'cpu') { 'int8' } else { 'float16' }
        & $exe $file.FullName --model $Model --language $Language `
            --output_format srt --output_dir $srtDir `
            --device $Device --compute_type $computeType
    } elseif ($engine -eq 'xxl') {
        & $exe $file.FullName --model $Model --language $Language `
            --output_format srt --output_dir $srtDir
    } else {
        & $exe $file.FullName --model $Model --language $Language `
            --output_format srt --output_dir $srtDir --verbose False
    }
}

# The engines print "results written" even when every file failed, so
# check for the transcript rather than believing the exit message.
$written = @(Get-ChildItem -LiteralPath $srtDir -Filter '*.srt' -ErrorAction SilentlyContinue |
             Where-Object { $_.Length -gt 0 })

Write-Host ""
if ($written.Count -eq 0) {
    Write-Host "NOTHING WAS TRANSCRIBED - every clip failed." -ForegroundColor Red
    Write-Host ""
    Write-Host "If the error mentions cublas or cudnn, it tried to use the GPU"
    Write-Host "without the CUDA runtime present. Either:"
    Write-Host "    .\transcribe.ps1 -Device cpu          (always works)"
    Write-Host "    pip install nvidia-cublas-cu12 nvidia-cudnn-cu12"
    Write-Host "    .\transcribe.ps1 -Device cuda         (much faster)"
    exit 1
}
Write-Host "Transcripts: $srtDir  ($($written.Count) written)" -ForegroundColor Green
Write-Host ""
Write-Host "Send out\transcripts\ and out\lookbook\ - text and small images."
Write-Host "That is enough to pick the soundbites and build the edit."

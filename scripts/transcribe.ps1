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
    [string] $Language = 'nl'
)

$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $PSScriptRoot
$audioDir = Join-Path $root 'out\audio'
$srtDir   = Join-Path $root 'out\transcripts'

if (-not (Test-Path -LiteralPath $audioDir)) {
    Write-Error "No audio yet — run .\scripts\make-proxies.ps1 first."
    exit 1
}

$whisper = Get-Command whisper -ErrorAction SilentlyContinue
if (-not $whisper) {
    Write-Host ""
    Write-Host "whisper not found. Install it with:" -ForegroundColor Yellow
    Write-Host "    pip install -U openai-whisper"
    Write-Host ""
    Write-Host "No Python? Any transcription service that exports .srt works"
    Write-Host "just as well — drop the files in out\transcripts\ named to"
    Write-Host "match the clips and everything downstream is identical."
    exit 1
}

New-Item -ItemType Directory -Force -Path $srtDir | Out-Null

$audio = Get-ChildItem -LiteralPath $audioDir -Filter '*.mp3' | Sort-Object Name
if ($audio.Count -eq 0) {
    Write-Error "No audio files in $audioDir — run make-proxies.ps1 first."
    exit 1
}

Write-Host ""
Write-Host "Transcribing $($audio.Count) clips — model $Model, language $Language"
Write-Host "The first run downloads the model, so it takes a while."
Write-Host ""

$n = 0
foreach ($file in $audio) {
    $n++
    $srtPath = Join-Path $srtDir "$($file.BaseName).srt"
    if (Test-Path -LiteralPath $srtPath) {
        Write-Host ("[{0}/{1}] {2} — already done" -f $n, $audio.Count, $file.BaseName)
        continue
    }

    Write-Host ("[{0}/{1}] {2}" -f $n, $audio.Count, $file.BaseName)
    & whisper $file.FullName --model $Model --language $Language `
        --output_format srt --output_dir $srtDir --verbose False
}

Write-Host ""
Write-Host "Transcripts: $srtDir" -ForegroundColor Green
Write-Host ""
Write-Host "Send out\transcripts\ and out\lookbook\ — text and small images."
Write-Host "That is enough to pick the soundbites and build the edit."

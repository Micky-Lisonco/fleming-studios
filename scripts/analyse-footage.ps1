<#
.SYNOPSIS
  Read the camera masters where they sit and write a report.

.DESCRIPTION
  Nothing is copied, uploaded or transcoded. This reads the files on
  whatever drive they live on - internal, external, NAS - and writes a few
  hundred KB of text describing them: codec, resolution, frame rate, colour
  handling, rotation, exposure and audio loudness, with a note on anything
  that needs treatment before it goes in an ad.

.PARAMETER SourcePath
  Folder holding the footage, e.g. E:\oxygen-shoot

.PARAMETER SampleSeconds
  Seconds per clip used for the measured picture and loudness stats.
  Container metadata is always read for the whole file. Default 30.
  Lower it to 10 if 30 clips is taking too long.

.EXAMPLE
  .\scripts\analyse-footage.ps1 -SourcePath "E:\oxygen-shoot"

.EXAMPLE
  # Standalone: drop this file anywhere and point it at the footage.
  # No repo, no git, no npm. Results land in a folder beside the script.
  .\analyse-footage.ps1 -SourcePath "D:\OXIGEN"

  # If Windows refuses to run it ("running scripts is disabled"):
  powershell -ExecutionPolicy Bypass -File .\analyse-footage.ps1 -SourcePath "D:\OXIGEN"

.NOTES
  Needs ffmpeg (which includes ffprobe):
      winget install Gyan.FFmpeg
  Then open a NEW terminal so PATH refreshes.

  Written for Windows PowerShell 5.1, which is what Windows 11 ships.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $SourcePath,

    [int] $SampleSeconds = 30,

    # One folder per client. With -Project elite everything this script
    # writes goes under out\elite\ and public\elite\, so a second client's
    # footage can never overwrite the first one's clip list - which conform
    # needs to find the masters again. Leave it off and the paths are
    # exactly what they were (the Normocare project).
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9-]*$')]
    [string] $Project
)

$ErrorActionPreference = 'Stop'

function Invoke-Native {
    <#
      Runs a native command and returns everything it printed, including
      stderr, as a plain string.

      ffmpeg writes progress and warnings to stderr. PowerShell surfaces
      native stderr as a NativeCommandError, which under
      ErrorActionPreference = Stop terminates the script - so a harmless
      "Missing key frame while searching for timestamp" from a Canon edit
      list would end an otherwise fine run. Dropping to Continue for the
      duration of the call treats that output as what it is: text.
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

    # winget's shim often does not reach PATH until the shell is restarted,
    # and the real binary sits several folders deep under Packages. Look in
    # both places before giving up, so a fresh install just works.
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

$ffprobe = Find-Tool 'ffprobe'
$ffmpeg  = Find-Tool 'ffmpeg'

if (-not $ffprobe -or -not $ffmpeg) {
    Write-Host ""
    Write-Host "ffmpeg not found. Install it with:" -ForegroundColor Yellow
    Write-Host "    winget install Gyan.FFmpeg"
    Write-Host ""
    Write-Host "Then close this window, open a new one, and run this again."
    exit 1
}

# Works two ways. Inside the repo it writes to out\analysis alongside
# everything else; dropped on its own anywhere it writes beside itself, so
# it can be used without cloning or installing a thing.
$parent = Split-Path -Parent $PSScriptRoot
$inRepo = ((Split-Path -Leaf $PSScriptRoot) -eq 'scripts') -and
          (Test-Path -LiteralPath (Join-Path $parent 'package.json'))

$out = if ($Project) { "out\$Project" } else { 'out' }
if ($inRepo) { $outDir = Join-Path $parent "$out\analysis" }
else         { $outDir = Join-Path $PSScriptRoot 'footage-analysis' }
if ($Project -and -not $inRepo) { $outDir = Join-Path $outDir $Project }

$reportPath = Join-Path $outDir 'report.txt'
$jsonPath   = Join-Path $outDir 'footage.json'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$extensions = @('.mp4', '.mov', '.m4v', '.mxf', '.avi', '.mkv', '.insv')
$files = Get-ChildItem -LiteralPath $SourcePath -File -Recurse |
         Where-Object { $extensions -contains $_.Extension.ToLower() } |
         Where-Object { $_.FullName -notlike "$outDir*" } |
         Sort-Object FullName

if ($files.Count -eq 0) {
    Write-Error "No video files found under $SourcePath"
    exit 1
}

Write-Host ""
Write-Host "Analysing $($files.Count) clips from $SourcePath"
Write-Host "Sampling ${SampleSeconds}s per clip for measured statistics."
Write-Host ""

$report = New-Object System.Collections.Generic.List[string]
$rows   = New-Object System.Collections.Generic.List[object]

$report.Add("FOOTAGE ANALYSIS")
$report.Add("Source:  $SourcePath")
$report.Add("Sampled: ${SampleSeconds}s per clip for measured statistics")
$report.Add("Date:    $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
$report.Add("")

$n = 0
foreach ($file in $files) {
    $n++
    Write-Host ("[{0}/{1}] {2}" -f $n, $files.Count, $file.Name)

    # -- container and stream metadata: instant, whole file, exact --
    $probeRaw = Invoke-Native $ffprobe @('-v','error','-print_format','json','-show_format','-show_streams',$file.FullName)
    if (-not $probeRaw) {
        $report.Add("-- [$n] $($file.Name)")
        $report.Add("   UNREADABLE - ffprobe could not open this file")
        $report.Add("")
        continue
    }

    try {
        $meta = $probeRaw | ConvertFrom-Json
    } catch {
        $report.Add("-- [$n] $($file.Name)")
        $report.Add("   UNREADABLE - could not parse the stream metadata")
        $report.Add("")
        Write-Host "    skipped - metadata would not parse" -ForegroundColor Yellow
        continue
    }
    $v     = $meta.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1
    $a     = $meta.streams | Where-Object { $_.codec_type -eq 'audio' } | Select-Object -First 1

    $fps = 0.0
    if ($v -and $v.r_frame_rate -match '^(\d+)/(\d+)$') {
        $den = [double]$Matches[2]
        if ($den -gt 0) { $fps = [math]::Round([double]$Matches[1] / $den, 3) }
    }

    $rotation = 0
    if ($v -and $v.side_data_list) {
        foreach ($sd in $v.side_data_list) {
            if ($null -ne $sd.rotation) { $rotation = $sd.rotation }
        }
    }

    $durationSec = 0.0
    if ($meta.format.duration) { $durationSec = [double]$meta.format.duration }
    $bitrateMbps = 0.0
    if ($meta.format.bit_rate) { $bitrateMbps = [math]::Round([double]$meta.format.bit_rate / 1e6, 1) }

    # -- measured: audio loudness, so the interview can be levelled --
    $lufs = ''; $lra = ''; $peak = ''
    if ($a) {
        # -vn skips video decoding entirely, which on 4K footage is the
        # difference between seconds and minutes per clip.
        $loudRaw = Invoke-Native $ffmpeg @(
            '-nostdin','-hide_banner','-t',"$SampleSeconds",'-i',$file.FullName,
            '-vn','-af','loudnorm=print_format=json','-f','null','-')
        if ($loudRaw -match '"input_i"\s*:\s*"([^"]+)"')   { $lufs = $Matches[1] }
        if ($loudRaw -match '"input_lra"\s*:\s*"([^"]+)"') { $lra  = $Matches[1] }
        if ($loudRaw -match '"input_tp"\s*:\s*"([^"]+)"')  { $peak = $Matches[1] }
    }

    $pixFmt = if ($v -and $v.pix_fmt) { $v.pix_fmt } else { '?' }

    # -- measured: picture, to spot flat/log or crushed footage --
    # -an likewise skips the audio track on the picture pass.
    $statsRaw = Invoke-Native $ffmpeg @(
        '-nostdin','-hide_banner','-t',"$SampleSeconds",'-i',$file.FullName,
        '-an','-vf','signalstats,metadata=print','-f','null','-')

    $lumaValues = [regex]::Matches($statsRaw, 'lavfi\.signalstats\.YAVG=([\d.]+)')   | ForEach-Object { [double]$_.Groups[1].Value }
    $satValues  = [regex]::Matches($statsRaw, 'lavfi\.signalstats\.SATAVG=([\d.]+)') | ForEach-Object { [double]$_.Groups[1].Value }

    # signalstats reports in the source's own bit depth, so a 10-bit clip
    # comes back on a 0-1023 scale and an 8-bit one on 0-255. Comparing
    # them raw makes 10-bit footage look four times brighter than it is,
    # and makes every threshold below meaningless. Normalise to 8-bit.
    $depthScale = 1.0
    if ($pixFmt -match '10(le|be)$') { $depthScale = 4.0 }
    elseif ($pixFmt -match '12(le|be)$') { $depthScale = 16.0 }

    $lumaAvg = 0.0; $satAvg = 0.0
    if ($lumaValues.Count -gt 0) { $lumaAvg = [math]::Round((($lumaValues | Measure-Object -Average).Average / $depthScale), 1) }
    if ($satValues.Count  -gt 0) { $satAvg  = [math]::Round((($satValues  | Measure-Object -Average).Average / $depthScale), 1) }

    # -- the notes that actually decide how we treat the clip --
    $notes = New-Object System.Collections.Generic.List[string]

    $transfer = if ($v -and $v.color_transfer) { $v.color_transfer } else { 'unset' }
    $primaries = if ($v -and $v.color_primaries) { $v.color_primaries } else { 'unset' }
    $space = if ($v -and $v.color_space) { $v.color_space } else { 'unset' }

    if ($transfer -in @('arib-std-b67', 'smpte2084')) {
        $notes.Add("HDR ($transfer) - needs tone-mapping to Rec.709 or it renders washed out and dull")
    }
    if ($pixFmt -match '10(le|be)$') {
        $notes.Add("10-bit - fine, but the delivery is 8-bit yuv420p")
    }
    if ($rotation -ne 0) {
        $notes.Add("rotation ${rotation} deg in metadata - check orientation before cropping")
    }
    if ($lumaAvg -gt 0 -and $lumaAvg -lt 60) {
        $notes.Add("low average luma ($lumaAvg) - underexposed or log, will need a lift")
    }
    # Deliberately quiet unless the colour metadata also suggests log. A
    # grey room under overcast Flemish light is genuinely desaturated
    # footage, not a profile problem, and calling every such clip "log"
    # sends the grade in exactly the wrong direction.
    if ($satAvg -gt 0 -and $satAvg -lt 14 -and $transfer -notmatch 'bt709|iec61966|unset') {
        $notes.Add("very low saturation ($satAvg) with non-Rec.709 transfer - may be a log profile")
    } elseif ($satAvg -gt 0 -and $satAvg -lt 14) {
        $notes.Add("low saturation ($satAvg) - flat, but the file says Rec.709, so this is the scene or the picture profile, not log. Lift it with a grade, do not apply a log LUT")
    }
    if ($lufs -ne '' -and [double]$lufs -lt -26) {
        $notes.Add("quiet dialogue ($lufs LUFS) - needs bringing up to about -14 for social")
    }
    if ($peak -ne '' -and [double]$peak -gt -1) {
        $notes.Add("peaks at $peak dBTP - risk of clipping")
    }
    if (-not $a) {
        $notes.Add("NO AUDIO - cannot carry a soundbite")
    }
    if ($notes.Count -eq 0) { $notes.Add("nothing flagged") }

    # Camera make, model and whatever else the body wrote. This is how the
    # camera identifies itself, and it saves asking a human what they shot
    # on. The log profile usually is NOT here - Canon and Sony keep that in
    # proprietary maker notes that ffprobe does not read, which is what
    # exiftool is for.
    $tagPairs = @()
    foreach ($src in @($meta.format.tags, ($meta.streams | Where-Object { $_.codec_type -eq 'video' } | Select-Object -First 1).tags)) {
        if ($src) {
            foreach ($t in $src.PSObject.Properties) {
                if ($t.Name -match 'make|model|software|encoder|comment|creation|handler|major_brand' -and
                    $t.Value -and $t.Name -notmatch 'minor_version') {
                    $tagPairs += ("{0}={1}" -f $t.Name, $t.Value)
                }
            }
        }
    }
    $tagLine = if ($tagPairs.Count) { ($tagPairs | Select-Object -Unique) -join '  ' } else { '(none written)' }

    $audioDesc = if ($a) {
        "$($a.codec_name), $($a.channels) ch @ $($a.sample_rate) Hz"
    } else { "none" }

    $report.Add("-- [$n] $($file.Name)")
    $report.Add(("   video    {0} {1}x{2} @ {3} fps, {4}, {5} Mb/s" -f $v.codec_name, $v.width, $v.height, $fps, $pixFmt, $bitrateMbps))
    $report.Add(("   colour   primaries={0} transfer={1} space={2}" -f $primaries, $transfer, $space))
    $report.Add(("   length   {0}s, {1} MB" -f [math]::Round($durationSec), [math]::Round($file.Length / 1MB)))
    $report.Add(("   audio    {0} - {1} LUFS, range {2} LU, peak {3} dBTP" -f $audioDesc, $(if($lufs){$lufs}else{'?'}), $(if($lra){$lra}else{'?'}), $(if($peak){$peak}else{'?'})))
    $report.Add(("   picture  luma avg {0}, saturation avg {1}" -f $lumaAvg, $satAvg))
    $report.Add(("   camera   {0}" -f $tagLine))
    $report.Add(("   notes    {0}" -f ($notes -join '; ')))
    $report.Add("")

    $rows.Add([pscustomobject]@{
        n              = $n
        file           = $file.Name
        path           = $file.FullName
        codec          = $v.codec_name
        width          = $v.width
        height         = $v.height
        fps            = $fps
        durationSec    = [math]::Round($durationSec, 2)
        bitrateMbps    = $bitrateMbps
        sizeMB         = [math]::Round($file.Length / 1MB)
        pixFmt         = $pixFmt
        colorPrimaries = $primaries
        colorTransfer  = $transfer
        colorSpace     = $space
        rotation       = $rotation
        audioCodec     = $(if ($a) { $a.codec_name } else { 'none' })
        audioChannels  = $(if ($a) { $a.channels } else { 0 })
        lufs           = $lufs
        lra            = $lra
        truePeak       = $peak
        lumaAvg        = $lumaAvg
        satAvg         = $satAvg
        cameraTags     = $tagLine
        notes          = ($notes -join '; ')
    })
}

$report.Add("-- $n clips analysed --")

# ASCII keeps the file readable wherever it ends up.
$report -join "`r`n" | Out-File -FilePath $reportPath -Encoding utf8
$rows | ConvertTo-Json -Depth 4 | Out-File -FilePath $jsonPath -Encoding utf8

Write-Host ""
Write-Host "Report: $reportPath" -ForegroundColor Green
Write-Host "JSON:   $jsonPath"   -ForegroundColor Green
Write-Host ""
Write-Host "Both are plain text and small. Send those two files - nothing"
Write-Host "else needs to move, and the footage stays where it is."

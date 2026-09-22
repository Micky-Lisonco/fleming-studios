<#
.SYNOPSIS
  Download the generated stills into public\images\.

.DESCRIPTION
  The sandbox that built this edit cannot reach the CDN the images are
  served from, so they are fetched here instead. Two are used; the other
  two are alternates - swap a URL below if you prefer one of those.

.EXAMPLE
  .\scripts\fetch-images.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root 'public\images'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$base = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GRcGkXwo3j5Yynu7p0ad1XyOhc'

# The two the edit uses. Both are a cyclist on a road - the one subject
# with no footage of it. Nothing generated goes inside the chamber any
# more: every invented interior read as a waiting room beside the real
# one.
$wanted = @{
  'cyclist-road.png'  = "$base/hf_20260922_125045_6ae4c3c3-fd6d-415a-ac94-049041475bd2.png"
  'cyclist-climb.png' = "$base/hf_20260922_125044_0183844f-b520-4aae-90fa-1fdeddf41bf1.png"
}

# Retired generated interiors, kept only so they can be seen once and
# written off.
$alternates = @{
  'retired-inside-rest.png'   = "$base/hf_20260922_123222_9605ce83-279b-4d5c-8d35-be992328becd.png"
  'retired-inside-group.png'  = "$base/hf_20260922_123220_d7d7b9c2-3734-4678-8e44-8c80044ff987.png"
  'retired-riders-tank.png'   = "$base/hf_20260922_123221_4bcd4e1b-1e2f-4777-8ec7-76a99d020550.png"
}

foreach ($set in @($wanted, $alternates)) {
  foreach ($name in $set.Keys) {
    $out = Join-Path $dest $name
    Write-Host "  $name"
    Invoke-WebRequest -Uri $set[$name] -OutFile $out -UseBasicParsing
  }
}

Write-Host ""
Write-Host "Saved to $dest" -ForegroundColor Green
Write-Host ""
Write-Host "Any image that does not work: tell me which filename and what is"
Write-Host "wrong with it, and it gets regenerated. I cannot see these - the"
Write-Host "sandbox cannot reach the CDN - so the pictures are your call."

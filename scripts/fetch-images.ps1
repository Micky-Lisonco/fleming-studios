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

# The three the edit still uses. Everything else went back to real
# footage - the chairs especially, which are heated massage recliners
# and which a generated interior turned into a waiting room.
$wanted = @{
  'cyclist-road.png'  = "$base/hf_20260922_125045_6ae4c3c3-fd6d-415a-ac94-049041475bd2.png"
  'cyclist-climb.png' = "$base/hf_20260922_125044_0183844f-b520-4aae-90fa-1fdeddf41bf1.png"
  'inside-rest.png'   = "$base/hf_20260922_123222_9605ce83-279b-4d5c-8d35-be992328becd.png"
}

# Retired: the group shot read as a dated interior, and the riders by
# the tank read as bystanders rather than as the audience. Kept only so
# they can be looked at before being written off.
$alternates = @{
  'retired-inside-group.png'  = "$base/hf_20260922_123220_d7d7b9c2-3734-4678-8e44-8c80044ff987.png"
  'retired-riders-tank.png'   = "$base/hf_20260922_123221_4bcd4e1b-1e2f-4777-8ec7-76a99d020550.png"
  'retired-inside-reading.png'= "$base/hf_20260922_123221_019702a1-94f7-41cc-9226-75637aeb0180.png"
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

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

# The six the edit uses. All but one are set INSIDE the chamber, which
# is the shot nobody filmed - the camera never rolled on the room in
# use, and that is exactly the thing the film has to show.
$wanted = @{
  'inside-cyclists.png' = "$base/hf_20260922_123220_e8bd113d-d07e-4eb2-9c33-98812d99153b.png"
  'inside-group.png'    = "$base/hf_20260922_123220_d7d7b9c2-3734-4678-8e44-8c80044ff987.png"
  'inside-rest.png'     = "$base/hf_20260922_123222_9605ce83-279b-4d5c-8d35-be992328becd.png"
  'inside-reading.png'  = "$base/hf_20260922_123221_019702a1-94f7-41cc-9226-75637aeb0180.png"
  'inside-armrest.png'  = "$base/hf_20260922_123220_b055bc7c-02ca-4e8f-8605-6bcc492d1300.png"
  'riders-outside.png'  = "$base/hf_20260922_123221_4bcd4e1b-1e2f-4777-8ec7-76a99d020550.png"
}

# Earlier attempts, kept only so they can be compared against.
$alternates = @{
  'old-tired-cyclist.png' = "$base/hf_20260922_121907_eca8cb6d-8ea2-4618-b2fb-f5ab486895ea.png"
  'old-resting.png'       = "$base/hf_20260922_121917_ba158e47-2c4c-4900-8897-956b3f46f55f.png"
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

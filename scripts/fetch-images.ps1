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

# The two the edit uses.
$wanted = @{
  'tired-cyclist.png' = "$base/hf_20260922_121907_eca8cb6d-8ea2-4618-b2fb-f5ab486895ea.png"
  'resting.png'       = "$base/hf_20260922_121917_ba158e47-2c4c-4900-8897-956b3f46f55f.png"
}

# Alternates, saved alongside so they can be compared and swapped in.
$alternates = @{
  'tired-cyclist-alt.png' = "$base/hf_20260922_121907_d3583b65-de8f-420a-85e5-bea5be2ef2d1.png"
  'resting-alt.png'       = "$base/hf_20260922_121917_1ff230d3-c5f1-47bc-8425-d3f32c0d38f1.png"
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
Write-Host "To use an alternate instead, rename it over the one it replaces,"
Write-Host "e.g. tired-cyclist-alt.png -> tired-cyclist.png"

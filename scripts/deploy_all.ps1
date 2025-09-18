$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

& (Join-Path $PSScriptRoot 'deploy_web.ps1')
& (Join-Path $PSScriptRoot 'deploy_api.ps1')

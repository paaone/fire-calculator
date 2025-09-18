$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root 'web')

npm install
npm run test -- --run
npm run build

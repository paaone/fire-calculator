Param(
    [string]$Port = "8000"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
pytest api/tests
python -m compileall api
uvicorn api.main:app --host 0.0.0.0 --port $Port

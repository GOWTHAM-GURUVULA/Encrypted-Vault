$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$backendDir = Join-Path $repoRoot "backend"
$distDir = Join-Path $backendDir "dist"
$specPath = Join-Path $backendDir "app.spec"
$exePath = Join-Path $distDir "app.exe"

if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
  throw "PyInstaller is not installed. Install it first: pip install pyinstaller"
}

Push-Location $backendDir
try {
  pyinstaller --noconfirm --onefile --name app app.py
}
finally {
  Pop-Location
}

if (-not (Test-Path $exePath)) {
  throw "Backend executable build failed. Expected file not found: $exePath"
}

if (Test-Path $specPath) {
  Remove-Item -LiteralPath $specPath -Force
}

Write-Host "Backend executable created at: $exePath" -ForegroundColor Green

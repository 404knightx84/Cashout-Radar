$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = Join-Path $projectRoot 'backend'

$pythonExe = 'python'
$venvPython = 'D:\Cashtrace\.venv-1\Scripts\python.exe'
if (Test-Path $venvPython) {
  $pythonExe = $venvPython
}

Write-Host "Starting ATM-Sentinel backend on http://127.0.0.1:8000 using $pythonExe"
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$backendRoot'; & '$pythonExe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)

Write-Host 'Starting ATM-Sentinel frontend on http://127.0.0.1:5173'
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$projectRoot'; npm run dev -- --host 127.0.0.1"
)

Write-Host 'Live services launched.'
Write-Host 'Frontend: http://127.0.0.1:5173/'
Write-Host 'Backend:  http://127.0.0.1:8000/health'

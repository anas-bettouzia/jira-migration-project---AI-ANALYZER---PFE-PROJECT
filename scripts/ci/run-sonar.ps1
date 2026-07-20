$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")

function Require-Command {
    param([string] $Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Require-Env {
    param([string] $Name)

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) {
        throw "Environment variable '$Name' is required."
    }
}

Require-Env "SONAR_HOST_URL"
Require-Env "SONAR_TOKEN"

$PythonBin = if ([string]::IsNullOrWhiteSpace($env:PYTHON_BIN)) { "python" } else { $env:PYTHON_BIN }

Require-Command "node"
Require-Command "npm"
Require-Command $PythonBin
Require-Command "sonar-scanner"

Write-Host "Running frontend validation..."
Push-Location (Join-Path $RepoRoot "front")
npm ci
npm run lint
npm run build
Pop-Location

Write-Host "Running backend syntax validation..."
Push-Location $RepoRoot
$PythonFiles = @(
    "back\gateway\app.py",
    "back\parsing_service\app.py",
    "back\compatibility_service\app.py",
    "back\knowledge_service\app.py",
    "back\report_service\app.py",
    "back\worker\tasks\analysis_task.py",
    "back\worker\tasks\job_manager.py"
)
& $PythonBin -m py_compile @PythonFiles

Write-Host "Running SonarQube analysis..."
sonar-scanner `
    -Dsonar.host.url="$env:SONAR_HOST_URL" `
    -Dsonar.token="$env:SONAR_TOKEN"
Pop-Location

Write-Host "CI analysis completed."

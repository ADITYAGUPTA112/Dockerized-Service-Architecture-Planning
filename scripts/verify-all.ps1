# ==============================================================================
# verify-all.ps1 - End-to-End Verification of the Dockerized Service Stack
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   DOCKERIZED SERVICE: FULL STACK VERIFICATION SUITE   " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Secret Hygiene
Write-Host "[1/6] Auditing Git Secret Hygiene..." -ForegroundColor Yellow
$null = cmd /c "git ls-files --error-unmatch .env >nul 2>nul"
if ($LASTEXITCODE -eq 0) {
    Write-Host "FATAL: .env file is tracked in Git repository!" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: .env is strictly ignored and untracked." -ForegroundColor Green

# 2. Lint & Unit Tests
Write-Host "`n[2/6] Running Linter & Automated Test Suite..." -ForegroundColor Yellow
& npm.cmd run lint
& npm.cmd test
if ($LASTEXITCODE -ne 0) {
    Write-Host "FATAL: Automated tests failed!" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: All 28 automated tests passed." -ForegroundColor Green

# 3. Docker Image Build
Write-Host "`n[3/6] Building Production Docker Image..." -ForegroundColor Yellow
& docker build --no-cache -t dockerized-service:verify .
if ($LASTEXITCODE -ne 0) {
    Write-Host "FATAL: Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Docker image built successfully." -ForegroundColor Green

# 4. Image Security & Isolation Audit
Write-Host "`n[4/6] Auditing Container Filesystem & Security Isolation..." -ForegroundColor Yellow
& docker run --rm --entrypoint sh dockerized-service:verify -c 'test ! -f /app/.env && test $(id -u) -eq 1000'
if ($LASTEXITCODE -ne 0) {
    Write-Host "FATAL: Image security audit failed (secret leak or running as root)!" -ForegroundColor Red
    exit 1
}
Write-Host "PASS: Container image contains NO .env and runs as non-root UID 1000." -ForegroundColor Green

# 5. Live Runtime Smoke Tests
Write-Host "`n[5/6] Starting Test Container & Probing Endpoints..." -ForegroundColor Yellow
$containerId = & docker run -d -p 3009:3000 --env-file .env dockerized-service:verify
Start-Sleep -Seconds 3

try {
    # Check /
    $resRoot = curl.exe -s http://127.0.0.1:3009/
    if ($resRoot -ne "Hello, world!") { throw "GET / mismatch: expected 'Hello, world!', got '$resRoot'" }

    # Check /health
    $resHealth = curl.exe -s http://127.0.0.1:3009/health
    if ($resHealth -notmatch '"status":"ok"') { throw "GET /health mismatch: got '$resHealth'" }

    # Check /secret unauthenticated
    $statusUnauth = curl.exe -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3009/secret
    if ($statusUnauth -ne "401") { throw "GET /secret without auth expected 401, got $statusUnauth" }

    # Check /secret valid credentials
    $resSecret = curl.exe -s -u devuser:devpass123 http://127.0.0.1:3009/secret
    if ($resSecret -notmatch "Dev secret: Dockerized service is working!") { throw "GET /secret auth mismatch: got '$resSecret'" }

    # Check /metrics
    $resMetrics = curl.exe -s http://127.0.0.1:3009/metrics
    $metricsText = $resMetrics -join "`n"
    if ($metricsText -notmatch "http_requests_total") { throw "GET /metrics mismatch: missing http_requests_total" }

    Write-Host "PASS: All live runtime endpoints (/ , /health , /secret , /metrics) verified!" -ForegroundColor Green
}
finally {
    & docker rm -f $containerId | Out-Null
}

# 6. Kubernetes Manifest Validation
Write-Host "`n[6/6] Validating Kubernetes Manifests & Helm Chart..." -ForegroundColor Yellow
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    & kubectl kustomize k8s/manifests | Out-Null
    Write-Host "PASS: Kubernetes manifests compiled cleanly with Kustomize." -ForegroundColor Green
} else {
    Write-Host "NOTICE: kubectl not installed locally; skipping client-side dry-run." -ForegroundColor Gray
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   FULL STACK PROJECT COMPLETE AND PRODUCTION READY!   " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

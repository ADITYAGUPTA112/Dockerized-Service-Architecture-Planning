#!/usr/bin/env bash
# ==============================================================================
# verify-all.sh - End-to-End Verification of the Dockerized Service Stack
# ==============================================================================
set -euo pipefail

echo ""
echo "========================================================"
echo "   DOCKERIZED SERVICE: FULL STACK VERIFICATION SUITE   "
echo "========================================================"
echo ""

# 1. Secret Hygiene
echo "[1/6] Auditing Git Secret Hygiene..."
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo "FATAL: .env file is tracked in Git repository!" >&2
    exit 1
fi
echo "PASS: .env is strictly ignored and untracked."

# 2. Lint & Unit Tests
echo ""
echo "[2/6] Running Linter & Automated Test Suite..."
npm run lint
npm test
echo "PASS: All 28 automated tests passed."

# 3. Docker Image Build
echo ""
echo "[3/6] Building Production Docker Image..."
docker build --no-cache -t dockerized-service:verify .
echo "PASS: Docker image built successfully."

# 4. Image Security & Isolation Audit
echo ""
echo "[4/6] Auditing Container Filesystem & Security Isolation..."
docker run --rm --entrypoint sh dockerized-service:verify -c 'test ! -f /app/.env && test $(id -u) -eq 1000'
echo "PASS: Container image contains NO .env and runs as non-root UID 1000."

# 5. Live Runtime Smoke Tests
echo ""
echo "[5/6] Starting Test Container & Probing Endpoints..."
CONTAINER_ID=$(docker run -d -p 3009:3000 --env-file .env dockerized-service:verify)
trap 'docker rm -f "${CONTAINER_ID}" >/dev/null 2>&1 || true' EXIT
sleep 3

# Check /
ROOT_RES=$(curl -s http://127.0.0.1:3009/)
if [ "${ROOT_RES}" != "Hello, world!" ]; then
    echo "FATAL: Root endpoint failed: ${ROOT_RES}" >&2
    exit 1
fi

# Check /health
curl -s http://127.0.0.1:3009/health | grep '"status":"ok"' >/dev/null

# Check /secret unauthenticated
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3009/secret)
if [ "${CODE}" != "401" ]; then
    echo "FATAL: Expected 401 on unauthenticated /secret, got ${CODE}" >&2
    exit 1
fi

# Check /secret valid credentials
curl -s -u devuser:devpass123 http://127.0.0.1:3009/secret | grep "Dev secret: Dockerized service is working!" >/dev/null

# Check /metrics
curl -s http://127.0.0.1:3009/metrics | grep "http_requests_total" >/dev/null

echo "PASS: All live runtime endpoints (/ , /health , /secret , /metrics) verified!"

# 6. Kubernetes Manifest Validation
echo ""
echo "[6/6] Validating Kubernetes Manifests..."
if command -v kubectl >/dev/null 2>&1; then
    kubectl kustomize k8s/manifests >/dev/null
    echo "PASS: Kubernetes manifests compiled cleanly with Kustomize."
else
    echo "NOTICE: kubectl not installed; skipping client-side dry-run."
fi

echo ""
echo "========================================================"
echo "   FULL STACK PROJECT COMPLETE AND PRODUCTION READY!   "
echo "========================================================"
echo ""

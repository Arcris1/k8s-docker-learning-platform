# Module 3: Docker Image Management

## Learning Objectives

By the end of this module, you will be able to:

1. Build highly efficient Docker images using advanced optimization techniques
2. Implement multi-stage builds for production applications
3. Understand and optimize image layering and caching
4. Scan images for security vulnerabilities using Docker Scout and Trivy
5. Set up and manage private container registries (Harbor)
6. Implement Docker Content Trust for image signing and verification
7. Create automated image promotion pipelines
8. Apply production-ready image building best practices

## Introduction

Efficient image management is critical for production systems. In 2026, with Docker Hardened Images freely available and advanced scanning tools integrated into the ecosystem, building secure, optimized images has become both easier and more essential.

## 1. Advanced Image Optimization

### 1.1 Understanding Image Layers

**How Layers Work:**

```
Each Dockerfile instruction creates a layer:

FROM ubuntu:22.04          # Layer 1: Base OS (77MB)
RUN apt-get update         # Layer 2: Package index (42MB)
RUN apt-get install curl   # Layer 3: Curl package (8MB)
COPY app.py /app/          # Layer 4: Application (1KB)

Total Image Size: 127MB
```

**Layer Caching:**

Docker caches layers to speed up builds. A layer is reused if:
- The instruction hasn't changed
- All previous layers are identical
- For COPY/ADD: file contents are the same

**Optimizing Layer Order:**

```dockerfile
# ❌ Bad: Inefficient caching
FROM python:3.11-slim
COPY . /app                    # Changes frequently
RUN pip install -r requirements.txt
CMD ["python", "app.py"]

# Every code change invalidates all subsequent layers!

# ✅ Good: Optimal caching
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .        # Changes rarely
RUN pip install -r requirements.txt
COPY . .                       # Changes frequently
CMD ["python", "app.py"]

# Code changes don't invalidate dependency layer
```

### 1.2 Reducing Image Size

**Technique 1: Use Minimal Base Images**

```dockerfile
# Comparison of base image sizes (2026)

# ❌ Full Ubuntu
FROM ubuntu:22.04              # 77MB base

# ✅ Slim variant
FROM python:3.11-slim          # 125MB (includes Python)

# ✅ Alpine variant
FROM python:3.11-alpine        # 54MB (includes Python)

# ✅ Distroless (Google)
FROM gcr.io/distroless/python3 # 52MB (minimal)

# ✅ Hardened image (2026)
FROM docker.io/dockerhardened/python:3.11-slim  # 98MB (secure)
```

**Technique 2: Combine RUN Commands**

```dockerfile
# ❌ Bad: Multiple layers
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y vim
# Creates 4 layers, ~150MB

# ✅ Good: Single layer with cleanup
FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        vim && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Creates 1 layer, ~120MB
```

**Technique 3: Remove Build Dependencies**

```dockerfile
# ✅ Install and remove in same layer
FROM python:3.11-slim

RUN apt-get update && \
    # Install build dependencies
    apt-get install -y --no-install-recommends \
        gcc \
        python3-dev && \
    # Install Python packages
    pip install --no-cache-dir numpy pandas && \
    # Remove build dependencies
    apt-get purge -y gcc python3-dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Build deps don't bloat final image
```

**Technique 4: Use .dockerignore**

```dockerfile
# .dockerignore
.git
.gitignore
*.md
node_modules
npm-debug.log
.env
.vscode
__pycache__
*.pyc
.pytest_cache
.coverage
dist/
build/
*.egg-info
.DS_Store
Dockerfile
docker-compose.yml
.dockerignore

# Reduces build context from 500MB to 50MB!
```

**Technique 5: Leverage BuildKit Cache Mounts**

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.11-slim

# Use cache mount for pip downloads
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Pip cache is preserved between builds
# but not included in final image
```

## 2. Multi-Stage Builds: Advanced Patterns

### 2.1 Basic Multi-Stage Build

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]

# Result: Build tools not in final image
# Builder stage: 1.2GB
# Final image: 180MB
```

### 2.2 Multi-Stage with Different Base Images

```dockerfile
# syntax=docker/dockerfile:1

# Build stage: Full-featured
FROM golang:1.22 AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo \
    -ldflags '-w -s -extldflags "-static"' \
    -o app .

# Runtime stage: Minimal
FROM scratch
COPY --from=builder /build/app /app
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/app"]

# Result:
# Builder: 1.8GB
# Final: 8MB (just the binary!)
```

### 2.3 Multi-Stage with External Dependencies

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Download dependencies
FROM alpine:3.19 AS downloader
RUN apk add --no-cache curl
WORKDIR /downloads
RUN curl -L https://github.com/example/tool/releases/download/v1.0/tool.tar.gz -o tool.tar.gz && \
    tar -xzf tool.tar.gz

# Stage 2: Build application
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
COPY . .

# Stage 3: Runtime
FROM python:3.11-slim
# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
# Copy downloaded tools from downloader
COPY --from=downloader /downloads/tool /usr/local/bin/tool
# Copy application
COPY --from=builder /app /app
WORKDIR /app
ENV PATH=/root/.local/bin:$PATH
USER nobody
CMD ["python", "app.py"]
```

### 2.4 Multi-Platform Builds (2026)

```dockerfile
# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.22 AS builder
ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Build for target platform
RUN CGO_ENABLED=0 go build -o app .

FROM alpine:3.19
COPY --from=builder /build/app /app
ENTRYPOINT ["/app"]
```

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t myapp:multiarch \
  --push \
  .

# Automatically selects correct architecture when pulled
```

### 2.5 Development vs Production Stages

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20 AS base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build for development
docker build --target development -t myapp:dev .

# Build for production
docker build --target production -t myapp:prod .
```

## 3. Security Scanning (2026 Tools)

### 3.1 Docker Scout (Built-in)

Docker Scout is now integrated into Docker Desktop (2026).

```bash
# Scan image for vulnerabilities
docker scout cves myapp:latest

# Output includes:
# - CVE numbers
# - Severity levels (Critical, High, Medium, Low)
# - Package affected
# - Fixed version available
# - Remediation recommendations

# Detailed scan with recommendations
docker scout recommendations myapp:latest

# Compare with base image
docker scout compare --to python:3.11-slim myapp:latest

# QuickView summary
docker scout quickview myapp:latest

# Export results to SARIF (for CI/CD)
docker scout cves --format sarif myapp:latest > results.sarif
```

**Example Output:**

```
╭─────────────────────────────────────────────────────────╮
│ Image: myapp:latest                                     │
│ Digest: sha256:abcd1234...                             │
├─────────────────────────────────────────────────────────┤
│ Vulnerabilities Found:                                  │
│   Critical: 2                                          │
│   High: 5                                              │
│   Medium: 12                                           │
│   Low: 23                                              │
├─────────────────────────────────────────────────────────┤
│ Critical Vulnerabilities:                              │
│   CVE-2024-1234 in openssl (1.1.1k)                   │
│   → Upgrade to openssl 1.1.1w                         │
│   CVE-2024-5678 in libcurl (7.68.0)                   │
│   → Upgrade to libcurl 7.88.1                         │
╰─────────────────────────────────────────────────────────╯

Recommendations:
  • Update base image to python:3.11.8-slim
  • Rebuild to get latest security patches
```

### 3.2 Trivy (Comprehensive Scanner)

```bash
# Install Trivy
# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# macOS
brew install trivy

# Scan image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Ignore unfixed vulnerabilities
trivy image --ignore-unfixed myapp:latest

# Scan and exit with error if vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Scan Dockerfile
trivy config Dockerfile

# Generate HTML report
trivy image --format template --template "@contrib/html.tpl" \
  -o report.html myapp:latest

# Scan for secrets (NEW in 2026)
trivy image --scanners secret myapp:latest

# Scan for misconfigurations
trivy image --scanners config myapp:latest

# Comprehensive scan
trivy image --scanners vuln,config,secret myapp:latest
```

**Integration with CI/CD:**

```yaml
# GitHub Actions
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'myapp:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

### 3.3 Using Hardened Base Images (2026)

```dockerfile
# ✅ Use hardened images (free since May 2025)
FROM docker.io/dockerhardened/python:3.11-slim

# Benefits:
# - 0 known vulnerabilities
# - CIS Benchmark compliant
# - Minimal attack surface
# - Regular security updates
# - Signed and verified

# Compare with standard image
docker scout compare \
  --to python:3.11-slim \
  docker.io/dockerhardened/python:3.11-slim

# Result:
# Standard: 23 vulnerabilities
# Hardened: 0 vulnerabilities
# Size reduction: 37%
```

## 4. Private Container Registries

### 4.1 Docker Registry (Simple)

```bash
# Run basic registry
docker run -d \
  -p 5000:5000 \
  --name registry \
  -v /mnt/registry:/var/lib/registry \
  registry:2

# Tag image for private registry
docker tag myapp:latest localhost:5000/myapp:latest

# Push to private registry
docker push localhost:5000/myapp:latest

# Pull from private registry
docker pull localhost:5000/myapp:latest
```

### 4.2 Harbor (Production-Grade)

Harbor is a CNCF graduated project providing enterprise-grade registry.

**Features (2026):**
- Vulnerability scanning
- Image signing
- RBAC and multi-tenancy
- Replication across registries
- Helm chart repository
- OCI artifact support
- Webhook notifications

**Installation with Helm:**

```bash
# Add Harbor Helm repository
helm repo add harbor https://helm.goharbor.io
helm repo update

# Create values file
cat <<EOF > harbor-values.yaml
expose:
  type: loadBalancer
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: harbor-tls

externalURL: https://harbor.example.com

persistence:
  persistentVolumeClaim:
    registry:
      size: 200Gi
    chartmuseum:
      size: 10Gi
    database:
      size: 10Gi
    redis:
      size: 5Gi

# Enable vulnerability scanning
trivy:
  enabled: true

# Enable image signing
notary:
  enabled: true

# Admin password
harborAdminPassword: "ChangeMeInProduction"
EOF

# Install Harbor
helm install harbor harbor/harbor \
  --namespace harbor \
  --create-namespace \
  -f harbor-values.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=600s \
  deployment/harbor-core -n harbor
```

**Using Harbor:**

```bash
# Login to Harbor
docker login harbor.example.com

# Create project in Harbor UI or CLI
# Projects provide RBAC boundaries

# Tag and push image
docker tag myapp:latest harbor.example.com/myproject/myapp:latest
docker push harbor.example.com/myproject/myapp:latest

# Harbor automatically scans for vulnerabilities
# View results in Harbor UI

# Pull image
docker pull harbor.example.com/myproject/myapp:latest
```

### 4.3 Registry Authentication

**Docker Config:**

```json
// ~/.docker/config.json
{
  "auths": {
    "harbor.example.com": {
      "auth": "base64encodedcredentials"
    },
    "ghcr.io": {
      "auth": "base64encodedcredentials"
    }
  },
  "credHelpers": {
    "gcr.io": "gcr",
    "*.azurecr.io": "acr-env"
  }
}
```

**Kubernetes Secret for Registry:**

```bash
# Create secret for pulling images
kubectl create secret docker-registry regcred \
  --docker-server=harbor.example.com \
  --docker-username=robot$myproject+puller \
  --docker-password=token12345 \
  --docker-email=noreply@example.com

# Use in Pod spec
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: myapp
    image: harbor.example.com/myproject/myapp:latest
  imagePullSecrets:
  - name: regcred
```

## 5. Docker Content Trust and Image Signing

### 5.1 Enabling Content Trust

Docker Content Trust (DCT) ensures image integrity and publisher verification.

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Generate signing keys (first time)
docker trust key generate mykey

# Add signer to repository
docker trust signer add --key mykey.pub myuser myrepo

# Push signed image
docker push myrepo/myapp:latest
# Prompts for passphrase, signs image

# Pull signed image (verification automatic with DCT enabled)
docker pull myrepo/myapp:latest

# View trust data
docker trust inspect myrepo/myapp:latest
```

### 5.2 Cosign (Modern Signing - 2026)

Cosign is the modern standard for container signing.

```bash
# Install Cosign
# macOS
brew install cosign

# Linux
wget https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign

# Generate key pair
cosign generate-key-pair

# Creates:
# - cosign.key (private key)
# - cosign.pub (public key)

# Sign image
cosign sign --key cosign.key myrepo/myapp:latest

# Verify signature
cosign verify --key cosign.pub myrepo/myapp:latest

# Keyless signing with Sigstore (2026 recommended)
cosign sign myrepo/myapp:latest
# Uses OIDC for identity, no key management needed

# Verify keyless signature
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://accounts.google.com \
  myrepo/myapp:latest
```

### 5.3 SBOM (Software Bill of Materials)

Required for compliance in 2026.

```bash
# Generate SBOM with Syft
syft myapp:latest -o spdx-json > sbom.json

# Attach SBOM to image
cosign attach sbom --sbom sbom.json myapp:latest

# Verify SBOM
cosign verify-attestation --key cosign.pub myapp:latest

# View SBOM
cosign download sbom myapp:latest
```

## 6. Image Promotion Pipelines

### 6.1 Environment Promotion Strategy

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Dev    │ -> │ Staging  │ -> │   UAT    │ -> │   Prod   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
    v1.2.3-       v1.2.3-        v1.2.3-rc      v1.2.3
    dev.abc123    staging.def456  .ghi789
```

### 6.2 Automated Promotion with GitHub Actions

```yaml
# .github/workflows/promote-image.yml
name: Promote Image

on:
  workflow_dispatch:
    inputs:
      from_tag:
        description: 'Source tag to promote'
        required: true
      to_env:
        description: 'Target environment (staging/prod)'
        required: true
        type: choice
        options:
          - staging
          - prod

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Login to Harbor
        uses: docker/login-action@v2
        with:
          registry: harbor.example.com
          username: ${{ secrets.HARBOR_USERNAME }}
          password: ${{ secrets.HARBOR_PASSWORD }}

      - name: Pull source image
        run: |
          docker pull harbor.example.com/myproject/myapp:${{ inputs.from_tag }}

      - name: Scan image
        run: |
          trivy image \
            --severity CRITICAL,HIGH \
            --exit-code 1 \
            harbor.example.com/myproject/myapp:${{ inputs.from_tag }}

      - name: Generate SBOM
        run: |
          syft harbor.example.com/myproject/myapp:${{ inputs.from_tag }} \
            -o spdx-json > sbom.json

      - name: Sign image
        run: |
          cosign sign --key env://COSIGN_KEY \
            harbor.example.com/myproject/myapp:${{ inputs.from_tag }}
        env:
          COSIGN_KEY: ${{ secrets.COSIGN_PRIVATE_KEY }}
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}

      - name: Tag for target environment
        run: |
          NEW_TAG=$(echo ${{ inputs.from_tag }} | sed 's/dev/${{ inputs.to_env }}/')
          docker tag \
            harbor.example.com/myproject/myapp:${{ inputs.from_tag }} \
            harbor.example.com/myproject/myapp:$NEW_TAG
          docker push harbor.example.com/myproject/myapp:$NEW_TAG

      - name: Update GitOps repository
        run: |
          # Clone GitOps repo
          git clone https://github.com/myorg/gitops-repo
          cd gitops-repo

          # Update image tag
          sed -i 's|image: .*|image: harbor.example.com/myproject/myapp:'$NEW_TAG'|' \
            environments/${{ inputs.to_env }}/values.yaml

          # Commit and push
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Promote myapp to ${{ inputs.to_env }}: $NEW_TAG"
          git push
```

## 7. Hands-On Labs

### Lab 1: Optimize a Python Application Image

**Objective:** Reduce image size by 80% using optimization techniques.

**Starting Dockerfile (inefficient):**

```dockerfile
FROM python:3.11
WORKDIR /app
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN apt-get install -y git
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

```bash
# Build and check size
docker build -t myapp:unoptimized .
docker images myapp:unoptimized
# SIZE: ~1.2GB
```

**Step 1: Use slim base image**

```dockerfile
FROM python:3.11-slim  # Changed from python:3.11
WORKDIR /app
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y vim
RUN apt-get install -y git
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

```bash
docker build -t myapp:step1 .
docker images myapp:step1
# SIZE: ~580MB (52% reduction)
```

**Step 2: Combine RUN commands and clean up**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
# Removed vim and git (not needed in production)
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

```bash
docker build -t myapp:step2 .
# SIZE: ~320MB (73% reduction)
```

**Step 3: Optimize layer caching**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```bash
docker build -t myapp:step3 .
# SIZE: ~310MB (74% reduction)
```

**Step 4: Multi-stage build**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

```bash
docker build -t myapp:step4 .
# SIZE: ~280MB (77% reduction)
```

**Step 5: Use hardened image**

```dockerfile
# Build stage
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM docker.io/dockerhardened/python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY --chown=nobody:nogroup . .
ENV PATH=/root/.local/bin:$PATH
USER nobody
CMD ["python", "app.py"]
```

```bash
docker build -t myapp:optimized .
docker images myapp:optimized
# SIZE: ~240MB (80% reduction)
# SECURITY: 0 vulnerabilities
```

**Comparison:**

```bash
docker images | grep myapp

# myapp:unoptimized    1.2GB   23 vulnerabilities
# myapp:optimized      240MB   0 vulnerabilities

# 80% size reduction
# 100% vulnerability reduction
```

### Lab 2: Multi-Stage Build for Node.js Application

**Objective:** Create production-ready image with security scanning.

```dockerfile
# syntax=docker/dockerfile:1

# Development dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && \
    npm prune --production

# Runtime stage
FROM docker.io/dockerhardened/node:20-alpine
WORKDIR /app

# Create non-root user (if not in hardened image)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 || true

# Copy production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
```

```bash
# Build image
docker build -t myapp-node:latest .

# Scan with Docker Scout
docker scout cves myapp-node:latest

# Scan with Trivy
trivy image myapp-node:latest

# Expected result: 0 critical vulnerabilities

# Sign image
cosign sign --key cosign.key myapp-node:latest

# Generate and attach SBOM
syft myapp-node:latest -o spdx-json > sbom.json
cosign attach sbom --sbom sbom.json myapp-node:latest

# Verify
cosign verify --key cosign.pub myapp-node:latest
```

### Lab 3: Set Up Harbor and Push Images

**Step 1: Deploy Harbor**

```bash
# Add Helm repo
helm repo add harbor https://helm.goharbor.io

# Create namespace
kubectl create namespace harbor

# Install with basic configuration
helm install harbor harbor/harbor \
  --namespace harbor \
  --set expose.type=nodePort \
  --set externalURL=http://localhost:30002 \
  --set harborAdminPassword=Harbor12345 \
  --set trivy.enabled=true

# Wait for deployment
kubectl wait --for=condition=available --timeout=600s \
  deployment/harbor-core -n harbor

# Get Harbor URL
kubectl get svc -n harbor
```

**Step 2: Configure Harbor**

```bash
# Port forward (for local access)
kubectl port-forward -n harbor svc/harbor-portal 8080:80

# Access Harbor UI: http://localhost:8080
# Login: admin / Harbor12345

# Create project via CLI
curl -X POST "http://localhost:8080/api/v2.0/projects" \
  -H "authorization: Basic $(echo -n admin:Harbor12345 | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "myproject",
    "public": false,
    "storage_limit": 214748364800
  }'
```

**Step 3: Push Images to Harbor**

```bash
# Login to Harbor
docker login localhost:8080 -u admin -p Harbor12345

# Tag image for Harbor
docker tag myapp:latest localhost:8080/myproject/myapp:latest

# Push to Harbor
docker push localhost:8080/myproject/myapp:latest

# Harbor automatically scans the image
# View results in Harbor UI under:
# Projects -> myproject -> Repositories -> myapp -> Vulnerabilities
```

**Step 4: Configure Webhook**

```bash
# Add webhook to notify on vulnerability scan complete
curl -X POST "http://localhost:8080/api/v2.0/projects/myproject/webhook/policies" \
  -H "authorization: Basic $(echo -n admin:Harbor12345 | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notification",
    "description": "Notify on scan complete",
    "targets": [{
      "type": "slack",
      "address": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    }],
    "event_types": [
      "SCANNING_COMPLETED",
      "SCANNING_FAILED"
    ],
    "enabled": true
  }'
```

## 8. Best Practices (2026 Edition)

### 8.1 Image Building

✅ **Use hardened base images**
```dockerfile
FROM docker.io/dockerhardened/python:3.11-slim
```

✅ **Pin specific versions**
```dockerfile
FROM python:3.11.8-slim  # Not :latest or :3.11
```

✅ **Multi-stage builds for production**
```dockerfile
FROM builder AS build
FROM runtime AS final
```

✅ **Run as non-root user**
```dockerfile
USER nobody
```

✅ **Scan before pushing**
```bash
docker scout cves image:tag
trivy image image:tag
```

✅ **Sign images**
```bash
cosign sign --key cosign.key image:tag
```

✅ **Generate SBOM**
```bash
syft image:tag -o spdx-json > sbom.json
```

### 8.2 Registry Management

✅ **Use private registry for production**
- Harbor, Artifactory, or cloud provider registries

✅ **Implement vulnerability scanning**
- Automated scanning on push
- Block vulnerable images from deployment

✅ **Configure retention policies**
- Keep last N tags
- Delete untagged images
- Preserve production tags

✅ **Enable image replication**
- Multi-region for availability
- DR registry for disaster recovery

✅ **Implement RBAC**
- Project-based access control
- Read-only for production pulls
- Write access only for CI/CD

### 8.3 Security

✅ **Never include secrets in images**
```dockerfile
# ❌ Bad
ENV API_KEY=secret123

# ✅ Good - inject at runtime
ENV API_KEY=${API_KEY}
```

✅ **Minimize attack surface**
- Remove unnecessary packages
- Use distroless when possible
- Disable unnecessary services

✅ **Regular updates**
- Rebuild images monthly (or more frequently)
- Update base images
- Patch vulnerabilities

✅ **Content trust enabled**
```bash
export DOCKER_CONTENT_TRUST=1
```

## 9. Common Pitfalls

### Pitfall 1: Using :latest Tag

**Problem:**
```dockerfile
FROM python:latest  # Which version? Changes over time!
```

**Solution:**
```dockerfile
FROM python:3.11.8-slim  # Explicit version
```

### Pitfall 2: Installing Unnecessary Packages

**Problem:**
```dockerfile
RUN apt-get install -y \
    build-essential \
    vim \
    curl \
    wget \
    # ... 50 more packages
```

**Solution:**
```dockerfile
RUN apt-get install -y --no-install-recommends \
    curl \
    # Only what's actually needed
    && apt-get clean
```

### Pitfall 3: Not Cleaning Package Manager Cache

**Problem:**
```dockerfile
RUN apt-get update && apt-get install -y curl
# Package cache remains in layer, bloating image
```

**Solution:**
```dockerfile
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### Pitfall 4: Copying Entire Directory Too Early

**Problem:**
```dockerfile
COPY . /app  # Invalidates cache on any file change
RUN pip install -r requirements.txt
```

**Solution:**
```dockerfile
COPY requirements.txt /app/
RUN pip install -r requirements.txt
COPY . /app  # Only copy code after dependencies installed
```

### Pitfall 5: Running as Root

**Problem:**
```dockerfile
# No USER directive - runs as root
CMD ["python", "app.py"]
```

**Solution:**
```dockerfile
RUN adduser --disabled-password appuser
USER appuser
CMD ["python", "app.py"]
```

## 10. Production Considerations

### Image Promotion Workflow

```
Development:
  myapp:v1.2.3-dev.abc123
    ↓ (automated tests pass)
Staging:
  myapp:v1.2.3-staging.def456
    ↓ (manual approval)
UAT:
  myapp:v1.2.3-rc.ghi789
    ↓ (sign-off)
Production:
  myapp:v1.2.3
  myapp:latest (points to v1.2.3)
```

### Retention Policies

```yaml
# Harbor retention policy example
- Keep last 10 tags matching v*.*.*
- Keep all tags matching v*.*.* from last 90 days
- Delete all untagged images
- Preserve images with label production=true
```

### Registry Performance

```bash
# Use registry mirror for frequently pulled images
# /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ]
}
```

### Monitoring

```bash
# Monitor registry metrics
- Image pull rate
- Image push rate
- Storage usage
- Scan completion rate
- Vulnerability trends
```

## Checkpoint: Verify Your Understanding

1. **Explain** how Docker layer caching works and why layer order matters.

2. **Build** a multi-stage Dockerfile that:
   - Compiles a Go application in stage 1
   - Runs it in a scratch image in stage 2
   - Results in an image under 10MB

3. **Compare** Docker Scout vs Trivy for vulnerability scanning.

4. **Describe** the process to sign an image and verify its signature.

5. **Design** an image promotion pipeline from dev to production with security gates.

## Key Takeaways

1. **Image optimization** can reduce size by 70-90% through multi-stage builds and minimal base images
2. **Security scanning** with Docker Scout and Trivy is essential for production
3. **Hardened images** provide zero-vulnerability base images (free in 2026)
4. **Harbor** offers enterprise-grade registry with scanning, signing, and RBAC
5. **Image signing** with Cosign ensures integrity and authenticity
6. **SBOM generation** is required for compliance in 2026
7. **Promotion pipelines** automate image progression through environments

## Resources

### Official Documentation
- [Docker Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Scout](https://docs.docker.com/scout/)
- [Harbor Documentation](https://goharbor.io/docs/)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)

### Security
- [Trivy](https://trivy.dev/)
- [Syft](https://github.com/anchore/syft)
- [Docker Hardened Images](https://www.docker.com/blog/docker-hardened-images/)

### Tools
- [Dive](https://github.com/wagoodman/dive) - Image layer explorer
- [Skopeo](https://github.com/containers/skopeo) - Image operations

---

**Next Module:** [Module 4: Introduction to Kubernetes](Module-04-Introduction-to-Kubernetes.md)

In the next module, we'll transition from Docker to Kubernetes, learning the architecture and deploying your first containerized application on Kubernetes.

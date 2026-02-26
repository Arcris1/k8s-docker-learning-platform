# Module 2: Docker Fundamentals

## Learning Objectives

By the end of this module, you will be able to:

1. Understand Docker architecture and its core components
2. Install and configure Docker Desktop (2026 version)
3. Work confidently with Docker CLI commands
4. Build, run, and manage containers
5. Create Dockerfiles following 2026 best practices
6. Use Docker Hardened Images for security
7. Manage the container lifecycle
8. Troubleshoot common Docker issues

## Introduction

Docker revolutionized containerization by making it accessible and practical. As of 2026, Docker has evolved significantly with features like Hardened Images (now free and open source), AI integration, and enhanced security. This module provides hands-on experience with modern Docker fundamentals.

## 1. Docker Architecture

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Docker Client                       │
│              (docker CLI commands)                   │
└────────────────────┬─────────────────────────────────┘
                     │ REST API
                     ▼
┌──────────────────────────────────────────────────────┐
│                Docker Daemon (dockerd)               │
│  ┌──────────┬──────────┬──────────┬───────────────┐ │
│  │ Images   │Containers│ Networks │   Volumes     │ │
│  └──────────┴──────────┴──────────┴───────────────┘ │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              containerd                              │
│         (container runtime)                          │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│                    runc                              │
│       (OCI-compliant runtime)                        │
└──────────────────────────────────────────────────────┘
```

### 1.2 Core Components

#### Docker Client (CLI)
The command-line interface you interact with.

```bash
docker run nginx    # Client sends command to daemon
docker build .      # Client handles build context
docker ps           # Client requests container list
```

#### Docker Daemon (dockerd)
The background service that:
- Manages Docker objects (images, containers, networks, volumes)
- Listens to Docker API requests
- Communicates with other daemons for orchestration

#### containerd
The industry-standard container runtime that:
- Manages container lifecycle (start, stop, pause)
- Image transfer and storage
- Container execution via runc

#### Docker Registries
Store and distribute Docker images:
- **Docker Hub** (hub.docker.com) - Public registry
- **GitHub Container Registry** (ghcr.io)
- **Private registries** (Harbor, Artifactory, ECR, GCR, ACR)

### 1.3 Docker Objects

#### Images
Read-only templates for creating containers.
```bash
# Image naming convention
[registry]/[repository]:[tag]

# Examples
nginx:1.25.3                    # From Docker Hub
ghcr.io/myorg/myapp:v2.1       # From GitHub
gcr.io/google-containers/nginx:latest
```

#### Containers
Runnable instances of images.
```bash
# Container states
Created → Running → Paused → Stopped → Removed
```

#### Networks
Enable container communication.
```bash
# Network types
bridge   # Default, for standalone containers
host     # Remove network isolation
overlay  # Multi-host networking
macvlan  # Assign MAC addresses
```

#### Volumes
Persistent data storage.
```bash
# Volume types
Named volumes   # Managed by Docker
Bind mounts    # Direct host filesystem mapping
tmpfs          # Memory-only storage
```

## 2. Installing Docker (2026 Edition)

### 2.1 Docker Desktop Installation

**For Windows 11 (Recommended):**

```powershell
# Download from https://www.docker.com/products/docker-desktop

# System Requirements
- Windows 11 64-bit (WSL 2 enabled)
- 8GB RAM minimum (16GB recommended)
- Hardware virtualization enabled in BIOS
- WSL 2 backend (default)

# Installation Steps
1. Download Docker Desktop installer
2. Run installer (uses Windows MSI as of 2026)
3. Enable WSL 2 integration
4. Restart computer
5. Verify installation
```

**For macOS:**

```bash
# Download from https://www.docker.com/products/docker-desktop

# System Requirements
- macOS 12.0 or later
- Apple Silicon (M1/M2/M3) or Intel chip
- 4GB RAM minimum

# Installation Steps
1. Download .dmg file
2. Drag Docker to Applications
3. Launch Docker Desktop
4. Grant permissions when prompted
```

**For Linux (Ubuntu/Debian):**

```bash
# Uninstall old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install using repository
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker run hello-world
```

### 2.2 Post-Installation Configuration

**Linux: Manage Docker as non-root user**

```bash
# Create docker group
sudo groupadd docker

# Add your user
sudo usermod -aG docker $USER

# Activate changes
newgrp docker

# Verify
docker run hello-world
```

**Configure Docker to start on boot:**

```bash
# Linux (systemd)
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

### 2.3 Verify Installation

```bash
# Check Docker version
docker --version
# Docker version 25.0.2, build 29cf629  (example 2026 version)

# Check detailed info
docker version

# Output shows:
# Client: Docker Engine - Community
#  Version:           25.0.2
#  API version:       1.45
# Server: Docker Engine - Community
#  Version:           25.0.2
#  containerd:        1.7.13

# Check system-wide information
docker info

# Run test container
docker run hello-world
```

## 3. Docker CLI Essentials

### 3.1 Working with Images

#### Searching for Images

```bash
# Search Docker Hub
docker search nginx

# Search with filters
docker search --filter stars=1000 nginx
docker search --filter is-official=true python
```

#### Pulling Images

```bash
# Pull latest version
docker pull nginx

# Pull specific version
docker pull nginx:1.25.3

# Pull from different registry
docker pull ghcr.io/nginxinc/nginx-unprivileged:latest

# Pull with digest (immutable reference)
docker pull nginx@sha256:abcd1234...
```

#### Listing Images

```bash
# List all local images
docker images
# or
docker image ls

# Show all images including intermediate layers
docker images -a

# Filter images
docker images nginx
docker images "nginx:1.*"

# Format output
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

#### Inspecting Images

```bash
# Detailed information about an image
docker image inspect nginx:latest

# View image layers
docker image history nginx:latest

# View with human-readable sizes
docker image history --no-trunc nginx:latest
```

#### Removing Images

```bash
# Remove single image
docker rmi nginx:1.25.3

# Remove multiple images
docker rmi nginx:1.25.3 redis:7-alpine

# Remove all unused images
docker image prune

# Remove all images (dangerous!)
docker rmi $(docker images -q)

# Force remove (even if container exists)
docker rmi -f nginx:latest
```

### 3.2 Working with Containers

#### Running Containers

```bash
# Basic run (pull if not exists, create, start)
docker run nginx

# Run with name
docker run --name my-nginx nginx

# Run in detached mode (background)
docker run -d nginx

# Run interactively with terminal
docker run -it ubuntu bash

# Run with port mapping (host:container)
docker run -d -p 8080:80 nginx

# Run with environment variables
docker run -d -e MYSQL_ROOT_PASSWORD=secret mysql:8

# Run with volume mount
docker run -d -v my-data:/var/lib/mysql mysql:8

# Run with resource limits
docker run -d --memory="512m" --cpus="1.5" nginx

# Run with automatic removal after exit
docker run --rm alpine echo "Hello World"

# Complete example
docker run -d \
  --name my-web-app \
  --restart unless-stopped \
  -p 8080:80 \
  -e ENV=production \
  -v /host/data:/app/data \
  --memory="1g" \
  --cpus="2" \
  nginx:1.25.3
```

#### Listing Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# List only container IDs
docker ps -q

# List with custom format
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"

# List recently created containers
docker ps -n 5

# List with size information
docker ps -s
```

#### Managing Container Lifecycle

```bash
# Start stopped container
docker start my-nginx

# Stop running container (SIGTERM, then SIGKILL after grace period)
docker stop my-nginx

# Stop with custom timeout
docker stop -t 30 my-nginx

# Restart container
docker restart my-nginx

# Pause container (freeze processes)
docker pause my-nginx

# Unpause container
docker unpause my-nginx

# Kill container immediately (SIGKILL)
docker kill my-nginx

# Remove stopped container
docker rm my-nginx

# Force remove running container
docker rm -f my-nginx

# Remove all stopped containers
docker container prune
```

#### Executing Commands in Containers

```bash
# Execute command in running container
docker exec my-nginx ls /etc/nginx

# Interactive shell access
docker exec -it my-nginx bash

# Execute as specific user
docker exec -u nginx my-nginx whoami

# Execute with environment variable
docker exec -e DEBUG=true my-nginx env

# Common use cases
docker exec -it mysql-db mysql -p        # Access MySQL
docker exec -it redis-cache redis-cli    # Access Redis
docker exec my-app cat /app/config.yml   # View file
```

#### Viewing Logs

```bash
# View container logs
docker logs my-nginx

# Follow logs in real-time
docker logs -f my-nginx

# Show last N lines
docker logs --tail 100 my-nginx

# Show logs with timestamps
docker logs -t my-nginx

# Show logs since timestamp
docker logs --since 2026-02-14T10:00:00 my-nginx

# Show logs for specific time range
docker logs --since 1h my-nginx
```

#### Inspecting Containers

```bash
# Detailed container information
docker inspect my-nginx

# Get specific field (using Go template)
docker inspect --format='{{.NetworkSettings.IPAddress}}' my-nginx

# Get container state
docker inspect --format='{{.State.Status}}' my-nginx

# Get environment variables
docker inspect --format='{{.Config.Env}}' my-nginx
```

#### Container Stats and Performance

```bash
# Real-time resource usage (all containers)
docker stats

# Stats for specific container
docker stats my-nginx

# Stats without streaming
docker stats --no-stream

# Top processes in container
docker top my-nginx

# Disk usage
docker system df

# Detailed disk usage
docker system df -v
```

### 3.3 Docker System Commands

```bash
# System-wide information
docker info

# Show Docker disk usage
docker system df

# Clean up unused resources
docker system prune

# Remove all unused resources including volumes
docker system prune -a --volumes

# Monitor events
docker events

# Monitor events with filters
docker events --filter container=my-nginx

# Get system version
docker version
```

## 4. Creating Your First Dockerfile

### 4.1 Dockerfile Basics

A Dockerfile is a text file containing instructions to build a Docker image.

**Basic Structure:**

```dockerfile
# Syntax version (recommended in 2026)
# syntax=docker/dockerfile:1

# Base image - where we start from
FROM ubuntu:22.04

# Metadata
LABEL maintainer="your-email@example.com"
LABEL version="1.0"
LABEL description="My first Docker image"

# Set working directory
WORKDIR /app

# Copy files from host to image
COPY . /app

# Run commands during build
RUN apt-get update && \
    apt-get install -y python3 && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV APP_ENV=production

# Expose ports (documentation only)
EXPOSE 8080

# Command to run when container starts
CMD ["python3", "app.py"]
```

### 4.2 Essential Dockerfile Instructions

#### FROM - Base Image

```dockerfile
# Use official image (recommended)
FROM python:3.11-slim

# Use specific version (best practice)
FROM node:20.11.0-alpine3.19

# Use digest for immutability (production)
FROM nginx@sha256:abcd1234...

# Multi-stage build (advanced)
FROM golang:1.22 AS builder
# ... build steps ...
FROM alpine:3.19
# ... copy from builder ...
```

#### WORKDIR - Set Working Directory

```dockerfile
# Sets working directory for subsequent instructions
WORKDIR /app

# All paths now relative to /app
COPY package.json .      # Copies to /app/package.json
RUN npm install          # Runs in /app
```

#### COPY vs ADD

```dockerfile
# COPY - simple file copy (preferred)
COPY package.json /app/
COPY src/ /app/src/

# COPY with ownership
COPY --chown=node:node package.json /app/

# ADD - has extra features (use sparingly)
ADD https://example.com/file.tar.gz /tmp/  # Can fetch URLs
ADD archive.tar.gz /app/                   # Auto-extracts archives

# Best Practice: Use COPY unless you need ADD's special features
```

#### RUN - Execute Commands

```dockerfile
# Shell form (runs in /bin/sh -c)
RUN apt-get update

# Exec form (no shell processing)
RUN ["apt-get", "update"]

# Chain commands to reduce layers (2026 best practice)
RUN apt-get update && \
    apt-get install -y \
        curl \
        git \
        vim && \
    rm -rf /var/lib/apt/lists/*

# Use here-documents for complex scripts (Dockerfile 1.4+)
RUN <<EOF
apt-get update
apt-get install -y python3
python3 --version
EOF
```

#### ENV - Environment Variables

```dockerfile
# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Multiple variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Use in subsequent instructions
ENV APP_HOME=/app
WORKDIR $APP_HOME
```

#### EXPOSE - Document Ports

```dockerfile
# Inform Docker which ports container listens on
EXPOSE 80
EXPOSE 443
EXPOSE 8080/tcp
EXPOSE 8081/udp

# Note: EXPOSE doesn't actually publish ports
# Use -p flag when running: docker run -p 8080:80 myimage
```

#### CMD vs ENTRYPOINT

```dockerfile
# CMD - default command (can be overridden)
CMD ["python3", "app.py"]
# docker run myimage           → runs python3 app.py
# docker run myimage bash      → runs bash (CMD overridden)

# ENTRYPOINT - main executable (harder to override)
ENTRYPOINT ["python3", "app.py"]
# docker run myimage           → runs python3 app.py
# docker run myimage --debug   → runs python3 app.py --debug

# Best Practice: Use both together
ENTRYPOINT ["python3", "app.py"]
CMD ["--port", "8000"]
# docker run myimage           → python3 app.py --port 8000
# docker run myimage --port 9000 → python3 app.py --port 9000
```

#### USER - Set User Context

```dockerfile
# Create and switch to non-root user (security best practice)
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# All subsequent RUN, CMD, ENTRYPOINT run as appuser

# Switch back to root if needed
USER root
RUN apt-get update
USER appuser
```

#### VOLUME - Define Mount Points

```dockerfile
# Declare volumes for data persistence
VOLUME /var/lib/mysql
VOLUME ["/var/log", "/var/db"]

# Creates anonymous volume if not specified at runtime
```

#### ARG - Build Arguments

```dockerfile
# Define build-time variables
ARG VERSION=1.0
ARG BUILD_DATE

# Use in build instructions
RUN echo "Building version $VERSION"

# Override at build time:
# docker build --build-arg VERSION=2.0 .

# ARG before FROM applies to FROM
ARG PYTHON_VERSION=3.11
FROM python:${PYTHON_VERSION}-slim
```

### 4.3 Practical Dockerfile Examples

#### Example 1: Python Flask Application

```dockerfile
# syntax=docker/dockerfile:1

# Use official Python runtime as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Run application
CMD ["python", "app.py"]
```

#### Example 2: Node.js Application (2026 Best Practices)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Use node user (built into official image)
USER node

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
```

#### Example 3: Multi-Stage Build for Go Application

```dockerfile
# syntax=docker/dockerfile:1

# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /build

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .

# Stage 2: Runtime
FROM alpine:3.19

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/app .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port
EXPOSE 8080

# Run binary
CMD ["./app"]
```

## 5. Building Docker Images

### 5.1 Build Command Syntax

```bash
# Basic build (looks for Dockerfile in current directory)
docker build .

# Build with tag
docker build -t myapp:1.0 .

# Build with multiple tags
docker build -t myapp:1.0 -t myapp:latest .

# Build with build arguments
docker build --build-arg VERSION=2.0 -t myapp:2.0 .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with no cache (force rebuild)
docker build --no-cache -t myapp:latest .

# Build with progress output (2026 feature)
docker build --progress=plain -t myapp:latest .

# Build for different platform
docker build --platform linux/amd64 -t myapp:latest .
```

### 5.2 Build Context

The build context is all files in the directory sent to Docker daemon.

```bash
# Directory structure
myapp/
├── Dockerfile
├── src/
│   ├── app.py
│   └── utils.py
├── tests/              # Don't need in image
├── .git/               # Don't need in image
├── node_modules/       # Don't need in image
└── .dockerignore       # Exclude files from context
```

**.dockerignore file:**

```
# Exclude from build context
.git
.gitignore
*.md
node_modules
tests
*.log
.env
.vscode
__pycache__
*.pyc
```

### 5.3 Image Tagging Best Practices

```bash
# Semantic versioning
myapp:1.0.0        # Specific version
myapp:1.0          # Minor version
myapp:1            # Major version
myapp:latest       # Latest stable

# Environment tags
myapp:dev
myapp:staging
myapp:production

# Git commit tags
myapp:git-abc123f

# Date-based tags
myapp:2026-02-14

# Complete example
docker build \
  -t myregistry.com/myapp:1.2.3 \
  -t myregistry.com/myapp:1.2 \
  -t myregistry.com/myapp:1 \
  -t myregistry.com/myapp:latest \
  .
```

## 6. Docker Hardened Images (2026 Feature)

### 6.1 What Are Hardened Images?

Docker Hardened Images (DHI) are production-ready, security-focused base images:

- **Minimal attack surface** - Only essential components
- **No vulnerabilities** - Regularly scanned and patched
- **CIS Benchmark compliant** - Follows security best practices
- **Free and open source** - Available since May 2025
- **Signed and verified** - Content trust enabled

### 6.2 Using Hardened Images

```dockerfile
# Instead of standard image
FROM nginx:latest

# Use hardened image (2026)
FROM docker.io/dockerhardened/nginx:latest

# Available hardened images
FROM docker.io/dockerhardened/node:20-alpine
FROM docker.io/dockerhardened/python:3.11-slim
FROM docker.io/dockerhardened/nginx:1.25
FROM docker.io/dockerhardened/postgres:16
```

### 6.3 Benefits of Hardened Images

```bash
# Comparison
Standard nginx image:
- 142MB size
- 37 vulnerabilities (example)
- Runs as root by default

Hardened nginx image:
- 89MB size (37% smaller)
- 0 known vulnerabilities
- Runs as non-root user
- Minimal packages installed
- Regular security updates
```

## 7. Container Lifecycle Management

### 7.1 Container States

```
     docker run
        ↓
    [ Created ]
        ↓ docker start
    [ Running ] ←→ [ Paused ]  (docker pause/unpause)
        ↓ docker stop
    [ Stopped ]
        ↓ docker rm
    [ Removed ]
```

### 7.2 Restart Policies

```bash
# No restart (default)
docker run --restart no nginx

# Always restart
docker run --restart always nginx

# Restart on failure
docker run --restart on-failure:5 nginx  # Max 5 retries

# Restart unless explicitly stopped
docker run --restart unless-stopped nginx  # Best for production
```

### 7.3 Health Checks

```dockerfile
# In Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Or in docker run
docker run \
  --health-cmd="curl -f http://localhost/ || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  nginx
```

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' my-nginx
# Output: healthy | unhealthy | starting
```

## 8. Hands-On Labs

### Lab 1: Your First Docker Container

**Objective:** Run a pre-built container and interact with it.

```bash
# Pull and run nginx
docker run -d --name my-first-nginx -p 8080:80 nginx:alpine

# Verify it's running
docker ps

# Access in browser: http://localhost:8080

# View logs
docker logs my-first-nginx

# Execute command in container
docker exec my-first-nginx ls /etc/nginx

# Get shell access
docker exec -it my-first-nginx sh

# Inside container, run:
cat /etc/nginx/nginx.conf
exit

# Stop and remove
docker stop my-first-nginx
docker rm my-first-nginx

# Verify removal
docker ps -a
```

### Lab 2: Build a Custom Python Application

**Step 1: Create application files**

```bash
# Create project directory
mkdir my-python-app
cd my-python-app
```

**app.py:**
```python
from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def hello():
    env = os.getenv('ENVIRONMENT', 'unknown')
    return f'Hello from Docker! Environment: {env}'

@app.route('/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**requirements.txt:**
```
flask==3.0.0
```

**Dockerfile:**
```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

CMD ["python", "app.py"]
```

**.dockerignore:**
```
__pycache__
*.pyc
.git
.env
```

**Step 2: Build the image**

```bash
# Build image
docker build -t my-python-app:1.0 .

# Verify image created
docker images | grep my-python-app
```

**Step 3: Run the container**

```bash
# Run with environment variable
docker run -d \
  --name python-app \
  -p 5000:5000 \
  -e ENVIRONMENT=production \
  my-python-app:1.0

# Test the application
curl http://localhost:5000
# Output: Hello from Docker! Environment: production

# Check health
docker inspect --format='{{.State.Health.Status}}' python-app

# View logs
docker logs python-app
```

**Step 4: Iterate and rebuild**

```bash
# Modify app.py (add new endpoint)
# Then rebuild
docker build -t my-python-app:1.1 .

# Stop old container
docker stop python-app
docker rm python-app

# Run new version
docker run -d --name python-app -p 5000:5000 my-python-app:1.1
```

### Lab 3: Multi-Stage Build

Create an efficient Go application image.

**main.go:**
```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from Go in Docker!")
    })

    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
```

**Dockerfile:**
```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /build

COPY main.go .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o app .

# Runtime stage
FROM scratch

COPY --from=builder /build/app /app

EXPOSE 8080

CMD ["/app"]
```

```bash
# Build
docker build -t go-app:multistage .

# Check size
docker images go-app:multistage
# Note: Image is only ~6-7MB!

# Run
docker run -d --name go-app -p 8080:8080 go-app:multistage

# Test
curl http://localhost:8080
```

## 9. Best Practices (2026 Edition)

### 9.1 Security Best Practices

1. **Use Hardened Base Images**
```dockerfile
FROM docker.io/dockerhardened/python:3.11-slim
```

2. **Run as Non-Root User**
```dockerfile
RUN adduser -D appuser
USER appuser
```

3. **Scan Images for Vulnerabilities**
```bash
# Using Docker Scout (built-in 2026)
docker scout cves my-image:latest

# Using Trivy
trivy image my-image:latest
```

4. **Sign Images**
```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push myregistry/myimage:1.0
```

5. **Use Specific Version Tags**
```dockerfile
FROM python:3.11.7-slim  # Not :latest
```

### 9.2 Efficiency Best Practices

1. **Optimize Layer Caching**
```dockerfile
# Copy dependencies first (changes less frequently)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code last (changes frequently)
COPY . .
```

2. **Use .dockerignore**
```
# Reduce build context size
.git
node_modules
*.log
tests
```

3. **Multi-Stage Builds**
```dockerfile
FROM node:20 AS builder
# ... build steps ...
FROM node:20-alpine
COPY --from=builder /app/dist /app
```

4. **Combine RUN Commands**
```dockerfile
# ❌ Bad (creates multiple layers)
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get clean

# ✅ Good (single layer)
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

5. **Use Appropriate Base Images**
```dockerfile
# Development: Full featured
FROM python:3.11

# Production: Minimal
FROM python:3.11-slim

# Extreme minimal: Alpine
FROM python:3.11-alpine
```

## 10. Common Pitfalls and Troubleshooting

### Pitfall 1: Large Image Sizes

**Problem:**
```bash
docker images myapp
# myapp  1.0  2.3GB  # Too large!
```

**Solutions:**
- Use alpine or slim base images
- Multi-stage builds
- Remove unnecessary files
- Combine RUN commands

### Pitfall 2: Cached Layers Not Updating

**Problem:**
```dockerfile
RUN apt-get update && apt-get install curl
# This layer might be cached with old package lists
```

**Solution:**
```bash
# Force rebuild without cache
docker build --no-cache -t myapp:latest .

# Or invalidate specific layer
RUN apt-get update && apt-get install -y curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*
```

### Pitfall 3: Container Exits Immediately

**Problem:**
```bash
docker run myapp
# Container exits immediately
```

**Troubleshooting:**
```bash
# Check logs
docker logs container-id

# Check exit code
docker inspect --format='{{.State.ExitCode}}' container-id

# Run interactively to debug
docker run -it myapp sh
```

### Pitfall 4: Permission Denied Errors

**Problem:**
```bash
# Container can't write to volume
Permission denied: /app/data
```

**Solution:**
```dockerfile
# Match container user to volume ownership
RUN useradd -m -u 1000 appuser
USER appuser
```

```bash
# Or fix permissions on host
sudo chown -R 1000:1000 /host/data
```

### Pitfall 5: Port Already in Use

**Problem:**
```bash
docker run -p 8080:80 nginx
# Error: port is already allocated
```

**Solution:**
```bash
# Check what's using the port
sudo lsof -i :8080  # Linux/Mac
netstat -ano | findstr :8080  # Windows

# Use different host port
docker run -p 8081:80 nginx
```

## 11. Production Considerations

### Resource Limits
```bash
docker run \
  --memory="1g" \
  --memory-swap="1g" \
  --cpus="2" \
  --pids-limit=100 \
  myapp:latest
```

### Logging Drivers
```bash
docker run \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp:latest
```

### Restart Policies
```bash
docker run --restart=unless-stopped myapp:latest
```

### Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

## Checkpoint: Verify Your Understanding

1. **Explain** the difference between an image and a container.

2. **Describe** what happens when you run `docker run nginx`:
   - Checks for local image
   - Pulls from registry if not found
   - Creates container from image
   - Starts container

3. **Identify** the best base image choice for a production Python app:
   - python:3.11 (Development)
   - python:3.11-slim (Production - recommended)
   - python:3.11-alpine (Most minimal)
   - docker.io/dockerhardened/python:3.11-slim (Most secure)

4. **Build** a Dockerfile for a Node.js app that:
   - Uses Node 20 Alpine
   - Runs as non-root user
   - Has proper layer caching
   - Includes health check

5. **Troubleshoot** why a container keeps restarting:
   - Check logs: `docker logs container-name`
   - Check health: `docker inspect container-name`
   - Run interactively: `docker run -it image-name sh`

## Key Takeaways

1. Docker architecture consists of **client, daemon, containerd, and runc**
2. Use **docker CLI** to build, run, and manage containers
3. **Dockerfiles** define how images are built with layered instructions
4. **Hardened images** (free in 2026) provide security by default
5. **Multi-stage builds** create small, efficient production images
6. **Best practices** include non-root users, specific tags, and .dockerignore
7. **Container lifecycle** management requires understanding states and restart policies

## Resources for Further Learning

### Official Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker CLI Reference](https://docs.docker.com/engine/reference/commandline/cli/)

### Security
- [Docker Hardened Images](https://www.docker.com/blog/docker-hardened-images-for-every-developer/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

### Tools
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Docker Scout](https://docs.docker.com/scout/) - Vulnerability scanning

---

**Next Module:** [Module 3: Docker Image Management](Module-03-Docker-Image-Management.md)

In the next module, we'll dive deeper into image optimization, multi-stage builds, private registries, and security scanning.

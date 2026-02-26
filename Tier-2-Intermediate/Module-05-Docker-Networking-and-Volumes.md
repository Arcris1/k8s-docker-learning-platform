# Module 5: Docker Networking and Volumes

## Learning Objectives

By the end of this module, you will be able to:

1. Understand Docker networking modes and when to use each
2. Create and manage custom bridge networks
3. Enable container-to-container communication
4. Implement service discovery using DNS
5. Troubleshoot network connectivity issues
6. Understand Docker volume types and use cases
7. Create and manage persistent data with volumes
8. Use bind mounts for development workflows
9. Implement backup and restore strategies
10. Optimize storage performance

## Introduction

Networking and data persistence are critical for real-world containerized applications. This module covers Docker's networking capabilities and storage solutions, essential for building production-ready multi-container applications.

## Part 1: Docker Networking

### 1.1 Docker Network Drivers

Docker provides several network drivers:

```
┌─────────────────────────────────────────────────────┐
│  Network Driver          Use Case                   │
├─────────────────────────────────────────────────────┤
│  bridge (default)        Single-host networking     │
│  host                    Remove network isolation   │
│  overlay                 Multi-host networking      │
│  macvlan                 Assign MAC addresses       │
│  none                    Disable networking         │
└─────────────────────────────────────────────────────┘
```

### 1.2 Bridge Network (Default)

**How it works:**
- Docker creates a virtual bridge (docker0)
- Each container gets a veth pair
- Containers on same bridge can communicate
- NAT for external access

**Default bridge limitations:**
- No automatic DNS resolution
- Manual port publishing required
- All containers can communicate (no isolation)

**Default Bridge Example:**

```bash
# Run container on default bridge
docker run -d --name web1 nginx:alpine

# Inspect network
docker network inspect bridge

# Container IP address
docker inspect web1 --format='{{.NetworkSettings.IPAddress}}'
# Output: 172.17.0.2

# From another container, ping by IP (not name)
docker run --rm busybox ping 172.17.0.2  # Works
docker run --rm busybox ping web1        # Fails - no DNS
```

### 1.3 Custom Bridge Networks (Recommended)

**Advantages:**
- Automatic DNS resolution (service discovery)
- Network isolation
- On-the-fly container connection/disconnection
- Better security

**Create and Use Custom Network:**

```bash
# Create custom bridge network
docker network create my-network

# Run containers on custom network
docker run -d --name web --network my-network nginx:alpine
docker run -d --name api --network my-network httpd:alpine

# Test DNS resolution (containers can ping by name)
docker exec web ping api  # Works!

# List networks
docker network ls

# Inspect network
docker network inspect my-network

# Connect existing container to network
docker network connect my-network db

# Disconnect container from network
docker network disconnect my-network db

# Remove network (must disconnect containers first)
docker network rm my-network
```

**Complete Example: Web Application Stack**

```bash
# Create network
docker network create app-network

# Run database
docker run -d \
  --name postgres \
  --network app-network \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

# Run backend API
docker run -d \
  --name api \
  --network app-network \
  -e DATABASE_URL=postgres://postgres:secret@postgres:5432/mydb \
  myapi:latest

# Run frontend
docker run -d \
  --name frontend \
  --network app-network \
  -p 8080:80 \
  -e API_URL=http://api:3000 \
  myfrontend:latest

# All containers can communicate by name
# Only frontend port 8080 is exposed to host
```

### 1.4 Host Network

**Use case:** Maximum network performance (no bridge overhead).

**Caveat:** Container shares host network stack (loses isolation).

```bash
# Run with host network
docker run -d --network host nginx:alpine

# Container uses host's network directly
# Access nginx on host IP:80 (not localhost:8080)

# Port conflicts possible (can't run two nginx on port 80)
```

**When to use:**
- Network performance critical
- Testing/debugging
- Special network configurations

**Avoid in production** - breaks container portability.

### 1.5 Overlay Network (Multi-Host)

For Docker Swarm or multi-host deployments.

```bash
# Initialize Swarm
docker swarm init

# Create overlay network
docker network create -d overlay my-overlay

# Services on overlay can span multiple hosts
docker service create --name web --network my-overlay nginx
```

### 1.6 Macvlan Network

Assigns MAC address to container (appears as physical device).

```bash
# Create macvlan network
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  my-macvlan

# Run container with macvlan
docker run -d --network my-macvlan --ip=192.168.1.100 nginx
```

**Use case:** Legacy apps requiring Layer 2 access.

### 1.7 None Network

Disables networking entirely.

```bash
docker run --network none alpine

# No network interfaces (except loopback)
# Use for security-sensitive workloads
```

### 1.8 Port Publishing

```bash
# Publish single port
docker run -d -p 8080:80 nginx
# Host:8080 → Container:80

# Publish to specific interface
docker run -d -p 127.0.0.1:8080:80 nginx
# Only accessible on localhost:8080

# Publish random host port
docker run -d -p 80 nginx
# Docker assigns random port (32768-65535)

# Publish all exposed ports
docker run -d -P nginx
# Maps all EXPOSE ports to random host ports

# Publish UDP port
docker run -d -p 53:53/udp dns-server

# Publish multiple ports
docker run -d -p 80:80 -p 443:443 nginx
```

### 1.9 DNS Resolution

**Custom bridge networks provide automatic DNS:**

```bash
# Create network
docker network create mynet

# Run containers
docker run -d --name db --network mynet postgres:16
docker run -d --name api --network mynet myapi:latest

# DNS resolution works
docker exec api ping db  # Resolves to db container IP

# Also works with network aliases
docker run -d --name web --network mynet --network-alias webapp nginx

docker exec api ping webapp  # Resolves to web container
```

**Configure custom DNS servers:**

```bash
# Use custom DNS server
docker run --dns 8.8.8.8 alpine nslookup google.com

# Multiple DNS servers
docker run --dns 8.8.8.8 --dns 8.8.4.4 alpine nslookup google.com

# Custom DNS search domain
docker run --dns-search example.com alpine ping server
# Resolves server.example.com
```

### 1.10 Network Troubleshooting

**Tools and Techniques:**

```bash
# Inspect network configuration
docker network inspect bridge

# Check container network settings
docker inspect <container> --format='{{json .NetworkSettings}}' | jq

# Test connectivity from container
docker exec <container> ping <target>
docker exec <container> curl http://service:port
docker exec <container> nslookup service-name

# Use nicolaka/netshoot for advanced troubleshooting
docker run --rm -it --network container:<container-id> nicolaka/netshoot

# Inside netshoot, you have:
# - tcpdump, iperf, netstat, ss, ip
# - curl, wget, nslookup, dig
# - telnet, nc, traceroute

# Check port listeners
docker exec <container> netstat -tlnp

# Capture network traffic
docker run --rm --net=host -v /tmp:/tmp nicolaka/netshoot tcpdump -i any -w /tmp/capture.pcap

# View iptables rules (on host)
sudo iptables -t nat -L -n -v

# Check DNS resolution
docker exec <container> nslookup google.com
docker exec <container> cat /etc/resolv.conf
```

**Common Issues:**

```bash
# Issue: Can't ping by container name
# Solution: Use custom bridge network (not default bridge)

docker network create mynet
docker run --network mynet --name app1 nginx
docker run --network mynet --name app2 alpine ping app1

# Issue: Port already in use
# Check what's using port
sudo lsof -i :8080  # Linux/Mac
netstat -ano | findstr :8080  # Windows

# Use different port
docker run -p 8081:80 nginx

# Issue: Can't access container from host
# Ensure port is published
docker run -p 8080:80 nginx  # Not just EXPOSE

# Check published ports
docker port <container>
```

## Part 2: Docker Volumes and Storage

### 2.1 Why Volumes?

**Problem with container filesystem:**
- Data lost when container is deleted
- Difficult to share data between containers
- Tightly coupled to container lifecycle

**Solutions:**
1. **Volumes** - Managed by Docker, stored in Docker area
2. **Bind mounts** - Mount host directory
3. **tmpfs mounts** - Memory-only storage

```
┌────────────────────────────────────────────────────────┐
│  Storage Type    Stored Location        Use Case       │
├────────────────────────────────────────────────────────┤
│  Volume          /var/lib/docker/volumes  Production   │
│  Bind Mount      Any host path            Development  │
│  tmpfs           Memory (RAM)             Temporary    │
└────────────────────────────────────────────────────────┘
```

### 2.2 Volumes (Recommended for Production)

**Create and manage volumes:**

```bash
# Create volume
docker volume create my-volume

# List volumes
docker volume ls

# Inspect volume
docker volume inspect my-volume

# Output shows mount point on host:
# "Mountpoint": "/var/lib/docker/volumes/my-volume/_data"

# Remove volume
docker volume rm my-volume

# Remove all unused volumes
docker volume prune
```

**Use volume with container:**

```bash
# Mount volume to container
docker run -d \
  --name postgres \
  -v my-volume:/var/lib/postgresql/data \
  postgres:16

# Create volume automatically
docker run -d \
  --name postgres \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16
# Creates 'postgres-data' volume if doesn't exist

# Multiple containers can share volume
docker run -d --name app1 -v shared-data:/app/data myapp:latest
docker run -d --name app2 -v shared-data:/app/data myapp:latest
# Both containers access same data

# Read-only volume
docker run -d -v config-data:/app/config:ro myapp:latest
# Container can read but not write
```

**Volume drivers:**

```bash
# Local driver (default)
docker volume create --driver local my-volume

# NFS volume
docker volume create --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.100,rw \
  --opt device=:/path/to/share \
  nfs-volume

# AWS EBS volume (requires plugin)
docker volume create --driver rexray/ebs \
  --opt size=10 \
  ebs-volume
```

### 2.3 Bind Mounts

**Mount host directory into container:**

```bash
# Basic bind mount
docker run -d \
  -v /host/path:/container/path \
  nginx:alpine

# Current directory shortcut
docker run -d \
  -v $(pwd):/app \
  myapp:latest

# Windows path
docker run -d \
  -v C:\Users\name\project:/app \
  myapp:latest

# Read-only bind mount
docker run -d \
  -v /host/config:/app/config:ro \
  myapp:latest
```

**Development workflow example:**

```bash
# Mount source code for live reload
docker run -d \
  --name dev-server \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/package.json:/app/package.json \
  -p 3000:3000 \
  node:20-alpine \
  npm run dev

# Code changes on host immediately reflected in container
```

**Bind mount vs Volume:**

```bash
# ✅ Volume: Production data
docker run -v db-data:/var/lib/postgresql/data postgres:16

# ✅ Bind mount: Development code
docker run -v $(pwd):/app node:20 npm run dev

# Volume advantages:
# - Docker manages storage
# - Works on all platforms
# - Better performance on Windows/Mac
# - Can backup/restore easily

# Bind mount advantages:
# - Direct access to files
# - Use familiar tools (IDE, etc.)
# - Good for development
```

### 2.4 tmpfs Mounts (Memory Storage)

**Data stored in memory, never persisted:**

```bash
# Create tmpfs mount
docker run -d \
  --tmpfs /app/temp \
  --tmpfs /app/cache:size=100m,mode=1777 \
  myapp:latest

# Use case: temporary files, cache, sensitive data
```

### 2.5 Volume Management Patterns

**Database persistence:**

```bash
# PostgreSQL with named volume
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16

# MySQL with named volume
docker run -d \
  --name mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mysql-data:/var/lib/mysql \
  mysql:8

# MongoDB with named volume
docker run -d \
  --name mongo \
  -v mongo-data:/data/db \
  mongo:7
```

**Application data:**

```bash
# Uploads directory
docker run -d \
  -v app-uploads:/app/uploads \
  myapp:latest

# Logs directory
docker run -d \
  -v app-logs:/var/log/app \
  myapp:latest

# Configuration
docker run -d \
  -v app-config:/etc/app:ro \
  myapp:latest
```

**Shared volumes:**

```bash
# Multiple containers sharing data
docker volume create shared-assets

docker run -d --name web -v shared-assets:/usr/share/nginx/html nginx
docker run -d --name uploader -v shared-assets:/app/uploads uploader:latest

# Web server serves files uploaded by uploader
```

### 2.6 Backup and Restore

**Backup volume data:**

```bash
# Method 1: Using tar
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/postgres-backup.tar.gz -C /data .

# Method 2: Using docker cp
docker create --name temp -v postgres-data:/data alpine
docker cp temp:/data ./backup-data
docker rm temp

# Method 3: Database-specific backup
docker exec postgres pg_dump -U postgres mydb > backup.sql
```

**Restore volume data:**

```bash
# Method 1: From tar archive
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/postgres-backup.tar.gz"

# Method 2: Using docker cp
docker create --name temp -v postgres-data:/data alpine
docker cp ./backup-data/. temp:/data
docker rm temp
docker run -d -v postgres-data:/var/lib/postgresql/data postgres:16

# Method 3: Database-specific restore
docker exec -i postgres psql -U postgres mydb < backup.sql
```

**Automated backup script:**

```bash
#!/bin/bash
# backup-volumes.sh

VOLUMES=("postgres-data" "mysql-data" "app-uploads")
BACKUP_DIR="/backup/docker-volumes"
DATE=$(date +%Y%m%d-%H%M%S)

for volume in "${VOLUMES[@]}"; do
  echo "Backing up $volume..."
  docker run --rm \
    -v $volume:/data \
    -v $BACKUP_DIR:/backup \
    alpine \
    tar czf /backup/${volume}-${DATE}.tar.gz -C /data .
done

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed"
```

### 2.7 Storage Drivers and Performance

**Check storage driver:**

```bash
docker info | grep "Storage Driver"
# Storage Driver: overlay2  (most common in 2026)
```

**Storage drivers:**
- **overlay2:** Default, best performance (Linux)
- **fuse-overlayfs:** Rootless containers
- **btrfs:** Copy-on-write filesystem
- **zfs:** Enterprise features
- **aufs:** Legacy (deprecated)

**Performance tips:**

```bash
# Use volumes instead of bind mounts (better performance)
docker run -v data:/app/data myapp  # ✅ Good
docker run -v $(pwd):/app myapp     # ⚠️ Slower on Windows/Mac

# Use delegated/cached consistency (Mac only)
docker run -v $(pwd):/app:cached myapp    # Host authoritative
docker run -v $(pwd):/app:delegated myapp # Container authoritative

# Limit container writes to writable layer
# Use volumes for frequently written data
```

## Hands-On Labs

### Lab 1: Multi-Container Application with Networking

**Objective:** Build a full-stack app with frontend, backend, and database.

```bash
# Create network
docker network create fullstack

# Run PostgreSQL
docker run -d \
  --name db \
  --network fullstack \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=appdb \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine

# Wait for database to be ready
docker exec db pg_isready -U postgres

# Run backend API
docker run -d \
  --name api \
  --network fullstack \
  -e DATABASE_URL=postgres://postgres:secret@db:5432/appdb \
  -p 3000:3000 \
  myapi:latest

# Run frontend
docker run -d \
  --name frontend \
  --network fullstack \
  -e API_URL=http://api:3000 \
  -p 8080:80 \
  myfrontend:latest

# Test connectivity
# Frontend can access API by name
docker exec frontend ping api

# API can access database by name
docker exec api ping db

# Access application
curl http://localhost:8080

# View logs
docker logs api
docker logs frontend

# Cleanup
docker stop frontend api db
docker rm frontend api db
docker network rm fullstack
docker volume rm postgres-data
```

### Lab 2: Development Workflow with Volumes

**Objective:** Hot-reload development environment.

**Directory structure:**
```
myapp/
├── src/
│   ├── index.js
│   └── server.js
├── package.json
└── Dockerfile
```

**package.json:**
```json
{
  "name": "myapp",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

**Run development container:**

```bash
# Install dependencies (in container)
docker run --rm \
  -v $(pwd):/app \
  -w /app \
  node:20-alpine \
  npm install

# Run dev server with hot reload
docker run -d \
  --name dev-server \
  -v $(pwd):/app \
  -w /app \
  -p 3000:3000 \
  node:20-alpine \
  npm run dev

# Edit files on host, changes auto-reload in container
echo "console.log('Updated!');" >> src/index.js

# View logs to see reload
docker logs -f dev-server

# Cleanup
docker stop dev-server
docker rm dev-server
```

### Lab 3: Volume Backup and Restore

**Objective:** Backup database, destroy container, restore data.

```bash
# Run database and create data
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Create test data
docker exec -i postgres psql -U postgres <<EOF
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));
INSERT INTO users (name) VALUES ('Alice'), ('Bob'), ('Charlie');
EOF

# Verify data
docker exec postgres psql -U postgres -c "SELECT * FROM users;"

# Backup volume
docker run --rm \
  -v pgdata:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/pgdata-backup.tar.gz -C /data .

# Destroy everything
docker stop postgres
docker rm postgres
docker volume rm pgdata

# Verify data is gone
docker volume ls | grep pgdata  # Should be empty

# Restore volume
docker volume create pgdata

docker run --rm \
  -v pgdata:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/pgdata-backup.tar.gz"

# Run new container with restored data
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16

# Wait for startup
sleep 5

# Verify data restored
docker exec postgres psql -U postgres -c "SELECT * FROM users;"
# Should show Alice, Bob, Charlie

# Cleanup
docker stop postgres
docker rm postgres
docker volume rm pgdata
rm pgdata-backup.tar.gz
```

## Best Practices

### Networking

✅ **Use custom bridge networks** for service discovery
✅ **Name containers meaningfully** for easy DNS resolution
✅ **Limit port exposure** - only publish what's necessary
✅ **Use environment variables** for service URLs
✅ **Implement health checks** for network services
✅ **Document port mappings** in docker-compose.yml

### Storage

✅ **Use volumes for persistent data** (not bind mounts in production)
✅ **Name volumes explicitly** (not anonymous volumes)
✅ **Regular backups** of important volumes
✅ **Use read-only mounts** for configuration
✅ **Separate data and logs** into different volumes
✅ **Clean up unused volumes** regularly (`docker volume prune`)

## Common Pitfalls

### Pitfall 1: Using Default Bridge

**Problem:** No DNS resolution between containers.

**Solution:** Create custom bridge network.

### Pitfall 2: Anonymous Volumes

**Problem:**
```bash
docker run -v /var/lib/mysql mysql  # Creates anonymous volume
```

**Solution:**
```bash
docker run -v mysql-data:/var/lib/mysql mysql  # Named volume
```

### Pitfall 3: Forgetting Volume Backups

**Problem:** Data loss when volumes are deleted.

**Solution:** Implement automated backup strategy.

### Pitfall 4: Bind Mount Permission Issues

**Problem:** Container can't write to bind-mounted directory.

**Solution:**
```bash
# Fix permissions on host
sudo chown -R 1000:1000 /host/path

# Or run container with same UID
docker run --user $(id -u):$(id -g) -v $(pwd):/app myapp
```

## Checkpoint

1. **Create** a custom network and connect three containers that can communicate by name.

2. **Set up** a PostgreSQL container with a named volume and verify data persists after container restart.

3. **Implement** a backup script for a volume.

4. **Explain** when to use volumes vs bind mounts vs tmpfs.

5. **Troubleshoot** a networking issue using netshoot container.

## Key Takeaways

1. **Custom bridge networks** provide automatic DNS and isolation
2. **Volumes** are the preferred mechanism for persistent data
3. **Bind mounts** are useful for development workflows
4. **Network troubleshooting** requires understanding Docker's networking model
5. **Regular backups** are essential for volumes containing critical data
6. **Port publishing** exposes container services to the host

## Resources

- [Docker Networking Overview](https://docs.docker.com/network/)
- [Docker Storage Overview](https://docs.docker.com/storage/)
- [Volumes vs Bind Mounts](https://docs.docker.com/storage/volumes/)

---

**Next Module:** [Module 6: Docker Compose](Module-06-Docker-Compose.md)

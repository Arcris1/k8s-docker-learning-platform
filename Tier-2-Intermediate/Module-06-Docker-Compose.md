# Module 6: Docker Compose

## Learning Objectives

By the end of this module, you will be able to:

1. Understand Docker Compose architecture and use cases
2. Write compose files using Docker Compose v5 syntax (2026)
3. Define multi-container applications declaratively
4. Manage service dependencies and startup order
5. Use environment variables and configuration files
6. Implement development and production workflows
7. Scale services dynamically
8. Troubleshoot Compose applications
9. Compare Compose vs Kubernetes for deployment

## Introduction

Docker Compose simplifies multi-container application management by defining services, networks, and volumes in a single YAML file. In 2026, Compose v5 with the Go SDK brings enhanced performance and new features, making it even more powerful for development and small-scale deployments.

## 1. Docker Compose Overview

### 1.1 What is Docker Compose?

**Definition:** Tool for defining and running multi-container Docker applications using YAML configuration.

**Benefits:**
- **Declarative:** Define entire application stack in one file
- **Reproducible:** Same environment everywhere
- **Simple:** One command to start/stop everything
- **Version controlled:** Compose files in Git
- **Development friendly:** Fast iteration

### 1.2 Compose vs Manual Docker Commands

**Without Compose:**
```bash
# Create network
docker network create myapp

# Run database
docker run -d --name db --network myapp -e POSTGRES_PASSWORD=secret postgres

# Run backend
docker run -d --name api --network myapp -e DB_HOST=db myapi:latest

# Run frontend
docker run -d --name web --network myapp -p 8080:80 myweb:latest

# Too many commands! Hard to remember! Not reproducible!
```

**With Compose:**
```yaml
# docker-compose.yml
services:
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: secret

  api:
    image: myapi:latest
    environment:
      DB_HOST: db
    depends_on:
      - db

  web:
    image: myweb:latest
    ports:
      - "8080:80"
    depends_on:
      - api
```

```bash
# One command to start everything
docker compose up -d

# One command to stop everything
docker compose down
```

## 2. Compose File Structure (v5 - 2026)

### 2.1 Basic Structure

```yaml
# Docker Compose file version (optional in v5)
version: '3.9'  # Still supported for compatibility

# Services (containers)
services:
  service-name:
    # Configuration...

# Networks (optional - default network created automatically)
networks:
  network-name:
    # Configuration...

# Volumes (optional)
volumes:
  volume-name:
    # Configuration...

# Configs (optional)
configs:
  config-name:
    # Configuration...

# Secrets (optional)
secrets:
  secret-name:
    # Configuration...
```

### 2.2 Service Configuration

```yaml
services:
  webapp:
    # Image to use
    image: nginx:1.25-alpine

    # Or build from Dockerfile
    build:
      context: ./webapp
      dockerfile: Dockerfile
      args:
        VERSION: "1.0"

    # Container name (optional)
    container_name: my-webapp

    # Restart policy
    restart: unless-stopped

    # Ports
    ports:
      - "8080:80"        # host:container
      - "443:443"

    # Volumes
    volumes:
      - ./data:/app/data
      - webapp-logs:/var/log/nginx

    # Environment variables
    environment:
      ENV: production
      DEBUG: "false"

    # Environment file
    env_file:
      - .env
      - .env.production

    # Networks
    networks:
      - frontend
      - backend

    # Dependencies
    depends_on:
      - db
      - redis

    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 3. Complete Examples

### 3.1 Web Application with Database

```yaml
# docker-compose.yml
version: '3.9'

services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: postgres_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: redis_cache
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Backend API
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    container_name: api_server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://appuser:${DB_PASSWORD:-changeme}@db:5432/myapp
      REDIS_URL: redis://redis:6379
      API_PORT: 3000
    volumes:
      - ./backend/uploads:/app/uploads
      - api_logs:/app/logs
    networks:
      - frontend
      - backend
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: web_frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      API_URL: http://api:3000
    networks:
      - frontend
    depends_on:
      api:
        condition: service_healthy

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  api_logs:
```

### 3.2 Development vs Production Configuration

**docker-compose.yml (base):**
```yaml
version: '3.9'

services:
  api:
    build:
      context: ./api
    environment:
      NODE_ENV: ${NODE_ENV:-development}
    volumes:
      - ./api:/app
    ports:
      - "${API_PORT:-3000}:3000"
```

**docker-compose.dev.yml (development overrides):**
```yaml
version: '3.9'

services:
  api:
    build:
      target: development
    command: npm run dev
    volumes:
      - ./api:/app
      - /app/node_modules  # Don't overwrite node_modules
    environment:
      DEBUG: "true"
```

**docker-compose.prod.yml (production overrides):**
```yaml
version: '3.9'

services:
  api:
    build:
      target: production
    command: node dist/index.js
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

**Usage:**
```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3.3 Full E-commerce Stack

```yaml
version: '3.9'

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - api
    networks:
      - frontend

  # React Frontend
  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: http://api:3000
    networks:
      - frontend

  # Node.js API
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/ecommerce
      REDIS_URL: redis://redis:6379
      ELASTICSEARCH_URL: http://elasticsearch:9200
    depends_on:
      - postgres
      - redis
      - elasticsearch
    networks:
      - frontend
      - backend

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - backend

  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - backend

  # Background Worker
  worker:
    build: ./api
    command: npm run worker
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/ecommerce
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  postgres_data:
  redis_data:
  es_data:
```

## 4. Docker Compose Commands

### 4.1 Basic Commands

```bash
# Start services
docker compose up              # Foreground
docker compose up -d           # Detached (background)
docker compose up --build      # Rebuild images before starting

# Stop services
docker compose down            # Stop and remove containers
docker compose down -v         # Also remove volumes
docker compose down --rmi all  # Also remove images

# Restart services
docker compose restart
docker compose restart api     # Restart specific service

# Pause/Unpause
docker compose pause
docker compose unpause

# View logs
docker compose logs            # All services
docker compose logs -f         # Follow
docker compose logs api        # Specific service
docker compose logs --tail=100 # Last 100 lines

# List containers
docker compose ps
docker compose ps -a           # Include stopped

# Execute commands
docker compose exec api sh     # Interactive shell
docker compose exec -T api env # Non-interactive command

# Run one-off command
docker compose run --rm api npm test
```

### 4.2 Advanced Commands

```bash
# Build images
docker compose build
docker compose build --no-cache
docker compose build api       # Build specific service

# Pull images
docker compose pull

# Push images
docker compose push

# Scale services
docker compose up -d --scale api=3

# View configuration
docker compose config          # Merged configuration
docker compose config --services  # List services

# Events
docker compose events

# Top (processes)
docker compose top

# Validate compose file
docker compose config -q       # Quiet mode, just validate

# Remove stopped containers
docker compose rm -f
```

## 5. Environment Variables and Configuration

### 5.1 Environment Variables in Compose

**Method 1: Inline**
```yaml
services:
  api:
    environment:
      NODE_ENV: production
      PORT: 3000
```

**Method 2: .env file**
```bash
# .env
NODE_ENV=production
DB_PASSWORD=secret123
API_PORT=3000
```

```yaml
# docker-compose.yml
services:
  api:
    environment:
      NODE_ENV: ${NODE_ENV}
      DB_PASSWORD: ${DB_PASSWORD}
    ports:
      - "${API_PORT}:3000"
```

**Method 3: env_file**
```yaml
services:
  api:
    env_file:
      - .env
      - .env.production
```

**Variable substitution:**
```yaml
services:
  api:
    image: myapp:${TAG:-latest}         # Default to 'latest'
    environment:
      PORT: ${PORT:-3000}                # Default to 3000
      DEBUG: ${DEBUG-false}              # Default to 'false'
```

### 5.2 Secrets Management

**Using Docker secrets (Swarm mode):**
```yaml
version: '3.9'

services:
  api:
    image: myapi:latest
    secrets:
      - db_password
      - api_key
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    external: true
```

**For Compose (non-Swarm):**
```yaml
# Don't commit secrets to git!
# Use .env file (add to .gitignore)
services:
  api:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      API_KEY: ${API_KEY}
```

## 6. Service Dependencies and Startup Order

### 6.1 depends_on (Basic)

```yaml
services:
  api:
    image: myapi:latest
    depends_on:
      - db
      - redis

  db:
    image: postgres:16

  redis:
    image: redis:7
```

**Limitation:** Only waits for container to start, not for service to be ready.

### 6.2 depends_on with Health Checks

```yaml
services:
  api:
    image: myapi:latest
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
```

### 6.3 Wait-for-it Script

For complex dependencies:

```yaml
services:
  api:
    image: myapi:latest
    depends_on:
      - db
    command: ["./wait-for-it.sh", "db:5432", "--", "npm", "start"]
    volumes:
      - ./wait-for-it.sh:/app/wait-for-it.sh
```

## 7. Hands-On Labs

### Lab 1: WordPress with MySQL

```yaml
# docker-compose.yml
version: '3.9'

services:
  db:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wpuser
      MYSQL_PASSWORD: wppass
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - backend

  wordpress:
    image: wordpress:latest
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wpuser
      WORDPRESS_DB_PASSWORD: wppass
    volumes:
      - wp_data:/var/www/html
    networks:
      - frontend
      - backend
    depends_on:
      - db

networks:
  frontend:
  backend:

volumes:
  db_data:
  wp_data:
```

```bash
# Start WordPress
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Access WordPress at http://localhost:8080

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Lab 2: Development Environment with Hot Reload

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  # Frontend (React)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:4000
    stdin_open: true
    tty: true

  # Backend (Node.js)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "4000:4000"
      - "9229:9229"  # Debugger port
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://dev:dev@db:5432/devdb
    command: npm run dev
    depends_on:
      - db

  # Database
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devdb
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up

# Edit frontend code - auto-reloads
# Edit backend code - auto-reloads via nodemon

# Attach debugger to port 9229

# Run tests
docker compose -f docker-compose.dev.yml exec backend npm test
```

## 8. Best Practices (2026)

### 8.1 File Organization

```
project/
├── docker-compose.yml          # Base configuration
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production overrides
├── .env.example                # Example environment variables
├── .env                        # Actual environment (gitignored)
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   └── ...
│   ├── frontend/
│   │   ├── Dockerfile
│   │   └── ...
│   └── worker/
│       ├── Dockerfile
│       └── ...
└── README.md
```

### 8.2 Security Best Practices

```yaml
services:
  api:
    # ✅ Use specific image tags
    image: node:20.11.0-alpine

    # ✅ Run as non-root user
    user: "1000:1000"

    # ✅ Read-only root filesystem
    read_only: true

    # ✅ Drop capabilities
    cap_drop:
      - ALL

    # ✅ Use secrets, not plain environment variables
    secrets:
      - db_password

    # ✅ Resource limits
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 8.3 Performance Optimization

```yaml
services:
  api:
    # ✅ Health checks for proper startup ordering
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s

    # ✅ Restart policy
    restart: unless-stopped

    # ✅ Logging driver to prevent disk fill
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 9. Compose vs Kubernetes

### 9.1 When to Use Compose

✅ **Local development**
✅ **Testing environments**
✅ **Simple single-host deployments**
✅ **CI/CD pipelines**
✅ **Small-scale production (< 100 containers)**

### 9.2 When to Migrate to Kubernetes

⚠️ **Multi-host deployments**
⚠️ **Auto-scaling requirements**
⚠️ **High availability needs**
⚠️ **Advanced networking requirements**
⚠️ **Large-scale production (> 100 containers)**

### 9.3 Comparison Table

| Feature | Docker Compose | Kubernetes |
|---------|---------------|------------|
| **Complexity** | Simple | Complex |
| **Setup Time** | Minutes | Hours/Days |
| **Learning Curve** | Gentle | Steep |
| **Multi-Host** | Limited | Native |
| **Auto-Scaling** | Manual | Automatic |
| **Load Balancing** | Basic | Advanced |
| **Self-Healing** | Limited | Yes |
| **Rollbacks** | Manual | Automatic |
| **Best For** | Dev/Test | Production at scale |

## Common Pitfalls

### Pitfall 1: Hardcoded Values

**Problem:**
```yaml
environment:
  DB_PASSWORD: secret123  # ❌ Hardcoded secret
```

**Solution:**
```yaml
environment:
  DB_PASSWORD: ${DB_PASSWORD}  # ✅ From .env file
```

### Pitfall 2: Missing .dockerignore

**Problem:** Build context includes unnecessary files, slowing builds.

**Solution:**
```
# .dockerignore
node_modules
.git
*.md
.env
```

### Pitfall 3: Not Using Health Checks

**Problem:** Dependent services start before ready.

**Solution:** Always define health checks for services with dependencies.

## Checkpoint

1. **Create** a Compose file for a 3-tier application (frontend, API, database).
2. **Implement** development and production configurations using override files.
3. **Configure** proper service dependencies with health checks.
4. **Set up** environment variable management with .env files.
5. **Scale** a service to multiple replicas.

## Key Takeaways

1. **Docker Compose** simplifies multi-container application management
2. **Compose files** provide declarative configuration
3. **Environment variables** enable configuration flexibility
4. **Health checks** ensure proper startup ordering
5. **Override files** support multiple environments
6. **Compose** is ideal for development, Kubernetes for large-scale production

## Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Compose Specification](https://github.com/compose-spec/compose-spec)
- [Awesome Compose Examples](https://github.com/docker/awesome-compose)

---

**Next Module:** [Module 7: Kubernetes Workloads](Module-07-Kubernetes-Workloads.md)

# Module 4: Introduction to Kubernetes

## Learning Objectives

By the end of this module, you will be able to:

1. Explain Kubernetes architecture and its core components
2. Understand the role of the control plane and worker nodes
3. Set up a local Kubernetes development environment (Minikube, Kind, or K3s)
4. Use kubectl to interact with Kubernetes clusters
5. Create and manage Pods, the fundamental building blocks
6. Deploy applications using Deployments
7. Expose applications using Services
8. Understand the Kubernetes API and resource model
9. Debug and troubleshoot basic Kubernetes issues

## Introduction

Kubernetes has become the de facto standard for container orchestration in 2026. Understanding its architecture and core concepts is essential for modern cloud-native development. This module introduces you to Kubernetes fundamentals and gets you deploying your first applications.

## 1. What is Kubernetes?

**Definition:**
Kubernetes (K8s) is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.

**Why Kubernetes? (The Problems It Solves)**

```
Without Kubernetes:
- Manual container placement across servers
- No automatic failover
- Complex networking between containers
- Manual scaling up/down
- No service discovery
- Difficult rolling updates
- No declarative configuration

With Kubernetes:
- Automatic scheduling and placement
- Self-healing (automatic restart/replacement)
- Built-in service discovery and load balancing
- Horizontal auto-scaling
- Automated rollouts and rollbacks
- Declarative configuration management
- Secret and configuration management
```

**Kubernetes in 2026:**
- Version 1.35 (Timbernetes) - December 2025 release
- 85%+ market share in container orchestration
- Gateway API replacing Ingress
- Vertical Pod Autoscaling (VPA) stable
- Dynamic Resource Allocation (DRA) stable
- Pod resource updates without restarts

## 2. Kubernetes Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────── Control Plane ───────────────────┐    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │    │
│  │  │API Server│  │Scheduler │  │Controller Manager│ │    │
│  │  └────┬─────┘  └────┬─────┘  └────────┬────────┘ │    │
│  │       │             │                  │           │    │
│  │       └─────────────┴──────────────────┘           │    │
│  │                     │                               │    │
│  │              ┌──────▼──────┐                       │    │
│  │              │    etcd     │                       │    │
│  │              │  (Database) │                       │    │
│  │              └─────────────┘                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                  │
│                          │ (API calls)                      │
│                          │                                  │
│  ┌───────────────── Worker Nodes ────────────────────┐     │
│  │                                                    │     │
│  │  ┌─────── Node 1 ───────┐  ┌─────── Node 2 ─────┐│     │
│  │  │                       │  │                     ││     │
│  │  │  ┌────────────────┐  │  │  ┌──────────────┐  ││     │
│  │  │  │    kubelet     │  │  │  │   kubelet    │  ││     │
│  │  │  └────────┬───────┘  │  │  └──────┬───────┘  ││     │
│  │  │           │           │  │         │          ││     │
│  │  │  ┌────────▼───────┐  │  │  ┌──────▼───────┐  ││     │
│  │  │  │  kube-proxy    │  │  │  │  kube-proxy  │  ││     │
│  │  │  └────────────────┘  │  │  └──────────────┘  ││     │
│  │  │           │           │  │         │          ││     │
│  │  │  ┌────────▼───────┐  │  │  ┌──────▼───────┐  ││     │
│  │  │  │Container Runtime│  │  │  │  Container   │  ││     │
│  │  │  │  (containerd)  │  │  │  │   Runtime    │  ││     │
│  │  │  └────────┬───────┘  │  │  └──────┬───────┘  ││     │
│  │  │           │           │  │         │          ││     │
│  │  │  ┌────────▼───────┐  │  │  ┌──────▼───────┐  ││     │
│  │  │  │  Pod  │  Pod   │  │  │  │ Pod  │ Pod   │  ││     │
│  │  │  └────────────────┘  │  │  └──────────────┘  ││     │
│  │  └───────────────────────┘  └─────────────────────┘│     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Control Plane Components

#### API Server (kube-apiserver)

**Role:** The front door to Kubernetes. All interactions go through the API server.

**Responsibilities:**
- Exposes Kubernetes API (RESTful)
- Authentication and authorization
- Validates and processes API requests
- Updates etcd
- Coordinates all components

**Interaction Example:**
```bash
kubectl get pods
    ↓
kubectl → API Server → Authenticate → Authorize → Validate → etcd
    ↓
API Server → Returns pod list
```

#### etcd

**Role:** Distributed key-value store - the "brain" of Kubernetes.

**Stores:**
- All cluster state
- All resource configurations
- Secrets, ConfigMaps
- Current state vs desired state

**Key Characteristics:**
- Distributed (high availability)
- Consistent (via Raft consensus)
- Persistent storage
- Only accessed by API server

**Critical:** If etcd fails, cluster control plane fails. Always back up etcd!

#### Scheduler (kube-scheduler)

**Role:** Decides which node should run new pods.

**Scheduling Factors:**
- Resource requirements (CPU, memory)
- Hardware/software constraints
- Affinity/anti-affinity rules
- Data locality
- Taints and tolerations
- Current node utilization

**Process:**
```
1. Watch for unscheduled pods
2. Filter nodes (remove unsuitable nodes)
3. Score nodes (rank by priority)
4. Bind pod to best-scoring node
```

#### Controller Manager (kube-controller-manager)

**Role:** Runs controller processes that maintain desired state.

**Key Controllers:**
- **Node Controller:** Monitors node health
- **Replication Controller:** Maintains correct pod count
- **Endpoints Controller:** Populates Endpoints objects (Services)
- **Service Account Controller:** Creates default service accounts
- **Namespace Controller:** Manages namespace lifecycle

**Control Loop (Reconciliation):**
```
loop forever:
  desired_state = read from etcd
  current_state = observe cluster
  if current_state != desired_state:
    take action to match desired state
  sleep
```

#### Cloud Controller Manager

**Role:** Integrates with cloud provider APIs (AWS, GCP, Azure).

**Cloud-Specific Controllers:**
- Node controller (manage cloud VMs)
- Route controller (set up networking)
- Service controller (create load balancers)

### 2.3 Worker Node Components

#### kubelet

**Role:** The agent running on each worker node.

**Responsibilities:**
- Receives PodSpecs from API server
- Ensures containers are running and healthy
- Reports node and pod status to API server
- Executes liveness/readiness probes
- Manages pod lifecycle

**Does NOT:**
- Manage pods not created by Kubernetes

#### kube-proxy

**Role:** Network proxy on each node.

**Responsibilities:**
- Maintains network rules (iptables/IPVS)
- Enables Service abstraction
- Load balances traffic to pods
- Implements ClusterIP

**Modes (2026):**
- **iptables:** Default mode
- **IPVS:** Deprecated (being phased out)
- **eBPF:** Modern, high-performance mode (Cilium)

#### Container Runtime

**Role:** Runs containers.

**Supported Runtimes (2026):**
- **containerd:** Most common, used by major cloud providers
- **CRI-O:** Lightweight, Kubernetes-specific
- **Docker Engine:** Contains containerd

**Container Runtime Interface (CRI):**
Kubernetes communicates with runtimes via CRI (standardized API).

### 2.4 Add-On Components

#### DNS (CoreDNS)

Provides DNS-based service discovery within the cluster.

```bash
# Pods can access services by name
curl http://my-service.default.svc.cluster.local
```

#### Dashboard

Web-based UI for cluster management.

#### Metrics Server

Collects resource metrics (CPU, memory) for autoscaling.

#### Ingress Controller

Manages external access to services (Nginx, Traefik, etc.).

## 3. Core Kubernetes Concepts

### 3.1 Pods

**Definition:** The smallest deployable unit in Kubernetes. A pod runs one or more containers.

**Key Characteristics:**
- Shares network namespace (same IP address)
- Shares storage volumes
- Co-located, co-scheduled
- Ephemeral (designed to be disposable)

**Analogy:** A pod is like a physical host for containers - containers in a pod are like processes on a host.

**When to Use Multiple Containers in a Pod:**
- Sidecar pattern (logging, monitoring)
- Proxy/adapter pattern
- Ambassador pattern

**Simple Pod Example:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.25-alpine
    ports:
    - containerPort: 80
```

```bash
# Create pod
kubectl apply -f pod.yaml

# View pod
kubectl get pods

# Describe pod
kubectl describe pod nginx-pod

# View logs
kubectl logs nginx-pod

# Execute command in pod
kubectl exec -it nginx-pod -- sh

# Delete pod
kubectl delete pod nginx-pod
```

### 3.2 Deployments

**Definition:** Manages a replicated set of pods with declarative updates.

**Why Use Deployments Instead of Pods Directly?**
- Automatic pod replacement on failure
- Scaling (increase/decrease replicas)
- Rolling updates with zero downtime
- Rollback capability
- Version history

**Deployment Example:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

```bash
# Create deployment
kubectl apply -f deployment.yaml

# View deployment
kubectl get deployments

# View replica sets (managed by deployment)
kubectl get replicasets

# View pods (managed by replica set)
kubectl get pods

# Scale deployment
kubectl scale deployment nginx-deployment --replicas=5

# Update image (rolling update)
kubectl set image deployment/nginx-deployment nginx=nginx:1.26-alpine

# Check rollout status
kubectl rollout status deployment/nginx-deployment

# View rollout history
kubectl rollout history deployment/nginx-deployment

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=2
```

### 3.3 Services

**Definition:** Provides stable network endpoint for a set of pods.

**Why Services?**
- Pods are ephemeral (IP addresses change)
- Services provide stable DNS name and IP
- Load balancing across multiple pods
- Service discovery

**Service Types:**

1. **ClusterIP** (default) - Internal cluster access only
2. **NodePort** - Exposes on each node's IP at a static port
3. **LoadBalancer** - Cloud load balancer (AWS ELB, GCP LB, etc.)
4. **ExternalName** - Maps to external DNS name

**ClusterIP Service Example:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: ClusterIP
  selector:
    app: nginx  # Matches pods with label app=nginx
  ports:
  - port: 80        # Service port
    targetPort: 80  # Container port
    protocol: TCP
```

```bash
# Create service
kubectl apply -f service.yaml

# View services
kubectl get services

# Get service details
kubectl describe service nginx-service

# Test service from inside cluster
kubectl run test-pod --image=busybox --rm -it -- sh
# Inside pod:
wget -O- http://nginx-service.default.svc.cluster.local
```

**NodePort Service Example:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-nodeport
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080  # Optional: Kubernetes assigns if not specified (30000-32767)
```

```bash
# Access from outside cluster
curl http://<NODE_IP>:30080
```

**LoadBalancer Service Example:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-loadbalancer
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
```

```bash
# Get external IP (cloud provider assigns)
kubectl get service nginx-loadbalancer

# Output:
# NAME                   TYPE           EXTERNAL-IP
# nginx-loadbalancer    LoadBalancer   34.123.45.67

# Access from internet
curl http://34.123.45.67
```

### 3.4 Namespaces

**Definition:** Virtual clusters within a physical cluster for resource isolation.

**Default Namespaces:**
- **default:** Default namespace for resources
- **kube-system:** System components
- **kube-public:** Publicly accessible resources
- **kube-node-lease:** Node heartbeat information

**Use Cases:**
- Multi-tenancy (team-a, team-b)
- Environment separation (dev, staging, prod)
- Resource quotas and limits
- RBAC boundaries

```bash
# List namespaces
kubectl get namespaces

# Create namespace
kubectl create namespace dev

# Or with YAML:
```

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
```

```bash
# Deploy to specific namespace
kubectl apply -f deployment.yaml -n dev

# Set default namespace for current context
kubectl config set-context --current --namespace=dev

# View resources in all namespaces
kubectl get pods -A
kubectl get pods --all-namespaces
```

### 3.5 Labels and Selectors

**Labels:** Key-value pairs attached to objects for organization.

```yaml
metadata:
  labels:
    app: nginx
    environment: production
    tier: frontend
    version: v1.2.3
```

**Selectors:** Query objects by labels.

```bash
# Get pods with specific label
kubectl get pods -l app=nginx

# Multiple labels (AND)
kubectl get pods -l app=nginx,environment=production

# Set-based selectors
kubectl get pods -l 'environment in (production, staging)'
kubectl get pods -l 'tier notin (database)'
```

**Label Best Practices (2026):**

```yaml
metadata:
  labels:
    # Recommended labels
    app.kubernetes.io/name: nginx
    app.kubernetes.io/instance: nginx-instance-1
    app.kubernetes.io/version: "1.25.3"
    app.kubernetes.io/component: webserver
    app.kubernetes.io/part-of: ecommerce-platform
    app.kubernetes.io/managed-by: helm
```

## 4. The Kubernetes API and Resource Model

### 4.1 API Groups and Versions

Kubernetes API is organized into groups:

```
Core Group (v1):
- Pod, Service, ConfigMap, Secret, Namespace

Apps Group (apps/v1):
- Deployment, StatefulSet, DaemonSet, ReplicaSet

Batch Group (batch/v1):
- Job, CronJob

Networking (networking.k8s.io/v1):
- Ingress, NetworkPolicy, IngressClass

Storage (storage.k8s.io/v1):
- StorageClass, VolumeAttachment
```

### 4.2 Resource Specification

Every Kubernetes resource follows this structure:

```yaml
apiVersion: apps/v1      # API group and version
kind: Deployment         # Resource type
metadata:                # Metadata about the resource
  name: my-app
  namespace: default
  labels:
    app: my-app
  annotations:
    description: "My application"
spec:                    # Desired state specification
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    # Pod template...
status:                  # Current state (populated by Kubernetes)
  availableReplicas: 3
  conditions:
    - type: Available
      status: "True"
```

### 4.3 Declarative vs Imperative

**Imperative (commands):**
```bash
kubectl create deployment nginx --image=nginx
kubectl scale deployment nginx --replicas=3
kubectl expose deployment nginx --port=80
```

**Declarative (YAML files):**
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

**Best Practice:** Use declarative approach for production (infrastructure as code).

## 5. Setting Up Local Kubernetes

### 5.1 Minikube (Recommended for Learning)

**Installation:**

```bash
# macOS
brew install minikube

# Windows
choco install minikube

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**Basic Usage:**

```bash
# Start cluster
minikube start --cpus=4 --memory=8192 --driver=docker

# With specific Kubernetes version
minikube start --kubernetes-version=v1.35.0

# Check status
minikube status

# Access dashboard
minikube dashboard

# Get cluster IP
minikube ip

# SSH into node
minikube ssh

# Access service via NodePort
minikube service nginx-service

# Enable addons
minikube addons enable metrics-server
minikube addons enable ingress

# Stop cluster
minikube stop

# Delete cluster
minikube delete
```

### 5.2 Kind (Kubernetes in Docker)

**Installation:**

```bash
# macOS/Linux
brew install kind

# Or download binary
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

**Basic Usage:**

```bash
# Create cluster
kind create cluster

# Create cluster with custom name
kind create cluster --name my-cluster

# Create multi-node cluster
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
- role: worker
EOF

# List clusters
kind get clusters

# Delete cluster
kind delete cluster --name my-cluster
```

### 5.3 K3s (Lightweight Kubernetes)

**Installation (Linux):**

```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -

# Check status
sudo systemctl status k3s

# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config

# Verify
kubectl get nodes
```

**Comparison:**

| Feature | Minikube | Kind | K3s |
|---------|----------|------|-----|
| **Platform** | VM or Container | Container only | Native |
| **Startup Time** | 2-3 minutes | 30-60 seconds | 10-20 seconds |
| **Resource Usage** | High | Medium | Low |
| **Multi-node** | Limited | Easy | Easy |
| **Best For** | Learning, testing | CI/CD, testing | Edge, production |

## 6. kubectl Fundamentals

### 6.1 Configuration

```bash
# View config
kubectl config view

# View current context
kubectl config current-context

# List contexts
kubectl config get-contexts

# Switch context
kubectl config use-context minikube

# Set default namespace
kubectl config set-context --current --namespace=dev
```

### 6.2 Common Commands

```bash
# Get resources
kubectl get pods
kubectl get deployments
kubectl get services
kubectl get all              # Most common resources

# Detailed information
kubectl describe pod <pod-name>
kubectl describe deployment <deployment-name>

# Create resources
kubectl apply -f file.yaml
kubectl create deployment nginx --image=nginx

# Delete resources
kubectl delete -f file.yaml
kubectl delete pod <pod-name>
kubectl delete deployment <deployment-name>

# Edit resources
kubectl edit deployment nginx

# Scale
kubectl scale deployment nginx --replicas=5

# Logs
kubectl logs <pod-name>
kubectl logs -f <pod-name>           # Follow
kubectl logs <pod-name> -c <container>  # Multi-container pod

# Execute commands
kubectl exec -it <pod-name> -- sh
kubectl exec <pod-name> -- ls /app

# Port forwarding
kubectl port-forward pod/<pod-name> 8080:80
kubectl port-forward deployment/nginx 8080:80

# Copy files
kubectl cp <pod-name>:/path/file ./local-file
kubectl cp ./local-file <pod-name>:/path/file

# Resource usage
kubectl top nodes
kubectl top pods

# Events
kubectl get events
kubectl get events --sort-by='.lastTimestamp'
```

### 6.3 Output Formats

```bash
# Wide output (more columns)
kubectl get pods -o wide

# YAML format
kubectl get pod nginx -o yaml

# JSON format
kubectl get pod nginx -o json

# Custom columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase

# JSONPath
kubectl get pods -o jsonpath='{.items[*].metadata.name}'

# Template
kubectl get pods -o go-template='{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}'
```

## 7. Hands-On Labs

### Lab 1: Deploy Your First Application

**Objective:** Deploy a web application with multiple replicas and expose it via a service.

**Step 1: Create deployment**

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-web
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

```bash
# Apply deployment
kubectl apply -f nginx-deployment.yaml

# Verify pods are running
kubectl get pods -l app=nginx

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# nginx-web-xxxx-xxxx        1/1     Running   0          30s
# nginx-web-yyyy-yyyy        1/1     Running   0          30s
# nginx-web-zzzz-zzzz        1/1     Running   0          30s
```

**Step 2: Create service**

```yaml
# nginx-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

```bash
# Apply service
kubectl apply -f nginx-service.yaml

# Verify service
kubectl get service nginx-service

# Get endpoints (pod IPs)
kubectl get endpoints nginx-service
```

**Step 3: Test the application**

```bash
# Method 1: Port forward
kubectl port-forward service/nginx-service 8080:80

# Open browser: http://localhost:8080
# Or curl: curl http://localhost:8080

# Method 2: From inside cluster
kubectl run test --image=busybox --rm -it -- sh
# Inside pod:
wget -O- http://nginx-service.default.svc.cluster.local
```

**Step 4: Scale the deployment**

```bash
# Scale to 5 replicas
kubectl scale deployment nginx-web --replicas=5

# Watch scaling in real-time
kubectl get pods -l app=nginx -w

# Verify
kubectl get deployment nginx-web
# READY should show 5/5
```

**Step 5: Perform rolling update**

```bash
# Update nginx version
kubectl set image deployment/nginx-web nginx=nginx:1.26-alpine

# Watch rollout
kubectl rollout status deployment/nginx-web

# Verify new version
kubectl describe pod nginx-web-<pod-id> | grep Image
```

**Step 6: Rollback**

```bash
# View rollout history
kubectl rollout history deployment/nginx-web

# Rollback to previous version
kubectl rollout undo deployment/nginx-web

# Verify rollback
kubectl rollout status deployment/nginx-web
```

**Step 7: Clean up**

```bash
kubectl delete -f nginx-deployment.yaml
kubectl delete -f nginx-service.yaml

# Or delete by name
kubectl delete deployment nginx-web
kubectl delete service nginx-service
```

### Lab 2: Multi-Container Pod (Sidecar Pattern)

**Objective:** Deploy a pod with main application and logging sidecar.

```yaml
# multi-container-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app-with-logger
spec:
  # Shared volume between containers
  volumes:
  - name: shared-logs
    emptyDir: {}

  containers:
  # Main application container
  - name: web-app
    image: nginx:1.25-alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx

  # Sidecar logging container
  - name: log-shipper
    image: busybox
    command: ['sh', '-c', 'tail -f /var/log/nginx/access.log']
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
```

```bash
# Create pod
kubectl apply -f multi-container-pod.yaml

# View both containers running
kubectl get pod web-app-with-logger

# Expected:
# NAME                  READY   STATUS    RESTARTS   AGE
# web-app-with-logger   2/2     Running   0          20s

# View logs from web-app container
kubectl logs web-app-with-logger -c web-app

# View logs from log-shipper container
kubectl logs web-app-with-logger -c log-shipper

# Execute in specific container
kubectl exec -it web-app-with-logger -c web-app -- sh

# Generate traffic to see logs
kubectl exec -it web-app-with-logger -c web-app -- \
  sh -c 'for i in $(seq 1 10); do wget -O- localhost; done'

# View access logs via sidecar
kubectl logs web-app-with-logger -c log-shipper
```

### Lab 3: Namespace Isolation

**Objective:** Create isolated environments using namespaces.

```bash
# Create development namespace
kubectl create namespace development

# Create staging namespace
kubectl create namespace staging

# Deploy to development
kubectl apply -f nginx-deployment.yaml -n development
kubectl apply -f nginx-service.yaml -n development

# Deploy to staging
kubectl apply -f nginx-deployment.yaml -n staging
kubectl apply -f nginx-service.yaml -n staging

# View pods in development
kubectl get pods -n development

# View all pods across namespaces
kubectl get pods -A

# Set default namespace to development
kubectl config set-context --current --namespace=development

# Now commands use development by default
kubectl get pods  # Shows development pods

# Access service across namespaces
# From development namespace, access staging service:
kubectl run test -n development --image=busybox --rm -it -- sh
# Inside pod:
wget -O- http://nginx-service.staging.svc.cluster.local

# Clean up
kubectl delete namespace development
kubectl delete namespace staging
```

## 8. Common Pitfalls

### Pitfall 1: Not Setting Resource Limits

**Problem:**
```yaml
# No resource limits - pod can consume all node resources
spec:
  containers:
  - name: app
    image: myapp:latest
```

**Solution:**
```yaml
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

### Pitfall 2: Using default Namespace for Everything

**Problem:** All resources in default namespace = hard to manage.

**Solution:** Use namespaces for organization:
```bash
kubectl create namespace myapp-dev
kubectl create namespace myapp-staging
kubectl create namespace myapp-prod
```

### Pitfall 3: Imperative Commands in Production

**Problem:**
```bash
kubectl create deployment nginx --image=nginx
# No record of what was created, can't reproduce
```

**Solution:** Use declarative YAML:
```bash
kubectl apply -f deployment.yaml
# Version controlled, reproducible, auditable
```

### Pitfall 4: Not Using Labels Consistently

**Problem:** Random or missing labels make management difficult.

**Solution:** Adopt standard labeling:
```yaml
metadata:
  labels:
    app.kubernetes.io/name: myapp
    app.kubernetes.io/instance: myapp-prod
    app.kubernetes.io/version: "1.2.3"
```

## 9. Best Practices (2026)

✅ **Always define resource requests and limits**
✅ **Use namespaces for isolation**
✅ **Apply consistent labeling**
✅ **Use declarative YAML (not imperative commands)**
✅ **Version control your manifests**
✅ **Use specific image tags (not :latest)**
✅ **Implement health checks (covered in Module 7)**
✅ **Run as non-root user in containers**
✅ **Use ConfigMaps for configuration**
✅ **Use Secrets for sensitive data**

## 10. Production Considerations

### High Availability
- Multiple control plane nodes (3 or 5)
- Multiple worker nodes across availability zones
- etcd clustering with backups

### Security
- RBAC enabled
- Pod Security Standards enforced
- Network policies
- Image scanning
- Secrets encrypted at rest

### Monitoring
- Metrics server for autoscaling
- Prometheus for metrics
- Logging aggregation
- Distributed tracing

### Updates
- Regular Kubernetes version updates
- Test updates in dev/staging first
- Backup etcd before updates
- Follow N-2 version support policy

## Checkpoint: Verify Your Understanding

1. **Explain** the role of each control plane component (API server, etcd, scheduler, controller manager).

2. **Describe** the difference between a Pod, Deployment, and Service.

3. **Create** a Deployment with 3 replicas, resource limits, and expose it via a ClusterIP Service.

4. **Demonstrate** how to scale a deployment, perform a rolling update, and rollback.

5. **Use** labels and selectors to organize and query resources.

## Key Takeaways

1. **Kubernetes architecture** consists of control plane (API server, etcd, scheduler, controllers) and worker nodes (kubelet, kube-proxy, container runtime)
2. **Pods** are the smallest unit, **Deployments** manage replicas and updates, **Services** provide stable networking
3. **kubectl** is the primary CLI tool for interacting with clusters
4. **Namespaces** provide isolation and multi-tenancy
5. **Labels and selectors** enable flexible resource organization
6. **Declarative YAML** is the production-standard approach
7. **Local development** options include Minikube, Kind, and K3s

## Resources

### Official Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/kubernetes-api/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

### Interactive Learning
- [Kubernetes Tutorial](https://kubernetes.io/docs/tutorials/)
- [Killercoda Kubernetes Scenarios](https://killercoda.com/kubernetes)
- [Play with Kubernetes](https://labs.play-with-k8s.com/)

### Books
- "Kubernetes Up & Running" by Kelsey Hightower
- "The Kubernetes Book" by Nigel Poulton

---

**Next Module:** [Module 5: Docker Networking and Volumes](../Tier-2-Intermediate/Module-05-Docker-Networking-and-Volumes.md)

In the next module, we'll dive deep into Docker networking modes, container communication, and data persistence with volumes.

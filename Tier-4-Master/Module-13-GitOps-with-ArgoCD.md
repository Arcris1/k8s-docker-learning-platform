# Module 13: GitOps with ArgoCD

## Learning Objectives

By the end of this module, you will be able to:

1. Explain GitOps principles and why they matter in 2026
2. Install and configure ArgoCD 3.x on Kubernetes
3. Create and manage Applications and ApplicationSets
4. Implement multi-environment deployment strategies
5. Use sync waves and hooks for ordered deployments
6. Integrate ArgoCD with CI/CD pipelines
7. Leverage OCI registries for GitOps (ArgoCD 3.1+ feature)
8. Implement progressive delivery patterns
9. Manage secrets securely in GitOps workflows
10. Deploy and manage multi-cluster environments with ArgoCD

## Introduction

GitOps has become the de facto standard for Kubernetes deployments in 2026. ArgoCD, a CNCF graduated project, leads the GitOps space with its rich web UI, multi-tenancy support, and robust feature set. This module covers ArgoCD 3.x with the latest 2026 features including OCI registry support.

## 1. GitOps Principles and Philosophy

### 1.1 What is GitOps?

**Definition:**
GitOps is a set of practices that uses Git as the single source of truth for declarative infrastructure and applications, with automated processes ensuring the actual state matches the desired state.

**Core Principles:**

1. **Declarative Configuration**
   - Everything is defined as code (Infrastructure as Code)
   - Desired state is declared, not imperative steps
   - Kubernetes manifests, Helm charts, Kustomize

2. **Git as Single Source of Truth**
   - Git repository contains complete system state
   - All changes go through Git (pull requests, reviews)
   - Full audit trail via Git history

3. **Automated Deployment**
   - Changes in Git trigger automatic synchronization
   - No manual kubectl apply commands
   - Self-healing when drift is detected

4. **Continuous Reconciliation**
   - Agents continuously monitor and correct drift
   - Actual state converges to desired state
   - Automatic rollback on failures

### 1.2 Why GitOps Matters in 2026

**Benefits:**

```
Traditional Deployment          GitOps Deployment
─────────────────────          ─────────────────
Developer pushes code          Developer commits manifest
↓                              ↓
CI builds container            CI builds container
↓                              ↓
CD deploys to cluster          CI commits new image tag to Git
↓                              ↓
Manual kubectl apply           ArgoCD auto-syncs
↓                              ↓
No audit trail                 Full Git history
Manual rollback                Git revert = instant rollback
Configuration drift            Self-healing
```

**Industry Adoption (2026):**
- 78% of Kubernetes users employ GitOps
- 65% use ArgoCD specifically
- Average deployment frequency: 50+ times per day with GitOps
- Mean time to recovery (MTTR): Reduced by 73%

### 1.3 GitOps vs Traditional CI/CD

| Aspect | Traditional CI/CD | GitOps |
|--------|------------------|--------|
| **Deployment Method** | Push (CI/CD pushes to cluster) | Pull (Agent pulls from Git) |
| **Credentials** | CI/CD needs cluster access | No external cluster access needed |
| **Audit Trail** | Pipeline logs | Git history |
| **Drift Detection** | None | Automatic |
| **Rollback** | Rerun old pipeline | Git revert |
| **Security** | Credentials in CI/CD | Credentials only in cluster |
| **Multi-Cluster** | Complex | Native support |

## 2. ArgoCD Architecture

### 2.1 Components

```
┌─────────────────────────────────────────────────────────┐
│                    ArgoCD Architecture                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   API Server │◄────────┤  Web UI      │             │
│  │   (gRPC/REST)│         │              │             │
│  └───────┬──────┘         └──────────────┘             │
│          │                                               │
│          │                                               │
│  ┌───────▼──────┐         ┌──────────────┐             │
│  │ Repo Server  │         │ Application  │             │
│  │ (Manifests)  │         │ Controller   │             │
│  └───────┬──────┘         └───────┬──────┘             │
│          │                        │                     │
│          │                        │                     │
│  ┌───────▼────────────────────────▼──────┐             │
│  │          Kubernetes API                │             │
│  └────────────────────────────────────────┘             │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │     Git Repository (Source of Truth)    │            │
│  └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

**Component Descriptions:**

1. **API Server**
   - Exposes gRPC/REST API
   - Handles authentication and authorization
   - Serves Web UI
   - Manages RBAC

2. **Repository Server**
   - Maintains local cache of Git repositories
   - Generates Kubernetes manifests
   - Handles Helm template rendering
   - Kustomize build operations
   - OCI artifact retrieval (ArgoCD 3.1+)

3. **Application Controller**
   - Monitors running applications
   - Compares desired vs actual state
   - Triggers synchronization
   - Health assessment
   - Automatic self-healing

4. **Web UI / CLI**
   - Visualization of application state
   - Manual sync triggers
   - Rollback operations
   - Configuration management

### 2.2 ArgoCD vs FluxCD

| Feature | ArgoCD | FluxCD |
|---------|--------|--------|
| **UI** | Rich web UI with visualization | CLI-based (k9s integration) |
| **Multi-Tenancy** | Native RBAC and Projects | Requires additional configuration |
| **Helm Support** | First-class | First-class |
| **Kustomize** | Built-in | Built-in |
| **Multi-Cluster** | Excellent | Good |
| **Image Automation** | Limited | Excellent |
| **GitOps Toolkit** | Monolithic | Modular (Flux controllers) |
| **CNCF Status** | Graduated | Graduated |
| **Best For** | Teams wanting UI, multi-tenancy | GitOps purists, automation |

**2026 Recommendation:** ArgoCD for most organizations due to UI, multi-tenancy, and centralized management.

## 3. Installing ArgoCD

### 3.1 Prerequisites

```bash
# Kubernetes cluster (1.31+ recommended for 2026)
kubectl version --short

# Helm 3.13+ (for Helm chart installation)
helm version

# kubectl
kubectl version --client
```

### 3.2 Installation Methods

#### Method 1: Using Official Manifests

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD 3.x (2026 version)
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Verify installation
kubectl get pods -n argocd

# Expected pods:
# argocd-server
# argocd-repo-server
# argocd-application-controller
# argocd-dex-server
# argocd-redis
```

#### Method 2: Using Helm Chart (Recommended for Production)

```bash
# Add Argo Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Create values file for customization
cat <<EOF > argocd-values.yaml
server:
  replicas: 2
  service:
    type: LoadBalancer

  # Enable metrics
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

  # Resource limits
  resources:
    limits:
      cpu: 1000m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

controller:
  replicas: 2
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 500m
      memory: 1Gi

repoServer:
  replicas: 2
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 512Mi

# High availability Redis
redis-ha:
  enabled: true

# Dex for SSO
dex:
  enabled: true

# Enable notifications
notifications:
  enabled: true
  argocdUrl: https://argocd.example.com

# ApplicationSet controller
applicationSet:
  replicas: 2
EOF

# Install ArgoCD
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values argocd-values.yaml \
  --version 9.4.1

# Verify installation
kubectl get all -n argocd
```

### 3.3 Accessing ArgoCD

#### Get Initial Admin Password

```bash
# Get initial password (username: admin)
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo

# Change password immediately
argocd account update-password
```

#### Method 1: Port Forwarding (Development)

```bash
# Forward port
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Access at: https://localhost:8080
# Accept self-signed certificate warning
```

#### Method 2: LoadBalancer (Cloud)

```bash
# Get LoadBalancer IP/hostname
kubectl get svc argocd-server -n argocd

# Access at: https://<EXTERNAL-IP>
```

#### Method 3: Ingress (Production)

```yaml
# argocd-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  rules:
  - host: argocd.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 443
  tls:
  - hosts:
    - argocd.example.com
    secretName: argocd-tls
```

```bash
kubectl apply -f argocd-ingress.yaml
```

### 3.4 Install ArgoCD CLI

```bash
# Linux
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# macOS
brew install argocd

# Windows
choco install argocd-cli

# Verify installation
argocd version

# Login
argocd login argocd.example.com --username admin --password <password>

# Or with port-forward
argocd login localhost:8080 --username admin --password <password> --insecure
```

## 4. Core Concepts: Applications

### 4.1 Application Resource

An Application is the fundamental ArgoCD resource representing a deployment.

**Basic Application Example:**

```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  # Project (for multi-tenancy)
  project: default

  # Source - where manifests come from
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook

  # Destination - where to deploy
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook

  # Sync policy
  syncPolicy:
    automated:
      prune: true      # Delete resources not in Git
      selfHeal: true   # Auto-sync on drift
      allowEmpty: false
    syncOptions:
    - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

```bash
# Apply application
kubectl apply -f application.yaml

# Or using ArgoCD CLI
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace guestbook

# Sync application
argocd app sync guestbook

# Watch synchronization
argocd app get guestbook --watch
```

### 4.2 Application with Helm

```yaml
# helm-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-helm
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: nginx
    targetRevision: 15.6.0

    # Helm values
    helm:
      values: |
        replicaCount: 3
        service:
          type: LoadBalancer
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi

      # Or from file
      valueFiles:
      - values-production.yaml

      # Helm parameters (override specific values)
      parameters:
      - name: replicaCount
        value: "5"

  destination:
    server: https://kubernetes.default.svc
    namespace: nginx

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

### 4.3 Application with Kustomize

```yaml
# kustomize-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-kustomize
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: main
    path: overlays/production

    # Kustomize options
    kustomize:
      # Common labels
      commonLabels:
        app: myapp
        env: production

      # Common annotations
      commonAnnotations:
        managed-by: argocd

      # Image override (tag update without changing Git)
      images:
      - myapp=myregistry.com/myapp:v2.1.3

      # Namespace override
      namespace: production

      # Name prefix/suffix
      namePrefix: prod-

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 4.4 OCI Registry Source (ArgoCD 3.1+ Feature)

```yaml
# oci-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-oci
  namespace: argocd
spec:
  project: default

  # OCI registry as source (NEW in ArgoCD 3.1)
  source:
    repoURL: oci://ghcr.io/myorg/myapp-manifests
    targetRevision: v1.2.3

    # For Helm charts in OCI
    chart: myapp

  destination:
    server: https://kubernetes.default.svc
    namespace: myapp

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Configure OCI Repository:**

```bash
# Add OCI repository
argocd repo add oci://ghcr.io/myorg --type helm \
  --username myusername \
  --password <github-token>

# Verify
argocd repo list
```

## 5. Sync Strategies and Hooks

### 5.1 Sync Waves

Sync waves control the order of resource creation/update.

```yaml
# 01-namespace.yaml (Wave 0 - default)
apiVersion: v1
kind: Namespace
metadata:
  name: myapp

---
# 02-configmap.yaml (Wave 1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "1"
data:
  config.yaml: |
    database: postgres

---
# 03-database.yaml (Wave 2)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  # ... PostgreSQL StatefulSet

---
# 04-migration-job.yaml (Wave 3)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myapp-migrate:v1
        command: ["npm", "run", "migrate"]
      restartPolicy: Never

---
# 05-application.yaml (Wave 4)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "4"
spec:
  # ... Application Deployment
```

**Execution Order:**
1. Wave 0: Namespace created
2. Wave 1: ConfigMap created
3. Wave 2: Database deployed and healthy
4. Wave 3: Migration job runs
5. Wave 4: Application deployed

### 5.2 Sync Hooks

Hooks run at specific points in the sync lifecycle.

**Hook Phases:**
- `PreSync`: Before sync starts
- `Sync`: During sync (default)
- `PostSync`: After successful sync
- `SyncFail`: After failed sync
- `Skip`: Don't sync this resource

**Example: Database Backup Before Sync**

```yaml
# pre-sync-backup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-backup
  namespace: myapp
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
      - name: backup
        image: postgres:16
        command:
        - sh
        - -c
        - |
          pg_dump -h postgres -U app myapp > /backup/myapp-$(date +%Y%m%d-%H%M%S).sql
        volumeMounts:
        - name: backup
          mountPath: /backup
      volumes:
      - name: backup
        persistentVolumeClaim:
          claimName: db-backups
      restartPolicy: Never
```

**Example: Smoke Tests After Sync**

```yaml
# post-sync-test.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
  namespace: myapp
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
      - name: test
        image: curlimages/curl:8.6.0
        command:
        - sh
        - -c
        - |
          curl -f http://myapp-service/health || exit 1
          curl -f http://myapp-service/api/status || exit 1
          echo "Smoke tests passed!"
      restartPolicy: Never
  backoffLimit: 3
```

### 5.3 Health Assessment

ArgoCD automatically assesses resource health.

**Custom Health Checks:**

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom health check for custom CRD
  resource.customizations.health.mycompany.io_MyResource: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Running" then
        hs.status = "Healthy"
        hs.message = "Resource is running"
        return hs
      end
      if obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.message
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for resource"
    return hs
```

## 6. Multi-Environment Management

### 6.1 Repository Structure

**Option 1: Environment Branches**

```
myapp/
├── main (production)
├── staging
└── dev
```

**Option 2: Directory-Based (Recommended)**

```
myapp/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── patch-replicas.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patch-replicas.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── patch-replicas.yaml
│       └── patch-resources.yaml
└── helm/
    ├── values-dev.yaml
    ├── values-staging.yaml
    └── values-prod.yaml
```

### 6.2 Application Per Environment

```yaml
# apps/dev/myapp.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  namespace: argocd
spec:
  project: myapp-project
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: dev
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
# apps/staging/myapp.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-staging
  namespace: argocd
spec:
  project: myapp-project
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: staging
    path: overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-staging
  syncPolicy:
    automated:
      prune: false     # Manual approval for staging
      selfHeal: true

---
# apps/prod/myapp.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-prod
  namespace: argocd
spec:
  project: myapp-project
  source:
    repoURL: https://github.com/myorg/myapp.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: false     # Manual approval required
      selfHeal: false  # No auto-healing in prod
    syncOptions:
    - RespectIgnoreDifferences=true
```

## 7. ApplicationSets for Scale

ApplicationSets generate multiple Applications from templates.

### 7.1 List Generator

Deploy same app to multiple clusters:

```yaml
# applicationset-clusters.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-all-clusters
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: dev-cluster
        url: https://dev.k8s.example.com
        namespace: myapp
      - cluster: staging-cluster
        url: https://staging.k8s.example.com
        namespace: myapp
      - cluster: prod-cluster-us
        url: https://prod-us.k8s.example.com
        namespace: myapp
      - cluster: prod-cluster-eu
        url: https://prod-eu.k8s.example.com
        namespace: myapp

  template:
    metadata:
      name: 'myapp-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp.git
        targetRevision: main
        path: helm
        helm:
          valueFiles:
          - values-{{cluster}}.yaml
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### 7.2 Git Directory Generator

Auto-discover apps in repository:

```yaml
# applicationset-git-directory.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/myorg/microservices.git
      revision: main
      directories:
      - path: apps/*

  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/microservices.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

**Repository Structure:**
```
microservices/
├── apps/
│   ├── user-service/
│   ├── order-service/
│   ├── payment-service/
│   └── notification-service/
```

ArgoCD automatically creates an Application for each directory!

### 7.3 Cluster Generator

Deploy to all registered clusters:

```yaml
# applicationset-all-clusters.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: guestbook-all-clusters
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          env: production  # Only production clusters

  template:
    metadata:
      name: '{{name}}-guestbook'
    spec:
      project: default
      source:
        repoURL: https://github.com/argoproj/argocd-example-apps.git
        targetRevision: main
        path: guestbook
      destination:
        server: '{{server}}'
        namespace: guestbook
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## 8. Projects for Multi-Tenancy

### 8.1 Creating Projects

Projects provide logical grouping and RBAC boundaries.

```yaml
# project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A's applications

  # Source repositories
  sourceRepos:
  - 'https://github.com/myorg/team-a-*'
  - 'https://charts.bitnami.com/bitnami'

  # Allowed destinations
  destinations:
  - namespace: 'team-a-*'
    server: https://kubernetes.default.svc
  - namespace: 'team-a-*'
    server: https://prod-cluster.k8s.example.com

  # Cluster resource whitelist (what can be deployed)
  clusterResourceWhitelist:
  - group: ''
    kind: Namespace
  - group: 'rbac.authorization.k8s.io'
    kind: RoleBinding

  # Namespace resource blacklist (what cannot be deployed)
  namespaceResourceBlacklist:
  - group: ''
    kind: ResourceQuota
  - group: ''
    kind: LimitRange

  # Allowed resource roles
  roles:
  - name: team-a-developer
    description: Developer role for Team A
    policies:
    - p, proj:team-a:team-a-developer, applications, get, team-a/*, allow
    - p, proj:team-a:team-a-developer, applications, sync, team-a/*, allow
    groups:
    - team-a-developers

  - name: team-a-admin
    description: Admin role for Team A
    policies:
    - p, proj:team-a:team-a-admin, applications, *, team-a/*, allow
    - p, proj:team-a:team-a-admin, repositories, *, *, allow
    groups:
    - team-a-admins
```

## 9. Hands-On Labs

### Lab 1: Deploy First Application with ArgoCD

**Objective:** Deploy guestbook application using ArgoCD

```bash
# 1. Create application
argocd app create guestbook \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default

# 2. Sync application
argocd app sync guestbook

# 3. Watch deployment
argocd app get guestbook --watch

# 4. Access Web UI and observe
# - Application topology
# - Sync status
# - Resource health

# 5. Make a change in Git
# Fork the repository, modify replica count
# Observe automatic sync (if enabled)

# 6. Rollback
argocd app rollback guestbook
```

### Lab 2: Multi-Environment Deployment with Kustomize

**Objective:** Deploy same application to dev, staging, and production

**Step 1: Create repository structure**

```bash
mkdir -p myapp/{base,overlays/{dev,staging,prod}}
cd myapp
```

**base/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: nginx:1.25
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

**base/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
```

**overlays/dev/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: myapp-dev
namePrefix: dev-
commonLabels:
  env: dev
resources:
- ../../base
patches:
- patch: |-
    - op: replace
      path: /spec/replicas
      value: 1
  target:
    kind: Deployment
```

**overlays/prod/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: myapp-prod
namePrefix: prod-
commonLabels:
  env: production
resources:
- ../../base
patches:
- patch: |-
    - op: replace
      path: /spec/replicas
      value: 5
  target:
    kind: Deployment
```

**Step 2: Create Applications**

```bash
# Dev environment
argocd app create myapp-dev \
  --repo https://github.com/yourusername/myapp.git \
  --path overlays/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace myapp-dev \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Production environment
argocd app create myapp-prod \
  --repo https://github.com/yourusername/myapp.git \
  --path overlays/prod \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace myapp-prod \
  --sync-policy none  # Manual sync for prod
```

**Step 3: Test promotion workflow**

```bash
# 1. Make change in dev overlay
# 2. Commit and push
# 3. ArgoCD auto-syncs to dev
# 4. Test in dev
# 5. Merge to production overlay
# 6. Manually sync production
argocd app sync myapp-prod
```

## 10. Best Practices (2026 Edition)

### 10.1 Repository Structure

**✅ Recommended:**
```
gitops-repo/
├── apps/                    # Application definitions
│   ├── dev/
│   ├── staging/
│   └── prod/
├── infra/                   # Infrastructure components
│   ├── ingress/
│   ├── cert-manager/
│   └── monitoring/
└── projects/                # ArgoCD Projects
    └── team-a.yaml
```

### 10.2 Secrets Management

**❌ Never commit secrets to Git**

**✅ Use External Secrets Operator:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-secret
  data:
  - secretKey: password
    remoteRef:
      key: database/production
      property: password
```

### 10.3 Sync Policies

**Development:**
```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

**Production:**
```yaml
syncPolicy:
  automated:
    prune: false
    selfHeal: false
  # Manual approval required
```

### 10.4 Monitoring ArgoCD

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-metrics
  endpoints:
  - port: metrics
```

**Key Metrics to Monitor:**
- `argocd_app_sync_total` - Total sync operations
- `argocd_app_health_status` - Application health
- `argocd_app_reconcile_duration` - Reconciliation time
- `argocd_git_request_total` - Git request rate

## 11. Production Considerations

### Security
- Enable SSO (SAML, OIDC)
- Implement RBAC with Projects
- Use AppProject restrictions
- Enable audit logging
- Scan manifests with OPA/Kyverno before sync

### High Availability
- Run multiple replicas of all components
- Use Redis HA or Redis Sentinel
- Configure anti-affinity rules
- Implement backup strategy

### Performance
- Use repo server caching
- Shard application controller for >1000 apps
- Optimize reconciliation intervals
- Use webhook triggers instead of polling

## Key Takeaways

1. **GitOps with ArgoCD** provides declarative, auditable deployments
2. **Applications and ApplicationSets** manage deployments at scale
3. **Sync waves and hooks** enable ordered, complex deployments
4. **Projects** provide multi-tenancy and RBAC boundaries
5. **OCI registry support** (ArgoCD 3.1+) modernizes artifact management
6. **Multi-environment patterns** separate development from production
7. **Secrets management** requires external solutions, never commit to Git
8. **Production readiness** requires HA, monitoring, and proper RBAC

## Resources

### Official Documentation
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD GitHub](https://github.com/argoproj/argo-cd)
- [ApplicationSet Documentation](https://argocd-applicationset.readthedocs.io/)

### Patterns and Examples
- [ArgoCD Example Apps](https://github.com/argoproj/argocd-example-apps)
- [GitOps Repository Patterns](https://devtoolbox.dedyn.io/blog/argocd-complete-guide)

---

**Next Module:** [Module 14: Service Mesh with Istio](Module-14-Service-Mesh-with-Istio.md)

In the next module, we'll explore Istio service mesh including the new ambient mode, traffic management, security, and observability.

# Module 15: Multi-Cluster Management

## Learning Objectives

By the end of this module, you will be able to:

- Understand multi-cluster architecture patterns and when to use them
- Explain the differences between multi-cluster, multi-tenant, and federated deployments
- Deploy and manage Kubernetes clusters across multiple clouds and regions
- Implement multi-cluster service discovery and networking
- Configure GitOps for multi-cluster deployments with ArgoCD
- Deploy and manage applications with Karmada (Kubernetes Armada)
- Implement multi-cluster service mesh with Istio
- Configure cross-cluster load balancing and failover
- Manage multi-cluster observability and monitoring
- Implement disaster recovery and high availability patterns
- Optimize costs across multi-cloud deployments

**Time Estimate**: 7-8 hours

**Prerequisites**:
- Completed Modules 1-14
- Strong understanding of Kubernetes networking
- Familiarity with GitOps and ArgoCD
- Understanding of service mesh concepts
- Experience with cloud provider infrastructure

---

## Introduction

### What is Multi-Cluster Management?

**Multi-cluster management** is the practice of operating multiple Kubernetes clusters as a unified platform, with centralized control, governance, and observability.

**The Corporate Office Analogy:**

Think of each Kubernetes cluster as a regional office:
- **Single Cluster**: One office handles everything (single point of failure)
- **Multi-Cluster**: Regional offices with centralized management (resilience, compliance)
- **Multi-Cluster Manager**: Corporate headquarters coordinating all offices

### Why Multi-Cluster? (2026 Reality)

**Industry Adoption (2026):**
- 30-80% of enterprises use multi-cluster or hybrid-cloud deployments
- 60% of organizations run clusters across multiple cloud providers
- Average enterprise manages 10-50 Kubernetes clusters

**Key Drivers:**

✅ **High Availability and Disaster Recovery**
- Survive regional outages
- Zero-downtime deployments
- Geographic redundancy

✅ **Compliance and Data Sovereignty**
- GDPR requires EU data to stay in EU
- HIPAA, PCI-DSS, SOC2 regional requirements
- Government regulations (China, Russia data localization)

✅ **Performance and Latency**
- Serve users from nearest region (CDN-like)
- Reduce cross-continent latency
- Edge computing deployments

✅ **Cost Optimization**
- Spot instances in one cloud, reserved in another
- Leverage regional pricing differences
- Avoid vendor lock-in with multi-cloud

✅ **Isolation and Blast Radius**
- Separate prod/staging/dev environments
- Team/department isolation
- Contain security incidents

✅ **Scalability Beyond Single Cluster**
- Kubernetes cluster limits (5000 nodes, 150,000 pods)
- Distribute massive workloads
- Regional scaling

### Multi-Cluster Patterns

**1. High Availability (Active-Active)**

```
┌─────────────────┐      ┌─────────────────┐
│   Cluster 1     │      │   Cluster 2     │
│   us-west-2     │◀────▶│   us-east-1     │
│                 │      │                 │
│  App (active)   │      │  App (active)   │
│  Load: 50%      │      │  Load: 50%      │
└─────────────────┘      └─────────────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         Global Load Balancer
```

**2. Disaster Recovery (Active-Passive)**

```
┌─────────────────┐      ┌─────────────────┐
│   Cluster 1     │      │   Cluster 2     │
│   us-west-2     │─────▶│   us-east-1     │
│   (Primary)     │      │   (Standby)     │
│  App (active)   │      │  App (standby)  │
│  Load: 100%     │      │  Load: 0%       │
└─────────────────┘      └─────────────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
       Failover on Primary Failure
```

**3. Multi-Region for Low Latency**

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ us-west-2   │  │ eu-west-1   │  │ ap-south-1  │
│             │  │             │  │             │
│ App (active)│  │ App (active)│  │ App (active)│
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
              GeoDNS / Global LB
          (routes to nearest cluster)
```

**4. Hybrid Cloud**

```
┌──────────────────┐    ┌──────────────────┐
│   AWS Cluster    │    │   On-Prem        │
│   (Public Cloud) │◀──▶│   (Data Center)  │
│                  │    │                  │
│  Stateless Apps  │    │  Databases       │
│  APIs            │    │  Legacy Systems  │
└──────────────────┘    └──────────────────┘
```

**5. Edge Computing**

```
        ┌─────────────────┐
        │  Central Cloud  │
        │   (us-west-2)   │
        └─────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
   ┌────▼───┐ ┌─▼────┐ ┌─▼────┐
   │ Edge 1 │ │Edge 2│ │Edge 3│
   │ Store  │ │Store │ │Store │
   │   NY   │ │  LA  │ │  CHI │
   └────────┘ └──────┘ └──────┘
```

### Multi-Cluster vs Alternatives

| Approach | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Single Cluster** | Small apps, simple needs | Simple, low overhead | Single point of failure, scaling limits |
| **Multi-Tenant (Namespaces)** | Shared infrastructure | Resource efficiency | No hard isolation, security risks |
| **Multi-Cluster** | Enterprise, HA, compliance | Strong isolation, HA, scalability | Complex, higher costs |
| **Federation (v2/KubeFed)** | Legacy multi-cluster | Standardized API | Deprecated, limited adoption |

---

## Core Concepts

### Cluster Topology

**Centralized Control Plane Architecture:**

```
┌─────────────────────────────────────┐
│   Management/Control Cluster        │
│                                     │
│  ┌──────────┐  ┌──────────────┐    │
│  │ ArgoCD   │  │  Karmada     │    │
│  │ (GitOps) │  │  (Scheduler) │    │
│  └──────────┘  └──────────────┘    │
│  ┌──────────┐  ┌──────────────┐    │
│  │Prometheus│  │   Grafana    │    │
│  │  (Multi) │  │  (Dashboard) │    │
│  └──────────┘  └──────────────┘    │
└─────────────────────────────────────┘
         │              │
         │              │
    ┌────┴──────┬───────┴─────┐
    │           │             │
┌───▼────┐  ┌──▼─────┐  ┌────▼───┐
│Cluster │  │Cluster │  │Cluster │
│   1    │  │   2    │  │   3    │
│(prod-w)│  │(prod-e)│  │ (dev)  │
└────────┘  └────────┘  └────────┘
```

**Components:**
- **Management Cluster**: Hosts control plane tools (ArgoCD, Karmada, observability)
- **Workload Clusters**: Run application workloads
- **Communication**: Secure API access (VPN, service mesh, cloud network peering)

### Service Discovery Across Clusters

**Challenge**: How does a service in Cluster A discover and call a service in Cluster B?

**Solution 1: Istio Multi-Cluster Service Discovery**

```
Cluster 1                         Cluster 2
┌─────────────────┐              ┌─────────────────┐
│                 │              │                 │
│ Service A ──────┼──────────────┼────▶ Service B  │
│ (client)        │  East-West   │     (server)    │
│                 │   Gateway    │                 │
└─────────────────┘              └─────────────────┘
```

- Services registered in shared service registry
- DNS resolves to local or remote service
- Istio handles cross-cluster routing

**Solution 2: Submariner**

```
┌──────────────────────────────────────────┐
│          Submariner Broker               │
│      (Service & Route Discovery)         │
└──────────────────────────────────────────┘
           │                │
    ┌──────┴──────┐   ┌────┴──────┐
    │             │   │           │
┌───▼──────┐  ┌──▼───────┐  ┌────▼─────┐
│ Gateway  │  │ Gateway  │  │ Gateway  │
│Cluster 1 │  │Cluster 2 │  │Cluster 3 │
└──────────┘  └──────────┘  └──────────┘
```

- Establishes encrypted tunnels between clusters
- Routes cross-cluster service traffic
- Supports ClusterIP services across clusters

### Multi-Cluster Networking

**Network Topologies:**

**1. Flat Network (Same VPC/VNet)**
- Clusters share IP space
- Direct pod-to-pod communication
- Simplest but limited scalability

**2. Gateway-Based (Istio East-West)**
- Dedicated gateway for cross-cluster traffic
- Different IP spaces per cluster
- Most common in production

**3. VPN/Peering**
- Cloud provider VPC peering
- Site-to-site VPN for hybrid
- Secure but additional latency

**4. Service Mesh (Ambient/Sidecar)**
- Transparent cross-cluster communication
- mTLS encryption
- Advanced traffic management

### Karmada Architecture

**Karmada** (Kubernetes Armada) is a CNCF multi-cluster orchestration system:

```
┌─────────────────────────────────────────────┐
│          Karmada Control Plane              │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │   Kubernetes API Server            │    │
│  │   (Karmada API Extensions)         │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Scheduler │  │Controller│  │  Webhook │  │
│  │          │  │ Manager  │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
          │              │              │
    ┌─────┴──────┬───────┴──────┬───────┴─────┐
    │            │              │             │
┌───▼─────┐  ┌──▼──────┐  ┌────▼──────┐  ┌───▼─────┐
│Member   │  │Member   │  │Member     │  │Member   │
│Cluster 1│  │Cluster 2│  │Cluster 3  │  │Cluster 4│
└─────────┘  └─────────┘  └───────────┘  └─────────┘
```

**Key Concepts:**

**1. ResourceBinding**
- Binds a resource (Deployment, Service) to target clusters
- Defines scheduling policy

**2. PropagationPolicy**
- Determines which clusters receive which resources
- Label selectors, cluster affinity

**3. OverridePolicy**
- Cluster-specific overrides (replicas, env vars)
- Differentiate dev/staging/prod

**4. Work**
- Actual resource manifests sent to member clusters
- Created automatically by Karmada controller

### GitOps for Multi-Cluster

**ArgoCD ApplicationSet for Multi-Cluster:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-cluster-app
spec:
  generators:
  - list:
      elements:
      - cluster: prod-west
        url: https://prod-west.k8s.local
        region: us-west-2
        env: production
      - cluster: prod-east
        url: https://prod-east.k8s.local
        region: us-east-1
        env: production
  template:
    metadata:
      name: '{{cluster}}-myapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/apps
        targetRevision: HEAD
        path: apps/myapp
        helm:
          values: |
            region: {{region}}
            environment: {{env}}
      destination:
        server: '{{url}}'
        namespace: myapp
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

**Directory Structure for Multi-Cluster:**

```
git-repo/
├── apps/
│   ├── frontend/
│   │   ├── base/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   └── overlays/
│   │       ├── prod-west/
│   │       │   ├── kustomization.yaml
│   │       │   └── replicas-patch.yaml
│   │       ├── prod-east/
│   │       │   ├── kustomization.yaml
│   │       │   └── replicas-patch.yaml
│   │       └── dev/
│   │           └── kustomization.yaml
│   └── backend/
│       └── ... (same structure)
└── infrastructure/
    ├── namespaces/
    ├── rbac/
    └── network-policies/
```

---

## Hands-On Lab 1: Setting Up Multi-Cluster Environment

### Objective
Create a multi-cluster environment with 3 clusters using kind (Kubernetes in Docker).

### Prerequisites
- Docker Desktop with 8GB+ memory allocated
- kubectl installed
- kind installed

### Step 1: Install kind (if not already installed)

```bash
# For macOS
brew install kind

# For Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.24.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# For Windows (PowerShell as Administrator)
curl.exe -Lo kind-windows-amd64.exe https://kind.sigs.k8s.io/dl/v0.24.0/kind-windows-amd64
Move-Item .\kind-windows-amd64.exe c:\windows\system32\kind.exe

# Verify installation
kind version
```

### Step 2: Create Management Cluster

```bash
# Create kind config for management cluster
cat <<EOF > kind-management.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: management
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "cluster=management"
  extraPortMappings:
  - containerPort: 30080
    hostPort: 30080
    protocol: TCP
EOF

# Create management cluster
kind create cluster --config kind-management.yaml

# Verify
kubectl cluster-info --context kind-management
```

### Step 3: Create Workload Clusters

```bash
# Cluster 1 (prod-west)
cat <<EOF > kind-prod-west.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: prod-west
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "cluster=prod-west,region=us-west,env=production"
- role: worker
  kubeadmConfigPatches:
  - |
    kind: JoinConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "cluster=prod-west,region=us-west,env=production"
EOF

kind create cluster --config kind-prod-west.yaml

# Cluster 2 (prod-east)
cat <<EOF > kind-prod-east.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: prod-east
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "cluster=prod-east,region=us-east,env=production"
- role: worker
  kubeadmConfigPatches:
  - |
    kind: JoinConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "cluster=prod-east,region=us-east,env=production"
EOF

kind create cluster --config kind-prod-east.yaml

# Verify all clusters
kind get clusters
# Expected: management, prod-east, prod-west
```

### Step 4: Configure kubectl Contexts

```bash
# List all contexts
kubectl config get-contexts

# Rename contexts for clarity
kubectl config rename-context kind-management management
kubectl config rename-context kind-prod-west prod-west
kubectl config rename-context kind-prod-east prod-east

# Verify
kubectl config get-contexts

# Set current context to management
kubectl config use-context management
```

### Step 5: Verify Cluster Access

```bash
# Test management cluster
kubectl --context management get nodes

# Test prod-west cluster
kubectl --context prod-west get nodes

# Test prod-east cluster
kubectl --context prod-east get nodes
```

### Step 6: Create Namespaces in All Clusters

```bash
# Create namespace in all workload clusters
for cluster in prod-west prod-east; do
  kubectl --context $cluster create namespace demo
  kubectl --context $cluster create namespace monitoring
done

# Verify
kubectl --context prod-west get namespaces
kubectl --context prod-east get namespaces
```

### Verification Checklist

✅ Three kind clusters created (management, prod-west, prod-east)
✅ kubectl contexts configured and accessible
✅ Namespaces created in workload clusters
✅ Node labels set for cluster identification

---

## Hands-On Lab 2: Installing and Using Karmada

### Objective
Deploy Karmada for multi-cluster orchestration and deploy applications across clusters.

### Step 1: Install Karmada on Management Cluster

```bash
# Switch to management context
kubectl config use-context management

# Install Karmada using Helm
helm repo add karmada https://docs.karmada.io/charts
helm repo update

# Install Karmada control plane
helm install karmada karmada/karmada \
  --create-namespace \
  --namespace karmada-system \
  --set certs.mode=auto

# Wait for Karmada components to be ready
kubectl wait --for=condition=ready pod --all -n karmada-system --timeout=600s

# Verify installation
kubectl get pods -n karmada-system
```

**Expected Pods:**
- karmada-apiserver
- karmada-aggregated-apiserver
- karmada-controller-manager
- karmada-scheduler
- karmada-webhook
- etcd

### Step 2: Install karmadactl CLI

```bash
# Download karmadactl
curl -s https://raw.githubusercontent.com/karmada-io/karmada/master/hack/install-cli.sh | bash

# Verify installation
karmadactl version

# Get Karmada API server endpoint
export KARMADA_APISERVER=$(kubectl --context management get pod -n karmada-system -l app=karmada-apiserver -o jsonpath='{.items[0].status.podIP}')
```

### Step 3: Register Member Clusters

```bash
# Register prod-west cluster
karmadactl --kubeconfig=$HOME/.kube/config \
  --karmada-context=management \
  join prod-west \
  --cluster-kubeconfig=$HOME/.kube/config \
  --cluster-context=prod-west

# Register prod-east cluster
karmadactl --kubeconfig=$HOME/.kube/config \
  --karmada-context=management \
  join prod-east \
  --cluster-kubeconfig=$HOME/.kube/config \
  --cluster-context=prod-east

# Verify clusters are registered
kubectl --context management get clusters -A
```

**Expected Output:**
```
NAME         VERSION   MODE   READY   AGE
prod-east    v1.29.0   Push   True    1m
prod-west    v1.29.0   Push   True    1m
```

### Step 4: Deploy Application with PropagationPolicy

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: demo
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
        image: nginx:1.27
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: demo
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

```bash
# Apply to Karmada control plane
kubectl --context management apply -f nginx-deployment.yaml
```

### Step 5: Create PropagationPolicy to Distribute Across Clusters

```yaml
# propagation-policy.yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: nginx-propagation
  namespace: demo
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: nginx
  - apiVersion: v1
    kind: Service
    name: nginx
  placement:
    clusterAffinity:
      clusterNames:
      - prod-west
      - prod-east
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Divided
      weightPreference:
        staticWeightList:
        - targetCluster:
            clusterNames:
            - prod-west
          weight: 2
        - targetCluster:
            clusterNames:
            - prod-east
          weight: 1
```

```bash
# Apply propagation policy
kubectl --context management apply -f propagation-policy.yaml

# Verify resource binding
kubectl --context management get rb -n demo

# Check deployment in prod-west (should have 2 replicas)
kubectl --context prod-west get deployment nginx -n demo

# Check deployment in prod-east (should have 1 replica)
kubectl --context prod-east get deployment nginx -n demo
```

### Step 6: Override Configuration Per Cluster

```yaml
# override-policy.yaml
apiVersion: policy.karmada.io/v1alpha1
kind: OverridePolicy
metadata:
  name: nginx-override
  namespace: demo
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: nginx
  overrideRules:
  - targetCluster:
      clusterNames:
      - prod-west
    overriders:
      plaintext:
      - path: /spec/template/spec/containers/0/env
        operator: add
        value:
        - name: REGION
          value: us-west-2
  - targetCluster:
      clusterNames:
      - prod-east
    overriders:
      plaintext:
      - path: /spec/template/spec/containers/0/env
        operator: add
        value:
        - name: REGION
          value: us-east-1
```

```bash
# Apply override policy
kubectl --context management apply -f override-policy.yaml

# Verify environment variable in prod-west
kubectl --context prod-west get deployment nginx -n demo -o jsonpath='{.spec.template.spec.containers[0].env}'

# Verify environment variable in prod-east
kubectl --context prod-east get deployment nginx -n demo -o jsonpath='{.spec.template.spec.containers[0].env}'
```

### Step 7: Test Cluster-Aware Scheduling

```yaml
# high-availability-app.yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: ha-app
  namespace: demo
spec:
  resourceSelectors:
  - apiVersion: apps/v1
    kind: Deployment
    name: ha-nginx
  placement:
    clusterAffinity:
      clusterNames:
      - prod-west
      - prod-east
    spreadConstraints:
    - spreadByField: cluster
      maxGroups: 2
      minGroups: 2
    replicaScheduling:
      replicaDivisionPreference: Weighted
      replicaSchedulingType: Duplicated
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-nginx
  namespace: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ha-nginx
  template:
    metadata:
      labels:
        app: ha-nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.27
```

```bash
# Apply HA configuration
kubectl --context management apply -f high-availability-app.yaml

# Verify deployment in both clusters (each should have 2 replicas)
kubectl --context prod-west get deployment ha-nginx -n demo
kubectl --context prod-east get deployment ha-nginx -n demo
```

---

## Hands-On Lab 3: Multi-Cluster GitOps with ArgoCD

### Objective
Configure ArgoCD to manage applications across multiple clusters using ApplicationSets.

### Step 1: Install ArgoCD on Management Cluster

```bash
# Switch to management context
kubectl config use-context management

# Create argocd namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
kubectl wait --for=condition=ready pod --all -n argocd --timeout=600s

# Get initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD admin password: $ARGOCD_PASSWORD"

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443 &
```

### Step 2: Add Workload Clusters to ArgoCD

```bash
# Install ArgoCD CLI
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd
sudo mv argocd /usr/local/bin/

# Login to ArgoCD
argocd login localhost:8080 --username admin --password $ARGOCD_PASSWORD --insecure

# Add prod-west cluster
argocd cluster add prod-west --name prod-west

# Add prod-east cluster
argocd cluster add prod-east --name prod-east

# List clusters
argocd cluster list
```

### Step 3: Create Git Repository Structure

```bash
# Create local git repository for demo
mkdir -p ~/multi-cluster-demo
cd ~/multi-cluster-demo

git init
git config user.name "Demo User"
git config user.email "demo@example.com"

# Create directory structure
mkdir -p apps/guestbook/{base,overlays/{prod-west,prod-east}}

# Base application
cat <<EOF > apps/guestbook/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guestbook-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: guestbook-ui
  template:
    metadata:
      labels:
        app: guestbook-ui
    spec:
      containers:
      - name: guestbook-ui
        image: gcr.io/heptio-images/ks-guestbook-demo:0.2
        ports:
        - containerPort: 80
        env:
        - name: CLUSTER
          value: "unknown"
EOF

cat <<EOF > apps/guestbook/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: guestbook-ui
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: guestbook-ui
EOF

cat <<EOF > apps/guestbook/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
EOF

# Prod-west overlay
cat <<EOF > apps/guestbook/overlays/prod-west/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: demo
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: guestbook-ui
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/env/0/value
        value: "prod-west"
EOF

# Prod-east overlay
cat <<EOF > apps/guestbook/overlays/prod-east/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: demo
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: guestbook-ui
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 2
      - op: replace
        path: /spec/template/spec/containers/0/env/0/value
        value: "prod-east"
EOF

# Commit to git
git add .
git commit -m "Initial multi-cluster guestbook app"
```

### Step 4: Create ApplicationSet

```yaml
# applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: guestbook-multicluster
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: prod-west
        url: https://prod-west-control-plane:6443
        path: apps/guestbook/overlays/prod-west
      - cluster: prod-east
        url: https://prod-east-control-plane:6443
        path: apps/guestbook/overlays/prod-east
  template:
    metadata:
      name: 'guestbook-{{cluster}}'
      labels:
        environment: production
        cluster: '{{cluster}}'
    spec:
      project: default
      source:
        repoURL: file:///home/user/multi-cluster-demo
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: '{{url}}'
        namespace: demo
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

```bash
# Apply ApplicationSet
kubectl --context management apply -f applicationset.yaml

# Check application status
argocd app list

# Wait for sync
argocd app wait guestbook-prod-west
argocd app wait guestbook-prod-east
```

### Step 5: Verify Deployments in Both Clusters

```bash
# Check prod-west (should have 3 replicas)
kubectl --context prod-west get deployment guestbook-ui -n demo

# Check prod-east (should have 2 replicas)
kubectl --context prod-east get deployment guestbook-ui -n demo

# Verify environment variable
kubectl --context prod-west get deployment guestbook-ui -n demo -o jsonpath='{.spec.template.spec.containers[0].env[0].value}'
# Expected: prod-west

kubectl --context prod-east get deployment guestbook-ui -n demo -o jsonpath='{.spec.template.spec.containers[0].env[0].value}'
# Expected: prod-east
```

### Step 6: Test GitOps Workflow

```bash
# Update replica count in prod-west
cat <<EOF > apps/guestbook/overlays/prod-west/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: demo
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: guestbook-ui
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
      - op: replace
        path: /spec/template/spec/containers/0/env/0/value
        value: "prod-west"
EOF

# Commit change
git add .
git commit -m "Scale prod-west to 5 replicas"

# ArgoCD will auto-sync (or manually sync)
argocd app sync guestbook-prod-west

# Verify change
kubectl --context prod-west get deployment guestbook-ui -n demo
# Expected: 5 replicas
```

---

## Hands-On Lab 4: Multi-Cluster Service Mesh with Istio

### Objective
Configure Istio for cross-cluster service discovery and communication.

### Step 1: Install Istio on Both Clusters

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.27.0 sh -
cd istio-1.27.0
export PATH=$PWD/bin:$PATH

# Install Istio on prod-west
kubectl config use-context prod-west
istioctl install --set profile=ambient \
  --set values.global.meshID=shared-mesh \
  --set values.global.multiCluster.clusterName=prod-west \
  --set values.global.network=network-west -y

# Install Istio on prod-east
kubectl config use-context prod-east
istioctl install --set profile=ambient \
  --set values.global.meshID=shared-mesh \
  --set values.global.multiCluster.clusterName=prod-east \
  --set values.global.network=network-east -y
```

### Step 2: Install East-West Gateways

```bash
# Generate east-west gateway for prod-west
cd ~/istio-1.27.0
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh shared-mesh --cluster prod-west --network network-west | \
  kubectl --context prod-west apply -f -

# Generate east-west gateway for prod-east
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh shared-mesh --cluster prod-east --network network-east | \
  kubectl --context prod-east apply -f -

# Wait for gateways to be ready
kubectl --context prod-west wait --for=condition=ready pod -l app=istio-eastwestgateway -n istio-system --timeout=300s
kubectl --context prod-east wait --for=condition=ready pod -l app=istio-eastwestgateway -n istio-system --timeout=300s
```

### Step 3: Enable Endpoint Discovery

```bash
# Expose services in prod-west for cross-cluster discovery
kubectl --context prod-west apply -f samples/multicluster/expose-services.yaml -n istio-system

# Expose services in prod-east
kubectl --context prod-east apply -f samples/multicluster/expose-services.yaml -n istio-system
```

### Step 4: Configure Cross-Cluster Secrets

```bash
# Create secret in prod-west to access prod-east
istioctl create-remote-secret \
  --context=prod-east \
  --name=prod-east | \
  kubectl --context prod-west apply -f -

# Create secret in prod-east to access prod-west
istioctl create-remote-secret \
  --context=prod-west \
  --name=prod-west | \
  kubectl --context prod-east apply -f -

# Verify secrets
kubectl --context prod-west get secrets -n istio-system | grep istio-remote-secret
kubectl --context prod-east get secrets -n istio-system | grep istio-remote-secret
```

### Step 5: Deploy Sample Application

```bash
# Deploy sleep app in prod-west
kubectl --context prod-west create namespace sample
kubectl --context prod-west label namespace sample istio.io/dataplane-mode=ambient

kubectl --context prod-west apply -f samples/sleep/sleep.yaml -n sample

# Deploy httpbin app in prod-east
kubectl --context prod-east create namespace sample
kubectl --context prod-east label namespace sample istio.io/dataplane-mode=ambient

kubectl --context prod-east apply -f samples/httpbin/httpbin.yaml -n sample

# Wait for pods
kubectl --context prod-west wait --for=condition=ready pod -l app=sleep -n sample --timeout=120s
kubectl --context prod-east wait --for=condition=ready pod -l app=httpbin -n sample --timeout=120s
```

### Step 6: Test Cross-Cluster Communication

```bash
# Call httpbin in prod-east from sleep in prod-west
kubectl --context prod-west exec -n sample deploy/sleep -- curl -s httpbin.sample:8000/headers

# Expected: Success with JSON response showing headers
```

### Step 7: Verify Multi-Cluster Topology

```bash
# Install Kiali on prod-west
kubectl --context prod-west apply -f samples/addons/kiali.yaml -n istio-system

# Port-forward Kiali
kubectl --context prod-west port-forward -n istio-system svc/kiali 20001:20001 &

# Access Kiali at http://localhost:20001
# Navigate to Graph → Select "sample" namespace → Enable "Service Nodes"
# You should see cross-cluster traffic from sleep (prod-west) to httpbin (prod-east)
```

---

## Hands-On Lab 5: Multi-Cluster Observability

### Objective
Configure centralized monitoring across all clusters using Prometheus and Grafana.

### Step 1: Install Prometheus on Management Cluster

```bash
# Switch to management context
kubectl config use-context management

# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Kube Prometheus Stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false

# Wait for all pods
kubectl wait --for=condition=ready pod --all -n monitoring --timeout=600s
```

### Step 2: Configure Prometheus Federation

```yaml
# prometheus-federation.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-federation-config
  namespace: monitoring
data:
  prometheus-additional.yaml: |
    - job_name: 'federate-prod-west'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{__name__=~".*"}'
      static_configs:
        - targets:
          - 'prometheus-server.monitoring.svc.cluster.local:9090'
          labels:
            cluster: 'prod-west'
    - job_name: 'federate-prod-east'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{__name__=~".*"}'
      static_configs:
        - targets:
          - 'prometheus-server.monitoring.svc.cluster.local:9090'
          labels:
            cluster: 'prod-east'
```

```bash
# Apply federation configuration
kubectl --context management apply -f prometheus-federation.yaml
```

### Step 3: Install Prometheus on Workload Clusters

```bash
# Install on prod-west
kubectl config use-context prod-west
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Install on prod-east
kubectl config use-context prod-east
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Wait for readiness
kubectl --context prod-west wait --for=condition=ready pod --all -n monitoring --timeout=600s
kubectl --context prod-east wait --for=condition=ready pod --all -n monitoring --timeout=600s
```

### Step 4: Create Multi-Cluster Grafana Dashboard

```bash
# Access Grafana on management cluster
kubectl --context management port-forward -n monitoring svc/prometheus-grafana 3000:80 &

# Get Grafana admin password
kubectl --context management get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 -d
echo

# Login to Grafana at http://localhost:3000
# Username: admin
# Password: <from above command>
```

**Create Multi-Cluster Dashboard:**

```json
{
  "dashboard": {
    "title": "Multi-Cluster Overview",
    "panels": [
      {
        "title": "Pods by Cluster",
        "targets": [
          {
            "expr": "count(kube_pod_info) by (cluster)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "CPU Usage by Cluster",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (cluster)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Usage by Cluster",
        "targets": [
          {
            "expr": "sum(container_memory_working_set_bytes) by (cluster)"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Step 5: Configure Alertmanager for Multi-Cluster

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-prometheus-kube-prometheus-alertmanager
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
    route:
      group_by: ['cluster', 'alertname']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty'
        continue: true
    receivers:
    - name: 'slack'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        text: 'Cluster: {{ .GroupLabels.cluster }} - {{ .CommonAnnotations.summary }}'
    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

```bash
kubectl --context management apply -f alertmanager-config.yaml
```

---

## Best Practices

### Cluster Design

**1. Separate Management and Workload Clusters**

✅ **Dedicated management cluster**
- Hosts control plane tools (ArgoCD, Karmada, Prometheus)
- Isolates management from application workloads
- Prevents resource contention

❌ **Don't run control plane on workload clusters**
- Management tools compete with applications
- Harder to troubleshoot cluster issues
- Security boundary violations

**2. Consistent Cluster Configuration**

✅ **Standardize cluster setup**
- Same Kubernetes version across all clusters
- Identical CNI, CSI, and ingress controllers
- Consistent RBAC policies

✅ **Use Infrastructure as Code**
```terraform
module "eks_cluster" {
  source = "./modules/eks"
  for_each = var.clusters

  cluster_name = each.key
  region       = each.value.region
  version      = "1.29"
  # ... standard configuration
}
```

**3. Network Topology Planning**

✅ **Non-overlapping IP ranges**
- Each cluster has unique pod CIDR
- Avoid IP conflicts for multi-cluster communication

| Cluster | Pod CIDR | Service CIDR |
|---------|----------|--------------|
| prod-west | 10.0.0.0/16 | 10.100.0.0/16 |
| prod-east | 10.1.0.0/16 | 10.101.0.0/16 |
| dev | 10.2.0.0/16 | 10.102.0.0/16 |

### Application Design

**1. Location-Aware Services**

✅ **Use cluster labels**
```yaml
env:
- name: CLUSTER_NAME
  valueFrom:
    fieldRef:
      fieldPath: spec.nodeName
- name: REGION
  value: "us-west-2"
```

✅ **Locality-based routing**
- Prefer local services
- Cross-cluster only for failover

**2. Data Locality and Sovereignty**

✅ **Regional data storage**
- EU data stays in EU clusters
- US data in US clusters
- Use geofencing policies

✅ **Cross-region replication**
- Asynchronous replication
- Eventual consistency acceptable
- Minimize cross-region writes

**3. Stateful Workloads**

✅ **Single-cluster stateful apps**
- Databases, caches in one cluster
- Replicate to other clusters asynchronously
- Use managed services (RDS Multi-AZ, GCP Cloud SQL HA)

❌ **Don't distribute StatefulSets across clusters**
- Complex consensus protocols
- Network partitions cause split-brain
- Use cloud-native HA instead

### Security

**1. Least Privilege Access**

✅ **Separate service accounts per cluster**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/prod-west-app-role
```

✅ **Cluster-specific RBAC**
- Don't share cluster-admin across clusters
- Limit cross-cluster API access

**2. Network Security**

✅ **Encrypt cross-cluster traffic**
- Use Istio mTLS
- VPN/TLS for cluster API access
- Private network peering

✅ **Network policies**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-cluster
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
```

**3. Secret Management**

✅ **Cluster-specific secrets**
- Don't share secrets across clusters
- Use cloud KMS per region
- Rotate independently

### Observability

**1. Centralized Logging**

✅ **Cluster label in logs**
```json
{
  "cluster": "prod-west",
  "namespace": "app",
  "pod": "api-12345",
  "message": "Request processed"
}
```

✅ **Federated log aggregation**
- Fluentd/Fluent Bit per cluster
- Central Loki or Elasticsearch
- Cluster-based retention policies

**2. Distributed Tracing**

✅ **Trace across clusters**
- Use OpenTelemetry
- Propagate trace context across cluster boundaries
- Jaeger/Tempo with multi-cluster support

**3. Cost Monitoring**

✅ **Per-cluster cost tracking**
- Use OpenCost with cluster labels
- Track cross-cluster data transfer costs
- Alert on anomalies

---

## Common Pitfalls

### Pitfall 1: Tight Coupling Between Clusters

**Problem**: Applications in cluster A directly depend on real-time responses from cluster B.

**Why It's Bad**:
- Network latency and failures
- Creates distributed monolith
- Defeats purpose of isolation

**Solution**:
- Use async communication (message queues)
- Implement circuit breakers
- Cache remote data locally

### Pitfall 2: Shared Databases Across Clusters

**Problem**: Multiple clusters writing to the same database.

**Why It's Bad**:
- Database becomes single point of failure
- Performance bottleneck
- Complex transaction management

**Solution**:
- Database per cluster
- Asynchronous replication
- Use managed multi-region databases (Aurora Global, Spanner)

### Pitfall 3: Not Planning for Network Partitions

**Problem**: Assuming clusters can always communicate.

**Why It's Bad**:
- Network failures happen
- Cloud provider outages
- VPN/peering issues

**Solution**:
- Design for eventual consistency
- Implement local fallbacks
- Test partition scenarios regularly

### Pitfall 4: Inconsistent Cluster Versions

**Problem**: Running different Kubernetes versions across clusters.

**Why It's Bad**:
- API incompatibilities
- Different feature sets
- Complex troubleshooting

**Solution**:
- Standardize versions
- Upgrade clusters in lockstep
- Use version compatibility matrix

### Pitfall 5: Forgetting About Data Transfer Costs

**Problem**: Excessive cross-cluster or cross-region traffic.

**Why It's Bad**:
- AWS charges $0.02/GB for cross-AZ
- $0.09/GB for cross-region
- Can add up to thousands per month

**Solution**:
```promql
# Monitor cross-AZ traffic
sum(rate(container_network_transmit_bytes_total[5m])) by (destination_zone)

# Alert on high costs
ALERT HighDataTransferCost
IF sum(rate(istio_tcp_sent_bytes_total{destination_cluster!="source_cluster"}[1h])) * 0.02 > 100
```

### Pitfall 6: Not Testing Failover

**Problem**: Disaster recovery plan never tested.

**Why It's Bad**:
- Fails when actually needed
- Unknown RTO/RPO
- Missing runbooks

**Solution**:
- Monthly failover drills
- Automated failover testing
- Document and improve each time

### Pitfall 7: Centralized Control Plane Outage

**Problem**: Management cluster down takes down all clusters.

**Why It's Bad**:
- Single point of failure
- Can't deploy or manage apps

**Solution**:
- HA management cluster (multi-AZ)
- Backup management cluster
- Clusters should function independently

### Pitfall 8: Over-Engineering for Small Scale

**Problem**: Using multi-cluster for 3 microservices.

**Why It's Bad**:
- Unnecessary complexity
- Higher operational burden
- Not cost-effective

**Solution**:
- Start with single cluster + multi-AZ
- Add clusters when you have clear need
- Consider multi-tenancy first

---

## Production Considerations

### Cluster Sizing

**Management Cluster:**
- CPU: 4-8 cores
- Memory: 16-32 GB
- Nodes: 3-5 (HA)
- Storage: 100-500 GB SSD

**Workload Clusters:**
- Size based on application needs
- Reserve 20% capacity for failures
- Auto-scaling configured

### Disaster Recovery

**Recovery Time Objective (RTO):**
- Active-Active: 0 seconds (instant failover)
- Active-Passive: 5-15 minutes
- Backup restoration: 1-4 hours

**Recovery Point Objective (RPO):**
- Synchronous replication: 0 data loss
- Asynchronous replication: Minutes
- Backup-based: Hours

**DR Testing Schedule:**
- Quarterly full failover tests
- Monthly partial failover drills
- Weekly backup verification

### Cost Optimization

**Cluster Consolidation:**
```
Before: 10 clusters × $500/month = $5,000/month
After: 4 multi-AZ clusters × $800/month = $3,200/month
Savings: $1,800/month (36%)
```

**Workload Placement:**
- Spot instances for non-critical workloads
- Reserved instances for baseline
- Cross-region traffic minimization

**Right-Sizing:**
- Use VPA to recommend resource requests
- Consolidate underutilized clusters
- Archive unused clusters

---

## Checkpoint Questions

1. **What are the three main reasons for adopting multi-cluster architecture?**
   <details>
   <summary>Answer</summary>
   High availability/disaster recovery, compliance/data sovereignty, and isolation/blast radius containment
   </details>

2. **What is the difference between active-active and active-passive multi-cluster patterns?**
   <details>
   <summary>Answer</summary>
   Active-active runs workloads in all clusters simultaneously (load sharing), while active-passive has workloads active in one cluster with standby in another (disaster recovery)
   </details>

3. **What is Karmada's role in multi-cluster management?**
   <details>
   <summary>Answer</summary>
   Karmada orchestrates deployment of resources across multiple clusters with intelligent scheduling, overrides, and propagation policies
   </details>

4. **How does Istio enable cross-cluster service discovery?**
   <details>
   <summary>Answer</summary>
   Through east-west gateways and shared service registries, allowing services in one cluster to discover and communicate with services in another cluster
   </details>

5. **What is the purpose of an ArgoCD ApplicationSet?**
   <details>
   <summary>Answer</summary>
   To automatically generate and manage multiple Applications across clusters from a single template definition
   </details>

6. **Why should you avoid tight coupling between clusters?**
   <details>
   <summary>Answer</summary>
   Network latency, failures, and partitions can break dependencies, creating a distributed monolith that defeats isolation benefits
   </details>

7. **What is the recommended approach for stateful workloads in multi-cluster?**
   <details>
   <summary>Answer</summary>
   Run stateful workloads in a single cluster with managed HA solutions (like RDS Multi-AZ), and replicate asynchronously to other clusters if needed
   </details>

8. **How can you minimize cross-region data transfer costs?**
   <details>
   <summary>Answer</summary>
   Use locality-aware routing, cache data locally, implement asynchronous replication instead of synchronous, and monitor/alert on high transfer volumes
   </details>

9. **What information should be added to logs in a multi-cluster environment?**
   <details>
   <summary>Answer</summary>
   Cluster name/ID as a consistent field in all log entries for filtering and correlation
   </details>

10. **What is the recommended testing frequency for disaster recovery failover?**
    <details>
    <summary>Answer</summary>
    Quarterly full failover tests, monthly partial drills, and weekly backup verification
    </details>

---

## Key Takeaways

🎯 **Multi-Cluster Drivers**
- High availability, compliance, latency, cost optimization, and blast radius isolation
- 30-80% enterprise adoption in 2026
- Average enterprise manages 10-50 clusters

🎯 **Architecture Patterns**
- Active-Active: Load distribution and HA
- Active-Passive: Disaster recovery
- Multi-Region: Low latency for global users
- Hybrid Cloud: Mix of on-prem and cloud
- Edge Computing: Distributed edge locations

🎯 **Management Tools**
- Karmada: Multi-cluster orchestration and scheduling
- ArgoCD ApplicationSets: GitOps across clusters
- Istio Multi-Cluster: Service mesh and discovery
- Prometheus Federation: Centralized observability

🎯 **Network Topology**
- Non-overlapping IP ranges per cluster
- East-west gateways for cross-cluster traffic
- VPN/peering for secure communication
- Service mesh for transparent cross-cluster calls

🎯 **Best Practices**
- Separate management and workload clusters
- Standardize cluster configurations
- Implement locality-aware routing
- Design for eventual consistency
- Test failover regularly

🎯 **Security**
- Cluster-specific RBAC and service accounts
- Encrypt cross-cluster traffic (mTLS)
- Separate secrets per cluster
- Network policies for isolation

🎯 **Observability**
- Federated metrics with cluster labels
- Centralized logging with cluster context
- Distributed tracing across cluster boundaries
- Cost monitoring per cluster

🎯 **Avoid Common Pitfalls**
- Don't tightly couple clusters
- Don't share databases across clusters
- Don't forget data transfer costs
- Don't skip disaster recovery testing
- Don't over-engineer for small scale

---

## Resources

### Official Documentation
- [Kubernetes Multi-Cluster](https://kubernetes.io/docs/concepts/cluster-administration/federation/) - Official docs
- [Karmada Documentation](https://karmada.io/docs/) - Multi-cluster orchestration
- [ArgoCD ApplicationSet](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/) - Multi-cluster GitOps

### Tools
- [Karmada](https://github.com/karmada-io/karmada) - Multi-cluster orchestration
- [Submariner](https://submariner.io/) - Cross-cluster networking
- [Cilium Cluster Mesh](https://docs.cilium.io/en/stable/network/clustermesh/) - Multi-cluster networking
- [Rancher](https://www.rancher.com/) - Multi-cluster management UI

### Learning Resources
- [CNCF Multi-Tenancy WG](https://github.com/kubernetes-sigs/multi-tenancy) - Best practices
- [Istio Multi-Cluster Guide](https://istio.io/latest/docs/setup/install/multicluster/) - Service mesh multi-cluster
- [Platform9 Multi-Cluster Guide](https://platform9.com/learn/v1.0/kubernetes-multi-cluster) - Practical guide

### Books
- *Managing Kubernetes* by Brendan Burns and Craig Tracey
- *Production Kubernetes* by Josh Rosso et al.

### Blogs and Articles
- [AWS Multi-Cluster Best Practices](https://aws.amazon.com/blogs/containers/multi-cluster-kubernetes-management/)
- [Google Cloud Multi-Cluster Ingress](https://cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-ingress)
- [Azure Arc-enabled Kubernetes](https://learn.microsoft.com/en-us/azure/azure-arc/kubernetes/)

### Community
- [CNCF Slack #multi-cluster](https://cloud-native.slack.com/)
- [KubeCon Multi-Cluster Talks](https://www.youtube.com/c/cloudnativefdn)

---

**Next Module**: [Module 16: Advanced Observability](../Tier-4-Master/Module-16-Advanced-Observability.md)

**Previous Module**: [Module 14: Service Mesh with Istio](../Tier-4-Master/Module-14-Service-Mesh-with-Istio.md)

---

*This module is part of the Kubernetes and Docker Master Course (2026 Edition). Content reflects Kubernetes 1.35, current multi-cluster management tools, and cloud-native best practices.*

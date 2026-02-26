# Module 8: Kubernetes Networking and Services

## Learning Objectives

By the end of this module, you will be able to:

1. Understand the Kubernetes networking model and CNI
2. Configure and use all Service types (ClusterIP, NodePort, LoadBalancer, ExternalName)
3. Implement Ingress controllers (Nginx, Traefik)
4. Use Gateway API (successor to Ingress - 2026 standard)
5. Apply Network Policies for micro-segmentation
6. Configure and troubleshoot DNS in Kubernetes
7. Understand CNI plugins (Calico, Cilium, Flannel)
8. Implement service mesh basics
9. Troubleshoot network connectivity issues
10. Design production-ready networking architectures

## Introduction

Networking is fundamental to Kubernetes. Every pod needs to communicate with other pods, services need stable endpoints, and external users need to access applications. This module covers the complete Kubernetes networking stack, including the new Gateway API that's replacing Ingress in 2026.

## 1. Kubernetes Networking Model

### 1.1 Core Principles

**The Kubernetes networking model requires:**

1. **All pods can communicate** with all other pods without NAT
2. **All nodes can communicate** with all pods without NAT
3. **Pod sees its own IP** as the same IP others see

```
┌─────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                  │
│                                                      │
│  ┌────────────────┐         ┌────────────────┐     │
│  │   Node 1       │         │   Node 2       │     │
│  │                │         │                │     │
│  │  Pod A         │         │  Pod C         │     │
│  │  IP: 10.1.1.2 ◄─────────►  IP: 10.1.2.3  │     │
│  │                │         │                │     │
│  │  Pod B         │         │  Pod D         │     │
│  │  IP: 10.1.1.3 ◄─────────►  IP: 10.1.2.4  │     │
│  │                │         │                │     │
│  └────────────────┘         └────────────────┘     │
│         │                           │               │
│         └───────────┬───────────────┘               │
│                     │                               │
│              Network Plugin (CNI)                   │
└─────────────────────────────────────────────────────┘

All pods can reach each other directly by IP
No NAT required
```

### 1.2 CNI (Container Network Interface)

**CNI plugins implement the networking model:**

```yaml
# Common CNI plugins (2026):

Calico:
  - Network policies (advanced)
  - BGP routing
  - Encryption
  - Best for: Production, network policies

Cilium:
  - eBPF-based (high performance)
  - Advanced security
  - Service mesh features
  - Best for: Large scale, security-focused

Flannel:
  - Simple overlay network
  - Easy to set up
  - Best for: Development, simple deployments

Weave Net:
  - Automatic mesh network
  - Encryption
  - Best for: Hybrid cloud

Canal:
  - Flannel + Calico
  - Simple networking + network policies
```

**Check cluster CNI:**

```bash
# View CNI pods
kubectl get pods -n kube-system | grep -E "calico|cilium|flannel|weave"

# View CNI configuration
ls /etc/cni/net.d/

# Example output:
# 10-calico.conflist
```

### 1.3 Pod Networking

**Pod IP assignment:**

```bash
# Create pod
kubectl run test-pod --image=nginx

# Get pod IP
kubectl get pod test-pod -o wide

# Example output:
# NAME       IP           NODE
# test-pod   10.244.1.5   worker-1

# Test connectivity from another pod
kubectl run debug --rm -it --image=busybox -- sh
# Inside pod:
ping 10.244.1.5  # Direct pod-to-pod communication
wget -O- http://10.244.1.5  # HTTP access
```

**Pod network namespaces:**

```bash
# Each pod has its own network namespace
# Containers in same pod share network namespace

# Multi-container pod
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
  - name: sidecar
    image: busybox
    command: ['sh', '-c', 'while true; do wget -O- localhost:80; sleep 5; done']
```

```bash
# Sidecar accesses nginx via localhost (same network namespace)
kubectl logs multi-container -c sidecar
```

## 2. Services: Complete Guide

### 2.1 Why Services?

**Problem:** Pods are ephemeral, IPs change.

**Solution:** Services provide stable endpoints.

```
Without Service:
  Frontend → Pod IP (10.1.1.2)
  Pod dies, new pod gets IP 10.1.1.5
  Frontend breaks ❌

With Service:
  Frontend → Service (stable DNS: backend.default.svc.cluster.local)
  Service → Pod (10.1.1.2)
  Pod dies, Service routes to new pod (10.1.1.5)
  Frontend continues working ✅
```

### 2.2 ClusterIP Service (Default)

**Internal cluster access only.**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP  # Default type
  selector:
    app: backend   # Matches pods with label app=backend
  ports:
  - protocol: TCP
    port: 80       # Service port
    targetPort: 8080  # Container port
    name: http

  # Optional: Session affinity
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

**How it works:**

```bash
# Create deployment
kubectl create deployment backend --image=nginx --replicas=3

# Expose as ClusterIP service
kubectl expose deployment backend --port=80 --target-port=80

# Service gets a ClusterIP
kubectl get svc backend

# Output:
# NAME      TYPE        CLUSTER-IP      PORT(S)
# backend   ClusterIP   10.96.100.50    80/TCP

# Access from within cluster
kubectl run curl --rm -it --image=curlimages/curl -- sh
# Inside pod:
curl http://10.96.100.50        # Via ClusterIP
curl http://backend             # Via DNS (same namespace)
curl http://backend.default     # Via DNS (full namespace)
curl http://backend.default.svc.cluster.local  # Full DNS
```

**DNS naming:**

```
<service-name>.<namespace>.svc.<cluster-domain>

Examples:
backend.default.svc.cluster.local
api.production.svc.cluster.local
db.staging.svc.cluster.local

Short forms (from same namespace):
backend
backend.default
```

### 2.3 NodePort Service

**Expose on each node's IP at a static port (30000-32767).**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80          # Service port (cluster-internal)
    targetPort: 8080  # Container port
    nodePort: 30080   # Node port (external)
```

**Access patterns:**

```bash
# From outside cluster
curl http://<NODE_IP>:30080

# From inside cluster (all methods work)
curl http://web-nodeport:80
curl http://<CLUSTER_IP>:80
curl http://<NODE_IP>:30080

# Get node IPs
kubectl get nodes -o wide

# Access from any node
curl http://192.168.1.10:30080
curl http://192.168.1.11:30080  # Works from any node
```

**Use cases:**
- Development/testing
- On-premise without load balancer
- Direct node access needed

### 2.4 LoadBalancer Service

**Cloud provider provisions external load balancer.**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-loadbalancer
  annotations:
    # AWS-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-internal: "false"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080

  # Optional: Preserve client source IP
  externalTrafficPolicy: Local  # or Cluster (default)

  # Optional: Load balancer source ranges (security)
  loadBalancerSourceRanges:
  - 203.0.113.0/24
  - 198.51.100.0/24
```

**How it works:**

```bash
# Create service
kubectl apply -f loadbalancer.yaml

# Check status (EXTERNAL-IP pending...)
kubectl get svc web-loadbalancer -w

# Once provisioned:
# NAME               TYPE           EXTERNAL-IP
# web-loadbalancer   LoadBalancer   a1b2c3.elb.amazonaws.com

# Access from internet
curl http://a1b2c3.elb.amazonaws.com
```

**Cloud provider examples:**

```yaml
# AWS (ELB/NLB/ALB)
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."

# GCP (Google Cloud Load Balancing)
metadata:
  annotations:
    cloud.google.com/load-balancer-type: "Internal"

# Azure (Azure Load Balancer)
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

### 2.5 ExternalName Service

**Maps to external DNS name.**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  type: ExternalName
  externalName: database.example.com
  ports:
  - port: 5432
```

**Usage:**

```bash
# Pods access via service name
psql -h external-db.default.svc.cluster.local -p 5432

# Kubernetes creates CNAME:
# external-db.default.svc.cluster.local → database.example.com
```

**Use case:** Gradual migration from external services to in-cluster.

### 2.6 Headless Service

**No ClusterIP allocated, direct pod IPs returned.**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None  # Headless!
  selector:
    app: postgres
  ports:
  - port: 5432
```

**Use with StatefulSets:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless  # References headless service
  replicas: 3
  # ... rest of StatefulSet config
```

**DNS returns individual pod IPs:**

```bash
# Query headless service
nslookup postgres-headless.default.svc.cluster.local

# Returns:
# Name:    postgres-headless.default.svc.cluster.local
# Address: 10.244.1.5  (postgres-0)
# Address: 10.244.2.6  (postgres-1)
# Address: 10.244.3.7  (postgres-2)

# Access specific pod
psql -h postgres-0.postgres-headless.default.svc.cluster.local
```

### 2.7 Endpoints and EndpointSlices

**Endpoints track pod IPs for a service:**

```bash
# View endpoints
kubectl get endpoints backend

# Output:
# NAME      ENDPOINTS
# backend   10.244.1.5:80,10.244.2.6:80,10.244.3.7:80

# Describe for details
kubectl describe endpoints backend
```

**EndpointSlices (scalable - thousands of pods):**

```bash
# View EndpointSlices
kubectl get endpointslices

# Automatically created for services
# Scale better than Endpoints for large deployments
```

**Manual endpoints (external service):**

```yaml
# Service without selector
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  ports:
  - port: 80

---
# Manual endpoints
apiVersion: v1
kind: Endpoints
metadata:
  name: external-api  # Must match service name
subsets:
- addresses:
  - ip: 203.0.113.10
  - ip: 203.0.113.11
  ports:
  - port: 80
```

## 3. Ingress: HTTP/HTTPS Routing

### 3.1 Ingress Overview

**Ingress provides:**
- HTTP/HTTPS routing
- Virtual hosting (multiple domains)
- SSL/TLS termination
- Path-based routing
- Load balancing

```
Internet
   │
   ▼
┌────────────────┐
│  Ingress       │
│  (Routing)     │
└────┬───────┬───┘
     │       │
     ▼       ▼
┌─────────┐ ┌─────────┐
│Service A│ │Service B│
└─────────┘ └─────────┘
```

### 3.2 Install Nginx Ingress Controller

```bash
# Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Verify installation
kubectl get pods -n ingress-nginx

# Get ingress controller service
kubectl get svc -n ingress-nginx

# Should see LoadBalancer with external IP
```

### 3.3 Basic Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### 3.4 Multiple Hosts (Virtual Hosting)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
spec:
  ingressClassName: nginx
  rules:
  # First host
  - host: app1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1-service
            port:
              number: 80

  # Second host
  - host: app2.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2-service
            port:
              number: 80
```

### 3.5 Path-Based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-based-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: example.com
    http:
      paths:
      # API routes to API service
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 3000

      # Admin routes to admin service
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 8080

      # Everything else to frontend
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### 3.6 TLS/SSL Termination

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    - www.example.com
    secretName: tls-secret
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### 3.7 Cert-Manager for Automatic Certificates

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Create ClusterIssuer
```

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

```yaml
# Ingress with cert-manager
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auto-tls-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    secretName: example-tls  # Automatically created!
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## 4. Gateway API (2026 Standard)

### 4.1 Why Gateway API?

**Ingress limitations:**
- Limited to HTTP/HTTPS
- Lacks role separation (platform vs app teams)
- Extension via annotations (inconsistent)

**Gateway API advantages:**
- Role-oriented design (GatewayClass, Gateway, HTTPRoute)
- Protocol-agnostic (HTTP, HTTPS, TCP, UDP, gRPC)
- Vendor-neutral
- Expressive routing
- Better RBAC separation

### 4.2 Gateway API Architecture

```
┌─────────────────────────────────────────────────────┐
│  Platform Team                                      │
│  ┌──────────────┐         ┌─────────────┐          │
│  │GatewayClass  │────────►│  Gateway    │          │
│  │(Infrastructure)        │ (Load Balancer)        │
│  └──────────────┘         └─────────────┘          │
└────────────────────────────────┬────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────┐
│  Application Team                                   │
│  ┌──────────────┐         ┌─────────────┐          │
│  │  HTTPRoute   │────────►│  Service    │          │
│  │  (Routing)   │         │             │          │
│  └──────────────┘         └─────────────┘          │
└─────────────────────────────────────────────────────┘
```

### 4.3 Install Gateway API

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Install a Gateway controller (e.g., Nginx Gateway Fabric)
kubectl apply -f https://github.com/nginxinc/nginx-gateway-fabric/releases/latest/download/crds.yaml
kubectl apply -f https://github.com/nginxinc/nginx-gateway-fabric/releases/latest/download/nginx-gateway.yaml
```

### 4.4 GatewayClass and Gateway

```yaml
# GatewayClass (created by platform team)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: nginx.org/nginx-gateway-controller

---
# Gateway (created by platform team)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: prod-gateway
  namespace: default
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    protocol: HTTP
    port: 80
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: example-tls
```

### 4.5 HTTPRoute

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-route
spec:
  parentRefs:
  - name: prod-gateway

  hostnames:
  - example.com

  rules:
  # API routing
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 3000

  # Frontend routing
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-service
      port: 80
```

### 4.6 Advanced Routing

**Header-based routing:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-route
spec:
  parentRefs:
  - name: prod-gateway
  rules:
  - matches:
    - headers:
      - name: X-Version
        value: v2
    backendRefs:
    - name: app-v2
      port: 80
  - backendRefs:
    - name: app-v1
      port: 80
```

**Traffic splitting (canary):**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
spec:
  parentRefs:
  - name: prod-gateway
  rules:
  - backendRefs:
    - name: app-v1
      port: 80
      weight: 90  # 90% traffic
    - name: app-v2
      port: 80
      weight: 10  # 10% traffic (canary)
```

## 5. Network Policies

### 5.1 Default Behavior

**Without NetworkPolicy:** All pods can communicate with all pods.

**With NetworkPolicy:** Deny by default, allow explicitly.

### 5.2 Deny All Traffic

```yaml
# Deny all ingress (incoming)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}  # Applies to all pods
  policyTypes:
  - Ingress

---
# Deny all egress (outgoing)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### 5.3 Allow Specific Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  # Apply to backend pods
  podSelector:
    matchLabels:
      app: backend

  policyTypes:
  - Ingress

  ingress:
  # Allow from frontend pods
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

### 5.4 Multi-Tier Application

```yaml
# Database: Only accept from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 5432

---
# Backend: Accept from frontend, connect to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53

---
# Frontend: Accept from ingress, connect to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 8080
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

### 5.5 Namespace Isolation

```yaml
# Only allow traffic from same namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: namespace-isolation
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}  # All pods in same namespace
```

**Cross-namespace communication:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-monitoring
spec:
  podSelector:
    matchLabels:
      app: myapp
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090  # Prometheus scraping
```

## 6. DNS in Kubernetes

### 6.1 CoreDNS

**CoreDNS provides cluster DNS:**

```bash
# View CoreDNS pods
kubectl get pods -n kube-system | grep coredns

# View CoreDNS config
kubectl get configmap coredns -n kube-system -o yaml
```

### 6.2 DNS Names

**Service DNS:**

```bash
# Format:
<service-name>.<namespace>.svc.<cluster-domain>

# Examples:
backend.default.svc.cluster.local     # Full
backend.default.svc                   # Without domain
backend.default                        # Without svc
backend                                # Same namespace only

# Short names work from same namespace:
kubectl run test -it --rm --image=busybox -- sh
# Inside pod in default namespace:
ping backend           # ✅ Works
ping backend.default   # ✅ Works
ping backend.production  # ✅ Works (cross-namespace)
```

**Pod DNS:**

```bash
# Format:
<pod-ip-with-dashes>.<namespace>.pod.<cluster-domain>

# Example for pod with IP 10.244.1.5:
10-244-1-5.default.pod.cluster.local
```

### 6.3 Custom DNS

```yaml
# Pod-level DNS config
apiVersion: v1
kind: Pod
metadata:
  name: custom-dns
spec:
  dnsPolicy: "None"  # Don't use cluster DNS
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 8.8.4.4
    searches:
    - example.com
    options:
    - name: ndots
      value: "2"
  containers:
  - name: test
    image: busybox
    command: ['sleep', '3600']
```

### 6.4 DNS Troubleshooting

```bash
# Test DNS resolution
kubectl run dnsutils --rm -it --image=tutum/dnsutils -- sh

# Inside pod:
nslookup kubernetes.default
dig backend.default.svc.cluster.local
host backend

# Check /etc/resolv.conf
cat /etc/resolv.conf

# Expected output:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

## 7. Hands-On Labs

### Lab 1: Service Types

```bash
# Create deployment
kubectl create deployment web --image=nginx --replicas=3

# Expose as ClusterIP
kubectl expose deployment web --port=80 --name=web-clusterip

# Test from inside cluster
kubectl run curl --rm -it --image=curlimages/curl -- curl http://web-clusterip

# Expose as NodePort
kubectl expose deployment web --type=NodePort --port=80 --name=web-nodeport

# Get NodePort
kubectl get svc web-nodeport

# Access from outside (replace NODE_IP and NODE_PORT)
curl http://<NODE_IP>:<NODE_PORT>

# Expose as LoadBalancer (cloud only)
kubectl expose deployment web --type=LoadBalancer --port=80 --name=web-lb

# Wait for external IP
kubectl get svc web-lb -w

# Clean up
kubectl delete deployment web
kubectl delete svc web-clusterip web-nodeport web-lb
```

### Lab 2: Ingress Setup

```yaml
# Create two deployments
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app1
  template:
    metadata:
      labels:
        app: app1
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: app1-html

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app1-html
data:
  index.html: |
    <h1>App 1</h1>

---
apiVersion: v1
kind: Service
metadata:
  name: app1-service
spec:
  selector:
    app: app1
  ports:
  - port: 80

---
# Similar for app2...

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: app1.example.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1-service
            port:
              number: 80
  - host: app2.example.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2-service
            port:
              number: 80
```

```bash
# Apply
kubectl apply -f ingress-lab.yaml

# Get ingress IP
kubectl get ingress

# Add to /etc/hosts
# <INGRESS_IP> app1.example.local app2.example.local

# Test
curl http://app1.example.local
curl http://app2.example.local
```

### Lab 3: Network Policies

```yaml
# Create three-tier app
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      tier: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:alpine

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
        app: backend
        tier: backend
  template:
    metadata:
      labels:
        app: backend
        tier: backend
    spec:
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - containerPort: 80

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
      tier: database
  template:
    metadata:
      labels:
        app: database
        tier: database
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_PASSWORD
          value: secret

---
# Network policy: database only accepts from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432
```

```bash
# Apply
kubectl apply -f network-policy-lab.yaml

# Test connectivity
# Frontend → Backend (should work)
kubectl exec -it deployment/frontend -- wget -O- backend

# Frontend → Database (should fail)
kubectl exec -it deployment/frontend -- nc -zv database 5432

# Backend → Database (should work)
kubectl exec -it deployment/backend -- nc -zv database 5432
```

## Best Practices

### Services
✅ Use meaningful service names (DNS names)
✅ Always define targetPort explicitly
✅ Use ClusterIP for internal services
✅ Use LoadBalancer sparingly (costs money)
✅ Implement health checks for readiness

### Ingress/Gateway API
✅ Use Gateway API for new deployments (2026 standard)
✅ Implement TLS for all external services
✅ Use cert-manager for automatic certificates
✅ Set resource limits on ingress controllers
✅ Monitor ingress controller metrics

### Network Policies
✅ Start with deny-all, allow explicitly
✅ Document network policies
✅ Test policies in non-production first
✅ Allow DNS traffic (UDP 53 to kube-system)
✅ Use namespace labels for isolation

## Common Pitfalls

❌ **No network policies** → All pods can communicate
✅ Implement default deny policies

❌ **Hardcoded IPs** → Breaks when pods restart
✅ Use service DNS names

❌ **Missing readiness probes** → Traffic to unready pods
✅ Always implement readiness probes

❌ **Network policy blocks DNS** → Apps can't resolve names
✅ Always allow DNS (UDP 53)

## Checkpoint

1. **Create** a ClusterIP service and access it from another pod
2. **Set up** Ingress with multiple hosts and TLS
3. **Implement** Network Policy for three-tier application
4. **Migrate** an Ingress to Gateway API
5. **Troubleshoot** DNS resolution issues

## Key Takeaways

1. **Services** provide stable endpoints for pods
2. **Ingress** routes HTTP/HTTPS traffic to services
3. **Gateway API** is the modern replacement for Ingress (2026)
4. **Network Policies** implement micro-segmentation
5. **DNS** enables service discovery
6. **CNI plugins** implement the Kubernetes network model

## Resources

- [Kubernetes Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Gateway API](https://gateway-api.sigs.k8s.io/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [CoreDNS](https://coredns.io/)

---

**Next Module:** [Module 9: Kubernetes Storage](../Tier-3-Advanced/Module-09-Kubernetes-Storage.md)

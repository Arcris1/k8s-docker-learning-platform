# Module 7: Kubernetes Workloads

## Learning Objectives

By the end of this module, you will be able to:

1. Master Deployments, ReplicaSets, and replica management
2. Understand and implement StatefulSets for stateful applications
3. Use DaemonSets for node-level services
4. Implement Jobs and CronJobs for batch processing
5. Configure Horizontal Pod Autoscaling (HPA)
6. Use Vertical Pod Autoscaling (VPA) - stable in Kubernetes 1.35
7. Implement rolling updates and rollback strategies
8. Set resource requests and limits effectively
9. Configure Pod Disruption Budgets for high availability
10. Understand Quality of Service (QoS) classes

## Introduction

Kubernetes workloads represent the different ways to run applications on the platform. Understanding when and how to use each workload type is fundamental to building production-ready systems. This module covers all major workload types with a focus on 2026 features including stable Vertical Pod Autoscaling in Kubernetes 1.35.

## 1. Deployments: Deep Dive

### 1.1 Deployment Architecture

**Deployment → ReplicaSet → Pods**

```
┌─────────────────────────────────────────┐
│           Deployment                    │
│  - Desired state: 3 replicas            │
│  - Update strategy: RollingUpdate       │
│  - Image: myapp:v2                      │
└──────────────┬──────────────────────────┘
               │
               │ manages
               ▼
┌─────────────────────────────────────────┐
│         ReplicaSet (v2)                 │
│  - Current replicas: 3                  │
│  - Pod template: myapp:v2               │
└──────────────┬──────────────────────────┘
               │
               │ creates/manages
               ▼
┌────────┐  ┌────────┐  ┌────────┐
│ Pod v2 │  │ Pod v2 │  │ Pod v2 │
└────────┘  └────────┘  └────────┘
```

### 1.2 Complete Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  labels:
    app: web
    tier: frontend
    version: v1
  annotations:
    kubernetes.io/change-cause: "Update to version 1.2.3"
spec:
  # Number of desired pods
  replicas: 5

  # How to select pods this deployment manages
  selector:
    matchLabels:
      app: web
      tier: frontend

  # Update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max pods above desired count during update
      maxUnavailable: 0  # Max pods unavailable during update

  # Minimum ready time (helps prevent bad deployments)
  minReadySeconds: 10

  # Revision history limit
  revisionHistoryLimit: 10

  # How long to wait before considering deployment failed
  progressDeadlineSeconds: 600

  # Pod template
  template:
    metadata:
      labels:
        app: web
        tier: frontend
        version: v1.2.3
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      # Service account
      serviceAccountName: web-app-sa

      # Security context for all containers
      securityContext:
        runAsNonRoot: true
        fsGroup: 1000

      # Init containers (run before main containers)
      initContainers:
      - name: migration
        image: web-app:1.2.3
        command: ['npm', 'run', 'migrate']
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url

      # Main containers
      containers:
      - name: web
        image: web-app:1.2.3
        imagePullPolicy: IfNotPresent

        ports:
        - name: http
          containerPort: 8080
          protocol: TCP

        # Environment variables
        env:
        - name: PORT
          value: "8080"
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url

        # Resource requests and limits
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi

        # Liveness probe (restart if fails)
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe (remove from service if fails)
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3

        # Startup probe (for slow-starting apps)
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 30  # 5 minutes max startup time

        # Volume mounts
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: cache
          mountPath: /app/cache

        # Security context (container level)
        securityContext:
          runAsUser: 1000
          runAsGroup: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

      # Volumes
      volumes:
      - name: config
        configMap:
          name: web-app-config
      - name: cache
        emptyDir:
          sizeLimit: 1Gi

      # Pod scheduling
      affinity:
        # Prefer different nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: kubernetes.io/hostname

      # Tolerations (allow scheduling on tainted nodes)
      tolerations:
      - key: "node-role.kubernetes.io/web"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"

      # Termination grace period
      terminationGracePeriodSeconds: 30
```

### 1.3 Deployment Management Commands

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Get deployments
kubectl get deployments
kubectl get deploy web-app -o wide

# Describe deployment
kubectl describe deployment web-app

# View deployment status
kubectl rollout status deployment/web-app

# Scale deployment
kubectl scale deployment web-app --replicas=10

# Update image (triggers rolling update)
kubectl set image deployment/web-app web=web-app:1.3.0

# Pause rollout (useful for troubleshooting)
kubectl rollout pause deployment/web-app

# Resume rollout
kubectl rollout resume deployment/web-app

# View rollout history
kubectl rollout history deployment/web-app

# View specific revision
kubectl rollout history deployment/web-app --revision=2

# Rollback to previous version
kubectl rollout undo deployment/web-app

# Rollback to specific revision
kubectl rollout undo deployment/web-app --to-revision=2

# Restart deployment (recreate all pods)
kubectl rollout restart deployment/web-app

# Delete deployment
kubectl delete deployment web-app
```

### 1.4 Update Strategies

**RollingUpdate (Default):**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%       # Can be number or percentage
    maxUnavailable: 25%
```

**Zero-downtime deployment:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0  # Never allow pods to be unavailable
```

**Fast rollout:**
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 100%      # Double capacity temporarily
    maxUnavailable: 0
```

**Recreate (downtime acceptable):**
```yaml
strategy:
  type: Recreate  # Terminate all old pods, then create new ones
```

### 1.5 ReplicaSets

**Understanding ReplicaSets:**

Deployments create and manage ReplicaSets automatically. You rarely create ReplicaSets directly.

```bash
# View ReplicaSets
kubectl get replicasets
kubectl get rs

# Example output:
# NAME              DESIRED   CURRENT   READY   AGE
# web-app-5d4f8     5         5         5       10m
# web-app-7c9b2     0         0         0       1h  (old version)

# Describe ReplicaSet
kubectl describe rs web-app-5d4f8

# Delete old ReplicaSets (manual cleanup)
kubectl delete rs web-app-7c9b2
```

**Why Deployments create new ReplicaSets:**

```
Initial deployment (v1):
  Deployment → ReplicaSet-v1 (3 replicas) → 3 Pods

Update to v2:
  Deployment → ReplicaSet-v2 (3 replicas) → 3 new Pods
            → ReplicaSet-v1 (0 replicas) → old pods terminated

Rollback to v1:
  Deployment → ReplicaSet-v1 (3 replicas) → 3 Pods (fast!)
            → ReplicaSet-v2 (0 replicas)
```

## 2. StatefulSets: Stateful Applications

### 2.1 When to Use StatefulSets

**Use StatefulSets when you need:**
- Stable, unique network identifiers
- Stable, persistent storage
- Ordered, graceful deployment and scaling
- Ordered, automated rolling updates

**Examples:**
- Databases (PostgreSQL, MySQL, MongoDB)
- Distributed systems (Kafka, ZooKeeper, Elasticsearch)
- Applications requiring stable hostnames

### 2.2 StatefulSet vs Deployment

| Feature | Deployment | StatefulSet |
|---------|------------|-------------|
| **Pod Names** | Random (web-abc123) | Ordered (web-0, web-1, web-2) |
| **Network Identity** | Unstable | Stable (web-0.service.namespace.svc) |
| **Storage** | Shared or none | Per-pod persistent volumes |
| **Scaling** | Parallel | Ordered (one at a time) |
| **Updates** | Parallel rolling | Ordered rolling |
| **Use Case** | Stateless apps | Stateful apps |

### 2.3 Complete StatefulSet Example

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  # Headless service (no ClusterIP)
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    name: postgres

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres  # Matches headless service above
  replicas: 3

  selector:
    matchLabels:
      app: postgres

  # Update strategy
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0  # Update pods with ordinal >= partition

  # Pod management policy
  podManagementPolicy: OrderedReady  # or Parallel

  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres

        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name

        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi

        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5

  # Volume claim templates (creates PVC per pod)
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

**Pod naming:**
```bash
# Pods created in order:
postgres-0  # Created first, waits until Running
postgres-1  # Created after postgres-0 is Running
postgres-2  # Created after postgres-1 is Running

# Stable DNS names:
postgres-0.postgres.default.svc.cluster.local
postgres-1.postgres.default.svc.cluster.local
postgres-2.postgres.default.svc.cluster.local
```

**Storage:**
```bash
# Each pod gets its own PVC:
data-postgres-0  → 10Gi volume
data-postgres-1  → 10Gi volume
data-postgres-2  → 10Gi volume

# If pod is deleted, PVC remains!
kubectl delete pod postgres-1
# New postgres-1 pod uses same PVC (data persists)
```

### 2.4 StatefulSet Operations

```bash
# Create StatefulSet
kubectl apply -f statefulset.yaml

# Watch creation (ordered)
kubectl get pods -w

# Scale up (adds postgres-3, postgres-4...)
kubectl scale statefulset postgres --replicas=5

# Scale down (removes in reverse order: postgres-4, postgres-3...)
kubectl scale statefulset postgres --replicas=3

# Update (rolling update in order)
kubectl set image statefulset/postgres postgres=postgres:16.1-alpine

# Partition update (canary pattern)
kubectl patch statefulset postgres -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
# Only pods with ordinal >= 2 will be updated

# Delete StatefulSet (keep pods)
kubectl delete statefulset postgres --cascade=orphan

# Delete StatefulSet and pods (PVCs remain!)
kubectl delete statefulset postgres

# Delete everything including PVCs
kubectl delete statefulset postgres
kubectl delete pvc -l app=postgres
```

## 3. DaemonSets: Node-Level Services

### 3.1 DaemonSet Use Cases

**Run exactly one pod per node:**
- Log collectors (Fluent Bit, Fluentd)
- Monitoring agents (Node Exporter, Datadog agent)
- Network plugins (Calico, Cilium)
- Storage daemons (Ceph, GlusterFS)
- Security agents (Falco)

### 3.2 DaemonSet Example

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter

  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1

  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      # Host network for metrics collection
      hostNetwork: true
      hostPID: true

      # Tolerations to run on all nodes (including control plane)
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
      - effect: NoSchedule
        key: node-role.kubernetes.io/master

      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)

        ports:
        - name: metrics
          containerPort: 9100
          hostPort: 9100

        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true

        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi

        securityContext:
          runAsNonRoot: true
          runAsUser: 65534

      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
```

### 3.3 Node Selection

**Run on specific nodes:**

```yaml
spec:
  template:
    spec:
      # Node selector
      nodeSelector:
        disktype: ssd

      # Or use affinity
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/worker
                operator: Exists
```

## 4. Jobs and CronJobs

### 4.1 Jobs: One-Time Tasks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-backup
spec:
  # How many successful completions needed
  completions: 1

  # How many pods to run in parallel
  parallelism: 1

  # Retry policy
  backoffLimit: 3

  # Timeout
  activeDeadlineSeconds: 600  # 10 minutes

  # Clean up finished pods
  ttlSecondsAfterFinished: 86400  # 24 hours

  template:
    metadata:
      labels:
        job: database-backup
    spec:
      restartPolicy: OnFailure  # or Never

      containers:
      - name: backup
        image: postgres:16-alpine
        command:
        - sh
        - -c
        - |
          pg_dump -h postgres -U postgres mydb > /backup/backup-$(date +%Y%m%d-%H%M%S).sql

        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password

        volumeMounts:
        - name: backup
          mountPath: /backup

      volumes:
      - name: backup
        persistentVolumeClaim:
          claimName: backup-pvc
```

**Parallel jobs:**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: parallel-job
spec:
  completions: 10      # Need 10 successful completions
  parallelism: 3       # Run 3 pods at a time
  template:
    spec:
      containers:
      - name: worker
        image: worker:latest
      restartPolicy: OnFailure
```

### 4.2 CronJobs: Scheduled Tasks

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  # Schedule (cron format)
  schedule: "0 2 * * *"  # Every day at 2 AM

  # Timezone (Kubernetes 1.27+)
  timeZone: "America/New_York"

  # Job history
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1

  # Concurrency policy
  concurrencyPolicy: Forbid  # or Allow, Replace

  # Start deadline
  startingDeadlineSeconds: 300

  # Suspend (pause scheduling)
  suspend: false

  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool:latest
            command:
            - /bin/sh
            - -c
            - |
              echo "Starting backup at $(date)"
              perform-backup.sh
              echo "Backup completed at $(date)"
          restartPolicy: OnFailure
```

**Cron schedule examples:**

```bash
"*/5 * * * *"      # Every 5 minutes
"0 * * * *"        # Every hour
"0 0 * * *"        # Every day at midnight
"0 2 * * *"        # Every day at 2 AM
"0 0 * * 0"        # Every Sunday at midnight
"0 0 1 * *"        # First day of every month
"0 0 1 1 *"        # January 1st every year
"0 9-17 * * 1-5"   # Every hour from 9 AM to 5 PM, Monday-Friday
```

## 5. Horizontal Pod Autoscaling (HPA)

### 5.1 HPA Overview

**Automatically scale pods based on metrics:**
- CPU utilization
- Memory utilization
- Custom metrics (requests per second, queue length, etc.)

**Requirements:**
- Metrics Server installed
- Resource requests defined on pods

### 5.2 Install Metrics Server

```bash
# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system

# Test metrics
kubectl top nodes
kubectl top pods
```

### 5.3 CPU-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app

  minReplicas: 2
  maxReplicas: 10

  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Target 70% CPU

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 50           # Scale down max 50% of pods
        periodSeconds: 60   # Per minute
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100          # Double pods
        periodSeconds: 15   # Every 15 seconds
      - type: Pods
        value: 4            # Or add 4 pods
        periodSeconds: 15
      selectPolicy: Max     # Use policy that scales faster
```

**Create HPA via kubectl:**

```bash
# Simple CPU-based HPA
kubectl autoscale deployment web-app --cpu-percent=70 --min=2 --max=10

# View HPA
kubectl get hpa

# Describe HPA
kubectl describe hpa web-app-hpa

# Delete HPA
kubectl delete hpa web-app-hpa
```

### 5.4 Memory-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 5.5 Multiple Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  # CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

  # Memory metric
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

  # Custom metric (requires adapter)
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

## 6. Vertical Pod Autoscaling (VPA) - Kubernetes 1.35

### 6.1 VPA Overview

**NEW in 2026:** VPA graduated to stable in Kubernetes 1.35!

**VPA automatically adjusts:**
- CPU requests and limits
- Memory requests and limits

**Benefits:**
- Right-size resources automatically
- Reduce over-provisioning (save money)
- Prevent OOM kills

### 6.2 Install VPA

```bash
# Clone VPA repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install VPA
./hack/vpa-up.sh

# Verify installation
kubectl get pods -n kube-system | grep vpa
```

### 6.3 VPA Example

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app

  # Update mode
  updatePolicy:
    updateMode: "Auto"  # or "Off", "Initial", "Recreate"

  # Resource policy
  resourcePolicy:
    containerPolicies:
    - containerName: web
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
      controlledResources:
      - cpu
      - memory
```

**Update modes:**

```yaml
# Off: Only provide recommendations
updateMode: "Off"

# Initial: Set resources on pod creation only
updateMode: "Initial"

# Recreate: Update by recreating pods (downtime)
updateMode: "Recreate"

# Auto: Update pods in-place (no restart) - K8s 1.35+
updateMode: "Auto"
```

**View VPA recommendations:**

```bash
# Get VPA
kubectl get vpa

# Describe VPA (see recommendations)
kubectl describe vpa web-app-vpa

# Output includes:
# Recommendation:
#   Container Recommendations:
#     Container Name: web
#     Lower Bound:
#       Cpu:     150m
#       Memory:  200Mi
#     Target:
#       Cpu:     250m
#       Memory:  400Mi
#     Upper Bound:
#       Cpu:     500m
#       Memory:  800Mi
```

### 6.4 HPA vs VPA

| Feature | HPA | VPA |
|---------|-----|-----|
| **What it scales** | Number of pods | Resource requests/limits |
| **Direction** | Horizontal (more pods) | Vertical (bigger pods) |
| **Best for** | Stateless workloads | Stateful workloads, databases |
| **Restart required** | No | Yes (except Auto mode) |
| **Use together** | ⚠️ Not on same metric | ✅ Can use together carefully |

**Using HPA and VPA together:**

```yaml
# HPA on custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"

---
# VPA on CPU/memory
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: web
      controlledResources:
      - cpu
      - memory
```

## 7. Resource Management

### 7.1 Requests vs Limits

```yaml
resources:
  requests:    # Guaranteed resources
    cpu: 100m
    memory: 128Mi
  limits:      # Maximum resources
    cpu: 500m
    memory: 512Mi
```

**How they work:**

```
Requests:
- Used for scheduling (node must have available)
- Pod gets this much CPU time guaranteed
- Pod can use more if available

Limits:
- Maximum pod can use
- CPU: Throttled if exceeded
- Memory: OOM killed if exceeded
```

### 7.2 QoS Classes

Kubernetes assigns QoS class based on requests/limits:

**1. Guaranteed (highest priority):**

```yaml
# Requests == Limits for all containers
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**2. Burstable (medium priority):**

```yaml
# Requests < Limits, or only requests specified
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**3. BestEffort (lowest priority):**

```yaml
# No requests or limits specified
# Can use any available resources
# First to be evicted under pressure
```

**Check QoS class:**

```bash
kubectl get pod my-pod -o jsonpath='{.status.qosClass}'
```

### 7.3 Resource Units

**CPU:**

```yaml
cpu: 1      # 1 CPU core
cpu: 1000m  # 1000 millicores = 1 CPU
cpu: 100m   # 0.1 CPU (10%)
cpu: 0.5    # 0.5 CPU (50%)
```

**Memory:**

```yaml
memory: 128Mi   # 128 Mebibytes (binary)
memory: 128M    # 128 Megabytes (decimal)
memory: 1Gi     # 1 Gibibyte
memory: 1G      # 1 Gigabyte

# Prefer Mi/Gi (binary) for consistency
```

## 8. Pod Disruption Budgets

### 8.1 PDB Overview

**Ensure minimum availability during:**
- Node drains (maintenance)
- Cluster upgrades
- Voluntary evictions

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  selector:
    matchLabels:
      app: web

  # Option 1: Min available
  minAvailable: 2

  # Option 2: Min available (percentage)
  # minAvailable: 50%

  # Option 3: Max unavailable
  # maxUnavailable: 1

  # Option 4: Max unavailable (percentage)
  # maxUnavailable: 25%
```

**Example scenarios:**

```yaml
# Always keep 2 pods running
minAvailable: 2

# Keep 75% of pods running
minAvailable: 75%

# Allow max 1 pod to be down
maxUnavailable: 1

# Allow max 25% to be down
maxUnavailable: 25%
```

## 9. Hands-On Labs

### Lab 1: Deployment with Rolling Update

```yaml
# Create deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 5
  selector:
    matchLabels:
      app: nginx
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
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
```

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Watch pods
kubectl get pods -w

# Update image (trigger rolling update)
kubectl set image deployment/nginx-deployment nginx=nginx:1.26-alpine

# Watch update
kubectl rollout status deployment/nginx-deployment

# View history
kubectl rollout history deployment/nginx-deployment

# Rollback
kubectl rollout undo deployment/nginx-deployment
```

### Lab 2: StatefulSet for PostgreSQL

```yaml
# Complete example in section 2.3
# Then test:

# Create StatefulSet
kubectl apply -f postgres-statefulset.yaml

# Watch ordered creation
kubectl get pods -w

# Connect to postgres-0
kubectl exec -it postgres-0 -- psql -U postgres

# Create database
CREATE DATABASE testdb;
\l

# Exit and delete pod
exit
kubectl delete pod postgres-0

# New pod created with same name
# Data persists!
kubectl exec -it postgres-0 -- psql -U postgres
\l  # testdb still exists
```

### Lab 3: CronJob for Backups

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes (for testing)
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: alpine:latest
            command:
            - /bin/sh
            - -c
            - |
              echo "Backup started at $(date)"
              echo "Backup completed at $(date)"
          restartPolicy: OnFailure
```

```bash
# Create CronJob
kubectl apply -f backup-cronjob.yaml

# Watch jobs being created
kubectl get jobs -w

# View CronJob
kubectl get cronjob

# View job logs
kubectl logs -l job-name=backup-job-<timestamp>

# Trigger manual run
kubectl create job --from=cronjob/backup-job manual-backup

# Delete CronJob
kubectl delete cronjob backup-job
```

### Lab 4: HPA in Action

```yaml
# php-apache.yaml (test app)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: php-apache
spec:
  replicas: 1
  selector:
    matchLabels:
      app: php-apache
  template:
    metadata:
      labels:
        app: php-apache
    spec:
      containers:
      - name: php-apache
        image: registry.k8s.io/hpa-example
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 200m
          limits:
            cpu: 500m
---
apiVersion: v1
kind: Service
metadata:
  name: php-apache
spec:
  selector:
    app: php-apache
  ports:
  - port: 80
```

```bash
# Create deployment and service
kubectl apply -f php-apache.yaml

# Create HPA
kubectl autoscale deployment php-apache --cpu-percent=50 --min=1 --max=10

# Generate load
kubectl run -it --rm load-generator --image=busybox -- /bin/sh
# Inside pod:
while true; do wget -q -O- http://php-apache; done

# Watch HPA (in another terminal)
kubectl get hpa -w

# Watch pods scale up
kubectl get pods -w

# Stop load generator (Ctrl+C)
# Watch pods scale down after 5 minutes
```

## 10. Best Practices

### Deployments
✅ Always set resource requests and limits
✅ Use readiness probes for zero-downtime deployments
✅ Set `minReadySeconds` to verify deployment health
✅ Use `maxUnavailable: 0` for critical services
✅ Annotate rollouts with `change-cause`
✅ Keep revision history (`revisionHistoryLimit: 10`)

### StatefulSets
✅ Use headless services for stable DNS
✅ Always define `volumeClaimTemplates`
✅ Set appropriate `podManagementPolicy`
✅ Plan for ordered scaling (StatefulSets scale slowly)
✅ Back up PVCs regularly

### Resource Management
✅ Set requests based on actual usage (use VPA recommendations)
✅ Set limits 1.5-2x requests for burstable workloads
✅ Use Guaranteed QoS for critical workloads
✅ Monitor actual resource usage and adjust

### Autoscaling
✅ Use HPA for stateless workloads
✅ Use VPA for right-sizing resources
✅ Set realistic min/max replicas
✅ Configure scale-down stabilization
✅ Don't HPA and VPA on same metric

## 11. Common Pitfalls

❌ **No resource requests** → Pods scheduled anywhere, unpredictable performance
✅ Always set resource requests

❌ **Limits without requests** → Can't schedule pods properly
✅ Set requests first, then limits

❌ **No readiness probes** → Traffic sent to unready pods
✅ Always use readiness probes

❌ **StatefulSet with Recreate strategy** → Defeats purpose
✅ Use RollingUpdate for StatefulSets

❌ **HPA without requests** → HPA can't calculate utilization
✅ Set CPU/memory requests for HPA

## Checkpoint

1. **Explain** when to use Deployment vs StatefulSet vs DaemonSet
2. **Create** a Deployment with zero-downtime rolling update
3. **Implement** HPA based on CPU with min 2, max 10 replicas
4. **Configure** VPA in Auto mode for a Deployment
5. **Set up** PodDisruptionBudget ensuring 75% availability

## Key Takeaways

1. **Deployments** manage stateless applications with rolling updates
2. **StatefulSets** provide stable identities and storage for stateful apps
3. **DaemonSets** run one pod per node for system services
4. **Jobs/CronJobs** handle batch and scheduled tasks
5. **HPA** scales pods horizontally based on metrics
6. **VPA** (stable in 1.35) automatically right-sizes resources
7. **Resource requests/limits** enable proper scheduling and QoS
8. **PodDisruptionBudgets** ensure availability during disruptions

## Resources

- [Kubernetes Workloads](https://kubernetes.io/docs/concepts/workloads/)
- [HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [VPA Documentation](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [StatefulSet Basics](https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/)

---

**Next Module:** [Module 8: Kubernetes Networking and Services](Module-08-Kubernetes-Networking-and-Services.md)

# Module 16: Advanced Observability

## Learning Objectives

By the end of this module, you will be able to:

- Design comprehensive observability strategies for cloud-native applications
- Implement eBPF-based observability with Pixie and Cilium Hubble
- Configure advanced distributed tracing with OpenTelemetry and Tempo
- Deploy and optimize Grafana Mimir for long-term metrics storage
- Implement continuous profiling with Parca and Pyroscope
- Configure service-level objectives (SLOs) and error budgets
- Deploy cost monitoring and optimization with OpenCost
- Implement chaos engineering with Chaos Mesh for resilience testing
- Build custom observability dashboards with Grafana
- Integrate AI-powered anomaly detection and incident response
- Design observability for multi-cluster and edge deployments

**Time Estimate**: 9-10 hours

**Prerequisites**:
- Completed Modules 1-15
- Strong understanding of Prometheus and Grafana
- Familiarity with distributed systems
- Experience with Kubernetes monitoring
- Understanding of performance profiling concepts

---

## Introduction

### The Three Pillars of Observability

**Traditional Observability (2020):**

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Metrics   │  │    Logs     │  │   Traces    │
│             │  │             │  │             │
│ Prometheus  │  │    Loki     │  │   Jaeger    │
└─────────────┘  └─────────────┘  └─────────────┘
```

**Modern Observability (2026):**

```
┌──────────────────────────────────────────────────┐
│           Unified Observability Platform         │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │Metrics │ │ Logs   │ │Traces  │ │ Profiles │  │
│  └────────┘ └────────┘ └────────┘ └──────────┘  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │ Events │ │Network │ │  Cost  │ │ Security │  │
│  └────────┘ └────────┘ └────────┘ └──────────┘  │
│                                                  │
│         ┌──────────────────────────┐             │
│         │  Correlation & Analytics │             │
│         │    AI-Powered Insights   │             │
│         └──────────────────────────┘             │
└──────────────────────────────────────────────────┘
```

### Why Advanced Observability? (2026 Reality)

**Industry Statistics:**
- Average Mean Time to Detect (MTTD): 206 minutes
- Average Mean Time to Resolve (MTTR): 314 minutes
- Cost of downtime: $5,600/minute for enterprises
- 78% of incidents detected by customers (not monitoring)

**The Problem with Traditional Monitoring:**

❌ **Reactive, not proactive**
- Alerts after problems occur
- No predictive capabilities
- Limited root cause analysis

❌ **Data silos**
- Metrics in Prometheus
- Logs in separate system
- Traces disconnected
- Manual correlation required

❌ **High cardinality challenges**
- Metrics explosion with containers/microservices
- Storage costs escalate
- Query performance degrades

❌ **Lack of business context**
- Technical metrics without business impact
- No SLO/SLA tracking
- Cost invisible

**Advanced Observability Solutions:**

✅ **Unified data model** (OpenTelemetry)
✅ **Automatic correlation** (trace ID in logs, metrics)
✅ **eBPF for zero-instrumentation** observability
✅ **Long-term storage** at scale (Mimir, Tempo)
✅ **Continuous profiling** (CPU, memory, I/O)
✅ **SLO-driven alerting** (error budgets)
✅ **Cost attribution** (OpenCost)
✅ **AI-powered anomaly detection**
✅ **Chaos engineering** integration

### Observability Maturity Model

**Level 1: Basic Monitoring**
- Manual instrumentation
- Dashboard-based troubleshooting
- Reactive alerts
- Siloed tools

**Level 2: Integrated Observability**
- Auto-instrumentation with OpenTelemetry
- Correlated metrics, logs, traces
- Context-aware alerts
- Centralized platform

**Level 3: Proactive Intelligence**
- Continuous profiling
- SLO/SLA tracking
- Predictive analytics
- Business metrics integration

**Level 4: Autonomous Operations (AIOps)**
- AI-powered root cause analysis
- Auto-remediation
- Capacity planning
- Cost optimization recommendations

---

## Core Concepts

### OpenTelemetry (OTel) Deep Dive

**OpenTelemetry** is the CNCF standard for observability instrumentation, combining OpenTracing and OpenCensus.

**Architecture:**

```
┌──────────────────────────────────────────────┐
│            Your Application                  │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │   OpenTelemetry SDK                │     │
│  │   - Tracing API                    │     │
│  │   - Metrics API                    │     │
│  │   - Logging API (experimental)     │     │
│  └────────────────────────────────────┘     │
│                    │                         │
│                    ▼                         │
│  ┌────────────────────────────────────┐     │
│  │   OpenTelemetry Exporter           │     │
│  │   - OTLP (gRPC/HTTP)               │     │
│  │   - Prometheus                     │     │
│  │   - Jaeger                         │     │
│  └────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│     OpenTelemetry Collector                  │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Receivers │→ │Processors│→ │Exporters │   │
│  │- OTLP    │  │- Batch   │  │- Tempo   │   │
│  │- Jaeger  │  │- Filter  │  │- Mimir   │   │
│  │- Zipkin  │  │- Sampling│  │- Loki    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────┘
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
      ┌──────┐  ┌──────┐  ┌──────┐
      │ Tempo│  │Mimir │  │ Loki │
      └──────┘  └──────┘  └──────┘
```

**Key Components:**

**1. SDK**: Library embedded in applications
- Auto-instrumentation for popular frameworks
- Manual instrumentation APIs
- Context propagation

**2. Collector**: Vendor-agnostic telemetry pipeline
- Receives data from multiple sources
- Processes (sampling, filtering, enrichment)
- Exports to multiple backends

**3. OTLP Protocol**: Standard wire protocol
- Efficient binary format (protobuf)
- Supports gRPC and HTTP
- Backward compatible

### eBPF-Based Observability

**eBPF** (Extended Berkeley Packet Filter) enables kernel-level observability without instrumentation.

**Traditional vs eBPF Observability:**

| Aspect | Traditional | eBPF |
|--------|-------------|------|
| **Instrumentation** | Required | Not required |
| **Overhead** | 5-20% | < 1% |
| **Language Support** | Per-language SDKs | Any language |
| **Kernel Access** | No | Yes (network, syscalls) |
| **Deployment** | Per-service | Per-node (DaemonSet) |

**eBPF Capabilities:**

✅ **Network observability**
- Packet-level inspection
- Service-to-service communication
- DNS resolution tracking
- TLS handshakes

✅ **Performance profiling**
- CPU flamegraphs
- Memory allocation
- I/O operations
- Lock contention

✅ **Security monitoring**
- Syscall auditing
- Process execution tracking
- Network anomalies

**Popular eBPF Tools:**

**Pixie** (acquired by New Relic):
- Auto-telemetry (no code changes)
- Protocol detection (HTTP, gRPC, MySQL, Redis, etc.)
- Live debugging
- Kubernetes-native

**Cilium Hubble**:
- Network flow visualization
- Service dependency map
- L3-L7 visibility
- Integrated with Cilium CNI

**Parca**:
- Continuous profiling
- CPU and memory profiles
- Flamegraph visualization
- Minimal overhead

### Service Level Objectives (SLOs)

**SLI (Service Level Indicator)**: Quantitative measure of service level
- Request latency (P95 < 200ms)
- Availability (99.9% uptime)
- Error rate (< 0.1%)

**SLO (Service Level Objective)**: Target value for SLI
- "99.9% of requests complete in < 200ms"
- "99.95% availability per month"

**SLA (Service Level Agreement)**: Contract with consequences
- External commitment to customers
- Financial penalties for violations
- More strict than internal SLOs

**Error Budget**: Allowed failure within SLO
```
Error Budget = 100% - SLO
If SLO = 99.9%, Error Budget = 0.1%

Monthly error budget for 99.9% SLO:
30 days × 24 hours × 60 minutes × 0.001 = 43.2 minutes
```

**Error Budget Policy:**

```
If error budget > 50%:
  - Focus on new features
  - Acceptable to take risks

If error budget < 50%:
  - Freeze non-critical releases
  - Focus on reliability
  - Conduct blameless postmortems

If error budget < 0%:
  - All hands on deck
  - Fix critical issues
  - Incident review
```

### Continuous Profiling

**Profiling** identifies performance bottlenecks in code:

**Types of Profiles:**

**1. CPU Profile**
- Which functions consume most CPU time
- Flamegraph visualization
- Identify hot paths

**2. Memory Profile**
- Heap allocations
- Memory leaks
- Object retention

**3. Goroutine Profile** (Go)
- Active goroutines
- Deadlocks
- Resource leaks

**4. Mutex Profile**
- Lock contention
- Synchronization bottlenecks

**Continuous Profiling Benefits:**

✅ Always-on performance monitoring
✅ Historical comparison
✅ Production debugging without deploying debug builds
✅ Minimal overhead (< 1% CPU)

**Tools:**
- **Parca**: CNCF project, eBPF-based
- **Pyroscope**: Multi-language support
- **Google Cloud Profiler**: Managed service
- **Datadog Continuous Profiler**: Commercial

### Cost Observability

**OpenCost** provides real-time cost monitoring for Kubernetes:

**Capabilities:**

✅ **Pod-level cost allocation**
- CPU cost per pod
- Memory cost per pod
- Storage (PV) costs
- Network egress costs

✅ **Resource attribution**
- By namespace
- By label (team, app, env)
- By cluster

✅ **Cost optimization recommendations**
- Right-sizing suggestions
- Spot instance opportunities
- Reserved instance analysis

✅ **Showback/Chargeback**
- Departmental cost allocation
- Multi-tenant billing

**Cost Calculation:**

```
Pod Cost = (CPU Cost + Memory Cost + Storage Cost + Network Cost)

CPU Cost = (CPU Request / Node CPU) × Node Hourly Rate × Hours
Memory Cost = (Memory Request / Node Memory) × Node Hourly Rate × Hours
```

### Chaos Engineering

**Chaos Engineering** proactively injects failures to test resilience.

**Principles:**

1. **Build a hypothesis around steady state**
2. **Vary real-world events** (failures, latency, etc.)
3. **Run experiments in production**
4. **Automate experiments**
5. **Minimize blast radius**

**Chaos Mesh Features:**

- **Pod failures**: Kill, stop, restart pods
- **Network chaos**: Latency, packet loss, partition
- **Stress testing**: CPU, memory pressure
- **I/O chaos**: Disk latency, read/write errors
- **Time chaos**: Clock skew
- **Kernel chaos**: System call failures

---

## Hands-On Lab 1: Deploying the Complete Observability Stack

### Objective
Deploy Grafana Mimir, Tempo, Loki, and OpenTelemetry Collector for unified observability.

### Prerequisites
- Kubernetes cluster (1.29+) with 8GB+ memory
- Helm 3.14+
- kubectl configured

### Step 1: Add Grafana Helm Repository

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create observability namespace
kubectl create namespace observability
```

### Step 2: Deploy Grafana Mimir (Metrics)

```yaml
# mimir-values.yaml
mimir:
  structuredConfig:
    limits:
      max_global_series_per_metric: 0
      max_global_series_per_user: 0
    compactor:
      compaction_interval: 30m
    ingester:
      ring:
        replication_factor: 3

minio:
  enabled: true
  replicas: 1
  persistence:
    size: 10Gi
  resources:
    requests:
      cpu: 100m
      memory: 128Mi

alertmanager:
  enabled: true
  replicas: 1

ruler:
  enabled: true
  replicas: 1

querier:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

ingester:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      memory: 4Gi

store_gateway:
  replicas: 1
```

```bash
# Install Grafana Mimir
helm install mimir grafana/mimir-distributed \
  --namespace observability \
  -f mimir-values.yaml

# Wait for Mimir components
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=mimir -n observability --timeout=600s

# Verify installation
kubectl get pods -n observability -l app.kubernetes.io/name=mimir
```

### Step 3: Deploy Grafana Tempo (Traces)

```yaml
# tempo-values.yaml
tempo:
  structuredConfig:
    server:
      http_listen_port: 3200
    distributor:
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318
    compactor:
      compaction:
        block_retention: 168h  # 7 days
    storage:
      trace:
        backend: s3
        s3:
          bucket: tempo-traces
          endpoint: mimir-minio.observability:9000
          access_key: minioadmin
          secret_key: minioadmin
          insecure: true

persistence:
  enabled: true
  size: 10Gi

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    memory: 2Gi
```

```bash
# Install Grafana Tempo
helm install tempo grafana/tempo-distributed \
  --namespace observability \
  -f tempo-values.yaml

# Wait for Tempo
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=tempo -n observability --timeout=600s

# Verify
kubectl get pods -n observability -l app.kubernetes.io/name=tempo
```

### Step 4: Deploy Grafana Loki (Logs)

```yaml
# loki-values.yaml
loki:
  auth_enabled: false
  commonConfig:
    replication_factor: 1
  storage:
    type: s3
    s3:
      endpoint: mimir-minio.observability:9000
      bucketnames: loki-chunks
      access_key_id: minioadmin
      secret_access_key: minioadmin
      s3forcepathstyle: true
      insecure: true

write:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

read:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

backend:
  replicas: 1

gateway:
  enabled: true
```

```bash
# Install Grafana Loki
helm install loki grafana/loki-distributed \
  --namespace observability \
  -f loki-values.yaml

# Wait for Loki
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=loki -n observability --timeout=600s

# Verify
kubectl get pods -n observability -l app.kubernetes.io/name=loki
```

### Step 5: Deploy OpenTelemetry Collector

```yaml
# otel-collector-values.yaml
mode: deployment

replicaCount: 2

config:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318
    prometheus:
      config:
        scrape_configs:
        - job_name: 'kubernetes-pods'
          kubernetes_sd_configs:
          - role: pod
          relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true

  processors:
    batch:
      timeout: 10s
      send_batch_size: 1024
    memory_limiter:
      check_interval: 5s
      limit_mib: 512
    resource:
      attributes:
      - key: cluster.name
        value: production
        action: insert

  exporters:
    otlp/tempo:
      endpoint: tempo-distributor.observability:4317
      tls:
        insecure: true
    prometheusremotewrite:
      endpoint: http://mimir-nginx.observability/api/v1/push
      tls:
        insecure: true
    loki:
      endpoint: http://loki-gateway.observability/loki/api/v1/push

  service:
    pipelines:
      traces:
        receivers: [otlp]
        processors: [memory_limiter, batch, resource]
        exporters: [otlp/tempo]
      metrics:
        receivers: [otlp, prometheus]
        processors: [memory_limiter, batch, resource]
        exporters: [prometheusremotewrite]
      logs:
        receivers: [otlp]
        processors: [memory_limiter, batch, resource]
        exporters: [loki]

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    memory: 1Gi

ports:
  otlp:
    enabled: true
    containerPort: 4317
    servicePort: 4317
    protocol: TCP
  otlp-http:
    enabled: true
    containerPort: 4318
    servicePort: 4318
    protocol: TCP
```

```bash
# Add OpenTelemetry Helm repo
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

# Install OpenTelemetry Collector
helm install otel-collector open-telemetry/opentelemetry-collector \
  --namespace observability \
  -f otel-collector-values.yaml

# Wait for collector
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=opentelemetry-collector -n observability --timeout=300s

# Verify
kubectl get pods -n observability -l app.kubernetes.io/name=opentelemetry-collector
```

### Step 6: Deploy Grafana

```yaml
# grafana-values.yaml
adminPassword: admin

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Mimir
      type: prometheus
      url: http://mimir-nginx.observability/prometheus
      isDefault: true
      jsonData:
        httpMethod: POST
    - name: Tempo
      type: tempo
      url: http://tempo-query-frontend.observability:3200
      jsonData:
        tracesToLogs:
          datasourceUid: Loki
          tags: ['trace_id']
        serviceMap:
          datasourceUid: Mimir
    - name: Loki
      type: loki
      url: http://loki-gateway.observability
      jsonData:
        derivedFields:
        - datasourceUid: Tempo
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: '$${__value.raw}'

service:
  type: LoadBalancer
  port: 80

resources:
  requests:
    cpu: 250m
    memory: 512Mi
```

```bash
# Install Grafana
helm install grafana grafana/grafana \
  --namespace observability \
  -f grafana-values.yaml

# Wait for Grafana
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n observability --timeout=300s

# Get Grafana URL
kubectl get svc grafana -n observability

# Access Grafana
# Username: admin
# Password: admin (from values file)
```

### Step 7: Verify Complete Stack

```bash
# Check all components
kubectl get pods -n observability

# Expected pods:
# - mimir-* (ingester, querier, distributor, compactor, etc.)
# - tempo-* (distributor, ingester, query-frontend, querier)
# - loki-* (write, read, backend, gateway)
# - otel-collector-*
# - grafana-*
# - mimir-minio-*

# Check services
kubectl get svc -n observability

# Verify connectivity
kubectl run test-curl --image=curlimages/curl -n observability --rm -it --restart=Never -- \
  curl -s http://mimir-nginx.observability/prometheus/api/v1/status/config
```

---

## Hands-On Lab 2: Instrumenting Applications with OpenTelemetry

### Objective
Auto-instrument a sample application with OpenTelemetry for metrics, traces, and logs.

### Step 1: Deploy Sample Application

```yaml
# sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: ghcr.io/open-telemetry/demo:latest-frontend
        ports:
        - containerPort: 8080
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector-opentelemetry-collector.observability:4318"
        - name: OTEL_SERVICE_NAME
          value: "sample-app"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "service.namespace=default,service.version=1.0.0"
        - name: OTEL_TRACES_SAMPLER
          value: "parentbased_traceidratio"
        - name: OTEL_TRACES_SAMPLER_ARG
          value: "0.1"  # 10% sampling
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: sample-app
  namespace: default
spec:
  selector:
    app: sample-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

```bash
# Deploy sample application
kubectl apply -f sample-app.yaml

# Wait for deployment
kubectl wait --for=condition=ready pod -l app=sample-app --timeout=300s

# Verify
kubectl get pods -l app=sample-app
```

### Step 2: Generate Traffic

```bash
# Deploy traffic generator
kubectl run traffic-gen --image=busybox --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://sample-app; sleep 1; done"

# Alternatively, use fortio for load testing
kubectl run fortio --image=fortio/fortio --restart=Never -- \
  load -c 10 -qps 100 -t 60s http://sample-app
```

### Step 3: Query Metrics in Grafana

```bash
# Port-forward Grafana if needed
kubectl port-forward -n observability svc/grafana 3000:80 &

# Open http://localhost:3000
# Navigate to Explore → Select "Mimir" datasource
```

**Example PromQL Queries:**

```promql
# Request rate
sum(rate(http_server_requests_total{service_name="sample-app"}[5m])) by (http_route)

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_server_duration_bucket{service_name="sample-app"}[5m])) by (le, http_route)
)

# Error rate
sum(rate(http_server_requests_total{service_name="sample-app",http_status_code=~"5.."}[5m]))
/
sum(rate(http_server_requests_total{service_name="sample-app"}[5m]))
```

### Step 4: View Traces in Grafana

```bash
# In Grafana, navigate to Explore → Select "Tempo" datasource
# Search for traces from "sample-app"
# Select a trace to view detailed span information
```

**Trace Analysis:**
- Total duration
- Individual span durations
- Service dependencies
- Errors and exceptions

### Step 5: Query Logs in Grafana

```bash
# Navigate to Explore → Select "Loki" datasource
```

**Example LogQL Queries:**

```logql
# All logs from sample-app
{app="sample-app"}

# Error logs only
{app="sample-app"} |= "error"

# Logs with specific trace ID
{app="sample-app"} | json | trace_id="abc123"

# Rate of errors
sum(rate({app="sample-app"} |= "error" [5m]))
```

### Step 6: Correlate Metrics, Logs, and Traces

```bash
# In a Grafana dashboard:
# 1. Add a panel showing error rate (metrics)
# 2. Click on a spike in the error rate
# 3. Click "View logs" → Jumps to Loki with time range
# 4. In logs, find a log entry with trace_id
# 5. Click trace_id link → Jumps to Tempo with full trace
```

**This workflow demonstrates:**
- Metrics → Logs correlation
- Logs → Traces correlation
- Unified troubleshooting experience

---

## Hands-On Lab 3: eBPF Observability with Pixie

### Objective
Deploy Pixie for auto-instrumentation and network observability.

### Prerequisites
- Kubernetes cluster with kernel 4.14+ (for eBPF)
- Cluster admin access

### Step 1: Install Pixie CLI

```bash
# Install Pixie CLI
bash -c "$(curl -fsSL https://withpixie.ai/install.sh)"

# Verify installation
px version
```

### Step 2: Deploy Pixie to Kubernetes

```bash
# Create Pixie account at https://work.withpixie.ai
# Get deployment key from the UI

# Deploy Pixie
px deploy --deploy_key=<YOUR_DEPLOY_KEY>

# Verify deployment
kubectl get pods -n px-operator
kubectl get pods -n pl

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n pl --timeout=600s
```

### Step 3: Explore Auto-Instrumented Metrics

```bash
# List available scripts
px script list

# View HTTP traffic
px live px/http_data

# View DNS traffic
px live px/dns_flow_graph

# View MySQL queries
px live px/mysql_data

# View service map
px live px/service_stats
```

**Output Example:**

```
┌──────────────────────┬──────────┬──────────┬─────────────┐
│ Service              │ Requests │ Errors   │ Latency P50 │
├──────────────────────┼──────────┼──────────┼─────────────┤
│ sample-app           │ 1,234    │ 12       │ 45ms        │
│ redis                │ 5,678    │ 0        │ 2ms         │
│ postgres             │ 890      │ 3        │ 15ms        │
└──────────────────────┴──────────┴──────────┴─────────────┘
```

### Step 4: Debug Application with Pixie Live View

```bash
# View real-time HTTP requests for a specific pod
px live px/http_data -p pod_name=sample-app-xxxxx

# View slow queries
px live px/slow_http_requests -- --latency_threshold_ms=100

# View top endpoints by latency
px live px/http_latency_by_endpoint
```

### Step 5: Create Custom Pixie Script

```python
# custom_monitor.pxl
import px

def http_errors(start_time: str):
    # Query HTTP data
    df = px.DataFrame(table='http_events', start_time=start_time)

    # Filter for errors (status code >= 400)
    df = df[df.resp_status >= 400]

    # Group by service and endpoint
    df = df.groupby(['service', 'req_path']).agg(
        error_count=('resp_status', px.count),
        avg_latency=('latency', px.mean)
    )

    return df

# Run the script
px.display(http_errors('-5m'))
```

```bash
# Save and run custom script
px script run custom_monitor.pxl
```

### Step 6: Integrate Pixie with Grafana

```bash
# Pixie provides a Grafana datasource plugin
# Install the plugin in Grafana

# Add Pixie as a datasource in Grafana
# Configure API key from Pixie UI

# Create dashboard using Pixie queries
```

---

## Hands-On Lab 4: Continuous Profiling with Parca

### Objective
Deploy Parca for continuous CPU and memory profiling.

### Step 1: Install Parca

```bash
# Add Parca Helm repository
helm repo add parca https://parca-dev.github.io/helm-charts
helm repo update

# Install Parca
helm install parca parca/parca \
  --namespace observability \
  --set "service.type=LoadBalancer"

# Wait for Parca
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=parca -n observability --timeout=300s

# Get Parca URL
kubectl get svc parca -n observability
```

### Step 2: Deploy Parca Agent

```yaml
# parca-agent-values.yaml
config:
  object_storage:
    bucket:
      type: FILESYSTEM
      config:
        directory: /tmp/parca

  scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_parca_dev_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_parca_dev_port]
      action: replace
      target_label: __address__
      regex: (.+):(.+);(.+)
      replacement: ${1}:${3}

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    memory: 1Gi
```

```bash
# Install Parca Agent as DaemonSet
helm install parca-agent parca/parca-agent \
  --namespace observability \
  -f parca-agent-values.yaml

# Verify agent on all nodes
kubectl get pods -n observability -l app.kubernetes.io/name=parca-agent
```

### Step 3: Annotate Applications for Profiling

```yaml
# Update sample-app deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
spec:
  template:
    metadata:
      annotations:
        parca.dev/scrape: "true"
        parca.dev/port: "6060"
    spec:
      containers:
      - name: app
        # ... existing config ...
        ports:
        - containerPort: 6060
          name: pprof
```

```bash
# Apply changes
kubectl apply -f sample-app.yaml

# Restart pods to apply annotations
kubectl rollout restart deployment sample-app
```

### Step 4: View Profiles in Parca UI

```bash
# Port-forward Parca UI
kubectl port-forward -n observability svc/parca 7070:7070 &

# Open http://localhost:7070
```

**In Parca UI:**
1. Select a profile type (CPU, Memory, Goroutines)
2. Choose time range
3. View flamegraph
4. Click on functions to drill down

### Step 5: Analyze Performance Bottlenecks

**CPU Flamegraph Analysis:**
- Width = % of total CPU time
- Height = call stack depth
- Look for wide bars = hot paths

**Memory Flamegraph Analysis:**
- Identify large allocations
- Find memory leaks
- Track object retention

### Step 6: Compare Profiles Over Time

```bash
# In Parca UI:
# 1. Select baseline time range (e.g., before deployment)
# 2. Select comparison time range (e.g., after deployment)
# 3. View differential flamegraph
# Green = performance improvement
# Red = performance regression
```

---

## Hands-On Lab 5: SLO Monitoring and Error Budgets

### Objective
Configure SLOs, track error budgets, and set up SLO-based alerting.

### Step 1: Install Sloth for SLO Generation

```bash
# Download Sloth binary
wget https://github.com/slok/sloth/releases/download/v0.11.0/sloth-linux-amd64
chmod +x sloth-linux-amd64
sudo mv sloth-linux-amd64 /usr/local/bin/sloth

# Verify installation
sloth version
```

### Step 2: Define SLO Specification

```yaml
# slo-http-availability.yaml
version: "prometheus/v1"
service: "sample-app"
labels:
  team: "platform"
  env: "production"
slos:
  - name: "http-availability"
    objective: 99.9
    description: "99.9% of HTTP requests should succeed"
    sli:
      events:
        error_query: |
          sum(rate(http_server_requests_total{service_name="sample-app",http_status_code=~"5.."}[{{.window}}]))
        total_query: |
          sum(rate(http_server_requests_total{service_name="sample-app"}[{{.window}}]))
    alerting:
      name: SampleAppHighErrorRate
      labels:
        severity: "critical"
      annotations:
        summary: "High error rate on sample-app"
      page_alert:
        labels:
          severity: "critical"
      ticket_alert:
        labels:
          severity: "warning"

  - name: "http-latency"
    objective: 99.5
    description: "99.5% of HTTP requests should complete in < 200ms"
    sli:
      events:
        error_query: |
          sum(rate(http_server_duration_bucket{service_name="sample-app",le="0.2"}[{{.window}}]))
        total_query: |
          sum(rate(http_server_duration_count{service_name="sample-app"}[{{.window}}]))
    alerting:
      name: SampleAppHighLatency
      labels:
        severity: "warning"
```

### Step 3: Generate Prometheus Rules

```bash
# Generate Prometheus recording and alerting rules
sloth generate -i slo-http-availability.yaml -o slo-rules.yaml

# Apply rules to Kubernetes
kubectl create configmap slo-rules \
  --from-file=slo-rules.yaml \
  -n observability \
  --dry-run=client -o yaml | kubectl apply -f -

# Reload Prometheus to pick up new rules
kubectl rollout restart statefulset -n observability prometheus-kube-prometheus-prometheus
```

### Step 4: Create Grafana SLO Dashboard

```json
{
  "dashboard": {
    "title": "SLO Dashboard - Sample App",
    "panels": [
      {
        "title": "Availability SLO",
        "targets": [
          {
            "expr": "slo:sli_error:ratio_rate5m{slo=\"http-availability\"}"
          }
        ],
        "type": "gauge",
        "options": {
          "min": 0,
          "max": 100,
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 99.9, "color": "yellow"},
              {"value": 100, "color": "red"}
            ]
          }
        }
      },
      {
        "title": "Error Budget Remaining",
        "targets": [
          {
            "expr": "slo:current_burn_rate:ratio{slo=\"http-availability\"}"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Error Budget Burn Rate (30d)",
        "targets": [
          {
            "expr": "slo:error_budget:remaining{slo=\"http-availability\"}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Step 5: Configure Error Budget Policy Alerts

```yaml
# error-budget-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: error-budget-policy
  namespace: observability
spec:
  groups:
  - name: error-budget
    interval: 30s
    rules:
    - alert: ErrorBudgetCritical
      expr: |
        (
          slo:error_budget:remaining{slo="http-availability"} < 0
        )
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Error budget exhausted for {{ $labels.slo }}"
        description: "Error budget is {{ $value | humanizePercentage }} (negative = exhausted)"

    - alert: ErrorBudgetLow
      expr: |
        (
          slo:error_budget:remaining{slo="http-availability"} < 0.25
          and
          slo:error_budget:remaining{slo="http-availability"} >= 0
        )
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Error budget low for {{ $labels.slo }}"
        description: "Only {{ $value | humanizePercentage }} of error budget remaining"
```

```bash
kubectl apply -f error-budget-alerts.yaml
```

### Step 6: Simulate SLO Violation

```bash
# Inject errors to burn error budget
kubectl exec -it deploy/sample-app -- /bin/sh -c \
  "while true; do curl -X POST http://localhost:8080/error; sleep 0.1; done"

# Monitor error budget consumption in Grafana
# Check for alerts in Prometheus Alertmanager
```

---

## Hands-On Lab 6: Cost Monitoring with OpenCost

### Objective
Deploy OpenCost for real-time Kubernetes cost monitoring and optimization.

### Step 1: Install OpenCost

```bash
# Add OpenCost Helm repository
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update

# Install OpenCost
helm install opencost opencost/opencost \
  --namespace observability \
  --set opencost.exporter.defaultClusterId=production \
  --set opencost.prometheus.internal.serviceName=mimir-nginx \
  --set opencost.prometheus.internal.namespaceName=observability \
  --set opencost.ui.enabled=true

# Wait for OpenCost
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=opencost -n observability --timeout=300s
```

### Step 2: Access OpenCost UI

```bash
# Port-forward OpenCost UI
kubectl port-forward -n observability svc/opencost 9090:9090 &

# Open http://localhost:9090
```

### Step 3: Configure Cloud Provider Pricing

```yaml
# opencost-cloud-config.yaml (for AWS)
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencost-cloud-config
  namespace: observability
data:
  cloud-provider: "aws"
  aws-config: |
    {
      "region": "us-west-2",
      "ec2_on_demand_prices": {},
      "spot_price_lookup": "aws-pricing-api"
    }
```

```bash
kubectl apply -f opencost-cloud-config.yaml

# Restart OpenCost to apply config
kubectl rollout restart deployment opencost -n observability
```

### Step 4: Query Cost Metrics in Prometheus

```promql
# Total cluster cost
sum(node_total_hourly_cost)

# Cost by namespace
sum(container_cpu_allocation * on(node) group_left() node_cpu_hourly_cost) by (namespace)
+
sum(container_memory_allocation_bytes / 1024 / 1024 / 1024 * on(node) group_left() node_ram_hourly_cost) by (namespace)

# Cost per pod
sum(container_cpu_allocation * on(node) group_left() node_cpu_hourly_cost) by (pod, namespace)

# Monthly cost projection
sum(node_total_hourly_cost) * 730
```

### Step 5: Create Cost Dashboard in Grafana

```json
{
  "dashboard": {
    "title": "Kubernetes Cost Dashboard",
    "panels": [
      {
        "title": "Total Monthly Cost",
        "targets": [
          {
            "expr": "sum(node_total_hourly_cost) * 730"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Cost by Namespace",
        "targets": [
          {
            "expr": "sum(container_cpu_allocation * on(node) group_left() node_cpu_hourly_cost) by (namespace)"
          }
        ],
        "type": "piechart"
      },
      {
        "title": "Cost Trend (7 days)",
        "targets": [
          {
            "expr": "sum(node_total_hourly_cost)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Top 10 Most Expensive Pods",
        "targets": [
          {
            "expr": "topk(10, sum(container_cpu_allocation * on(node) group_left() node_cpu_hourly_cost) by (pod, namespace))"
          }
        ],
        "type": "table"
      }
    ]
  }
}
```

### Step 6: Set Up Cost Alerts

```yaml
# cost-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-alerts
  namespace: observability
spec:
  groups:
  - name: cost
    interval: 1h
    rules:
    - alert: HighNamespaceCost
      expr: |
        sum(container_cpu_allocation * on(node) group_left() node_cpu_hourly_cost) by (namespace) * 730 > 1000
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "High monthly cost for namespace {{ $labels.namespace }}"
        description: "Namespace {{ $labels.namespace }} is projected to cost ${{ $value }} per month"

    - alert: CostSpike
      expr: |
        (sum(node_total_hourly_cost) - sum(node_total_hourly_cost offset 1h)) / sum(node_total_hourly_cost offset 1h) > 0.2
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "20% cost spike detected"
        description: "Cluster cost increased by {{ $value | humanizePercentage }} in the last hour"
```

```bash
kubectl apply -f cost-alerts.yaml
```

---

## Hands-On Lab 7: Chaos Engineering with Chaos Mesh

### Objective
Deploy Chaos Mesh and run experiments to test application resilience.

### Step 1: Install Chaos Mesh

```bash
# Add Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock \
  --set dashboard.create=true

# Wait for Chaos Mesh
kubectl wait --for=condition=ready pod --all -n chaos-mesh --timeout=600s
```

### Step 2: Access Chaos Mesh Dashboard

```bash
# Port-forward dashboard
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333 &

# Open http://localhost:2333
# Create a token for authentication
kubectl create token account-cluster-manager -n chaos-mesh
```

### Step 3: Create Pod Kill Experiment

```yaml
# pod-kill-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-sample-app
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
    - default
    labelSelectors:
      app: sample-app
  scheduler:
    cron: "@every 5m"
  duration: "1m"
```

```bash
# Apply pod kill experiment
kubectl apply -f pod-kill-experiment.yaml

# Verify experiment is running
kubectl get podchaos -n default

# Check events
kubectl describe podchaos pod-kill-sample-app -n default
```

### Step 4: Network Latency Experiment

```yaml
# network-latency-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency
  namespace: default
spec:
  action: delay
  mode: all
  selector:
    namespaces:
    - default
    labelSelectors:
      app: sample-app
  delay:
    latency: "100ms"
    correlation: "25"
    jitter: "10ms"
  duration: "5m"
```

```bash
# Apply network latency experiment
kubectl apply -f network-latency-experiment.yaml

# Monitor latency increase in Grafana
# Query: histogram_quantile(0.95, sum(rate(http_server_duration_bucket[5m])) by (le))
```

### Step 5: Stress Test Experiment

```yaml
# stress-test-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: memory-stress
  namespace: default
spec:
  mode: one
  selector:
    namespaces:
    - default
    labelSelectors:
      app: sample-app
  stressors:
    memory:
      workers: 4
      size: "256MB"
  duration: "3m"
```

```bash
# Apply stress test
kubectl apply -f stress-test-experiment.yaml

# Monitor memory usage
kubectl top pods -l app=sample-app

# Check if pod is OOMKilled
kubectl get events --field-selector involvedObject.name=sample-app-xxxxx
```

### Step 6: Workflow for Complex Scenarios

```yaml
# chaos-workflow.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: multi-chaos-workflow
  namespace: default
spec:
  entry: entry
  templates:
  - name: entry
    templateType: Serial
    deadline: 30m
    children:
    - pod-kill-phase
    - network-delay-phase
    - stress-phase

  - name: pod-kill-phase
    templateType: PodChaos
    deadline: 5m
    podChaos:
      action: pod-kill
      mode: one
      selector:
        namespaces:
        - default
        labelSelectors:
          app: sample-app

  - name: network-delay-phase
    templateType: NetworkChaos
    deadline: 10m
    networkChaos:
      action: delay
      mode: all
      selector:
        namespaces:
        - default
        labelSelectors:
          app: sample-app
      delay:
        latency: "200ms"

  - name: stress-phase
    templateType: StressChaos
    deadline: 10m
    stressChaos:
      mode: one
      selector:
        namespaces:
        - default
        labelSelectors:
          app: sample-app
      stressors:
        memory:
          workers: 2
          size: "128MB"
```

```bash
# Run workflow
kubectl apply -f chaos-workflow.yaml

# Monitor workflow progress
kubectl get workflows -n default

# Check workflow details
kubectl describe workflow multi-chaos-workflow -n default
```

### Step 7: Observe and Analyze Results

```bash
# In Grafana, create a dashboard showing:
# 1. Request rate during chaos
# 2. Error rate during chaos
# 3. Latency during chaos
# 4. Pod restart count

# Example queries:
# Request rate: sum(rate(http_server_requests_total[1m]))
# Error rate: sum(rate(http_server_requests_total{http_status_code=~"5.."}[1m])) / sum(rate(http_server_requests_total[1m]))
# Latency P95: histogram_quantile(0.95, sum(rate(http_server_duration_bucket[1m])) by (le))
# Restarts: sum(kube_pod_container_status_restarts_total{pod=~"sample-app.*"})
```

---

## Best Practices

### Observability Strategy

**1. Instrument Early and Often**

✅ **Build observability into applications from day one**
- Don't wait for production issues
- Make observability a requirement

✅ **Use OpenTelemetry for standardization**
- Vendor-agnostic instrumentation
- Future-proof your observability

**2. Define SLOs for Every Service**

✅ **Start with critical user journeys**
```yaml
User Journey: Checkout
- SLI: 99.9% of checkouts complete successfully
- SLI: 95% of checkouts complete in < 2 seconds
```

✅ **Track error budgets**
- Alert when budget is 50% consumed
- Freeze releases when budget is exhausted

**3. Reduce Alert Fatigue**

✅ **Alert on symptoms, not causes**
```yaml
# Good alert
Alert: User-facing latency > 500ms for 5 minutes

# Bad alert
Alert: CPU usage > 80%
```

✅ **Use multi-window, multi-burn-rate alerts**
- Faster detection of critical issues
- Fewer false positives

**4. Optimize for Cardinality**

✅ **Limit label cardinality**
```yaml
# Bad (unbounded cardinality)
http_requests_total{user_id="12345"}

# Good (bounded cardinality)
http_requests_total{user_type="premium"}
```

✅ **Use exemplars for high-cardinality data**
- Store trace IDs in exemplars
- Don't create metrics with trace IDs as labels

### Performance Optimization

**1. Sampling Strategies**

✅ **Adaptive sampling for traces**
```yaml
# High-traffic endpoints: 1% sampling
# Low-traffic endpoints: 100% sampling
# Errors: Always sample
```

✅ **Tail-based sampling**
- Sample all slow requests
- Sample all errors
- Probabilistic sampling for normal requests

**2. Storage Optimization**

✅ **Retention policies**
```yaml
Metrics:
  - Raw (15s): 7 days
  - 5m aggregates: 30 days
  - 1h aggregates: 1 year

Traces:
  - All traces: 7 days
  - Sampled traces: 30 days

Logs:
  - Debug logs: 3 days
  - Info logs: 30 days
  - Error logs: 90 days
```

✅ **Use object storage for long-term retention**
- S3, GCS, Azure Blob
- Much cheaper than SSD/NVMe
- Query performance acceptable for old data

**3. Query Optimization**

✅ **Pre-aggregate expensive queries**
```promql
# Use recording rules for expensive queries
record: job:http_requests:rate5m
expr: sum(rate(http_requests_total[5m])) by (job)
```

✅ **Limit query time ranges**
- Default to last 1 hour
- Warn on queries > 7 days

### Security

**1. Protect Sensitive Data**

✅ **Scrub sensitive information from logs**
```yaml
# Use log processors to redact
- type: regex
  pattern: "password=.*"
  replacement: "password=[REDACTED]"
```

✅ **Don't log PII**
- User emails, phone numbers, addresses
- Credit card numbers
- Social security numbers

**2. Secure Observability Infrastructure**

✅ **Enable authentication on all UIs**
- Grafana: SSO with OAuth
- Prometheus: Basic auth or OAuth proxy
- Tempo/Loki: Authentication via reverse proxy

✅ **Network isolation**
- Observability in dedicated namespace
- Network policies to restrict access
- No public exposure without authentication

---

## Common Pitfalls

### Pitfall 1: Over-Instrumenting

**Problem**: Adding metrics for every possible dimension.

**Result**:
- Cardinality explosion
- High storage costs
- Query performance degradation

**Solution**:
- Instrument what you need
- Use logs/traces for high-cardinality data
- Review metrics regularly and remove unused

### Pitfall 2: Not Correlating Signals

**Problem**: Metrics, logs, and traces in separate silos.

**Result**:
- Slow troubleshooting
- Manual correlation effort
- Missed insights

**Solution**:
- Use OpenTelemetry for unified instrumentation
- Add trace IDs to logs
- Configure data source correlation in Grafana

### Pitfall 3: Alert Fatigue

**Problem**: Too many alerts, most are false positives.

**Result**:
- Alerts ignored
- Real issues missed
- Team burnout

**Solution**:
- Alert on business-impacting symptoms
- Use multi-window burn rate alerts
- Ruthlessly eliminate noisy alerts

### Pitfall 4: No Error Budgets

**Problem**: Chasing 100% uptime without considering costs.

**Result**:
- Slow feature velocity
- Over-engineering
- Missed business opportunities

**Solution**:
- Define realistic SLOs (99.9%, not 99.999%)
- Track error budgets
- Balance reliability with feature velocity

### Pitfall 5: Ignoring Costs

**Problem**: Not monitoring observability infrastructure costs.

**Result**:
- Runaway costs (metrics/logs/traces)
- Budget overruns
- Forced to delete valuable data

**Solution**:
- Use OpenCost to monitor costs
- Set retention policies
- Review and optimize cardinality monthly

### Pitfall 6: Not Testing Observability

**Problem**: Assume monitoring works, never test it.

**Result**:
- Monitoring fails during incidents
- Blind spots discovered too late

**Solution**:
- Chaos engineering to test observability
- Regular fire drills
- Validate alerts trigger correctly

---

## Key Takeaways

🎯 **Modern Observability (2026)**
- Unified platform (metrics, logs, traces, profiles, cost)
- OpenTelemetry as standard
- eBPF for zero-instrumentation
- AI-powered insights

🎯 **OpenTelemetry**
- Vendor-agnostic instrumentation
- OTLP protocol for all signals
- Collector for processing and routing
- Auto-instrumentation where possible

🎯 **eBPF Observability**
- Pixie for auto-instrumentation
- Cilium Hubble for network visibility
- Parca for continuous profiling
- < 1% overhead

🎯 **SLOs and Error Budgets**
- Define SLIs for critical user journeys
- Set realistic SLOs (99.9% not 99.999%)
- Track error budgets
- Balance reliability with velocity

🎯 **Advanced Metrics Storage**
- Grafana Mimir for long-term storage
- 92% memory reduction with MQE
- Horizontal scalability
- S3-compatible object storage

🎯 **Distributed Tracing**
- Grafana Tempo for traces
- OpenTelemetry for instrumentation
- Tail-based sampling
- Correlation with metrics and logs

🎯 **Continuous Profiling**
- Parca or Pyroscope
- Always-on performance monitoring
- Flamegraph analysis
- Minimal overhead

🎯 **Cost Observability**
- OpenCost for Kubernetes costs
- Real-time cost attribution
- Optimization recommendations
- Alert on cost spikes

🎯 **Chaos Engineering**
- Chaos Mesh for resilience testing
- Pod failures, network issues, resource stress
- Automated workflows
- Validate observability works under failure

---

## Resources

### Official Documentation
- [OpenTelemetry](https://opentelemetry.io/) - Instrumentation standard
- [Grafana Mimir](https://grafana.com/oss/mimir/) - Long-term metrics storage
- [Grafana Tempo](https://grafana.com/oss/tempo/) - Distributed tracing
- [Grafana Loki](https://grafana.com/oss/loki/) - Log aggregation

### eBPF Tools
- [Pixie](https://px.dev/) - Auto-instrumentation
- [Cilium Hubble](https://docs.cilium.io/en/stable/gettingstarted/hubble/) - Network observability
- [Parca](https://www.parca.dev/) - Continuous profiling

### SLO Management
- [Sloth](https://sloth.dev/) - SLO generator
- [Pyrra](https://github.com/pyrra-dev/pyrra) - SLO management UI

### Cost Monitoring
- [OpenCost](https://www.opencost.io/) - Kubernetes cost monitoring
- [Kubecost](https://www.kubecost.com/) - Commercial alternative

### Chaos Engineering
- [Chaos Mesh](https://chaos-mesh.org/) - Cloud-native chaos engineering
- [LitmusChaos](https://litmuschaos.io/) - Alternative chaos tool

### Books
- *Observability Engineering* by Charity Majors, Liz Fong-Jones, George Miranda
- *The Art of Monitoring* by James Turnbull
- *Implementing Service Level Objectives* by Alex Hidalgo

### Community
- [CNCF Observability TAG](https://github.com/cncf/tag-observability)
- [OpenTelemetry Community](https://opentelemetry.io/community/)
- [Grafana Community](https://community.grafana.com/)

---

**Previous Module**: [Module 15: Multi-Cluster Management](../Tier-4-Master/Module-15-Multi-Cluster-Management.md)

---

## 🎉 Congratulations!

You have completed the **Kubernetes and Docker Master Course (2026 Edition)**!

You now have comprehensive knowledge of:
- Container fundamentals and Docker
- Kubernetes architecture and workloads
- Production security and networking
- Service mesh with Istio Ambient Mode
- GitOps with ArgoCD
- Multi-cluster management
- Advanced observability

**Next Steps:**
- Build production projects using skills learned
- Pursue certifications (CKA, CKAD, CKS)
- Contribute to CNCF projects
- Join the cloud-native community

---

*This module is part of the Kubernetes and Docker Master Course (2026 Edition). Content reflects Kubernetes 1.35, latest observability tools, and cloud-native best practices.*

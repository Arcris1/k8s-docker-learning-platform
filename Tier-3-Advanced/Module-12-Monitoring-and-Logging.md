# Module 12: Monitoring and Logging

## Learning Objectives

By the end of this module, you will be able to:

1. Understand Prometheus architecture and metric types
2. Write PromQL queries for monitoring and alerting
3. Deploy and configure Kube Prometheus Stack
4. Create and manage ServiceMonitor CRDs
5. Build Grafana dashboards with templating
6. Implement Grafana Mimir 3.0 for scalable metrics (2026)
7. Configure Alertmanager for intelligent routing
8. Deploy Fluent Bit/Fluentd for log collection
9. Use Grafana Loki for log aggregation
10. Query logs with LogQL
11. Implement distributed tracing with OpenTelemetry
12. Build complete observability stack for production

## Introduction

Observability is critical for operating production Kubernetes clusters. This module covers the complete monitoring and logging stack including Prometheus, Grafana, Mimir 3.0 (2026 scalable metrics), Loki for logs, and distributed tracing, providing full-stack observability.

## 1. Prometheus Fundamentals

### 1.1 Prometheus Architecture

```
┌──────────────────────────────────────────────────┐
│              Prometheus Server                   │
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Retrieval │  │  Storage │  │  PromQL     │ │
│  │  (Scrape)  │  │  (TSDB)  │  │  Engine     │ │
│  └─────┬──────┘  └────┬─────┘  └──────┬──────┘ │
└────────┼──────────────┼────────────────┼────────┘
         │              │                │
    Scrape Targets   Local Disk      HTTP API
         │              │                │
         ▼              ▼                ▼
┌─────────────┐  ┌──────────┐    ┌───────────┐
│  Exporters  │  │Time Series│    │ Grafana   │
│ (Metrics)   │  │ Database  │    │Alertmanager│
└─────────────┘  └──────────┘    └───────────┘
```

### 1.2 Metric Types

**Counter (always increases):**
```promql
# HTTP requests total
http_requests_total{method="GET", status="200"}

# Example values over time:
# 10:00 → 100
# 10:01 → 150
# 10:02 → 200

# Rate of increase:
rate(http_requests_total[5m])
```

**Gauge (can go up/down):**
```promql
# Current memory usage
node_memory_usage_bytes

# Current pod count
kube_pod_info

# Temperature, queue size, etc.
```

**Histogram (distribution of values):**
```promql
# Request duration buckets
http_request_duration_seconds_bucket{le="0.1"}  # <= 100ms
http_request_duration_seconds_bucket{le="0.5"}  # <= 500ms
http_request_duration_seconds_bucket{le="1.0"}  # <= 1s

# Calculate percentiles:
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Summary (similar to histogram, pre-calculated quantiles):**
```promql
# Request duration summary
http_request_duration_seconds{quantile="0.5"}   # Median
http_request_duration_seconds{quantile="0.95"}  # 95th percentile
http_request_duration_seconds{quantile="0.99"}  # 99th percentile
```

### 1.3 PromQL Queries

**Basic selectors:**
```promql
# Select all metrics with name
up

# Filter by labels
up{job="kubernetes-nodes"}
up{job="kubernetes-nodes", instance="worker-1"}

# Regex matching
up{job=~"kubernetes-.*"}
up{job!~"kubernetes-.*"}

# Multiple matchers
up{job="kubernetes-nodes", instance=~"worker-.*"}
```

**Range vectors:**
```promql
# Last 5 minutes of data
up[5m]
http_requests_total[1h]

# Rate (per-second average)
rate(http_requests_total[5m])

# Increase (total increase)
increase(http_requests_total[1h])

# irate (instant rate, last 2 points)
irate(http_requests_total[5m])
```

**Aggregation:**
```promql
# Sum across all instances
sum(rate(http_requests_total[5m]))

# Sum by label
sum by (job) (rate(http_requests_total[5m]))
sum by (job, method) (rate(http_requests_total[5m]))

# Average
avg(node_memory_usage_bytes)
avg by (node) (node_memory_usage_bytes)

# Max/Min
max(kube_pod_container_resource_limits_memory_bytes)
min(kube_pod_container_resource_requests_cpu_cores)

# Count
count(up == 1)  # Number of healthy targets
```

**Mathematical operations:**
```promql
# Memory usage percentage
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# CPU usage rate
rate(node_cpu_seconds_total{mode!="idle"}[5m])

# Request error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# Throughput
sum(rate(http_requests_total[5m])) by (job)
```

**Logical operators:**
```promql
# AND
up{job="app"} and on(instance) rate(http_requests_total[5m]) > 100

# OR
up{job="app"} or up{job="backup"}

# UNLESS
up unless on(instance) rate(errors_total[5m]) > 10
```

## 2. Kube Prometheus Stack

### 2.1 Install Kube Prometheus Stack

```bash
# Add Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace monitoring

# Install with custom values
cat <<EOF > kube-prometheus-values.yaml
# Prometheus configuration
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi

    # Additional scrape configs
    additionalScrapeConfigs:
    - job_name: 'custom-app'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

# Grafana configuration
grafana:
  enabled: true
  adminPassword: admin  # Change in production!
  persistence:
    enabled: true
    size: 10Gi

  # Datasources
  additionalDataSources:
  - name: Loki
    type: loki
    url: http://loki:3100
    access: proxy

  # Default dashboards
  defaultDashboardsEnabled: true

# Alertmanager configuration
alertmanager:
  config:
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty'

    receivers:
    - name: 'slack'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

# Node exporter
prometheus-node-exporter:
  enabled: true

# Kube state metrics
kube-state-metrics:
  enabled: true
EOF

# Install
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f kube-prometheus-values.yaml
```

### 2.2 Access Prometheus and Grafana

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090

# Access Prometheus UI: http://localhost:9090

# Port forward Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Access Grafana: http://localhost:3000
# Login: admin / admin (or password from values)
```

### 2.3 ServiceMonitor CRD

**ServiceMonitor automatically discovers and scrapes services:**

```yaml
# Application Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example-app
  template:
    metadata:
      labels:
        app: example-app
    spec:
      containers:
      - name: app
        image: example-app:latest
        ports:
        - name: metrics
          containerPort: 8080

---
# Service with metrics port
apiVersion: v1
kind: Service
metadata:
  name: example-app
  namespace: default
  labels:
    app: example-app
spec:
  selector:
    app: example-app
  ports:
  - name: metrics
    port: 8080
    targetPort: metrics

---
# ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
  namespace: default
  labels:
    app: example-app
spec:
  selector:
    matchLabels:
      app: example-app
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_name]
      targetLabel: pod
    - sourceLabels: [__meta_kubernetes_namespace]
      targetLabel: namespace
```

**PodMonitor (for pods without service):**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: pod-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      monitoring: enabled
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
```

### 2.4 PrometheusRule (Alerting)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-alerts
  namespace: monitoring
spec:
  groups:
  - name: app.rules
    interval: 30s
    rules:
    # High error rate
    - alert: HighErrorRate
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)
        /
        sum(rate(http_requests_total[5m])) by (job)
        > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "{{ $labels.job }} has error rate of {{ $value | humanizePercentage }}"

    # High memory usage
    - alert: HighMemoryUsage
      expr: |
        (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on {{ $labels.instance }}"
        description: "Memory usage is {{ $value | humanizePercentage }}"

    # Pod crashlooping
    - alert: PodCrashLooping
      expr: |
        rate(kube_pod_container_status_restarts_total[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
        description: "Pod has restarted {{ $value }} times in last 15 minutes"

    # Deployment replica mismatch
    - alert: DeploymentReplicasMismatch
      expr: |
        kube_deployment_spec_replicas != kube_deployment_status_replicas_available
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} has mismatched replicas"
```

## 3. Grafana Dashboards

### 3.1 Create Custom Dashboard

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "tags": ["app", "production"],
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 1,
    "refresh": "30s",

    "panels": [
      {
        "id": 1,
        "type": "graph",
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (job)",
            "legendFormat": "{{ job }}"
          }
        ],
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8}
      },
      {
        "id": 2,
        "type": "stat",
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          }
        ],
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 4},
        "options": {
          "colorMode": "background",
          "graphMode": "none",
          "textMode": "value_and_name"
        },
        "thresholds": {
          "steps": [
            {"value": 0, "color": "green"},
            {"value": 1, "color": "yellow"},
            {"value": 5, "color": "red"}
          ]
        }
      }
    ],

    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_pod_info, namespace)",
          "refresh": 1,
          "multi": false
        },
        {
          "name": "pod",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
          "refresh": 1,
          "multi": true
        }
      ]
    }
  }
}
```

### 3.2 Dashboard as Code (ConfigMap)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-app
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  app-dashboard.json: |
    {
      "dashboard": {
        "title": "Application Dashboard",
        "panels": [
          {
            "id": 1,
            "type": "graph",
            "title": "CPU Usage",
            "targets": [{
              "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\",pod=~\"$pod\"}[5m])) by (pod)"
            }]
          }
        ],
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "query": "label_values(kube_pod_info, namespace)"
            },
            {
              "name": "pod",
              "type": "query",
              "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)"
            }
          ]
        }
      }
    }
```

## 4. Grafana Mimir 3.0 (2026)

### 4.1 Mimir Overview

**Grafana Mimir 3.0 features (November 2025):**
- Decoupled architecture
- Kafka ingest layer
- Mimir Query Engine (MQE): 92% memory reduction
- Horizontal scalability
- Multi-tenancy
- Long-term storage

### 4.2 Install Grafana Mimir

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts

# Install Mimir (distributed mode)
cat <<EOF > mimir-values.yaml
mimir:
  structuredConfig:
    # Storage
    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: mimir-blocks
        region: us-east-1

    # Multi-tenancy
    multitenancy_enabled: true

    # Limits
    limits:
      max_global_series_per_user: 10000000
      ingestion_rate: 100000
      ingestion_burst_size: 200000

# Components
distributor:
  replicas: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi

ingester:
  replicas: 5
  persistentVolume:
    enabled: true
    size: 50Gi
  resources:
    requests:
      cpu: 2000m
      memory: 4Gi

querier:
  replicas: 3
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi

query_frontend:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi

compactor:
  replicas: 1
  persistentVolume:
    enabled: true
    size: 50Gi

store_gateway:
  replicas: 3
  persistentVolume:
    enabled: true
    size: 50Gi
EOF

helm install mimir grafana/mimir-distributed \
  -n monitoring \
  -f mimir-values.yaml
```

### 4.3 Configure Prometheus to Remote Write to Mimir

```yaml
# Update Prometheus configuration
prometheus:
  prometheusSpec:
    remoteWrite:
    - url: http://mimir-distributor.monitoring.svc:8080/api/v1/push
      headers:
        X-Scope-OrgID: tenant-1
      queueConfig:
        capacity: 10000
        maxShards: 50
        minShards: 1
        maxSamplesPerSend: 5000
        batchSendDeadline: 5s
      writeRelabelConfigs:
      - sourceLabels: [__name__]
        regex: 'up|process_.*'
        action: drop  # Don't send certain metrics
```

### 4.4 Query Mimir from Grafana

```yaml
# Grafana datasource for Mimir
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-mimir
  namespace: monitoring
data:
  mimir.yaml: |
    apiVersion: 1
    datasources:
    - name: Mimir
      type: prometheus
      access: proxy
      url: http://mimir-query-frontend.monitoring.svc:8080/prometheus
      jsonData:
        httpHeaderName1: 'X-Scope-OrgID'
      secureJsonData:
        httpHeaderValue1: 'tenant-1'
      isDefault: false
```

## 5. Alertmanager Configuration

### 5.1 Advanced Routing

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m
      slack_api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'

    # Templates
    templates:
    - '/etc/alertmanager/templates/*.tmpl'

    # Routing tree
    route:
      receiver: 'default'
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 12h

      # Child routes
      routes:
      # Critical alerts to PagerDuty
      - match:
          severity: critical
        receiver: 'pagerduty'
        group_wait: 10s
        repeat_interval: 1h

      # Database alerts to DB team
      - match_re:
          service: '^(postgres|mysql|mongodb).*'
        receiver: 'database-team'
        group_wait: 30s

      # Namespace-specific routing
      - match:
          namespace: production
        receiver: 'prod-team'
        routes:
        - match:
            severity: critical
          receiver: 'pagerduty'

    # Inhibition rules (suppress alerts)
    inhibit_rules:
    # Suppress warning if critical firing
    - source_match:
        severity: critical
      target_match:
        severity: warning
      equal: ['alertname', 'instance']

    # Suppress NodeNotReady if NodeDown
    - source_match:
        alertname: NodeDown
      target_match:
        alertname: NodeNotReady
      equal: ['instance']

    # Receivers
    receivers:
    - name: 'default'
      slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'pagerduty'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}'

    - name: 'database-team'
      email_configs:
      - to: 'db-team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        headers:
          Subject: '[DB Alert] {{ .GroupLabels.alertname }}'

    - name: 'prod-team'
      slack_configs:
      - channel: '#prod-alerts'
        title: '🔥 Production Alert'
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
```

## 6. Logging with Fluent Bit

### 6.1 Install Fluent Bit

```bash
# Add Fluent Helm repo
helm repo add fluent https://fluent.github.io/helm-charts

# Install Fluent Bit as DaemonSet
cat <<EOF > fluent-bit-values.yaml
# DaemonSet configuration
daemonSetVolumes:
  - name: varlog
    hostPath:
      path: /var/log
  - name: varlibdockercontainers
    hostPath:
      path: /var/lib/docker/containers

daemonSetVolumeMounts:
  - name: varlog
    mountPath: /var/log
    readOnly: true
  - name: varlibdockercontainers
    mountPath: /var/lib/docker/containers
    readOnly: true

# Configuration
config:
  service: |
    [SERVICE]
        Daemon Off
        Flush 1
        Log_Level info
        Parsers_File parsers.conf

  inputs: |
    [INPUT]
        Name tail
        Path /var/log/containers/*.log
        Parser docker
        Tag kube.*
        Mem_Buf_Limit 5MB
        Skip_Long_Lines On

  filters: |
    [FILTER]
        Name kubernetes
        Match kube.*
        Kube_URL https://kubernetes.default.svc:443
        Kube_CA_File /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log On
        Keep_Log Off
        K8S-Logging.Parser On
        K8S-Logging.Exclude On

    [FILTER]
        Name nest
        Match kube.*
        Operation lift
        Nested_under kubernetes
        Add_prefix k8s_

  outputs: |
    [OUTPUT]
        Name loki
        Match kube.*
        Host loki.monitoring.svc
        Port 3100
        Labels job=fluentbit, namespace=$k8s_namespace_name, pod=$k8s_pod_name
        Auto_Kubernetes_Labels on

  parsers: |
    [PARSER]
        Name docker
        Format json
        Time_Key time
        Time_Format %Y-%m-%dT%H:%M:%S.%LZ
EOF

helm install fluent-bit fluent/fluent-bit \
  -n monitoring \
  -f fluent-bit-values.yaml
```

## 7. Grafana Loki

### 7.1 Install Loki

```bash
# Install Loki in microservices mode
cat <<EOF > loki-values.yaml
loki:
  auth_enabled: false

  commonConfig:
    replication_factor: 3

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      s3ForcePathStyle: false

  schemaConfig:
    configs:
    - from: 2024-01-01
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: loki_index_
        period: 24h

# Components
distributor:
  replicas: 3

ingester:
  replicas: 3
  persistence:
    enabled: true
    size: 10Gi

querier:
  replicas: 3

query_frontend:
  replicas: 2

gateway:
  replicas: 2
  service:
    type: LoadBalancer
EOF

helm install loki grafana/loki-distributed \
  -n monitoring \
  -f loki-values.yaml
```

### 7.2 LogQL Queries

**Basic queries:**

```logql
# All logs from namespace
{namespace="production"}

# Logs from specific app
{app="nginx", namespace="production"}

# Multiple labels
{app="nginx", env="prod", level="error"}

# Regex matching
{app=~"nginx|apache"}
{app!~"test.*"}
```

**Line filters:**

```logql
# Contains text
{app="nginx"} |= "error"

# Doesn't contain
{app="nginx"} != "info"

# Regex match
{app="nginx"} |~ "error|warning"

# Case insensitive
{app="nginx"} |~ "(?i)error"

# Chain filters
{app="nginx"} |= "error" != "timeout"
```

**Parsing:**

```logql
# JSON parsing
{app="nginx"} | json

# Extract fields
{app="nginx"} | json | status="500"

# Regex parsing
{app="nginx"} | regexp "status=(?P<status>\\d+)"

# logfmt parsing
{app="app"} | logfmt | level="error"
```

**Aggregations:**

```logql
# Count logs
count_over_time({app="nginx"}[5m])

# Rate (logs per second)
rate({app="nginx"}[5m])

# Sum
sum(rate({app="nginx"}[5m]))

# Sum by label
sum by (namespace) (rate({namespace=~".+"}[5m]))

# Bytes over time
sum(rate({app="nginx"} [5m])) by (namespace)

# Top 10 error producers
topk(10, sum by (app) (rate({level="error"}[5m])))
```

**Metrics from logs:**

```logql
# Count errors
sum(rate({app="nginx"} |= "error" [5m]))

# Error rate
sum(rate({app="nginx"} |= "error" [5m]))
/
sum(rate({app="nginx"} [5m]))

# Response time p95
quantile_over_time(0.95,
  {app="nginx"}
  | json
  | unwrap response_time [5m]
)
```

## 8. Distributed Tracing

### 8.1 OpenTelemetry Collector

```yaml
# Install OpenTelemetry Operator
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml

---
# OpenTelemetry Collector
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  mode: deployment
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      jaeger:
        protocols:
          grpc:
            endpoint: 0.0.0.0:14250

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024

      memory_limiter:
        check_interval: 1s
        limit_mib: 4000
        spike_limit_mib: 500

    exporters:
      # Export to Tempo
      otlp:
        endpoint: tempo.monitoring.svc:4317
        tls:
          insecure: true

      # Export to Prometheus
      prometheusremotewrite:
        endpoint: http://prometheus:9090/api/v1/write

      # Export to Loki
      loki:
        endpoint: http://loki:3100/loki/api/v1/push

    service:
      pipelines:
        traces:
          receivers: [otlp, jaeger]
          processors: [memory_limiter, batch]
          exporters: [otlp]

        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
```

### 8.2 Instrument Application

```python
# Python example with OpenTelemetry
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource

# Setup tracing
resource = Resource.create({"service.name": "my-app"})
trace.set_tracer_provider(TracerProvider(resource=resource))
tracer = trace.get_tracer(__name__)

# Configure exporter
otlp_exporter = OTLPSpanExporter(endpoint="otel-collector:4317", insecure=True)
span_processor = BatchSpanProcessor(otlp_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

# Create spans
@app.route('/api/users')
def get_users():
    with tracer.start_as_current_span("get_users"):
        # Your code
        users = fetch_users_from_db()
        return users

def fetch_users_from_db():
    with tracer.start_as_current_span("db_query"):
        # Database query
        return db.query("SELECT * FROM users")
```

## 9. Hands-On Labs

### Lab 1: Complete Observability Stack

```bash
# Install everything
kubectl create namespace monitoring

# Prometheus Stack
helm install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  -n monitoring

# Loki
helm install loki grafana/loki-distributed -n monitoring

# Fluent Bit
helm install fluent-bit fluent/fluent-bit -n monitoring

# Tempo (distributed tracing)
helm install tempo grafana/tempo -n monitoring

# Access Grafana
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Add Loki datasource in Grafana
# Settings → Data Sources → Add Loki
# URL: http://loki-gateway

# Explore metrics (Prometheus)
# Explore logs (Loki)
# Explore traces (Tempo)
```

### Lab 2: Custom Metrics and Alerts

```yaml
# Deploy sample app with metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
spec:
  replicas: 3
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
        image: quay.io/brancz/prometheus-example-app:v0.3.0
        ports:
        - name: metrics
          containerPort: 8080

---
# ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: sample-app
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: sample-app
  endpoints:
  - port: metrics
    interval: 30s

---
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sample-app-alerts
  namespace: monitoring
spec:
  groups:
  - name: sample-app
    rules:
    - alert: HighRequestRate
      expr: rate(http_requests_total[5m]) > 100
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High request rate"
```

```bash
# Generate traffic
kubectl run loadgen --image=busybox --rm -it -- sh -c \
  "while true; do wget -q -O- http://sample-app:8080; done"

# View in Prometheus
# Query: rate(http_requests_total[5m])

# View in Grafana
# Create panel with above query

# Check if alert fires
# Prometheus → Alerts
```

## Best Practices

### Monitoring
✅ Use ServiceMonitors for auto-discovery
✅ Set appropriate scrape intervals (15s-1m)
✅ Configure retention based on needs
✅ Use recording rules for expensive queries
✅ Implement multi-level alerting (warning, critical)
✅ Tag metrics with meaningful labels

### Logging
✅ Use structured logging (JSON)
✅ Include correlation IDs for tracing
✅ Set log levels appropriately
✅ Implement log retention policies
✅ Use Loki labels sparingly (high cardinality = performance issues)

### Alerting
✅ Alert on symptoms, not causes
✅ Use alert grouping and inhibition
✅ Set appropriate firing and resolution times
✅ Include runbooks in annotations
✅ Test alert routing regularly

## Common Pitfalls

❌ **Too many metrics** → High cardinality kills Prometheus
✅ Drop unnecessary metrics, use recording rules

❌ **No retention policy** → Disk full
✅ Set retention based on needs (default: 15d)

❌ **Alert fatigue** → Ignored alerts
✅ Tune alert thresholds, use inhibition rules

❌ **High cardinality labels in Loki** → Performance issues
✅ Use stream labels sparingly, parse at query time

## Checkpoint

1. **Deploy** Kube Prometheus Stack with custom values
2. **Create** ServiceMonitor for custom application
3. **Write** PromQL query to calculate error rate
4. **Build** Grafana dashboard with templating
5. **Configure** Alertmanager with Slack integration
6. **Set up** Loki and Fluent Bit for log aggregation
7. **Query** logs with LogQL

## Key Takeaways

1. **Prometheus** is the standard for Kubernetes metrics
2. **Kube Prometheus Stack** provides turnkey monitoring
3. **Grafana Mimir 3.0** scales metrics storage (92% memory reduction)
4. **ServiceMonitors** enable automatic service discovery
5. **Grafana** provides powerful visualization
6. **Loki** aggregates logs efficiently with LogQL
7. **OpenTelemetry** unifies observability signals
8. **Complete observability** requires metrics, logs, and traces

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [OpenTelemetry](https://opentelemetry.io/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**Next Module:** [Module 14: Service Mesh with Istio](../Tier-4-Master/Module-14-Service-Mesh-with-Istio.md)

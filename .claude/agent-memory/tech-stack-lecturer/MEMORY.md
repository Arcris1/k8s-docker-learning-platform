# Agent Memory - Tech Stack Lecturer (Kubernetes & Docker Course)

## Course Development - February 2026

### Research Findings - Current State (2026)

**Kubernetes 1.35 (Timbernetes) - Released December 2025:**
- Dynamic Resource Allocation (DRA) graduated to stable
- Pod resource updates without restarts (GA)
- Vertical Pod Autoscaling stable
- Major deprecations: cgroup v1 removal, IPVS mode deprecation, Ingress NGINX retirement (March 2026)
- Gateway API as successor to Ingress
- 60 enhancements total (17 stable, 19 beta, 22 alpha)

**Docker Updates (2025-2026):**
- Docker Hardened Images (DHI) now free and open source (May 2025, Apache 2.0 license)
- Docker Compose v5 with Go SDK
- AI integration via Model Context Protocol (MCP)
- Enhanced Container Isolation for security
- virtiofs for macOS (performance improvement)

**GitOps & ArgoCD:**
- ArgoCD 3.x with OCI registry support (v3.1+)
- Helm chart version 9.4.1 available
- OCI-compliant container registries as sources for manifests
- Multi-cluster ambient mesh support (Istio integration)

**Istio Service Mesh:**
- Ambient mode graduated (Istio 1.27+ August 2025)
- CNCF graduation achieved in 2025
- 30% latency reduction for cross-cluster traffic reported
- Multi-cluster ambient mesh in alpha (Istio 1.27)
- Sidecar-to-ambient migration path documented

**Observability Stack:**
- Prometheus + Grafana remains standard
- Grafana Mimir 3.0 (November 2025) - decoupled architecture, Kafka ingest layer
- Mimir Query Engine (MQE) reduces memory usage by up to 92%
- OpenTelemetry as lingua franca for signals
- Kube Prometheus Stack = Prometheus + Grafana + Alertmanager

**Multi-Cluster Management:**
- 30-80% multi/hybrid-cloud adoption in enterprises
- Key tools: ArgoCD, Karmada, Rancher, Platform9
- Multi-cluster is baseline for enterprise (2026)

**Security Best Practices:**
- CIS Kubernetes Benchmark remains primary standard
- OWASP Kubernetes Top 10 (updated for 2025)
- NSA/CISA Kubernetes Hardening Guide v1.2
- 6 security features graduated to stable in K8s v1.32-v1.35 (2025)
- 8 more features expected to graduate in 2026
- SBOM requirements evolved (OMB M-26-05, risk-based approach, January 2026)

### Effective Teaching Patterns Discovered

**Progressive Disclosure Works Best:**
- Start with "why" before "how"
- Use visual diagrams (ASCII art works in markdown)
- Analogies bridge understanding (containers = hotel rooms, VMs = apartments)
- Comparison tables for technical differences (VMs vs Containers)

**Hands-On Labs Structure:**
- Learning objectives first
- Prerequisites clearly stated
- Step-by-step with expected outputs
- Troubleshooting section for common issues
- Checkpoint questions to verify understanding
- Resources for further learning

**Code Examples:**
- Complete, runnable examples (not snippets)
- Commented code explaining "why" not just "what"
- Production-ready patterns, not just demos
- Include error handling and edge cases
- Show both development and production configurations

**Module Structure That Works:**
1. Learning Objectives (clear, measurable)
2. Introduction (context and motivation)
3. Core Concepts (theory, plain language)
4. Technical Deep Dive (how it works)
5. Hands-On Labs (practical application)
6. Best Practices (industry patterns)
7. Common Pitfalls (what to avoid)
8. Production Considerations (enterprise readiness)
9. Checkpoint (verify understanding)
10. Resources (further learning)

### Technology Stack Patterns

**Container Image Best Practices (2026):**
- Use hardened images (docker.io/dockerhardened/*)
- Multi-stage builds for production
- Alpine/slim variants for size reduction
- Non-root users always
- Specific version tags (never :latest in production)
- .dockerignore to reduce build context

**Kubernetes Resource Sizing:**
- Average CPU utilization in production: 10%
- Average memory utilization: 23%
- 99.94% of clusters are over-provisioned
- Vertical Pod Autoscaling (VPA) addresses this (stable in K8s 1.35)

**GitOps Repository Structures:**
- Directory-based environments preferred over branch-based
- Separate apps/, infra/, projects/ directories
- Kustomize overlays for environment-specific configs
- Helm values files per environment
- Never commit secrets to Git (use External Secrets Operator)

### Common Learner Confusion Points

**Containers vs VMs:**
- Main confusion: "Are containers just lightweight VMs?"
- Key distinction: Shared kernel (containers) vs separate OS (VMs)
- Clarify with architecture diagrams

**Docker Image vs Container:**
- Image = template (cookie cutter)
- Container = running instance (cookie)
- Images are immutable, containers are ephemeral

**Kubernetes Concepts:**
- Pod vs Deployment vs ReplicaSet hierarchy confuses beginners
- Service types (ClusterIP, NodePort, LoadBalancer) need clear examples
- Ingress vs Gateway API transition (2026)

**GitOps Workflow:**
- Push vs Pull deployment models
- Where credentials should live (in-cluster, not CI/CD)
- Git as source of truth concept

### Resources Worth Highlighting

**Official Documentation (Always Current):**
- kubernetes.io/docs
- docs.docker.com
- argo-cd.readthedocs.io
- istio.io

**Industry Standards:**
- CIS Benchmarks for security
- CNCF Landscape for tool discovery
- OCI specifications for container standards

**Learning Platforms:**
- Killercoda (interactive scenarios)
- Play with Docker/K8s (browser environments)

### Version-Specific Notes

**Kubernetes Versions to Reference:**
- 1.35 (current as of Feb 2026)
- Support policy: Last 3 minor versions
- Graduation path: Alpha → Beta → Stable/GA

**Docker Versions:**
- Docker Engine 25.0.x (2026)
- Docker Compose v5
- API version 1.45

**Tool Versions (2026):**
- Helm 3.14+
- ArgoCD 3.x
- Istio 1.27+ (for ambient mode)
- Prometheus Operator latest
- Grafana Mimir 3.0+

### Course Design Decisions

**4-Tier Structure:**
1. Foundations (Beginner) - Docker basics
2. Intermediate - Docker Compose, K8s fundamentals
3. Advanced - Production K8s, security, monitoring
4. Master - GitOps, service mesh, multi-cluster

**Time Estimates:**
- Total: 118-134 hours
- Each module: 4-9 hours depending on complexity
- Capstone projects: 10-15 hours each

**Assessment Strategy:**
- Checkpoint questions per module
- Hands-on labs with verification
- 4 capstone projects
- CKA/CKAD/CKS certification alignment

**COURSE COMPLETED: February 15, 2026**
- ✅ All 16 modules complete (100%)
- ✅ ~131,000 words total content
- ✅ 65+ comprehensive hands-on labs
- ✅ Supporting documentation complete
- Files: COURSE-COMPLETE.md has full details

### Tools and Ecosystem (2026 Landscape)

**Must-Know Tools by Tier:**
- Tier 1: Docker, kubectl, basic YAML
- Tier 2: Docker Compose, Helm, Minikube/Kind
- Tier 3: Prometheus, Grafana, RBAC, Network Policies
- Tier 4: ArgoCD, Istio, Karmada, OpenTelemetry

**Security Tools:**
- Docker Scout (built-in vulnerability scanning)
- Trivy (comprehensive security scanner)
- OPA/Kyverno (policy enforcement)
- Falco (runtime security)
- External Secrets Operator

**Observability Stack:**
- Metrics: Prometheus, Grafana, Mimir
- Logs: Fluent Bit/Fluentd, Grafana Loki
- Traces: OpenTelemetry, Jaeger, Tempo
- Cost: OpenCost

### Industry Trends to Watch

**2026 Trends:**
- AI integration in container operations
- eBPF-based observability gaining traction
- Multi-cluster as standard, not exception
- GitOps adoption at 78% of K8s users
- Service mesh consolidation (Istio dominance)
- Gateway API replacing Ingress
- OCI as universal artifact format

**Deprecated/Retiring:**
- Ingress NGINX (March 2026 retirement)
- IPVS mode in kube-proxy
- cgroup v1 support

### Links to Detailed Notes

(Create separate files for these topics as needed)
- kubernetes-security-2026.md
- docker-hardened-images.md
- argocd-patterns.md
- istio-ambient-mode.md
- multi-cluster-strategies.md

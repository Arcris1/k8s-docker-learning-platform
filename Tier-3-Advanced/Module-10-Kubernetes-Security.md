# Module 10: Kubernetes Security

## Learning Objectives

By the end of this module, you will be able to:

1. Implement Pod Security Standards (Privileged, Baseline, Restricted)
2. Configure RBAC (Roles, ClusterRoles, RoleBindings)
3. Manage Service Accounts and authentication
4. Secure secrets using External Secrets Operator and Sealed Secrets
5. Apply Network Policies for micro-segmentation
6. Implement image security with scanning and admission controllers
7. Use OPA/Kyverno for policy enforcement
8. Configure security contexts and capabilities
9. Monitor runtime security with Falco
10. Apply CIS Kubernetes Benchmark for compliance
11. Implement defense-in-depth security strategy

## Introduction

Security is paramount in Kubernetes. This module covers the complete security stack from Pod Security Standards to runtime threat detection, implementing defense-in-depth principles throughout. All content reflects 2026 security best practices and CIS Benchmark compliance.

## 1. Pod Security Standards

### 1.1 PSS Overview (2026)

**Pod Security Standards replace PSP (deprecated in K8s 1.25):**

```yaml
Three security profiles:
  Privileged:  Unrestricted (legacy apps, system components)
  Baseline:    Minimally restrictive (prevents known privilege escalations)
  Restricted:  Heavily restricted (defense-in-depth best practice)
```

### 1.2 Enable Pod Security Admission

```yaml
# Label namespace with security level
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Modes:**

```yaml
enforce: Block pod creation if violates policy
audit:   Log violations but allow creation
warn:    Show warnings but allow creation
```

### 1.3 Privileged Profile (Avoid in Production)

```yaml
# Namespace with privileged profile
apiVersion: v1
kind: Namespace
metadata:
  name: system-components
  labels:
    pod-security.kubernetes.io/enforce: privileged
```

**Allows everything:**
- Host namespaces (network, PID, IPC)
- Privileged containers
- Host path volumes
- All capabilities

### 1.4 Baseline Profile

```yaml
# Namespace with baseline profile
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

**Prohibits:**
- HostProcess containers (Windows)
- Host namespaces
- Privileged containers
- Dangerous capabilities (ALL)
- hostPath volumes
- HostPort usage
- AppArmor profiles (restricted set)
- SELinux (custom policies restricted)
- /proc mount masks

**Example baseline-compliant pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: baseline-pod
spec:
  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      seccompProfile:
        type: RuntimeDefault
```

### 1.5 Restricted Profile (Production Best Practice)

```yaml
# Namespace with restricted profile
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/enforce-version: latest
```

**Requires (on top of baseline):**
- Non-root containers (`runAsNonRoot: true`)
- Drop ALL capabilities
- Read-only root filesystem (or explicit write paths)
- Seccomp profile (RuntimeDefault or Localhost)
- No privilege escalation

**Example restricted-compliant pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: nginx:alpine
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL

    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run

  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

### 1.6 Cluster-Wide PSS Configuration

```yaml
# Apply to all namespaces (AdmissionConfiguration)
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "restricted"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces: ["kube-system"]
```

## 2. RBAC (Role-Based Access Control)

### 2.1 RBAC Components

```
┌─────────────────────────────────────────────┐
│  Subject (Who)                              │
│  - User                                     │
│  - Group                                    │
│  - ServiceAccount                           │
└──────────────┬──────────────────────────────┘
               │
               │ Binding
               ▼
┌─────────────────────────────────────────────┐
│  Role (What, Where)                         │
│  - Role (namespace-scoped)                  │
│  - ClusterRole (cluster-wide)               │
└─────────────────────────────────────────────┘
```

### 2.2 Roles and RoleBindings

```yaml
# Role: namespace-scoped permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]  # "" indicates core API group
  resources: ["pods"]
  verbs: ["get", "watch", "list"]

---
# RoleBinding: Grants Role to user/group/serviceaccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: app-sa
  namespace: production
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2.3 ClusterRoles and ClusterRoleBindings

```yaml
# ClusterRole: cluster-wide permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]

---
# ClusterRoleBinding: Grants ClusterRole cluster-wide
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global
subjects:
- kind: Group
  name: security-team
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 2.4 Common RBAC Patterns

**Developer Role (namespace-scoped):**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: dev
rules:
# Pods
- apiGroups: [""]
  resources: ["pods", "pods/log", "pods/status"]
  verbs: ["get", "list", "watch", "create", "delete"]

# Deployments
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]

# ConfigMaps (read-only)
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]

# Secrets (no access)
```

**Admin Role (namespace-scoped):**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: production
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
```

**Read-Only Cluster Access:**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: read-only
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- nonResourceURLs: ["*"]
  verbs: ["get", "list"]
```

### 2.5 ServiceAccount RBAC

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployment-controller
  namespace: production

---
# Role for deployment controller
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]

---
# Bind Role to ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-controller-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: deployment-controller
  namespace: production
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

**Use ServiceAccount in Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: deployment-pod
  namespace: production
spec:
  serviceAccountName: deployment-controller
  containers:
  - name: controller
    image: deployment-controller:latest
```

### 2.6 Testing RBAC

```bash
# Check if user can perform action
kubectl auth can-i create deployments --namespace=production

# Check as another user
kubectl auth can-i create deployments --namespace=production --as=jane

# Check as serviceaccount
kubectl auth can-i create deployments --namespace=production \
  --as=system:serviceaccount:production:app-sa

# List all permissions for user
kubectl auth can-i --list --namespace=production --as=jane
```

## 3. Secrets Management

### 3.1 Built-in Secrets (Limitations)

**⚠️ Kubernetes Secrets are NOT secure by default:**
- Base64 encoded (not encrypted)
- Stored in etcd
- Accessible to anyone with API access
- Visible in pod specs

```yaml
# Generic secret
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:  # Unencoded
  username: admin
  password: super-secret-123

# Or base64 encoded
data:
  username: YWRtaW4=
  password: c3VwZXItc2VjcmV0LTEyMw==
```

**Use in Pod:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    # Environment variables
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password

    # Volume mount
    volumeMounts:
    - name: secrets
      mountPath: /secrets
      readOnly: true

  volumes:
  - name: secrets
    secret:
      secretName: db-credentials
```

### 3.2 Encryption at Rest

```yaml
# EncryptionConfiguration
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-32-byte-key>
  - identity: {}  # Fallback for unencrypted data
```

**Enable on API server:**

```bash
# Add to kube-apiserver flags:
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml

# Encrypt all existing secrets
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

### 3.3 External Secrets Operator

**Install External Secrets Operator:**

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

**AWS Secrets Manager Example:**

```yaml
# SecretStore (namespace-scoped)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
# ExternalSecret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore

  target:
    name: db-credentials  # Kubernetes Secret created
    creationPolicy: Owner

  data:
  - secretKey: username
    remoteRef:
      key: prod/database
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database
      property: password
```

**HashiCorp Vault Example:**

```yaml
# ClusterSecretStore (cluster-wide)
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets-system

---
# ExternalSecret using ClusterSecretStore
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secret
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore

  target:
    name: app-secrets

  data:
  - secretKey: api-key
    remoteRef:
      key: production/api
      property: key
```

### 3.4 Sealed Secrets

**Install Sealed Secrets:**

```bash
# Install controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/controller.yaml

# Install kubeseal CLI
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/kubeseal-linux-amd64
chmod +x kubeseal-linux-amd64
sudo mv kubeseal-linux-amd64 /usr/local/bin/kubeseal
```

**Create and seal secret:**

```bash
# Create regular secret (DON'T commit this!)
kubectl create secret generic mysecret \
  --from-literal=username=admin \
  --from-literal=password=secret123 \
  --dry-run=client -o yaml > secret.yaml

# Seal the secret
kubeseal -f secret.yaml -w sealed-secret.yaml

# sealed-secret.yaml is safe to commit to Git!
```

**sealed-secret.yaml:**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
  namespace: default
spec:
  encryptedData:
    password: AgBh8... (encrypted blob)
    username: AgCY9... (encrypted blob)
  template:
    metadata:
      name: mysecret
      namespace: default
```

```bash
# Apply sealed secret (controller decrypts)
kubectl apply -f sealed-secret.yaml

# Kubernetes Secret automatically created
kubectl get secret mysecret
```

## 4. Network Policies (Deep Dive)

### 4.1 Default Deny All

```yaml
# Deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress

---
# Deny all egress
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

### 4.2 Three-Tier Application Security

```yaml
# Frontend: Accept from ingress, connect to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress

  ingress:
  # Allow from ingress controller
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80

  egress:
  # Allow to backend
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 8080

  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    - podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53

---
# Backend: Accept from frontend, connect to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress

  ingress:
  # Allow from frontend
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080

  egress:
  # Allow to database
  - to:
    - podSelector:
        matchLabels:
          tier: database
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

  # Allow external API calls (if needed)
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443

---
# Database: Accept only from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-netpol
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  - Egress

  ingress:
  # Allow only from backend
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432

  egress:
  # Allow DNS only
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

### 4.3 CIDR-Based Rules

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api
spec:
  podSelector:
    matchLabels:
      app: api-client
  policyTypes:
  - Egress

  egress:
  # Allow to specific external IPs
  - to:
    - ipBlock:
        cidr: 203.0.113.0/24
        except:
        - 203.0.113.5/32  # Block specific IP
    ports:
    - protocol: TCP
      port: 443
```

## 5. Image Security

### 5.1 Image Scanning

**Scan with Trivy:**

```bash
# Scan image
trivy image nginx:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL nginx:latest

# Scan and fail on findings
trivy image --exit-code 1 --severity CRITICAL nginx:latest

# Generate report
trivy image --format json -o report.json nginx:latest
```

**Scan with Docker Scout:**

```bash
# Scan image
docker scout cves nginx:latest

# Get recommendations
docker scout recommendations nginx:latest

# Compare with base image
docker scout compare --to nginx:alpine nginx:latest
```

### 5.2 Admission Controllers

**Install OPA Gatekeeper:**

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml
```

**Constraint Template (Allowed Registries):**

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              items:
                type: string

  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8sallowedrepos

      violation[{"msg": msg}] {
        container := input.review.object.spec.containers[_]
        not startswith(container.image, input.parameters.repos[_])
        msg := sprintf("Container image %v not from allowed registry", [container.image])
      }
```

**Constraint (Enforce):**

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaces:
    - "production"

  parameters:
    repos:
    - "docker.io/dockerhardened/"
    - "gcr.io/mycompany/"
    - "ghcr.io/myorg/"
```

**Install Kyverno:**

```bash
kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.11.0/install.yaml
```

**Kyverno Policy (Require Non-Root):**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-run-as-nonroot
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: check-runAsNonRoot
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Running as root is not allowed"
      pattern:
        spec:
          securityContext:
            runAsNonRoot: true
          containers:
          - securityContext:
              runAsNonRoot: true
```

### 5.3 Image Signing Verification

**Sigstore Policy Controller:**

```bash
# Install policy controller
kubectl apply -f https://github.com/sigstore/policy-controller/releases/latest/download/policy-controller.yaml
```

**ClusterImagePolicy:**

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: signed-images-only
spec:
  images:
  - glob: "**"  # All images

  authorities:
  - keyless:
      url: https://fulcio.sigstore.dev
      identities:
      - issuer: https://token.actions.githubusercontent.com
        subject: https://github.com/myorg/*
```

## 6. Security Contexts

### 6.1 Pod-Level Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    # Run as specific user/group
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000

    # Supplemental groups
    supplementalGroups: [4000, 5000]

    # Must run as non-root
    runAsNonRoot: true

    # Seccomp profile
    seccompProfile:
      type: RuntimeDefault

    # SELinux options
    seLinuxOptions:
      level: "s0:c123,c456"

  containers:
  - name: app
    image: nginx:alpine
```

### 6.2 Container-Level Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-container
spec:
  containers:
  - name: app
    image: nginx:alpine

    securityContext:
      # Run as specific user
      runAsUser: 1000
      runAsNonRoot: true

      # Privilege escalation
      allowPrivilegeEscalation: false

      # Privileged mode (AVOID!)
      privileged: false

      # Read-only root filesystem
      readOnlyRootFilesystem: true

      # Capabilities
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE  # Allow binding to ports < 1024

      # Seccomp profile
      seccompProfile:
        type: RuntimeDefault

    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run

  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

### 6.3 AppArmor and Seccomp

**AppArmor:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  containers:
  - name: app
    image: nginx:alpine
```

**Custom Seccomp Profile:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seccomp-pod
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/audit.json
  containers:
  - name: app
    image: nginx:alpine
```

## 7. Runtime Security with Falco

### 7.1 Install Falco

```bash
# Add Falco Helm repository
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

# Install Falco
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set driver.kind=ebpf
```

### 7.2 Falco Rules

**Default rules detect:**
- Shell spawned in container
- Sensitive file access
- Privilege escalation
- Unexpected network connections
- Package management in container

**Custom Rule:**

```yaml
# custom-rules.yaml
- rule: Unauthorized Process
  desc: Detect processes not in allowed list
  condition: >
    container.id != host
    and proc.name not in (nginx, php-fpm, sh, bash)
  output: >
    Unauthorized process started
    (user=%user.name process=%proc.name
    container=%container.name image=%container.image.repository)
  priority: WARNING
  tags: [process, container]
```

**Deploy custom rules:**

```bash
kubectl create configmap falco-rules \
  --from-file=custom-rules.yaml \
  -n falco

# Update Falco deployment to use custom rules
```

### 7.3 Falco Alerts

**Configure alerts to Slack:**

```yaml
# falco-values.yaml
falcosidekick:
  enabled: true
  config:
    slack:
      webhookurl: "https://hooks.slack.com/services/XXX/YYY/ZZZ"
      minimumpriority: "warning"
```

## 8. CIS Kubernetes Benchmark

### 8.1 Run kube-bench

```bash
# Run kube-bench as Job
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# View results
kubectl logs -f job/kube-bench

# Save results
kubectl logs job/kube-bench > kube-bench-report.txt
```

### 8.2 Key CIS Recommendations

**Control Plane:**
- Enable audit logging
- Restrict API server access
- Use TLS for all communications
- Enable RBAC
- Rotate certificates regularly

**Worker Nodes:**
- Restrict kubelet API access
- Enable Node Authorization
- Use seccomp profiles
- Configure kernel parameters

**Policies:**
- Enable Pod Security Standards
- Restrict privileged containers
- Limit resource usage
- Implement Network Policies

## 9. Hands-On Labs

### Lab 1: Implement Pod Security Standards

```yaml
# Create restricted namespace
apiVersion: v1
kind: Namespace
metadata:
  name: secure-app
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted

---
# Compliant deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-nginx
  namespace: secure-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: nginx
        image: nginx:alpine
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        volumeMounts:
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run

      volumes:
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}
```

```bash
# Apply
kubectl apply -f secure-deployment.yaml

# Try violating policy (should fail)
kubectl run test --image=nginx --namespace=secure-app
# Error: violates PodSecurity "restricted:latest"
```

### Lab 2: RBAC Configuration

```yaml
# Create namespace
kubectl create namespace team-a

# Create ServiceAccount
kubectl create serviceaccount developer -n team-a

# Create Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: team-a
rules:
- apiGroups: ["", "apps"]
  resources: ["pods", "deployments", "services"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]

---
# Create RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: team-a
subjects:
- kind: ServiceAccount
  name: developer
  namespace: team-a
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Test permissions
kubectl auth can-i create pods -n team-a \
  --as=system:serviceaccount:team-a:developer
# yes

kubectl auth can-i create secrets -n team-a \
  --as=system:serviceaccount:team-a:developer
# no
```

### Lab 3: External Secrets Operator

```bash
# Install ESO (already done in section 3.3)

# Create AWS SecretStore
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
EOF

# Create ExternalSecret
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: app-credentials
  data:
  - secretKey: api-key
    remoteRef:
      key: production/api
      property: key
EOF

# Verify Secret created
kubectl get secret app-credentials -n production
```

## Best Practices

### Defense-in-Depth
✅ Implement multiple security layers
✅ Use Pod Security Standards (Restricted)
✅ Enable RBAC with least privilege
✅ Apply Network Policies
✅ Scan images regularly
✅ Use admission controllers
✅ Monitor runtime behavior

### Secrets
✅ Never commit secrets to Git
✅ Use External Secrets Operator
✅ Enable encryption at rest
✅ Rotate secrets regularly
✅ Limit secret access with RBAC
✅ Use Sealed Secrets for GitOps

### Images
✅ Use hardened base images
✅ Scan for vulnerabilities
✅ Sign images (Cosign/Sigstore)
✅ Use specific tags (not :latest)
✅ Verify signatures in admission
✅ Update regularly

### Runtime
✅ Run as non-root
✅ Drop ALL capabilities
✅ Read-only root filesystem
✅ Use seccomp profiles
✅ Monitor with Falco
✅ Enable audit logging

## Common Pitfalls

❌ **Running as root** → Security vulnerability
✅ Always set `runAsNonRoot: true`

❌ **No Network Policies** → Unrestricted pod communication
✅ Implement default deny policies

❌ **Secrets in plaintext** → Exposure risk
✅ Use External Secrets Operator

❌ **No image scanning** → Vulnerable containers
✅ Integrate scanning in CI/CD

❌ **Overly permissive RBAC** → Privilege escalation
✅ Follow least privilege principle

## Checkpoint

1. **Implement** Pod Security Standards (Restricted) for namespace
2. **Create** RBAC roles for developer and admin
3. **Configure** External Secrets Operator with cloud provider
4. **Apply** Network Policies for three-tier app
5. **Set up** image scanning in CI/CD pipeline

## Key Takeaways

1. **Pod Security Standards** replace PSPs (use Restricted in production)
2. **RBAC** provides fine-grained access control
3. **External Secrets** solve native Secrets limitations
4. **Network Policies** enable micro-segmentation
5. **Image security** requires scanning and admission control
6. **Security contexts** enforce container isolation
7. **Falco** provides runtime threat detection
8. **Defense-in-depth** combines multiple security layers

## Resources

- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [External Secrets Operator](https://external-secrets.io/)
- [Falco Documentation](https://falco.org/docs/)
- [CIS Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/)
- [Kyverno](https://kyverno.io/)

---

**Next Module:** [Module 11: Kubernetes Configuration and Secrets](Module-11-Kubernetes-Configuration-and-Secrets.md)

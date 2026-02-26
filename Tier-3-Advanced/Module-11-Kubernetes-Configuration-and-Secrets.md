# Module 11: Kubernetes Configuration and Secrets

## Learning Objectives

By the end of this module, you will be able to:

1. Create and manage ConfigMaps from literals, files, and directories
2. Inject configuration via environment variables and volume mounts
3. Understand built-in Secrets types and their limitations
4. Implement External Secrets Operator with multiple backends
5. Use Sealed Secrets for GitOps workflows
6. Integrate HashiCorp Vault for enterprise secret management
7. Apply configuration best practices
8. Implement secret rotation strategies
9. Troubleshoot configuration issues
10. Design secure configuration management architectures

## Introduction

Configuration management and secrets handling are critical for application deployment. This module covers the complete spectrum from basic ConfigMaps to enterprise-grade secret management with External Secrets Operator, Sealed Secrets, and HashiCorp Vault integration.

## 1. ConfigMaps

### 1.1 What are ConfigMaps?

**ConfigMaps decouple configuration from application code:**

```
Benefits:
- Same image across environments
- Configuration changes without rebuilds
- Centralized configuration management
- Version control for configs
```

### 1.2 Create ConfigMaps

**From literals:**

```bash
kubectl create configmap app-config \
  --from-literal=database.host=postgres.production.svc.cluster.local \
  --from-literal=database.port=5432 \
  --from-literal=log.level=info
```

**From file:**

```bash
# app.properties
database.host=postgres
database.port=5432
log.level=info

# Create ConfigMap
kubectl create configmap app-config --from-file=app.properties
```

**From directory:**

```bash
# config/
#   app.properties
#   logging.conf
#   nginx.conf

kubectl create configmap app-config --from-file=config/
```

**From YAML:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # Simple key-value
  database.host: "postgres.production.svc.cluster.local"
  database.port: "5432"
  log.level: "info"

  # Multi-line configuration
  app.properties: |
    database.host=postgres
    database.port=5432
    database.name=myapp
    log.level=info
    cache.enabled=true

  # JSON configuration
  config.json: |
    {
      "database": {
        "host": "postgres",
        "port": 5432
      },
      "features": {
        "cache": true,
        "metrics": true
      }
    }

  # YAML configuration
  application.yaml: |
    database:
      host: postgres
      port: 5432
    logging:
      level: info
```

### 1.3 Use ConfigMap as Environment Variables

**Individual keys:**

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
    # Individual key
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.host

    - name: DATABASE_PORT
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database.port

    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log.level
```

**All keys as environment variables:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    envFrom:
    # All keys from ConfigMap
    - configMapRef:
        name: app-config

    # Prefix keys
    - prefix: CONFIG_
      configMapRef:
        name: app-config
```

### 1.4 Use ConfigMap as Volume

**Mount entire ConfigMap:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config
      readOnly: true

  volumes:
  - name: config
    configMap:
      name: app-config

# Files created:
# /etc/config/database.host (contains: postgres.production...)
# /etc/config/database.port (contains: 5432)
# /etc/config/app.properties (contains: multi-line config)
```

**Mount specific keys:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config

  volumes:
  - name: config
    configMap:
      name: app-config
      items:
      # Select specific keys
      - key: app.properties
        path: application.properties
      - key: config.json
        path: config.json

# Files created:
# /etc/config/application.properties
# /etc/config/config.json
```

**Mount to specific path:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf  # Mount single file

  volumes:
  - name: nginx-config
    configMap:
      name: nginx-config
```

### 1.5 Immutable ConfigMaps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
immutable: true  # Cannot be modified
data:
  key: value
```

**Benefits:**
- Prevents accidental updates
- Improves performance (kube-apiserver doesn't watch)
- Forces explicit version changes

**Update strategy:**

```yaml
# Create new ConfigMap with version
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-v2
immutable: true
data:
  key: new-value

---
# Update Deployment to use new ConfigMap
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config-v2  # Changed from v1
```

### 1.6 ConfigMap Updates

**Mounted as volume (automatic update):**

```yaml
# ConfigMap mounted as volume updates automatically
# BUT: Application must watch file changes

# Example: Nginx reloads config
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    volumeMounts:
    - name: config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
    lifecycle:
      postStart:
        exec:
          command: ["/bin/sh", "-c", "nginx -s reload"]

  volumes:
  - name: config
    configMap:
      name: nginx-config
```

**Environment variables (no auto-update):**

```bash
# Environment variables don't update
# Must restart pod/deployment

kubectl rollout restart deployment/app
```

## 2. Built-in Secrets

### 2.1 Secret Types

```yaml
Opaque:                 Generic secret (default)
kubernetes.io/service-account-token:  ServiceAccount token
kubernetes.io/dockercfg:  Docker registry (legacy)
kubernetes.io/dockerconfigjson:  Docker registry config
kubernetes.io/basic-auth:  Basic authentication
kubernetes.io/ssh-auth:  SSH authentication
kubernetes.io/tls:  TLS certificate
bootstrap.kubernetes.io/token:  Bootstrap token
```

### 2.2 Create Secrets

**Opaque (generic):**

```bash
# From literals
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=super-secret-123

# From file
echo -n 'admin' > username.txt
echo -n 'super-secret-123' > password.txt

kubectl create secret generic db-credentials \
  --from-file=username=username.txt \
  --from-file=password=password.txt
```

**From YAML:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:  # Unencoded (easier)
  username: admin
  password: super-secret-123

# Or base64 encoded
data:
  username: YWRtaW4=  # base64 of "admin"
  password: c3VwZXItc2VjcmV0LTEyMw==  # base64 of "super-secret-123"
```

**Docker registry:**

```bash
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=user@example.com
```

**TLS certificate:**

```bash
kubectl create secret tls tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

**SSH auth:**

```bash
kubectl create secret ssh-auth ssh-key \
  --ssh-privatekey=~/.ssh/id_rsa
```

### 2.3 Use Secrets

**Environment variables:**

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
    # Individual secret key
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

    # All keys from secret
    envFrom:
    - secretRef:
        name: db-credentials
```

**Volume mount:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: secrets
      mountPath: /secrets
      readOnly: true

  volumes:
  - name: secrets
    secret:
      secretName: db-credentials

# Files created:
# /secrets/username
# /secrets/password
```

**ImagePullSecrets:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  imagePullSecrets:
  - name: regcred
  containers:
  - name: app
    image: private-registry.com/myapp:latest
```

### 2.4 Secret Limitations

**⚠️ Built-in Secrets are NOT secure:**

```yaml
Problems:
1. Base64 encoded (NOT encrypted)
2. Stored in etcd (accessible via API)
3. Visible in pod specs (kubectl get pod -o yaml)
4. No audit trail
5. No automatic rotation
6. No fine-grained access control beyond RBAC
```

**Mitigation:**

```yaml
Solutions:
1. Enable encryption at rest (KMS)
2. Use External Secrets Operator
3. Use Sealed Secrets for GitOps
4. Integrate with Vault/cloud secret managers
5. Strict RBAC on secrets
6. Regular rotation
```

## 3. External Secrets Operator

### 3.1 ESO Architecture

```
┌─────────────────────────────────────────────┐
│  External Secret Manager                    │
│  (Vault, AWS, GCP, Azure, etc.)            │
└──────────────┬──────────────────────────────┘
               │
               │ Syncs
               ▼
┌─────────────────────────────────────────────┐
│  External Secrets Operator                  │
│  ┌──────────────┐  ┌───────────────┐       │
│  │ SecretStore  │  │ExternalSecret │       │
│  └──────────────┘  └───────────────┘       │
└──────────────┬──────────────────────────────┘
               │
               │ Creates/Updates
               ▼
┌─────────────────────────────────────────────┐
│  Kubernetes Secret                          │
└─────────────────────────────────────────────┘
```

### 3.2 Install ESO

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

### 3.3 AWS Secrets Manager

**IAM Role for ServiceAccount (IRSA):**

```yaml
# ServiceAccount with IAM role
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/external-secrets-role
```

**SecretStore:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
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
```

**ExternalSecret:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h  # Sync every hour

  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore

  target:
    name: db-credentials  # Kubernetes Secret created
    creationPolicy: Owner
    deletionPolicy: Retain

  data:
  # Extract specific keys
  - secretKey: username
    remoteRef:
      key: production/database
      property: username

  - secretKey: password
    remoteRef:
      key: production/database
      property: password

  # Extract entire JSON
  dataFrom:
  - extract:
      key: production/app-config
```

### 3.4 Google Secret Manager

**ServiceAccount with Workload Identity:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: external-secrets@project-id.iam.gserviceaccount.com
```

**SecretStore:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-manager
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "my-project-123"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: production-cluster
          serviceAccountRef:
            name: external-secrets-sa
```

**ExternalSecret:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: gcp-secret-manager
    kind: SecretStore

  target:
    name: app-credentials

  data:
  - secretKey: api-key
    remoteRef:
      key: production-api-key
      version: latest  # Or specific version: "1"
```

### 3.5 Azure Key Vault

**Managed Identity:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: 12345678-1234-1234-1234-123456789012
```

**SecretStore:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authType: WorkloadIdentity
      serviceAccountRef:
        name: external-secrets-sa
```

**ExternalSecret:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: azure-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore

  target:
    name: app-secrets

  data:
  - secretKey: connection-string
    remoteRef:
      key: database-connection-string
```

### 3.6 HashiCorp Vault

**ClusterSecretStore (cluster-wide):**

```yaml
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
```

**ExternalSecret:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secrets
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore

  target:
    name: vault-credentials
    template:
      engineVersion: v2
      data:
        # Template secrets
        connection: "postgres://{{ .username }}:{{ .password }}@postgres:5432/db"

  data:
  - secretKey: username
    remoteRef:
      key: production/database
      property: username

  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

## 4. Sealed Secrets

### 4.1 Sealed Secrets Overview

**Workflow:**

```
1. Create regular Secret (locally)
2. Seal Secret with public key (kubeseal)
3. Commit SealedSecret to Git (safe!)
4. Apply to cluster
5. Controller decrypts with private key
6. Creates Kubernetes Secret
```

### 4.2 Install Sealed Secrets

```bash
# Install controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/controller.yaml

# Install kubeseal CLI
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.26.0/kubeseal-0.26.0-linux-amd64.tar.gz
tar -xzf kubeseal-0.26.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

### 4.3 Create and Seal Secret

```bash
# Create regular secret YAML (DON'T commit!)
kubectl create secret generic mysecret \
  --from-literal=username=admin \
  --from-literal=password=secret123 \
  --dry-run=client -o yaml > secret.yaml

# Seal the secret
kubeseal -f secret.yaml -w sealed-secret.yaml

# Or pipe directly
kubectl create secret generic mysecret \
  --from-literal=username=admin \
  --from-literal=password=secret123 \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml
```

**sealed-secret.yaml (safe to commit):**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
  namespace: default
spec:
  encryptedData:
    password: AgBh8VwPW0... (long encrypted string)
    username: AgCY9mPLK... (long encrypted string)
  template:
    metadata:
      name: mysecret
      namespace: default
    type: Opaque
```

### 4.4 Encryption Scopes

**Strict (default - namespace and name):**

```bash
# Sealed for specific namespace and name
kubeseal -f secret.yaml -w sealed-secret.yaml
# Can only be decrypted as "mysecret" in "default" namespace
```

**Namespace-wide:**

```bash
# Can be used with any name in namespace
kubeseal --scope namespace-wide -f secret.yaml -w sealed-secret.yaml
```

**Cluster-wide:**

```bash
# Can be used anywhere in cluster
kubeseal --scope cluster-wide -f secret.yaml -w sealed-secret.yaml
```

### 4.5 Key Management

```bash
# Backup sealed-secrets controller keys (IMPORTANT!)
kubectl get secret -n kube-system sealed-secrets-key -o yaml > sealed-secrets-key-backup.yaml

# Store backup securely (encrypted, off-cluster)

# Restore keys (disaster recovery)
kubectl apply -f sealed-secrets-key-backup.yaml

# Restart controller
kubectl delete pod -n kube-system -l name=sealed-secrets-controller
```

## 5. Complete Example: Multi-Environment Configuration

### 5.1 Directory Structure

```
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── dev/
│   │   ├── configmap.yaml
│   │   ├── external-secret.yaml
│   │   └── kustomization.yaml
│   ├── staging/
│   │   ├── configmap.yaml
│   │   ├── external-secret.yaml
│   │   └── kustomization.yaml
│   └── production/
│       ├── configmap.yaml
│       ├── external-secret.yaml
│       ├── sealed-secret.yaml
│       └── kustomization.yaml
```

### 5.2 Base Deployment

```yaml
# base/deployment.yaml
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
      - name: app
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

### 5.3 Development Config

```yaml
# overlays/dev/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  ENV: development
  LOG_LEVEL: debug
  DATABASE_HOST: postgres-dev.default.svc.cluster.local

---
# overlays/dev/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
  data:
  - secretKey: db-password
    remoteRef:
      key: dev/database
      property: password
```

### 5.4 Production Config

```yaml
# overlays/production/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  ENV: production
  LOG_LEVEL: info
  DATABASE_HOST: postgres.production.svc.cluster.local

---
# overlays/production/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: app-secrets
  data:
  - secretKey: db-password
    remoteRef:
      key: production/database
      property: password

---
# overlays/production/sealed-secret.yaml (for GitOps)
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: tls-cert
spec:
  encryptedData:
    tls.crt: AgBe3K...
    tls.key: AgCp9...
```

## 6. Hands-On Labs

### Lab 1: ConfigMap Injection Methods

```yaml
# Create ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key1: value1
  key2: value2
  config.json: |
    {
      "feature": "enabled",
      "timeout": 30
    }

---
# Test Pod
apiVersion: v1
kind: Pod
metadata:
  name: config-test
spec:
  containers:
  - name: test
    image: busybox
    command: ['sh', '-c', 'echo "ENV: $KEY1"; cat /config/config.json; sleep 3600']
    env:
    - name: KEY1
      valueFrom:
        configMapKeyRef:
          name: test-config
          key: key1
    volumeMounts:
    - name: config
      mountPath: /config
  volumes:
  - name: config
    configMap:
      name: test-config
```

```bash
# Apply
kubectl apply -f config-test.yaml

# Verify environment variable
kubectl exec config-test -- env | grep KEY1

# Verify volume mount
kubectl exec config-test -- cat /config/config.json

# Update ConfigMap
kubectl patch configmap test-config -p '{"data":{"key1":"updated"}}'

# Check if updated (volume mounts update, env vars don't)
kubectl exec config-test -- cat /config/key1
# Shows: updated

kubectl exec config-test -- env | grep KEY1
# Shows: value1 (old value, needs pod restart)
```

### Lab 2: External Secrets Operator with AWS

```bash
# Prerequisites: AWS account, eksctl cluster with IRSA

# Create IAM policy
cat > eso-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ],
    "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:production/*"
  }]
}
EOF

aws iam create-policy --policy-name ESO-Policy --policy-document file://eso-policy.json

# Create IAM role with IRSA
eksctl create iamserviceaccount \
  --name external-secrets-sa \
  --namespace production \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::ACCOUNT:policy/ESO-Policy \
  --approve

# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name production/database \
  --secret-string '{"username":"admin","password":"secret123"}' \
  --region us-east-1

# Create SecretStore
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-sm
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
  name: db-creds
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-sm
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
EOF

# Verify Secret created
kubectl get secret database-credentials -n production -o yaml
```

### Lab 3: Sealed Secrets Workflow

```bash
# Create secret
kubectl create secret generic app-secret \
  --from-literal=api-key=secret-api-key-123 \
  --from-literal=token=secret-token-456 \
  --dry-run=client -o yaml > secret.yaml

# Seal it
kubeseal -f secret.yaml -w sealed-secret.yaml

# View sealed secret (safe to commit)
cat sealed-secret.yaml

# Commit to Git
git add sealed-secret.yaml
git commit -m "Add sealed secret"
git push

# Apply sealed secret
kubectl apply -f sealed-secret.yaml

# Verify Secret created
kubectl get secret app-secret -o yaml

# Use in Pod
kubectl run test --image=busybox --rm -it -- sh -c \
  'echo $API_KEY' \
  --env="API_KEY" \
  --overrides='{"spec":{"containers":[{"name":"test","image":"busybox","env":[{"name":"API_KEY","valueFrom":{"secretKeyRef":{"name":"app-secret","key":"api-key"}}}],"command":["sh","-c","echo API_KEY=$API_KEY; sleep 3600"]}]}}'
```

## Best Practices

### ConfigMaps
✅ Use for non-sensitive configuration
✅ Version ConfigMaps (app-config-v1, app-config-v2)
✅ Use immutable ConfigMaps for stability
✅ Mount as volumes for auto-updates
✅ Keep configs small (< 1MB)
✅ One ConfigMap per application/component

### Secrets
✅ Never use built-in Secrets for sensitive data
✅ Use External Secrets Operator
✅ Enable encryption at rest (KMS)
✅ Rotate secrets regularly
✅ Use Sealed Secrets for GitOps
✅ Limit secret access with RBAC
✅ Audit secret access

### General
✅ Separate configuration from code
✅ Use same image across environments
✅ Document configuration keys
✅ Validate configuration on startup
✅ Use defaults for optional configs
✅ Test configuration changes in non-prod first

## Common Pitfalls

❌ **Committing secrets to Git** → Exposure
✅ Use Sealed Secrets or External Secrets

❌ **Using environment variables for large configs** → Pod spec bloat
✅ Use volume mounts for large/complex configs

❌ **No config validation** → Runtime failures
✅ Validate configuration on application startup

❌ **Hardcoded values in images** → Rebuilds for config changes
✅ Use ConfigMaps for all configuration

❌ **Expecting env vars to auto-update** → Stale configuration
✅ Use volume mounts for automatic updates

## Checkpoint

1. **Create** ConfigMap and inject via env vars and volume
2. **Set up** External Secrets Operator with cloud provider
3. **Implement** Sealed Secrets workflow
4. **Design** multi-environment configuration strategy
5. **Rotate** secrets using External Secrets Operator

## Key Takeaways

1. **ConfigMaps** separate configuration from application code
2. **Built-in Secrets** have significant security limitations
3. **External Secrets Operator** integrates with enterprise secret managers
4. **Sealed Secrets** enable GitOps for secrets
5. **Volume mounts** provide auto-updating configuration
6. **Environment variables** are simpler but don't auto-update
7. **Immutable ConfigMaps** prevent accidental changes
8. **Defense-in-depth** combines multiple secret management approaches

## Resources

- [ConfigMap Documentation](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Secrets Documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [External Secrets Operator](https://external-secrets.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [HashiCorp Vault K8s](https://www.vaultproject.io/docs/platform/k8s)

---

**Next Module:** [Module 12: Monitoring and Logging](Module-12-Monitoring-and-Logging.md)

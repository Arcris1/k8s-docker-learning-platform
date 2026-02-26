# Module 9: Kubernetes Storage

## Learning Objectives

By the end of this module, you will be able to:

1. Understand Persistent Volumes (PV) and Persistent Volume Claims (PVC)
2. Configure Storage Classes for dynamic provisioning
3. Implement CSI (Container Storage Interface) drivers
4. Use StatefulSet storage patterns effectively
5. Create and manage volume snapshots
6. Implement backup and restore with Velero
7. Optimize storage performance
8. Design production-ready storage architectures
9. Troubleshoot storage issues
10. Implement data protection strategies

## Introduction

Storage is critical for stateful applications in Kubernetes. This module covers the complete storage stack from basic volumes to production-grade backup solutions with Velero, including volume snapshots and CSI drivers that are standard in Kubernetes 1.35.

## 1. Storage Fundamentals

### 1.1 Volume Types Overview

```yaml
# Ephemeral (deleted with pod):
- emptyDir         # Temporary storage
- configMap        # Configuration files
- secret           # Sensitive data
- downwardAPI      # Pod metadata

# Persistent (survives pod deletion):
- persistentVolumeClaim  # Dynamic persistent storage
- hostPath              # Node filesystem (dev only)
- nfs                    # Network file system
- cloud volumes          # AWS EBS, GCE PD, Azure Disk
```

### 1.2 EmptyDir (Temporary Storage)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cache-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: cache-volume
      mountPath: /cache

  volumes:
  - name: cache-volume
    emptyDir:
      sizeLimit: 1Gi  # Limit size
      # medium: Memory  # Use RAM instead of disk
```

**Use cases:**
- Temporary cache
- Scratch space
- Shared data between containers in same pod

### 1.3 HostPath (Node Filesystem)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: host-volume
      mountPath: /host-data

  volumes:
  - name: host-volume
    hostPath:
      path: /data
      type: DirectoryOrCreate
```

**⚠️ Use only for:**
- Testing/development
- System pods (node monitoring)
- Never for production applications (data loss if pod moves nodes)

## 2. Persistent Volumes and Claims

### 2.1 Architecture

```
┌──────────────────────────────────────────────┐
│  Storage Administrator                       │
│  ┌────────────────────┐                      │
│  │ Persistent Volume  │ (Cluster resource)   │
│  │ - 10Gi SSD         │                      │
│  │ - ReadWriteOnce    │                      │
│  └────────────────────┘                      │
└─────────────┬────────────────────────────────┘
              │
              │ Binding
              ▼
┌──────────────────────────────────────────────┐
│  Application Developer                       │
│  ┌──────────────────────────────┐            │
│  │ Persistent Volume Claim (PVC)│            │
│  │ - Request: 5Gi               │            │
│  │ - Access: ReadWriteOnce      │            │
│  └──────────────────────────────┘            │
└──────────────────────────────────────────────┘
```

### 2.2 Create PersistentVolume (Manual)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-manual
spec:
  capacity:
    storage: 10Gi

  accessModes:
  - ReadWriteOnce  # RWO: Single node read-write

  # Reclaim policy
  persistentVolumeReclaimPolicy: Retain  # or Delete, Recycle

  # Storage class (optional)
  storageClassName: manual

  # Actual storage backend
  hostPath:
    path: /mnt/data
```

**Access Modes:**

```yaml
ReadWriteOnce (RWO):  # Single node, read-write
  - Most common
  - Block storage (EBS, GCE PD, Azure Disk)

ReadOnlyMany (ROX):   # Multiple nodes, read-only
  - Shared read access
  - NFS, cloud file storage

ReadWriteMany (RWX):  # Multiple nodes, read-write
  - Shared read-write
  - NFS, CephFS, GlusterFS, cloud file systems
```

**Reclaim Policies:**

```yaml
Retain:  # Keep PV after PVC deleted (manual cleanup)
Delete:  # Delete PV and underlying storage automatically
Recycle: # Deprecated (use dynamic provisioning instead)
```

### 2.3 Create PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
  - ReadWriteOnce

  resources:
    requests:
      storage: 5Gi

  storageClassName: manual  # Match PV storage class

  # Optional: Selector for specific PV
  selector:
    matchLabels:
      type: fast
```

**Binding:**

```bash
# Check PVC status
kubectl get pvc

# Output:
# NAME     STATUS   VOLUME      CAPACITY   ACCESS MODES
# my-pvc   Bound    pv-manual   10Gi       RWO

# Check PV
kubectl get pv

# Output:
# NAME        CAPACITY   ACCESS MODES   RECLAIM   STATUS   CLAIM
# pv-manual   10Gi       RWO            Retain    Bound    default/my-pvc
```

### 2.4 Use PVC in Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pvc-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: storage
      mountPath: /usr/share/nginx/html

  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: my-pvc
```

**Multiple pods can share RWX volumes:**

```yaml
# Pod 1
apiVersion: v1
kind: Pod
metadata:
  name: pod1
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: shared-pvc  # ReadWriteMany PVC

---
# Pod 2 (can mount same PVC if RWX)
apiVersion: v1
kind: Pod
metadata:
  name: pod2
spec:
  containers:
  - name: app
    image: busybox
    command: ['sh', '-c', 'echo "Hello" > /data/message.txt; sleep 3600']
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: shared-pvc
```

## 3. Storage Classes (Dynamic Provisioning)

### 3.1 What are Storage Classes?

**Benefits:**
- Automatic PV creation
- No manual PV management
- Different tiers (fast SSD, standard HDD, archive)
- Cloud provider integration

### 3.2 AWS EBS Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3              # SSD type
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  kmsKeyId: arn:aws:kms:...

volumeBindingMode: WaitForFirstConsumer  # Topology-aware
reclaimPolicy: Delete
allowVolumeExpansion: true
```

**Usage:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-claim
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd  # References StorageClass
  resources:
    requests:
      storage: 100Gi
```

**Kubernetes automatically:**
1. Sees new PVC
2. Finds StorageClass "fast-ssd"
3. Calls AWS API to create EBS volume
4. Creates PV object
5. Binds PV to PVC

### 3.3 Google Cloud Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-regional
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd  # Regional replication

volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: true
```

### 3.4 Azure Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  kind: Managed

reclaimPolicy: Delete
allowVolumeExpansion: true
```

### 3.5 NFS Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  archiveOnDelete: "false"

reclaimPolicy: Delete
volumeBindingMode: Immediate
```

### 3.6 Local Storage Class

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner  # No dynamic provisioning
volumeBindingMode: WaitForFirstConsumer
```

**Use with Local PersistentVolume:**

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Delete
  storageClassName: local-storage
  local:
    path: /mnt/disks/ssd1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - node1
```

### 3.7 Default Storage Class

```bash
# Set default storage class
kubectl patch storageclass fast-ssd -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# View default
kubectl get storageclass

# Output:
# NAME                 PROVISIONER            RECLAIMPOLICY
# fast-ssd (default)   ebs.csi.aws.com        Delete
# standard             kubernetes.io/aws-ebs  Delete
```

**PVC without storageClassName uses default:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: auto-provision
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  # No storageClassName specified → uses default
```

## 4. CSI (Container Storage Interface)

### 4.1 CSI Overview

**CSI provides:**
- Standard interface for storage
- Vendor-neutral
- Pluggable storage backends
- Volume snapshots
- Volume cloning
- Volume expansion

**Popular CSI drivers (2026):**

```yaml
Cloud Providers:
- ebs.csi.aws.com              # AWS EBS
- pd.csi.storage.gke.io        # Google Cloud Persistent Disk
- disk.csi.azure.com           # Azure Disk
- file.csi.azure.com           # Azure Files

On-Premise:
- csi.ceph.com                 # Ceph RBD
- org.democratic-csi.nfs       # NFS
- driver.longhorn.io           # Longhorn
- hostpath.csi.k8s.io          # Local storage (dev only)
```

### 4.2 Install CSI Driver (AWS EBS Example)

```bash
# Install AWS EBS CSI driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.27"

# Verify installation
kubectl get pods -n kube-system | grep ebs-csi

# Create IAM role for CSI driver (AWS)
# Follow: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/install.md
```

### 4.3 CSI Volume Lifecycle

```
1. Create PVC
   ↓
2. CSI Controller provisions volume (CreateVolume)
   ↓
3. Volume becomes available
   ↓
4. Pod scheduled to node
   ↓
5. CSI Node attaches volume to node (ControllerPublishVolume)
   ↓
6. CSI Node mounts volume into pod (NodePublishVolume)
   ↓
7. Pod uses volume
   ↓
8. Pod deleted
   ↓
9. CSI Node unmounts volume (NodeUnpublishVolume)
   ↓
10. CSI Controller detaches volume (ControllerUnpublishVolume)
    ↓
11. PVC deleted
    ↓
12. CSI Controller deletes volume (DeleteVolume)
```

## 5. StatefulSet Storage Patterns

### 5.1 VolumeClaimTemplates

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database

  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: secret
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data

  # VolumeClaimTemplate creates PVC per pod
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

**Result:**

```bash
# Three pods created
database-0
database-1
database-2

# Three PVCs created automatically
data-database-0  → 50Gi volume
data-database-1  → 50Gi volume
data-database-2  → 50Gi volume

# If pod deleted, new pod uses same PVC (data persists!)
kubectl delete pod database-1
# New database-1 pod uses existing data-database-1 PVC
```

### 5.2 StatefulSet Storage Scaling

```bash
# Scale up
kubectl scale statefulset database --replicas=5

# Creates database-3 and database-4
# Creates data-database-3 and data-database-4

# Scale down
kubectl scale statefulset database --replicas=3

# Deletes database-4 and database-3 pods
# PVCs remain! (data-database-4, data-database-3)

# Manual PVC cleanup if needed
kubectl delete pvc data-database-4 data-database-3
```

## 6. Volume Snapshots

### 6.1 VolumeSnapshot CRDs

**Install snapshot CRDs:**

```bash
# Install VolumeSnapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml

# Install snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

### 6.2 VolumeSnapshotClass

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete  # or Retain
parameters:
  tagSpecifications: |
    - resourceType: snapshot
      tags:
      - key: Environment
        value: production
```

### 6.3 Create Snapshot

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot-1
spec:
  volumeSnapshotClassName: ebs-snapshot-class
  source:
    persistentVolumeClaimName: data-database-0
```

```bash
# Create snapshot
kubectl apply -f snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot

# Output:
# NAME                  READYTOUSE   SOURCEPVC        AGE
# database-snapshot-1   true         data-database-0  2m

# View snapshot details
kubectl describe volumesnapshot database-snapshot-1
```

### 6.4 Restore from Snapshot

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-pvc
spec:
  dataSource:
    name: database-snapshot-1
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 50Gi
```

```bash
# Create PVC from snapshot
kubectl apply -f restore-pvc.yaml

# Use in pod
kubectl run test --image=postgres:16 \
  --overrides='{"spec":{"containers":[{"name":"postgres","image":"postgres:16","volumeMounts":[{"mountPath":"/var/lib/postgresql/data","name":"data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"restored-pvc"}}]}}'
```

### 6.5 Automated Snapshots

```yaml
# CronJob for regular snapshots
apiVersion: batch/v1
kind: CronJob
metadata:
  name: database-snapshot
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              DATE=$(date +%Y%m%d-%H%M%S)
              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: auto-snapshot-${DATE}
              spec:
                volumeSnapshotClassName: ebs-snapshot-class
                source:
                  persistentVolumeClaimName: data-database-0
              EOF
          restartPolicy: OnFailure
```

## 7. Backup and Restore with Velero

### 7.1 Velero Overview

**Velero provides:**
- Cluster backup and restore
- Disaster recovery
- Cluster migration
- Scheduled backups
- Backup to object storage (S3, GCS, Azure Blob)

### 7.2 Install Velero

```bash
# Download Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.13.0/velero-v1.13.0-linux-amd64.tar.gz
tar -xvf velero-v1.13.0-linux-amd64.tar.gz
sudo mv velero-v1.13.0-linux-amd64/velero /usr/local/bin/

# Install Velero (AWS example)
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero

# Verify installation
kubectl get pods -n velero
```

**credentials-velero file (AWS):**

```ini
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
```

### 7.3 Create Backup

```bash
# Backup entire cluster
velero backup create full-backup

# Backup specific namespace
velero backup create app-backup --include-namespaces production

# Backup with label selector
velero backup create critical-apps --selector app=database

# Exclude namespaces
velero backup create backup-1 --exclude-namespaces kube-system,kube-public

# Check backup status
velero backup describe full-backup

# List backups
velero backup get

# View backup logs
velero backup logs full-backup
```

### 7.4 Scheduled Backups

```bash
# Create schedule (daily at 2 AM)
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production

# Create schedule (every 6 hours)
velero schedule create frequent-backup \
  --schedule="@every 6h"

# List schedules
velero schedule get

# Delete schedule
velero schedule delete daily-backup
```

### 7.5 Restore from Backup

```bash
# Restore everything
velero restore create --from-backup full-backup

# Restore specific namespace
velero restore create --from-backup app-backup \
  --include-namespaces production

# Restore to different namespace
velero restore create --from-backup app-backup \
  --namespace-mappings production:staging

# Check restore status
velero restore describe <restore-name>

# List restores
velero restore get
```

### 7.6 Disaster Recovery Scenario

```bash
# Scenario: Complete cluster failure

# Step 1: Create new cluster
# (provision new Kubernetes cluster)

# Step 2: Install Velero pointing to same backup storage
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --secret-file ./credentials-velero

# Step 3: Check available backups
velero backup get

# Step 4: Restore from latest backup
velero restore create disaster-recovery \
  --from-backup full-backup

# Step 5: Verify restoration
kubectl get pods --all-namespaces
kubectl get pvc --all-namespaces

# Applications and data restored!
```

## 8. Storage Performance Optimization

### 8.1 Choose Right Storage Type

```yaml
# SSD for databases (low latency)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: database-storage
provisioner: ebs.csi.aws.com
parameters:
  type: io2      # Provisioned IOPS SSD
  iops: "10000"
  throughput: "1000"

# Standard for logs/archives (cost-effective)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: archive-storage
provisioner: ebs.csi.aws.com
parameters:
  type: sc1  # Cold HDD
```

### 8.2 Volume Topology

```yaml
# WaitForFirstConsumer ensures volume created in same zone as pod
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topology-aware
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer  # Important!
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1a
    - us-east-1b
```

### 8.3 Volume Expansion

```yaml
# Enable expansion in StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable
provisioner: ebs.csi.aws.com
allowVolumeExpansion: true  # Enable expansion
```

```bash
# Expand PVC
kubectl patch pvc my-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Check expansion status
kubectl get pvc my-pvc -w

# Some storage types require pod restart
kubectl delete pod <pod-using-pvc>
```

## 9. Hands-On Labs

### Lab 1: Dynamic Provisioning

```yaml
# StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: kubernetes.io/no-provisioner  # Replace with your CSI driver
volumeBindingMode: WaitForFirstConsumer

---
# PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast
  resources:
    requests:
      storage: 1Gi

---
# Pod
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: test-pvc
```

```bash
# Apply
kubectl apply -f dynamic-storage.yaml

# Verify PVC bound
kubectl get pvc

# Verify PV created
kubectl get pv

# Test data persistence
kubectl exec test-pod -- sh -c "echo 'Hello Persistent Storage' > /data/test.txt"

# Delete pod
kubectl delete pod test-pod

# Recreate pod
kubectl apply -f dynamic-storage.yaml

# Data persists!
kubectl exec test-pod -- cat /data/test.txt
```

### Lab 2: StatefulSet with Persistent Storage

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: web
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

```bash
# Create StatefulSet
kubectl apply -f statefulset-storage.yaml

# Verify PVCs created
kubectl get pvc

# Write unique data to each pod
for i in 0 1 2; do
  kubectl exec web-$i -- sh -c "echo 'Pod $i data' > /usr/share/nginx/html/index.html"
done

# Verify unique data
for i in 0 1 2; do
  kubectl exec web-$i -- cat /usr/share/nginx/html/index.html
done

# Delete pod
kubectl delete pod web-1

# Verify data persists in new pod
kubectl exec web-1 -- cat /usr/share/nginx/html/index.html
```

## Best Practices

### Storage Classes
✅ Use dynamic provisioning (don't create PVs manually)
✅ Set appropriate `volumeBindingMode`
✅ Enable `allowVolumeExpansion`
✅ Use descriptive names (fast-ssd, standard-hdd)
✅ Set sensible default StorageClass

### PVCs
✅ Always set resource requests
✅ Use appropriate access mode
✅ Set storage class explicitly
✅ Use meaningful names
✅ Don't request more than needed (costs money)

### Backups
✅ Implement regular automated backups
✅ Test restore procedures regularly
✅ Use volume snapshots for quick recovery
✅ Use Velero for disaster recovery
✅ Monitor backup success/failures

### Performance
✅ Choose right storage type for workload
✅ Use local storage for latency-sensitive apps
✅ Use SSD for databases
✅ Enable topology-aware provisioning
✅ Monitor IOPS and throughput

## Common Pitfalls

❌ **No backups** → Data loss
✅ Implement automated backup strategy

❌ **Wrong access mode** → Pods can't schedule
✅ Use RWO for most workloads, RWX only when needed

❌ **No storage class** → PVC pending
✅ Set default StorageClass or specify explicitly

❌ **Deleting StatefulSet cascades to PVCs** → Data loss
✅ Delete with `--cascade=orphan` or manually delete PVCs

## Checkpoint

1. **Create** PVC with dynamic provisioning
2. **Implement** StatefulSet with persistent storage
3. **Create** volume snapshot and restore
4. **Set up** Velero backup schedule
5. **Expand** PVC from 10Gi to 20Gi

## Key Takeaways

1. **PV/PVC** separate storage provisioning from consumption
2. **StorageClasses** enable dynamic provisioning
3. **CSI** provides pluggable storage backends
4. **StatefulSets** with volumeClaimTemplates provide stable storage
5. **Volume snapshots** enable point-in-time recovery
6. **Velero** provides cluster-level backup and DR
7. **Choose storage type** based on performance requirements

## Resources

- [Kubernetes Storage](https://kubernetes.io/docs/concepts/storage/)
- [CSI Drivers](https://kubernetes-csi.github.io/docs/drivers.html)
- [Velero Documentation](https://velero.io/docs/)
- [Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)

---

**Next Module:** [Module 10: Kubernetes Security](Module-10-Kubernetes-Security.md)

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  K8sNode, Pod, Deployment, ReplicaSet, K8sService, ConfigMap,
  K8sSecret, DockerContainer, DockerImage, DockerNetwork, DockerVolume,
  K8sEvent, ClusterStateFixture,
} from '../types'

let nextPodIp = 10

function genPodIp() {
  return `10.244.0.${nextPodIp++}`
}

function genId(len = 12): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function genShortId(): string {
  return genId(5) + genId(5)
}

export const useTerminalStore = defineStore('terminal', () => {
  // Kubernetes state
  const nodes = ref<K8sNode[]>([])
  const namespaces = ref<string[]>([])
  const pods = ref<Pod[]>([])
  const deployments = ref<Deployment[]>([])
  const replicasets = ref<ReplicaSet[]>([])
  const services = ref<K8sService[]>([])
  const configmaps = ref<ConfigMap[]>([])
  const secrets = ref<K8sSecret[]>([])
  const events = ref<K8sEvent[]>([])

  // Docker state
  const containers = ref<DockerContainer[]>([])
  const images = ref<DockerImage[]>([])
  const networks = ref<DockerNetwork[]>([])
  const volumes = ref<DockerVolume[]>([])

  // Command history
  const commandHistory = ref<string[]>([])

  const currentNamespace = ref('default')

  function initDefaultCluster() {
    nextPodIp = 10
    namespaces.value = ['default', 'kube-system', 'kube-public', 'kube-node-lease']

    nodes.value = [
      {
        name: 'control-plane', status: 'Ready', roles: ['control-plane'],
        version: 'v1.31.0', internalIP: '192.168.1.10', os: 'linux',
        cpu: '4', memory: '8Gi',
      },
      {
        name: 'worker-1', status: 'Ready', roles: ['worker'],
        version: 'v1.31.0', internalIP: '192.168.1.11', os: 'linux',
        cpu: '4', memory: '16Gi',
      },
      {
        name: 'worker-2', status: 'Ready', roles: ['worker'],
        version: 'v1.31.0', internalIP: '192.168.1.12', os: 'linux',
        cpu: '4', memory: '16Gi',
      },
    ]

    pods.value = [
      makePod('coredns-5d78c9869d-abc12', 'kube-system', 'Running', 'coredns:1.11.1', 'control-plane', { 'k8s-app': 'kube-dns' }),
      makePod('coredns-5d78c9869d-def34', 'kube-system', 'Running', 'coredns:1.11.1', 'control-plane', { 'k8s-app': 'kube-dns' }),
      makePod('etcd-control-plane', 'kube-system', 'Running', 'etcd:3.5.12', 'control-plane', { component: 'etcd' }),
      makePod('kube-apiserver-control-plane', 'kube-system', 'Running', 'kube-apiserver:v1.31.0', 'control-plane', { component: 'kube-apiserver' }),
      makePod('kube-controller-manager-control-plane', 'kube-system', 'Running', 'kube-controller-manager:v1.31.0', 'control-plane', { component: 'kube-controller-manager' }),
      makePod('kube-scheduler-control-plane', 'kube-system', 'Running', 'kube-scheduler:v1.31.0', 'control-plane', { component: 'kube-scheduler' }),
      makePod('kube-proxy-abc12', 'kube-system', 'Running', 'kube-proxy:v1.31.0', 'control-plane', { 'k8s-app': 'kube-proxy' }),
      makePod('kube-proxy-def34', 'kube-system', 'Running', 'kube-proxy:v1.31.0', 'worker-1', { 'k8s-app': 'kube-proxy' }),
      makePod('kube-proxy-ghi56', 'kube-system', 'Running', 'kube-proxy:v1.31.0', 'worker-2', { 'k8s-app': 'kube-proxy' }),
    ]

    services.value = [
      {
        name: 'kubernetes', namespace: 'default', type: 'ClusterIP',
        clusterIP: '10.96.0.1', ports: [{ port: 443, targetPort: 6443, protocol: 'TCP' }],
        selector: {}, age: '7d',
      },
      {
        name: 'kube-dns', namespace: 'kube-system', type: 'ClusterIP',
        clusterIP: '10.96.0.10',
        ports: [
          { name: 'dns', port: 53, targetPort: 53, protocol: 'UDP' },
          { name: 'dns-tcp', port: 53, targetPort: 53, protocol: 'TCP' },
        ],
        selector: { 'k8s-app': 'kube-dns' }, age: '7d',
      },
    ]

    deployments.value = []
    replicasets.value = []
    configmaps.value = [
      { name: 'kube-root-ca.crt', namespace: 'default', data: { 'ca.crt': '...' }, age: '7d' },
      { name: 'coredns', namespace: 'kube-system', data: { Corefile: '...' }, age: '7d' },
    ]
    secrets.value = []
    events.value = []

    // Docker defaults
    images.value = [
      { repository: 'nginx', tag: 'latest', id: genId(), size: '187MB', created: '2 weeks ago' },
      { repository: 'nginx', tag: 'alpine', id: genId(), size: '43MB', created: '2 weeks ago' },
      { repository: 'node', tag: '20-alpine', id: genId(), size: '128MB', created: '3 weeks ago' },
      { repository: 'redis', tag: 'alpine', id: genId(), size: '32MB', created: '1 month ago' },
      { repository: 'postgres', tag: '16-alpine', id: genId(), size: '238MB', created: '1 month ago' },
      { repository: 'python', tag: '3.12-slim', id: genId(), size: '155MB', created: '3 weeks ago' },
      { repository: 'alpine', tag: 'latest', id: genId(), size: '7.8MB', created: '1 month ago' },
      { repository: 'busybox', tag: 'latest', id: genId(), size: '4.26MB', created: '1 month ago' },
    ]
    containers.value = []
    networks.value = [
      { name: 'bridge', id: genId(), driver: 'bridge', scope: 'local', subnet: '172.17.0.0/16', gateway: '172.17.0.1', containers: [] },
      { name: 'host', id: genId(), driver: 'host', scope: 'local', containers: [] },
      { name: 'none', id: genId(), driver: 'null', scope: 'local', containers: [] },
    ]
    volumes.value = []
  }

  function makePod(name: string, ns: string, status: Pod['status'], image: string, node: string, labels: Record<string, string>): Pod {
    return {
      name, namespace: ns, status, ready: status === 'Running' ? '1/1' : '0/1',
      restarts: 0, age: '7d', ip: genPodIp(), node, labels, image,
      containers: [{ name: name.split('-')[0] || name, image, ports: [], ready: status === 'Running', state: status }],
    }
  }

  function addPod(name: string, ns: string, image: string, labels: Record<string, string>, ownerRef?: string): Pod {
    const node = nodes.value.filter(n => n.roles.includes('worker'))[Math.floor(Math.random() * 2)]?.name || 'worker-1'
    const pod: Pod = {
      name, namespace: ns, status: 'Running', ready: '1/1',
      restarts: 0, age: '0s', ip: genPodIp(), node, labels, image,
      containers: [{ name: (image.split(':')[0] || '').split('/').pop() || 'app', image, ports: [], ready: true, state: 'Running' }],
      ownerRef,
    }
    pods.value.push(pod)
    addEvent('Normal', 'Scheduled', `pod/${name}`, `Successfully assigned ${ns}/${name} to ${node}`)
    addEvent('Normal', 'Pulled', `pod/${name}`, `Container image "${image}" already present on machine`)
    addEvent('Normal', 'Created', `pod/${name}`, `Created container ${pod.containers[0]!.name}`)
    addEvent('Normal', 'Started', `pod/${name}`, `Started container ${pod.containers[0]!.name}`)
    return pod
  }

  function deletePod(name: string, ns: string) {
    const idx = pods.value.findIndex(p => p.name === name && p.namespace === ns)
    if (idx >= 0) {
      pods.value[idx]!.status = 'Terminating'
      setTimeout(() => {
        pods.value = pods.value.filter(p => !(p.name === name && p.namespace === ns))
      }, 300)
    }
  }

  function createDeployment(name: string, ns: string, image: string, replicas: number): Deployment {
    const labels = { app: name }
    const dep: Deployment = {
      name, namespace: ns, replicas, readyReplicas: replicas,
      availableReplicas: replicas, image, labels, selector: labels,
      strategy: 'RollingUpdate', age: '0s',
    }
    deployments.value.push(dep)

    const rsName = `${name}-${genId(5)}`
    const rs: ReplicaSet = {
      name: rsName, namespace: ns, replicas, readyReplicas: replicas,
      deployment: name, labels: { ...labels, 'pod-template-hash': genId(5) }, age: '0s',
    }
    replicasets.value.push(rs)

    for (let i = 0; i < replicas; i++) {
      const podName = `${rsName}-${genId(5)}`
      addPod(podName, ns, image, { ...labels, 'pod-template-hash': rs.labels['pod-template-hash'] || '' }, rsName)
    }

    addEvent('Normal', 'ScalingReplicaSet', `deployment/${name}`, `Scaled up replica set ${rsName} to ${replicas}`)
    return dep
  }

  function scaleDeployment(name: string, ns: string, replicas: number) {
    const dep = deployments.value.find(d => d.name === name && d.namespace === ns)
    if (!dep) return false

    const rs = replicasets.value.find(r => r.deployment === name && r.namespace === ns)
    if (!rs) return false

    const currentPods = pods.value.filter(p => p.namespace === ns && p.ownerRef === rs.name)
    const diff = replicas - currentPods.length

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const podName = `${rs.name}-${genId(5)}`
        addPod(podName, ns, dep.image, { ...dep.labels, 'pod-template-hash': rs.labels['pod-template-hash'] || '' }, rs.name)
      }
    } else if (diff < 0) {
      const toRemove = currentPods.slice(0, Math.abs(diff))
      toRemove.forEach(p => deletePod(p.name, ns))
    }

    dep.replicas = replicas
    dep.readyReplicas = replicas
    dep.availableReplicas = replicas
    rs.replicas = replicas
    rs.readyReplicas = replicas

    addEvent('Normal', 'ScalingReplicaSet', `deployment/${name}`, `Scaled replica set ${rs.name} to ${replicas}`)
    return true
  }

  function deleteDeployment(name: string, ns: string) {
    const dep = deployments.value.find(d => d.name === name && d.namespace === ns)
    if (!dep) return false

    const rsList = replicasets.value.filter(r => r.deployment === name && r.namespace === ns)
    rsList.forEach(rs => {
      pods.value.filter(p => p.ownerRef === rs.name && p.namespace === ns)
        .forEach(p => deletePod(p.name, ns))
    })

    setTimeout(() => {
      replicasets.value = replicasets.value.filter(r => !(r.deployment === name && r.namespace === ns))
      deployments.value = deployments.value.filter(d => !(d.name === name && d.namespace === ns))
    }, 300)
    return true
  }

  function createService(name: string, ns: string, type: K8sService['type'], port: number, targetPort: number, selector: Record<string, string>): K8sService {
    const svc: K8sService = {
      name, namespace: ns, type, clusterIP: `10.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      ports: [{ port, targetPort, protocol: 'TCP', nodePort: type === 'NodePort' ? 30000 + Math.floor(Math.random() * 2767) : undefined }],
      selector, age: '0s',
    }
    if (type === 'LoadBalancer') svc.externalIP = `203.0.113.${Math.floor(Math.random() * 255)}`
    services.value.push(svc)
    return svc
  }

  function deleteService(name: string, ns: string) {
    services.value = services.value.filter(s => !(s.name === name && s.namespace === ns))
  }

  function addEvent(type: K8sEvent['type'], reason: string, object: string, message: string) {
    events.value.unshift({ type, reason, object, message, age: '0s' })
    if (events.value.length > 50) events.value.pop()
  }

  // Docker operations
  function dockerRun(image: string, name?: string, _detach = true, ports?: string, network?: string): DockerContainer {
    const c: DockerContainer = {
      id: genId(),
      name: name || `${image.replace(/[/:]/g, '_')}_${genShortId().slice(0, 6)}`,
      image,
      status: 'running',
      ports: ports || '',
      created: 'Less than a second ago',
      command: image.includes('nginx') ? '"nginx -g daemon off;"' : '"/bin/sh"',
      networks: [network || 'bridge'],
    }
    containers.value.push(c)
    if (!images.value.find(i => `${i.repository}:${i.tag}` === image || i.repository === image)) {
      const [repo = image, tag = 'latest'] = image.includes(':') ? image.split(':') : [image, 'latest']
      images.value.push({ repository: repo, tag, id: genId(), size: '100MB', created: 'Just now' })
    }
    return c
  }

  function dockerStop(nameOrId: string) {
    const c = containers.value.find(c => c.name === nameOrId || c.id.startsWith(nameOrId))
    if (c) c.status = 'exited'
    return !!c
  }

  function dockerRm(nameOrId: string) {
    const idx = containers.value.findIndex(c => c.name === nameOrId || c.id.startsWith(nameOrId))
    if (idx >= 0) {
      containers.value.splice(idx, 1)
      return true
    }
    return false
  }

  function dockerCreateNetwork(name: string, driver = 'bridge'): DockerNetwork {
    const net: DockerNetwork = {
      name, id: genId(), driver, scope: 'local',
      subnet: `172.${18 + networks.value.length}.0.0/16`,
      gateway: `172.${18 + networks.value.length}.0.1`,
      containers: [],
    }
    networks.value.push(net)
    return net
  }

  function dockerCreateVolume(name: string): DockerVolume {
    const vol: DockerVolume = {
      name, driver: 'local',
      mountpoint: `/var/lib/docker/volumes/${name}/_data`,
      created: 'Just now',
    }
    volumes.value.push(vol)
    return vol
  }

  function loadFixture(fixture: ClusterStateFixture) {
    if (fixture.namespaces) {
      fixture.namespaces.forEach(ns => {
        if (!namespaces.value.includes(ns)) namespaces.value.push(ns)
      })
    }
    if (fixture.pods) fixture.pods.forEach(p => pods.value.push(p))
    if (fixture.deployments) fixture.deployments.forEach(d => deployments.value.push(d))
    if (fixture.services) fixture.services.forEach(s => services.value.push(s))
    if (fixture.nodes) fixture.nodes.forEach(n => nodes.value.push(n))
    if (fixture.configmaps) fixture.configmaps.forEach(c => configmaps.value.push(c))
    if (fixture.secrets) fixture.secrets.forEach(s => secrets.value.push(s))
  }

  function reset() {
    initDefaultCluster()
  }

  // Initialize
  initDefaultCluster()

  return {
    nodes, namespaces, pods, deployments, replicasets, services,
    configmaps, secrets, events, containers, images, networks, volumes,
    commandHistory, currentNamespace,
    addPod, deletePod, createDeployment, scaleDeployment, deleteDeployment,
    createService, deleteService, addEvent,
    dockerRun, dockerStop, dockerRm, dockerCreateNetwork, dockerCreateVolume,
    loadFixture, reset, makePod,
  }
})

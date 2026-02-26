import type { ParsedCommand, K8sService } from '../../types'
import { useTerminalStore } from '../../stores/terminal'
import { ANSI } from './SimulatorEngine'

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

function tableRow(cols: { val: string; width: number }[]): string {
  return cols.map(c => padRight(c.val, c.width)).join('  ')
}

function getNamespace(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  if (cmd.flags['all-namespaces'] === true || cmd.flags['A'] === true) return '__all__'
  return (cmd.flags['n'] as string) || (cmd.flags['namespace'] as string) || store.currentNamespace
}

export function handleKubectl(cmd: ParsedCommand): string {
  switch (cmd.subcommand) {
    case 'get': return kubectlGet(cmd)
    case 'describe': return kubectlDescribe(cmd)
    case 'apply': return kubectlApply(cmd)
    case 'delete': return kubectlDelete(cmd)
    case 'scale': return kubectlScale(cmd)
    case 'rollout': return kubectlRollout(cmd)
    case 'logs': return kubectlLogs(cmd)
    case 'exec': return kubectlExec(cmd)
    case 'top': return kubectlTop(cmd)
    case 'create': return kubectlCreate(cmd)
    case 'expose': return kubectlExpose(cmd)
    case 'config':
      if (cmd.args[0] === 'set-context' || cmd.args[0] === 'current-context') {
        return 'kubernetes-admin@kubernetes'
      }
      return `${ANSI.yellow}kubectl config: simplified simulation${ANSI.reset}`
    case 'version':
      return `Client Version: v1.31.0\nServer Version: v1.31.0`
    case 'cluster-info':
      return `${ANSI.green}Kubernetes control plane${ANSI.reset} is running at ${ANSI.cyan}https://192.168.1.10:6443${ANSI.reset}\n${ANSI.green}CoreDNS${ANSI.reset} is running at ${ANSI.cyan}https://192.168.1.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy${ANSI.reset}`
    default:
      if (!cmd.subcommand) return `${ANSI.red}error: You must specify a subcommand.${ANSI.reset}\nUse "kubectl --help" for a list of commands.`
      return `${ANSI.red}error: unknown command "${cmd.subcommand}"${ANSI.reset}`
  }
}

function kubectlGet(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const ns = getNamespace(cmd)
  const wide = cmd.flags['o'] === 'wide'
  const outputFormat = cmd.flags['o'] as string

  if (!resource) return `${ANSI.red}error: Required resource not specified.${ANSI.reset}`

  switch (resource) {
    case 'pods':
    case 'pod':
    case 'po': {
      let filtered = store.pods
      if (ns !== '__all__') filtered = filtered.filter(p => p.namespace === ns)

      const labelSelector = (cmd.flags['l'] as string) || (cmd.flags['selector'] as string)
      if (labelSelector) {
        const parts = labelSelector.split('=')
        const key = parts[0] || ''
        const val = parts[1] || ''
        filtered = filtered.filter(p => p.labels[key] === val)
      }

      if (filtered.length === 0) return 'No resources found in ' + (ns === '__all__' ? 'any' : ns) + ' namespace.'

      if (outputFormat === 'json' || outputFormat === 'yaml') {
        return formatOutput(filtered, outputFormat)
      }

      const header = ns === '__all__'
        ? tableRow([
            { val: 'NAMESPACE', width: 16 }, { val: 'NAME', width: 48 },
            { val: 'READY', width: 8 }, { val: 'STATUS', width: 18 },
            { val: 'RESTARTS', width: 10 }, { val: 'AGE', width: 6 },
            ...(wide ? [{ val: 'IP', width: 16 }, { val: 'NODE', width: 16 }] : []),
          ])
        : tableRow([
            { val: 'NAME', width: 48 }, { val: 'READY', width: 8 },
            { val: 'STATUS', width: 18 }, { val: 'RESTARTS', width: 10 },
            { val: 'AGE', width: 6 },
            ...(wide ? [{ val: 'IP', width: 16 }, { val: 'NODE', width: 16 }] : []),
          ])

      const rows = filtered.map(p => {
        const statusColor = p.status === 'Running' ? ANSI.green : p.status === 'Pending' ? ANSI.yellow : ANSI.red
        if (ns === '__all__') {
          return tableRow([
            { val: p.namespace, width: 16 }, { val: p.name, width: 48 },
            { val: p.ready, width: 8 }, { val: `${statusColor}${p.status}${ANSI.reset}`, width: 18 + 9 },
            { val: String(p.restarts), width: 10 }, { val: p.age, width: 6 },
            ...(wide ? [{ val: p.ip, width: 16 }, { val: p.node, width: 16 }] : []),
          ])
        }
        return tableRow([
          { val: p.name, width: 48 }, { val: p.ready, width: 8 },
          { val: `${statusColor}${p.status}${ANSI.reset}`, width: 18 + 9 },
          { val: String(p.restarts), width: 10 }, { val: p.age, width: 6 },
          ...(wide ? [{ val: p.ip, width: 16 }, { val: p.node, width: 16 }] : []),
        ])
      })

      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'deployments':
    case 'deployment':
    case 'deploy': {
      let filtered = store.deployments
      if (ns !== '__all__') filtered = filtered.filter(d => d.namespace === ns)
      if (filtered.length === 0) return 'No resources found in ' + (ns === '__all__' ? 'any' : ns) + ' namespace.'

      const header = tableRow([
        ...(ns === '__all__' ? [{ val: 'NAMESPACE', width: 16 }] : []),
        { val: 'NAME', width: 30 }, { val: 'READY', width: 10 },
        { val: 'UP-TO-DATE', width: 12 }, { val: 'AVAILABLE', width: 12 },
        { val: 'AGE', width: 6 },
      ])
      const rows = filtered.map(d => tableRow([
        ...(ns === '__all__' ? [{ val: d.namespace, width: 16 }] : []),
        { val: d.name, width: 30 }, { val: `${d.readyReplicas}/${d.replicas}`, width: 10 },
        { val: String(d.replicas), width: 12 }, { val: String(d.availableReplicas), width: 12 },
        { val: d.age, width: 6 },
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'services':
    case 'service':
    case 'svc': {
      let filtered = store.services
      if (ns !== '__all__') filtered = filtered.filter(s => s.namespace === ns)
      if (filtered.length === 0) return 'No resources found in ' + (ns === '__all__' ? 'any' : ns) + ' namespace.'

      const header = tableRow([
        ...(ns === '__all__' ? [{ val: 'NAMESPACE', width: 16 }] : []),
        { val: 'NAME', width: 24 }, { val: 'TYPE', width: 14 },
        { val: 'CLUSTER-IP', width: 18 }, { val: 'EXTERNAL-IP', width: 16 },
        { val: 'PORT(S)', width: 24 }, { val: 'AGE', width: 6 },
      ])
      const rows = filtered.map(s => {
        const portsStr = s.ports.map(p =>
          p.nodePort ? `${p.port}:${p.nodePort}/${p.protocol}` : `${p.port}/${p.protocol}`
        ).join(',')
        return tableRow([
          ...(ns === '__all__' ? [{ val: s.namespace, width: 16 }] : []),
          { val: s.name, width: 24 }, { val: s.type, width: 14 },
          { val: s.clusterIP, width: 18 }, { val: s.externalIP || '<none>', width: 16 },
          { val: portsStr, width: 24 }, { val: s.age, width: 6 },
        ])
      })
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'nodes':
    case 'node':
    case 'no': {
      const header = tableRow([
        { val: 'NAME', width: 20 }, { val: 'STATUS', width: 10 },
        { val: 'ROLES', width: 16 }, { val: 'AGE', width: 6 },
        { val: 'VERSION', width: 10 },
        ...(wide ? [{ val: 'INTERNAL-IP', width: 16 }, { val: 'OS', width: 8 }] : []),
      ])
      const rows = store.nodes.map(n => tableRow([
        { val: n.name, width: 20 },
        { val: `${ANSI.green}${n.status}${ANSI.reset}`, width: 10 + 9 },
        { val: n.roles.join(','), width: 16 }, { val: '7d', width: 6 },
        { val: n.version, width: 10 },
        ...(wide ? [{ val: n.internalIP, width: 16 }, { val: n.os, width: 8 }] : []),
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'namespaces':
    case 'namespace':
    case 'ns': {
      const header = tableRow([
        { val: 'NAME', width: 24 }, { val: 'STATUS', width: 10 }, { val: 'AGE', width: 6 },
      ])
      const rows = store.namespaces.map(n => tableRow([
        { val: n, width: 24 }, { val: `${ANSI.green}Active${ANSI.reset}`, width: 10 + 9 },
        { val: '7d', width: 6 },
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'replicasets':
    case 'replicaset':
    case 'rs': {
      let filtered = store.replicasets
      if (ns !== '__all__') filtered = filtered.filter(r => r.namespace === ns)
      if (filtered.length === 0) return 'No resources found in ' + ns + ' namespace.'

      const header = tableRow([
        { val: 'NAME', width: 36 }, { val: 'DESIRED', width: 10 },
        { val: 'CURRENT', width: 10 }, { val: 'READY', width: 8 }, { val: 'AGE', width: 6 },
      ])
      const rows = filtered.map(r => tableRow([
        { val: r.name, width: 36 }, { val: String(r.replicas), width: 10 },
        { val: String(r.replicas), width: 10 }, { val: String(r.readyReplicas), width: 8 },
        { val: r.age, width: 6 },
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'configmaps':
    case 'configmap':
    case 'cm': {
      let filtered = store.configmaps
      if (ns !== '__all__') filtered = filtered.filter(c => c.namespace === ns)
      if (filtered.length === 0) return 'No resources found in ' + ns + ' namespace.'

      const header = tableRow([
        { val: 'NAME', width: 30 }, { val: 'DATA', width: 6 }, { val: 'AGE', width: 6 },
      ])
      const rows = filtered.map(c => tableRow([
        { val: c.name, width: 30 }, { val: String(Object.keys(c.data).length), width: 6 },
        { val: c.age, width: 6 },
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'events':
    case 'event': {
      let filtered = store.events
      if (filtered.length === 0) return 'No events found.'

      const header = tableRow([
        { val: 'TYPE', width: 10 }, { val: 'REASON', width: 22 },
        { val: 'OBJECT', width: 40 }, { val: 'MESSAGE', width: 60 },
      ])
      const rows = filtered.slice(0, 20).map(e => {
        const typeColor = e.type === 'Normal' ? ANSI.green : ANSI.yellow
        return tableRow([
          { val: `${typeColor}${e.type}${ANSI.reset}`, width: 10 + 9 },
          { val: e.reason, width: 22 }, { val: e.object, width: 40 },
          { val: e.message.slice(0, 58), width: 60 },
        ])
      })
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }

    case 'all': {
      const parts = []
      const podOutput = kubectlGet({ ...cmd, args: ['pods'] })
      if (!podOutput.includes('No resources')) parts.push(podOutput)
      const depOutput = kubectlGet({ ...cmd, args: ['deployments'] })
      if (!depOutput.includes('No resources')) parts.push(depOutput)
      const svcOutput = kubectlGet({ ...cmd, args: ['services'] })
      if (!svcOutput.includes('No resources')) parts.push(svcOutput)
      return parts.join('\n\n') || 'No resources found.'
    }

    default:
      return `${ANSI.red}error: the server doesn't have a resource type "${resource}"${ANSI.reset}`
  }
}

function formatOutput(data: any, format: string): string {
  if (format === 'json') return JSON.stringify({ items: data }, null, 2)
  if (format === 'yaml') {
    return data.map((item: any) =>
      Object.entries(item).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')
    ).join('\n---\n')
  }
  return ''
}

function kubectlDescribe(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const name = cmd.args[1]
  const ns = getNamespace(cmd)

  if (!resource) return `${ANSI.red}error: You must specify a resource type.${ANSI.reset}`

  switch (resource) {
    case 'pod':
    case 'pods': {
      const pod = store.pods.find(p => p.name === name && (ns === '__all__' || p.namespace === ns))
      if (!pod) return `Error from server (NotFound): pods "${name}" not found`
      const c0 = pod.containers[0]!
      return `${ANSI.bold}Name:${ANSI.reset}         ${pod.name}
${ANSI.bold}Namespace:${ANSI.reset}    ${pod.namespace}
${ANSI.bold}Node:${ANSI.reset}         ${pod.node}
${ANSI.bold}Status:${ANSI.reset}       ${pod.status}
${ANSI.bold}IP:${ANSI.reset}           ${pod.ip}
${ANSI.bold}Labels:${ANSI.reset}       ${Object.entries(pod.labels).map(([k, v]) => `${k}=${v}`).join('\n              ')}
${ANSI.bold}Containers:${ANSI.reset}
  ${c0.name}:
    Image:          ${c0.image}
    State:          ${c0.state}
    Ready:          ${c0.ready}
${ANSI.bold}Events:${ANSI.reset}
  Type    Reason     Age   Message
  ----    ------     ----  -------
  Normal  Scheduled  ${pod.age}  Successfully assigned ${pod.namespace}/${pod.name} to ${pod.node}
  Normal  Pulled     ${pod.age}  Container image "${pod.image}" already present
  Normal  Created    ${pod.age}  Created container ${c0.name}
  Normal  Started    ${pod.age}  Started container ${c0.name}`
    }

    case 'deployment':
    case 'deployments': {
      const dep = store.deployments.find(d => d.name === name && (ns === '__all__' || d.namespace === ns))
      if (!dep) return `Error from server (NotFound): deployments.apps "${name}" not found`
      return `${ANSI.bold}Name:${ANSI.reset}               ${dep.name}
${ANSI.bold}Namespace:${ANSI.reset}          ${dep.namespace}
${ANSI.bold}Selector:${ANSI.reset}           ${Object.entries(dep.selector).map(([k, v]) => `${k}=${v}`).join(',')}
${ANSI.bold}Replicas:${ANSI.reset}           ${dep.replicas} desired | ${dep.replicas} updated | ${dep.availableReplicas} available
${ANSI.bold}StrategyType:${ANSI.reset}       ${dep.strategy}
${ANSI.bold}Pod Template:${ANSI.reset}
  Labels:  ${Object.entries(dep.labels).map(([k, v]) => `${k}=${v}`).join(', ')}
  Containers:
   ${(dep.image.split(':')[0] || '').split('/').pop() || dep.image}:
    Image:      ${dep.image}
${ANSI.bold}Events:${ANSI.reset}
  Type    Reason             Age   Message
  ----    ------             ----  -------
  Normal  ScalingReplicaSet  ${dep.age}  Scaled up replica set to ${dep.replicas}`
    }

    case 'service':
    case 'services': {
      const svc = store.services.find(s => s.name === name && (ns === '__all__' || s.namespace === ns))
      if (!svc) return `Error from server (NotFound): services "${name}" not found`
      return `${ANSI.bold}Name:${ANSI.reset}              ${svc.name}
${ANSI.bold}Namespace:${ANSI.reset}         ${svc.namespace}
${ANSI.bold}Type:${ANSI.reset}              ${svc.type}
${ANSI.bold}IP:${ANSI.reset}                ${svc.clusterIP}
${ANSI.bold}Port:${ANSI.reset}              ${svc.ports.map(p => `${p.port}/${p.protocol}`).join(', ')}
${ANSI.bold}TargetPort:${ANSI.reset}        ${svc.ports.map(p => `${p.targetPort}/${p.protocol}`).join(', ')}
${ANSI.bold}Endpoints:${ANSI.reset}         <simulated>
${ANSI.bold}Selector:${ANSI.reset}          ${Object.entries(svc.selector).map(([k, v]) => `${k}=${v}`).join(',')}`
    }

    case 'node':
    case 'nodes': {
      const node = store.nodes.find(n => n.name === name)
      if (!node) return `Error from server (NotFound): nodes "${name}" not found`
      return `${ANSI.bold}Name:${ANSI.reset}               ${node.name}
${ANSI.bold}Roles:${ANSI.reset}              ${node.roles.join(',')}
${ANSI.bold}Status:${ANSI.reset}             ${node.status}
${ANSI.bold}InternalIP:${ANSI.reset}         ${node.internalIP}
${ANSI.bold}Capacity:${ANSI.reset}
  cpu:     ${node.cpu}
  memory:  ${node.memory}
${ANSI.bold}System Info:${ANSI.reset}
  OS:                    ${node.os}
  Kernel Version:        5.15.0-91-generic
  Container Runtime:     containerd://1.7.11
  Kubelet Version:       ${node.version}`
    }

    default:
      return `${ANSI.red}error: the server doesn't have a resource type "${resource}"${ANSI.reset}`
  }
}

function kubectlApply(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const file = cmd.flags['f'] as string || cmd.flags['filename'] as string
  const ns = getNamespace(cmd)

  if (!file) return `${ANSI.red}error: must specify one of -f and -k${ANSI.reset}`

  // Parse common YAML file names to determine what to create
  if (file.includes('deployment') || file === 'deployment.yaml') {
    const name = 'nginx-deployment'
    const existing = store.deployments.find(d => d.name === name && d.namespace === ns)
    if (existing) {
      return `deployment.apps/${name} configured`
    }
    store.createDeployment(name, ns, 'nginx:1.25', 3)
    return `deployment.apps/${name} created`
  }

  if (file.includes('service') || file === 'service.yaml') {
    const name = 'nginx-service'
    const existing = store.services.find(s => s.name === name && s.namespace === ns)
    if (existing) return `service/${name} configured`
    store.createService(name, ns, 'ClusterIP', 80, 80, { app: 'nginx' })
    return `service/${name} created`
  }

  if (file.includes('configmap') || file === 'configmap.yaml') {
    const name = 'app-config'
    const existing = store.configmaps.find(c => c.name === name && c.namespace === ns)
    if (existing) return `configmap/${name} configured`
    store.configmaps.push({ name, namespace: ns, data: { APP_ENV: 'production', LOG_LEVEL: 'info' }, age: '0s' })
    return `configmap/${name} created`
  }

  if (file.includes('pod') || file === 'pod.yaml') {
    const name = 'nginx-pod'
    const existing = store.pods.find(p => p.name === name && p.namespace === ns)
    if (existing) return `pod/${name} configured`
    store.addPod(name, ns, 'nginx:alpine', { app: 'nginx' })
    return `pod/${name} created`
  }

  // Generic YAML apply simulation
  return `resource from ${file} applied`
}

function kubectlDelete(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const name = cmd.args[1]
  const ns = getNamespace(cmd)

  if (!resource) return `${ANSI.red}error: You must specify a resource type.${ANSI.reset}`
  if (!name && !cmd.flags['all']) return `${ANSI.red}error: resource(s) were provided, but no name was specified${ANSI.reset}`

  switch (resource) {
    case 'pod':
    case 'pods': {
      if (cmd.flags['all']) {
        const count = store.pods.filter(p => p.namespace === ns).length
        store.pods = store.pods.filter(p => p.namespace !== ns)
        return count > 0 ? `Deleted ${count} pods in ${ns}` : 'No resources found'
      }
      const pod = store.pods.find(p => p.name === name && p.namespace === ns)
      if (!pod) return `Error from server (NotFound): pods "${name}" not found`
      store.deletePod(name!, ns)
      return `pod "${name}" deleted`
    }
    case 'deployment':
    case 'deployments': {
      if (!store.deleteDeployment(name!, ns)) return `Error from server (NotFound): deployments.apps "${name}" not found`
      return `deployment.apps "${name}" deleted`
    }
    case 'service':
    case 'services': {
      store.deleteService(name!, ns)
      return `service "${name}" deleted`
    }
    default:
      return `${ANSI.red}error: the server doesn't have a resource type "${resource}"${ANSI.reset}`
  }
}

function kubectlScale(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const ns = getNamespace(cmd)
  const replicasStr = cmd.flags['replicas'] as string

  if (!replicasStr) return `${ANSI.red}error: --replicas is required${ANSI.reset}`
  const replicas = parseInt(replicasStr, 10)
  if (isNaN(replicas) || replicas < 0) return `${ANSI.red}error: invalid value for --replicas${ANSI.reset}`

  // Parse "deployment/name" format
  let depName = ''
  if (resource?.includes('/')) {
    depName = resource.split('/')[1] || ''
  } else {
    depName = cmd.args[1] || ''
  }

  if (!depName) return `${ANSI.red}error: resource name is required${ANSI.reset}`

  if (store.scaleDeployment(depName, ns, replicas)) {
    return `deployment.apps/${depName} scaled`
  }
  return `Error from server (NotFound): deployments.apps "${depName}" not found`
}

function kubectlRollout(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const action = cmd.args[0]
  const resource = cmd.args[1]
  const ns = getNamespace(cmd)

  if (!action) return `${ANSI.red}error: must specify a subcommand${ANSI.reset}`

  const depName = resource?.includes('/') ? (resource.split('/')[1] || '') : cmd.args[2] || ''

  switch (action) {
    case 'status': {
      const dep = store.deployments.find(d => d.name === depName && d.namespace === ns)
      if (!dep) return `Error from server (NotFound): deployments "${depName}" not found`
      return `deployment "${depName}" successfully rolled out`
    }
    case 'history': {
      return `deployment.apps/${depName}\nREVISION  CHANGE-CAUSE\n1         <none>`
    }
    case 'restart': {
      const dep = store.deployments.find(d => d.name === depName && d.namespace === ns)
      if (!dep) return `Error from server (NotFound): deployments "${depName}" not found`
      return `deployment.apps/${depName} restarted`
    }
    case 'undo': {
      return `deployment.apps/${depName} rolled back`
    }
    default:
      return `${ANSI.red}error: unknown subcommand "${action}"${ANSI.reset}`
  }
}

function kubectlLogs(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const podName = cmd.args[0]
  const ns = getNamespace(cmd)

  if (!podName) return `${ANSI.red}error: expected 'logs [-f] [-p] POD [-c CONTAINER]'${ANSI.reset}`

  const pod = store.pods.find(p => p.name === podName && p.namespace === ns)
  if (!pod) return `Error from server (NotFound): pods "${podName}" not found`

  const image = pod.image
  if (image.includes('nginx')) {
    return `${ANSI.gray}/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
/docker-entrypoint.sh: Configuration complete; ready for start up
2024/01/15 10:23:45 [notice] 1#1: using the "epoll" event method
2024/01/15 10:23:45 [notice] 1#1: nginx/1.25.3
2024/01/15 10:23:45 [notice] 1#1: start worker processes
10.244.0.1 - - [15/Jan/2024:10:24:00 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.1.2"
10.244.0.1 - - [15/Jan/2024:10:24:01 +0000] "GET /favicon.ico HTTP/1.1" 404 153 "-" "Mozilla/5.0"${ANSI.reset}`
  }

  return `${ANSI.gray}Container started successfully
Listening on port 8080
Ready to accept connections${ANSI.reset}`
}

function kubectlExec(cmd: ParsedCommand): string {
  const podName = cmd.args[0]
  if (!podName) return `${ANSI.red}error: expected 'exec POD COMMAND [args...]'${ANSI.reset}`

  const execCmd = cmd.args.slice(1).join(' ')
  if (execCmd.includes('sh') || execCmd.includes('bash')) {
    return `${ANSI.yellow}(simulated shell - type commands normally)${ANSI.reset}`
  }
  if (execCmd.includes('env')) {
    return `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\nHOSTNAME=${podName}\nKUBERNETES_SERVICE_HOST=10.96.0.1\nKUBERNETES_SERVICE_PORT=443\nHOME=/root`
  }
  if (execCmd.includes('ls')) {
    return `bin  dev  etc  home  lib  proc  root  run  sbin  srv  sys  tmp  usr  var`
  }
  return `${ANSI.gray}Command executed in ${podName}${ANSI.reset}`
}

function kubectlTop(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]

  if (resource === 'nodes' || resource === 'node') {
    const header = tableRow([
      { val: 'NAME', width: 20 }, { val: 'CPU(cores)', width: 12 },
      { val: 'CPU%', width: 8 }, { val: 'MEMORY(bytes)', width: 16 },
      { val: 'MEMORY%', width: 10 },
    ])
    const rows = store.nodes.map(n => {
      const cpuUsage = Math.floor(Math.random() * 300 + 100)
      const memUsage = Math.floor(Math.random() * 2000 + 500)
      return tableRow([
        { val: n.name, width: 20 }, { val: `${cpuUsage}m`, width: 12 },
        { val: `${Math.floor(cpuUsage / 40)}%`, width: 8 },
        { val: `${memUsage}Mi`, width: 16 },
        { val: `${Math.floor(memUsage / (parseInt(n.memory) * 10.24))}%`, width: 10 },
      ])
    })
    return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
  }

  if (resource === 'pods' || resource === 'pod') {
    const ns = getNamespace(cmd)
    let filtered = store.pods.filter(p => p.status === 'Running')
    if (ns !== '__all__') filtered = filtered.filter(p => p.namespace === ns)

    const header = tableRow([
      { val: 'NAME', width: 48 }, { val: 'CPU(cores)', width: 12 },
      { val: 'MEMORY(bytes)', width: 16 },
    ])
    const rows = filtered.map(p => tableRow([
      { val: p.name, width: 48 },
      { val: `${Math.floor(Math.random() * 50 + 1)}m`, width: 12 },
      { val: `${Math.floor(Math.random() * 100 + 10)}Mi`, width: 16 },
    ]))
    return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
  }

  return `${ANSI.red}error: You must specify "nodes" or "pods"${ANSI.reset}`
}

function kubectlCreate(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const ns = getNamespace(cmd)

  switch (resource) {
    case 'namespace':
    case 'ns': {
      const name = cmd.args[1]
      if (!name) return `${ANSI.red}error: NAME is required${ANSI.reset}`
      if (store.namespaces.includes(name)) return `Error from server (AlreadyExists): namespaces "${name}" already exists`
      store.namespaces.push(name)
      return `namespace/${name} created`
    }
    case 'deployment': {
      const name = cmd.args[1]
      const image = cmd.flags['image'] as string
      if (!name) return `${ANSI.red}error: NAME is required${ANSI.reset}`
      if (!image) return `${ANSI.red}error: --image is required${ANSI.reset}`
      const replicas = parseInt(cmd.flags['replicas'] as string || '1', 10)
      store.createDeployment(name, ns, image, replicas)
      return `deployment.apps/${name} created`
    }
    case 'service': {
      return `${ANSI.yellow}Use "kubectl expose" to create a service${ANSI.reset}`
    }
    case 'configmap': {
      const name = cmd.args[1]
      if (!name) return `${ANSI.red}error: NAME is required${ANSI.reset}`
      const data: Record<string, string> = {}
      Object.entries(cmd.flags).forEach(([k, _v]) => {
        if (k.startsWith('from-literal')) {
          // won't match well, but handle basic case
        }
      })
      store.configmaps.push({ name, namespace: ns, data, age: '0s' })
      return `configmap/${name} created`
    }
    default:
      return `${ANSI.red}error: unknown resource type "${resource}"${ANSI.reset}`
  }
}

function kubectlExpose(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const resource = cmd.args[0]
  const name = cmd.args[1]
  const ns = getNamespace(cmd)
  const port = parseInt(cmd.flags['port'] as string || '80', 10)
  const targetPort = parseInt(cmd.flags['target-port'] as string || String(port), 10)
  const type = (cmd.flags['type'] as string as K8sService['type']) || 'ClusterIP'

  if (!resource || !name) return `${ANSI.red}error: resource and name are required${ANSI.reset}`

  const dep = store.deployments.find(d => d.name === name && d.namespace === ns)
  if (!dep) return `Error from server (NotFound): deployments.apps "${name}" not found`

  store.createService(name, ns, type, port, targetPort, dep.selector)
  return `service/${name} exposed`
}

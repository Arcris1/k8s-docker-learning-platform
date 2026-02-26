import type { ParsedCommand } from '../../types'
import { useTerminalStore } from '../../stores/terminal'
import { handleKubectl } from './KubectlSimulator'
import { handleDocker } from './DockerSimulator'

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
}

export { ANSI }

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim()
  const parts = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
  const cleaned = parts.map(p => p.replace(/^["']|["']$/g, ''))

  const tool = cleaned[0] || ''
  const args: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 1; i < cleaned.length; i++) {
    const part = cleaned[i]!
    if (part.startsWith('--')) {
      const eqIdx = part.indexOf('=')
      if (eqIdx > 0) {
        flags[part.slice(2, eqIdx)] = part.slice(eqIdx + 1)
      } else if (i + 1 < cleaned.length && !cleaned[i + 1]!.startsWith('-')) {
        flags[part.slice(2)] = cleaned[++i]!
      } else {
        flags[part.slice(2)] = true
      }
    } else if (part.startsWith('-') && part.length === 2) {
      if (i + 1 < cleaned.length && !cleaned[i + 1]!.startsWith('-')) {
        flags[part.slice(1)] = cleaned[++i]!
      } else {
        flags[part.slice(1)] = true
      }
    } else {
      args.push(part)
    }
  }

  return { tool, subcommand: args[0] || '', args: args.slice(1), flags, raw }
}

export function executeCommand(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const store = useTerminalStore()
  store.commandHistory.push(trimmed)

  const cmd = parseCommand(trimmed)

  switch (cmd.tool) {
    case 'kubectl':
      return handleKubectl(cmd)
    case 'docker':
      return handleDocker(cmd)
    case 'clear':
      return '\x1b[CLEAR]'
    case 'help':
      return helpText()
    case 'whoami':
      return 'kubernetes-admin'
    case 'hostname':
      return 'control-plane'
    case 'pwd':
      return '/home/user'
    case 'ls':
      return 'deployment.yaml  service.yaml  configmap.yaml  pod.yaml'
    case 'cat':
      return catFile(cmd.args[0] || cmd.subcommand)
    case 'echo':
      return cmd.args.join(' ') || cmd.subcommand
    case 'history':
      return store.commandHistory.map((c, i) => `  ${i + 1}  ${c}`).join('\n')
    default:
      return `${ANSI.red}bash: ${cmd.tool}: command not found${ANSI.reset}\nTry ${ANSI.cyan}help${ANSI.reset} to see available commands.`
  }
}

function catFile(name: string): string {
  const files: Record<string, string> = {
    'deployment.yaml': `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80`,
    'service.yaml': `apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP`,
    'configmap.yaml': `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info`,
    'pod.yaml': `apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80`,
  }
  return files[name] || `cat: ${name}: No such file or directory`
}

function helpText(): string {
  return `${ANSI.bold}${ANSI.cyan}K8s & Docker Learning Platform - Terminal Simulator${ANSI.reset}

${ANSI.bold}Available commands:${ANSI.reset}

  ${ANSI.green}kubectl${ANSI.reset}  - Kubernetes command-line tool
    get, apply, delete, describe, scale, rollout, logs, exec, top, create, expose

  ${ANSI.green}docker${ANSI.reset}   - Docker container management
    run, ps, stop, rm, images, build, logs, network, volume, pull, exec

  ${ANSI.green}Utilities:${ANSI.reset}
    help, clear, history, whoami, hostname, pwd, ls, cat, echo

${ANSI.gray}Use arrow keys for command history. Tab for auto-completion.${ANSI.reset}`
}

// Tab completion
export function getCompletions(partial: string): string[] {
  const parts = partial.split(/\s+/)
  const tool = parts[0]

  if (parts.length <= 1) {
    const cmds = ['kubectl', 'docker', 'clear', 'help', 'history', 'whoami', 'cat', 'ls', 'echo']
    return cmds.filter(c => c.startsWith(partial))
  }

  if (tool === 'kubectl') {
    const subcmds = ['get', 'apply', 'delete', 'describe', 'scale', 'rollout', 'logs', 'exec', 'top', 'create', 'expose']
    if (parts.length === 2) return subcmds.filter(c => c.startsWith(parts[1] || '')).map(c => `kubectl ${c}`)

    const sub = parts[1] || ''
    if (['get', 'describe', 'delete'].includes(sub) && parts.length === 3) {
      const resources = ['pods', 'deployments', 'services', 'nodes', 'namespaces', 'replicasets', 'configmaps', 'secrets', 'events', 'all']
      return resources.filter(r => r.startsWith(parts[2] || '')).map(r => `kubectl ${sub} ${r}`)
    }
  }

  if (tool === 'docker') {
    const subcmds = ['run', 'ps', 'stop', 'rm', 'images', 'build', 'logs', 'network', 'volume', 'pull', 'exec']
    if (parts.length === 2) return subcmds.filter(c => c.startsWith(parts[1] || '')).map(c => `docker ${c}`)
  }

  return []
}

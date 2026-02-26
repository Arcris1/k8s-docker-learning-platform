import type { ParsedCommand } from '../../types'
import { useTerminalStore } from '../../stores/terminal'
import { ANSI } from './SimulatorEngine'

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

function tableRow(cols: { val: string; width: number }[]): string {
  return cols.map(c => padRight(c.val, c.width)).join('  ')
}

export function handleDocker(cmd: ParsedCommand): string {
  switch (cmd.subcommand) {
    case 'run': return dockerRun(cmd)
    case 'ps': return dockerPs(cmd)
    case 'stop': return dockerStop(cmd)
    case 'rm': return dockerRm(cmd)
    case 'images': return dockerImages(cmd)
    case 'build': return dockerBuild(cmd)
    case 'logs': return dockerLogs(cmd)
    case 'network': return dockerNetwork(cmd)
    case 'volume': return dockerVolume(cmd)
    case 'pull': return dockerPull(cmd)
    case 'exec': return dockerExec(cmd)
    case 'inspect': return dockerInspect(cmd)
    case 'version':
      return `Client:\n Version:           27.0.3\n API version:       1.46\n\nServer:\n Version:           27.0.3\n API version:       1.46`
    case 'info':
      return `Containers: ${useTerminalStore().containers.length}\n Running: ${useTerminalStore().containers.filter(c => c.status === 'running').length}\nImages: ${useTerminalStore().images.length}\nServer Version: 27.0.3\nStorage Driver: overlay2\nKernel Version: 5.15.0-91-generic\nOperating System: Ubuntu 22.04.3 LTS`
    default:
      if (!cmd.subcommand) return `${ANSI.red}Usage: docker [OPTIONS] COMMAND${ANSI.reset}\nRun 'docker --help' for more information.`
      return `${ANSI.red}docker: '${cmd.subcommand}' is not a docker command.${ANSI.reset}`
  }
}

function dockerRun(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const detach = cmd.flags['d'] === true || cmd.flags['detach'] === true
  const name = cmd.flags['name'] as string | undefined
  const ports = cmd.flags['p'] as string | undefined
  const network = cmd.flags['network'] as string | undefined
  const rm = cmd.flags['rm'] === true
  const interactive = cmd.flags['it'] === true || cmd.flags['i'] === true

  // Image is the last positional arg
  const image = cmd.args[cmd.args.length - 1] || cmd.args[0]
  if (!image) return `${ANSI.red}docker: "run" requires at least 1 argument.${ANSI.reset}`

  const container = store.dockerRun(image, name || undefined, detach, ports || '', network || undefined)

  if (detach) {
    return container.id
  }

  if (interactive || image.includes('busybox') || image.includes('alpine')) {
    return `${ANSI.yellow}(simulated interactive container ${container.name})${ANSI.reset}\n/ # `
  }

  if (image.includes('nginx')) {
    return `${ANSI.gray}/docker-entrypoint.sh: Configuration complete; ready for start up${ANSI.reset}`
  }

  return `${ANSI.gray}Container ${container.name} started${ANSI.reset}`
}

function dockerPs(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const showAll = cmd.flags['a'] === true || cmd.flags['all'] === true

  let filtered = store.containers
  if (!showAll) filtered = filtered.filter(c => c.status === 'running')

  if (filtered.length === 0) return '' // Docker ps returns empty when no containers

  const header = tableRow([
    { val: 'CONTAINER ID', width: 14 }, { val: 'IMAGE', width: 24 },
    { val: 'COMMAND', width: 24 }, { val: 'CREATED', width: 22 },
    { val: 'STATUS', width: 18 }, { val: 'PORTS', width: 24 },
    { val: 'NAMES', width: 20 },
  ])

  const rows = filtered.map(c => {
    const statusStr = c.status === 'running'
      ? `${ANSI.green}Up${ANSI.reset} ${c.created}`
      : `${ANSI.red}Exited${ANSI.reset} (0) ${c.created}`
    return tableRow([
      { val: c.id.slice(0, 12), width: 14 }, { val: c.image, width: 24 },
      { val: c.command.slice(0, 22), width: 24 }, { val: c.created, width: 22 },
      { val: statusStr, width: 18 + 9 }, { val: c.ports || '', width: 24 },
      { val: c.name, width: 20 },
    ])
  })

  return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
}

function dockerStop(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const nameOrId = cmd.args[0]
  if (!nameOrId) return `${ANSI.red}"docker stop" requires at least 1 argument.${ANSI.reset}`

  if (store.dockerStop(nameOrId)) return nameOrId
  return `Error response from daemon: No such container: ${nameOrId}`
}

function dockerRm(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const nameOrId = cmd.args[0]
  const force = cmd.flags['f'] === true || cmd.flags['force'] === true

  if (!nameOrId) return `${ANSI.red}"docker rm" requires at least 1 argument.${ANSI.reset}`

  const container = store.containers.find(c => c.name === nameOrId || c.id.startsWith(nameOrId))
  if (!container) return `Error response from daemon: No such container: ${nameOrId}`

  if (container.status === 'running' && !force) {
    return `Error response from daemon: cannot remove running container ${container.id}. Stop the container before removing or force remove.`
  }

  if (force && container.status === 'running') store.dockerStop(nameOrId)
  store.dockerRm(nameOrId)
  return nameOrId
}

function dockerImages(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const showAll = cmd.flags['a'] === true

  const header = tableRow([
    { val: 'REPOSITORY', width: 24 }, { val: 'TAG', width: 16 },
    { val: 'IMAGE ID', width: 14 }, { val: 'CREATED', width: 20 },
    { val: 'SIZE', width: 10 },
  ])

  const rows = store.images.map(i => tableRow([
    { val: i.repository, width: 24 }, { val: i.tag, width: 16 },
    { val: i.id.slice(0, 12), width: 14 }, { val: i.created, width: 20 },
    { val: i.size, width: 10 },
  ]))

  return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
}

function dockerBuild(cmd: ParsedCommand): string {
  const tag = cmd.flags['t'] as string || cmd.flags['tag'] as string || 'latest'
  const context = cmd.args[0] || '.'

  const steps = [
    `${ANSI.bold}[+] Building${ANSI.reset}`,
    ` => [internal] load build definition from Dockerfile`,
    ` => [internal] load .dockerignore`,
    ` => [internal] load metadata for docker.io/library/node:20-alpine`,
    ` => [1/5] FROM docker.io/library/node:20-alpine`,
    ` => [2/5] WORKDIR /app`,
    ` => [3/5] COPY package*.json ./`,
    ` => [4/5] RUN npm install`,
    ` => [5/5] COPY . .`,
    ` => exporting to image`,
    ` => => naming to docker.io/library/${tag}`,
    ``,
    `${ANSI.green}Successfully built ${tag}${ANSI.reset}`,
  ]

  // Add image to store
  const store = useTerminalStore()
  const [repo, tagPart] = tag.includes(':') ? tag.split(':') : [tag, 'latest']
  if (!store.images.find(i => i.repository === repo && i.tag === tagPart)) {
    store.images.push({ repository: repo, tag: tagPart, id: Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), size: '145MB', created: 'Just now' })
  }

  return steps.join('\n')
}

function dockerLogs(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const nameOrId = cmd.args[0]
  if (!nameOrId) return `${ANSI.red}"docker logs" requires exactly 1 argument.${ANSI.reset}`

  const container = store.containers.find(c => c.name === nameOrId || c.id.startsWith(nameOrId))
  if (!container) return `Error response from daemon: No such container: ${nameOrId}`

  if (container.image.includes('nginx')) {
    return `${ANSI.gray}/docker-entrypoint.sh: Configuration complete; ready for start up
2024/01/15 10:23:45 [notice] 1#1: nginx/1.25.3
2024/01/15 10:23:45 [notice] 1#1: start worker processes
10.0.0.1 - - [15/Jan/2024:10:24:00 +0000] "GET / HTTP/1.1" 200 615${ANSI.reset}`
  }

  return `${ANSI.gray}Container ${container.name} started\nListening on port 8080\nReady to accept connections${ANSI.reset}`
}

function dockerNetwork(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const action = cmd.args[0]

  switch (action) {
    case 'ls':
    case 'list': {
      const header = tableRow([
        { val: 'NETWORK ID', width: 14 }, { val: 'NAME', width: 20 },
        { val: 'DRIVER', width: 10 }, { val: 'SCOPE', width: 8 },
      ])
      const rows = store.networks.map(n => tableRow([
        { val: n.id.slice(0, 12), width: 14 }, { val: n.name, width: 20 },
        { val: n.driver, width: 10 }, { val: n.scope, width: 8 },
      ]))
      return `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}`
    }
    case 'create': {
      const name = cmd.args[1]
      const driver = cmd.flags['driver'] as string || 'bridge'
      if (!name) return `${ANSI.red}network name is required${ANSI.reset}`
      const net = store.dockerCreateNetwork(name, driver)
      return net.id
    }
    case 'rm':
    case 'remove': {
      const name = cmd.args[1]
      if (!name) return `${ANSI.red}network name is required${ANSI.reset}`
      store.networks = store.networks.filter(n => n.name !== name)
      return name
    }
    case 'inspect': {
      const name = cmd.args[1]
      const net = store.networks.find(n => n.name === name)
      if (!net) return `Error: No such network: ${name}`
      return JSON.stringify([{
        Name: net.name, Id: net.id, Driver: net.driver,
        IPAM: { Config: [{ Subnet: net.subnet, Gateway: net.gateway }] },
        Containers: {},
      }], null, 2)
    }
    default:
      return `${ANSI.red}Usage: docker network COMMAND${ANSI.reset}\nCommands: ls, create, rm, inspect`
  }
}

function dockerVolume(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const action = cmd.args[0]

  switch (action) {
    case 'ls':
    case 'list': {
      const header = tableRow([
        { val: 'DRIVER', width: 10 }, { val: 'VOLUME NAME', width: 40 },
      ])
      const rows = store.volumes.map(v => tableRow([
        { val: v.driver, width: 10 }, { val: v.name, width: 40 },
      ]))
      return rows.length > 0 ? `${ANSI.bold}${header}${ANSI.reset}\n${rows.join('\n')}` : `${ANSI.bold}${header}${ANSI.reset}`
    }
    case 'create': {
      const name = cmd.args[1] || `vol_${Date.now().toString(36)}`
      const vol = store.dockerCreateVolume(name)
      return vol.name
    }
    case 'rm':
    case 'remove': {
      const name = cmd.args[1]
      if (!name) return `${ANSI.red}volume name is required${ANSI.reset}`
      store.volumes = store.volumes.filter(v => v.name !== name)
      return name
    }
    case 'inspect': {
      const name = cmd.args[1]
      const vol = store.volumes.find(v => v.name === name)
      if (!vol) return `Error: No such volume: ${name}`
      return JSON.stringify([{
        Name: vol.name, Driver: vol.driver,
        Mountpoint: vol.mountpoint, CreatedAt: vol.created,
      }], null, 2)
    }
    default:
      return `${ANSI.red}Usage: docker volume COMMAND${ANSI.reset}\nCommands: ls, create, rm, inspect`
  }
}

function dockerPull(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const image = cmd.args[0]
  if (!image) return `${ANSI.red}"docker pull" requires exactly 1 argument.${ANSI.reset}`

  const [repo, tag] = image.includes(':') ? image.split(':') : [image, 'latest']

  if (!store.images.find(i => i.repository === repo && i.tag === tag)) {
    store.images.push({
      repository: repo, tag, id: Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      size: `${Math.floor(Math.random() * 200 + 20)}MB`, created: 'Just now',
    })
  }

  return `Using default tag: ${tag}
${tag}: Pulling from library/${repo}
Digest: sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}
Status: Downloaded newer image for ${repo}:${tag}
docker.io/library/${repo}:${tag}`
}

function dockerExec(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const nameOrId = cmd.args[0]
  if (!nameOrId) return `${ANSI.red}"docker exec" requires at least 2 arguments.${ANSI.reset}`

  const container = store.containers.find(c => c.name === nameOrId || c.id.startsWith(nameOrId))
  if (!container) return `Error response from daemon: No such container: ${nameOrId}`

  const execCmd = cmd.args.slice(1).join(' ')
  if (execCmd.includes('sh') || execCmd.includes('bash')) {
    return `${ANSI.yellow}(simulated shell in ${container.name})${ANSI.reset}`
  }
  if (execCmd.includes('env')) {
    return `PATH=/usr/local/sbin:/usr/local/bin\nHOSTNAME=${container.id.slice(0, 12)}\nHOME=/root`
  }

  return `${ANSI.gray}Command executed in ${container.name}${ANSI.reset}`
}

function dockerInspect(cmd: ParsedCommand): string {
  const store = useTerminalStore()
  const nameOrId = cmd.args[0]
  if (!nameOrId) return `${ANSI.red}"docker inspect" requires at least 1 argument.${ANSI.reset}`

  const container = store.containers.find(c => c.name === nameOrId || c.id.startsWith(nameOrId))
  if (container) {
    return JSON.stringify([{
      Id: container.id, Name: `/${container.name}`,
      State: { Status: container.status, Running: container.status === 'running' },
      Config: { Image: container.image, Cmd: [container.command] },
      NetworkSettings: { Networks: { bridge: { IPAddress: '172.17.0.2' } } },
    }], null, 2)
  }
  return `Error: No such object: ${nameOrId}`
}

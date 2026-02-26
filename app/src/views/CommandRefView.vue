<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CommandLineIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/vue/24/outline'

const searchQuery = ref('')
const activeFilter = ref<'all' | 'kubectl' | 'docker'>('all')
const copiedCmd = ref('')

interface CmdRef {
  tool: 'kubectl' | 'docker'
  command: string
  description: string
  syntax: string
  examples: string[]
}

const commands: CmdRef[] = [
  // kubectl commands
  { tool: 'kubectl', command: 'get', description: 'Display one or many resources', syntax: 'kubectl get [resource] [flags]', examples: ['kubectl get pods', 'kubectl get pods -n kube-system', 'kubectl get deployments -o wide', 'kubectl get all', 'kubectl get nodes'] },
  { tool: 'kubectl', command: 'describe', description: 'Show details of a specific resource', syntax: 'kubectl describe [resource] [name]', examples: ['kubectl describe pod nginx-pod', 'kubectl describe deployment nginx', 'kubectl describe node worker-1'] },
  { tool: 'kubectl', command: 'create', description: 'Create a resource from a file or inline', syntax: 'kubectl create [resource] [name] [flags]', examples: ['kubectl create deployment nginx --image=nginx', 'kubectl create namespace dev', 'kubectl create configmap app-config --from-literal=key=value'] },
  { tool: 'kubectl', command: 'apply', description: 'Apply a configuration to a resource by file', syntax: 'kubectl apply -f [file]', examples: ['kubectl apply -f deployment.yaml', 'kubectl apply -f service.yaml', 'kubectl apply -f configmap.yaml'] },
  { tool: 'kubectl', command: 'delete', description: 'Delete resources', syntax: 'kubectl delete [resource] [name]', examples: ['kubectl delete pod nginx-pod', 'kubectl delete deployment nginx', 'kubectl delete service nginx-svc', 'kubectl delete pods --all'] },
  { tool: 'kubectl', command: 'scale', description: 'Set a new size for a deployment or replicaset', syntax: 'kubectl scale [resource] --replicas=[count]', examples: ['kubectl scale deployment nginx --replicas=5', 'kubectl scale deployment/nginx --replicas=0'] },
  { tool: 'kubectl', command: 'rollout', description: 'Manage rollouts of a deployment', syntax: 'kubectl rollout [action] [resource]', examples: ['kubectl rollout status deployment/nginx', 'kubectl rollout history deployment/nginx', 'kubectl rollout restart deployment/nginx', 'kubectl rollout undo deployment/nginx'] },
  { tool: 'kubectl', command: 'logs', description: 'Print the logs for a container in a pod', syntax: 'kubectl logs [pod] [flags]', examples: ['kubectl logs nginx-pod', 'kubectl logs nginx-pod -f', 'kubectl logs nginx-pod -c nginx --tail=100'] },
  { tool: 'kubectl', command: 'exec', description: 'Execute a command in a container', syntax: 'kubectl exec [pod] -- [command]', examples: ['kubectl exec -it nginx-pod -- /bin/sh', 'kubectl exec nginx-pod -- env', 'kubectl exec nginx-pod -- ls /usr/share/nginx/html'] },
  { tool: 'kubectl', command: 'expose', description: 'Expose a resource as a new Kubernetes service', syntax: 'kubectl expose [resource] [name] --port=[port]', examples: ['kubectl expose deployment nginx --port=80', 'kubectl expose deployment nginx --port=80 --type=NodePort', 'kubectl expose deployment nginx --port=80 --type=LoadBalancer'] },
  { tool: 'kubectl', command: 'top', description: 'Display resource usage (CPU/Memory)', syntax: 'kubectl top [nodes|pods]', examples: ['kubectl top nodes', 'kubectl top pods', 'kubectl top pods -n kube-system'] },

  // docker commands
  { tool: 'docker', command: 'run', description: 'Create and start a new container', syntax: 'docker run [flags] IMAGE [command]', examples: ['docker run -d nginx', 'docker run -d --name web -p 8080:80 nginx', 'docker run -it alpine /bin/sh', 'docker run --rm busybox echo hello'] },
  { tool: 'docker', command: 'ps', description: 'List running containers', syntax: 'docker ps [flags]', examples: ['docker ps', 'docker ps -a'] },
  { tool: 'docker', command: 'stop', description: 'Stop one or more running containers', syntax: 'docker stop CONTAINER', examples: ['docker stop web', 'docker stop abc123'] },
  { tool: 'docker', command: 'rm', description: 'Remove one or more containers', syntax: 'docker rm [flags] CONTAINER', examples: ['docker rm web', 'docker rm -f web'] },
  { tool: 'docker', command: 'images', description: 'List images', syntax: 'docker images [flags]', examples: ['docker images', 'docker images -a'] },
  { tool: 'docker', command: 'build', description: 'Build an image from a Dockerfile', syntax: 'docker build [flags] PATH', examples: ['docker build -t myapp:v1 .', 'docker build -t myapp:latest --no-cache .'] },
  { tool: 'docker', command: 'pull', description: 'Download an image from a registry', syntax: 'docker pull IMAGE[:TAG]', examples: ['docker pull nginx', 'docker pull nginx:alpine', 'docker pull node:20-alpine'] },
  { tool: 'docker', command: 'logs', description: 'Fetch the logs of a container', syntax: 'docker logs [flags] CONTAINER', examples: ['docker logs web', 'docker logs -f web', 'docker logs --tail 50 web'] },
  { tool: 'docker', command: 'exec', description: 'Execute a command in a running container', syntax: 'docker exec [flags] CONTAINER COMMAND', examples: ['docker exec -it web /bin/sh', 'docker exec web env', 'docker exec web cat /etc/nginx/nginx.conf'] },
  { tool: 'docker', command: 'network', description: 'Manage Docker networks', syntax: 'docker network [command]', examples: ['docker network ls', 'docker network create mynet', 'docker network inspect bridge', 'docker network rm mynet'] },
  { tool: 'docker', command: 'volume', description: 'Manage Docker volumes', syntax: 'docker volume [command]', examples: ['docker volume ls', 'docker volume create mydata', 'docker volume inspect mydata', 'docker volume rm mydata'] },
]

const filteredCommands = computed(() => {
  let result = commands
  if (activeFilter.value !== 'all') {
    result = result.filter(c => c.tool === activeFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.command.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.syntax.toLowerCase().includes(q) ||
      c.examples.some(e => e.toLowerCase().includes(q))
    )
  }
  return result
})

async function copyCommand(cmd: string) {
  await navigator.clipboard.writeText(cmd)
  copiedCmd.value = cmd
  setTimeout(() => copiedCmd.value = '', 2000)
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-slate-100 mb-2">Command Reference</h1>
      <p class="text-slate-400">Quick reference for kubectl and Docker commands.</p>
    </div>

    <!-- Search + Filter -->
    <div class="flex items-center gap-4 mb-6">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search commands..."
          class="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
        />
      </div>
      <div class="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
        <button
          v-for="filter in (['all', 'kubectl', 'docker'] as const)" :key="filter"
          class="px-3 py-1.5 text-xs rounded-md transition-colors"
          :class="activeFilter === filter ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'"
          @click="activeFilter = filter"
        >
          {{ filter === 'all' ? 'All' : filter }}
        </button>
      </div>
    </div>

    <!-- Results count -->
    <p class="text-xs text-slate-500 mb-4">{{ filteredCommands.length }} commands</p>

    <!-- Command Cards -->
    <div class="space-y-4">
      <div
        v-for="cmd in filteredCommands" :key="cmd.tool + cmd.command"
        class="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span
              class="px-2 py-0.5 text-xs font-mono rounded"
              :class="cmd.tool === 'kubectl' ? 'bg-cyan-400/10 text-cyan-400' : 'bg-blue-400/10 text-blue-400'"
            >
              {{ cmd.tool }}
            </span>
            <h3 class="text-base font-semibold text-slate-100 font-mono">{{ cmd.command }}</h3>
          </div>
        </div>
        <p class="text-sm text-slate-400 mb-3">{{ cmd.description }}</p>

        <!-- Syntax -->
        <div class="mb-3 px-3 py-2 bg-slate-800/50 rounded-lg">
          <code class="text-sm text-emerald-400 font-mono">{{ cmd.syntax }}</code>
        </div>

        <!-- Examples -->
        <div class="space-y-1">
          <p class="text-xs text-slate-500 font-medium">Examples:</p>
          <div v-for="(ex, i) in cmd.examples" :key="i" class="flex items-center group">
            <code class="flex-1 text-xs text-slate-300 font-mono bg-slate-800/30 px-2 py-1 rounded">$ {{ ex }}</code>
            <button
              class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700"
              @click="copyCommand(ex)"
            >
              <ClipboardDocumentCheckIcon v-if="copiedCmd === ex" class="w-3.5 h-3.5 text-emerald-400" />
              <ClipboardDocumentIcon v-else class="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="filteredCommands.length === 0" class="text-center py-12 text-slate-500">
      No commands match your search.
    </p>
  </div>
</template>

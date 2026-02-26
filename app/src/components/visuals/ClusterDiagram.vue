<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTerminalStore } from '../../stores/terminal'

const store = useTerminalStore()

interface VisualNode {
  id: string
  label: string
  type: 'control-plane' | 'worker' | 'pod' | 'service' | 'deployment'
  status: string
  x: number
  y: number
  parentId?: string
}

const nodeWidth = 140
const nodeHeight = 40
const podSize = 32

const visualNodes = computed<VisualNode[]>(() => {
  const nodes: VisualNode[] = []

  // Control plane
  nodes.push({
    id: 'cp', label: 'Control Plane', type: 'control-plane',
    status: 'Ready', x: 300, y: 30,
  })

  // Worker nodes
  store.nodes.filter(n => n.roles.includes('worker')).forEach((n, i) => {
    nodes.push({
      id: n.name, label: n.name, type: 'worker',
      status: n.status, x: 100 + i * 280, y: 120,
    })
  })

  // Deployments
  store.deployments.filter(d => d.namespace === 'default').forEach((d, i) => {
    nodes.push({
      id: `dep-${d.name}`, label: d.name, type: 'deployment',
      status: `${d.readyReplicas}/${d.replicas}`, x: 50 + i * 200, y: 220,
    })
  })

  // Services
  store.services.filter(s => s.namespace === 'default' && s.name !== 'kubernetes').forEach((s, i) => {
    nodes.push({
      id: `svc-${s.name}`, label: s.name, type: 'service',
      status: s.type, x: 500 + i * 160, y: 220,
    })
  })

  // Pods (default namespace only, user-created)
  store.pods.filter(p => p.namespace === 'default').forEach((p, i) => {
    const workerIdx = p.node === 'worker-1' ? 0 : 1
    const podsOnNode = store.pods.filter(pp => pp.namespace === 'default' && pp.node === p.node)
    const podIdx = podsOnNode.indexOf(p)
    nodes.push({
      id: `pod-${p.name}`, label: p.name.split('-').slice(-1)[0] || p.name.slice(0, 8),
      type: 'pod', status: p.status,
      x: 80 + workerIdx * 280 + (podIdx % 4) * 42,
      y: 330 + Math.floor(podIdx / 4) * 42,
      parentId: p.node,
    })
  })

  return nodes
})

// Connections between deployments and pods
const connections = computed(() => {
  const lines: { from: VisualNode; to: VisualNode; color: string }[] = []
  const allNodes = visualNodes.value

  // Control plane -> workers
  const cp = allNodes.find(n => n.id === 'cp')
  allNodes.filter(n => n.type === 'worker').forEach(w => {
    if (cp) lines.push({ from: cp, to: w, color: '#475569' })
  })

  return lines
})

function getNodeColor(type: string, status: string) {
  if (type === 'control-plane') return { bg: '#1e293b', border: '#6366f1', text: '#a5b4fc' }
  if (type === 'worker') return { bg: '#1e293b', border: '#334155', text: '#94a3b8' }
  if (type === 'deployment') return { bg: '#0f172a', border: '#06b6d4', text: '#22d3ee' }
  if (type === 'service') return { bg: '#0f172a', border: '#a78bfa', text: '#c4b5fd' }
  if (type === 'pod') {
    if (status === 'Running') return { bg: '#064e3b', border: '#34d399', text: '#6ee7b7' }
    if (status === 'Pending' || status === 'ContainerCreating') return { bg: '#422006', border: '#fbbf24', text: '#fde68a' }
    if (status === 'Terminating') return { bg: '#4c0519', border: '#fb7185', text: '#fda4af' }
    return { bg: '#1e293b', border: '#475569', text: '#94a3b8' }
  }
  return { bg: '#1e293b', border: '#334155', text: '#94a3b8' }
}
</script>

<template>
  <div class="w-full h-full min-h-[400px] bg-slate-950 rounded-lg border border-slate-800 overflow-auto relative">
    <svg class="w-full" :viewBox="`0 0 700 ${Math.max(450, 330 + store.pods.filter(p => p.namespace === 'default').length * 12)}`" preserveAspectRatio="xMidYMin meet">
      <!-- Grid background -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- Connection lines -->
      <line
        v-for="(conn, i) in connections" :key="'conn-' + i"
        :x1="conn.from.x + nodeWidth / 2" :y1="conn.from.y + nodeHeight"
        :x2="conn.to.x + nodeWidth / 2" :y2="conn.to.y"
        :stroke="conn.color" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.6"
      />

      <!-- Nodes -->
      <g v-for="node in visualNodes" :key="node.id">
        <!-- Pod nodes (small circles) -->
        <template v-if="node.type === 'pod'">
          <rect
            :x="node.x" :y="node.y" :width="podSize" :height="podSize" rx="6"
            :fill="getNodeColor(node.type, node.status).bg"
            :stroke="getNodeColor(node.type, node.status).border"
            stroke-width="1.5"
            class="transition-all duration-300"
          />
          <text
            :x="node.x + podSize / 2" :y="node.y + podSize / 2 + 4"
            text-anchor="middle" :fill="getNodeColor(node.type, node.status).text"
            font-size="8" font-family="JetBrains Mono, monospace"
          >
            {{ node.label.slice(0, 5) }}
          </text>
        </template>

        <!-- Regular nodes -->
        <template v-else>
          <rect
            :x="node.x" :y="node.y" :width="nodeWidth" :height="nodeHeight" rx="8"
            :fill="getNodeColor(node.type, node.status).bg"
            :stroke="getNodeColor(node.type, node.status).border"
            stroke-width="1.5"
          />
          <text
            :x="node.x + nodeWidth / 2" :y="node.y + 17"
            text-anchor="middle" :fill="getNodeColor(node.type, node.status).text"
            font-size="11" font-weight="600" font-family="Inter, sans-serif"
          >
            {{ node.label }}
          </text>
          <text
            :x="node.x + nodeWidth / 2" :y="node.y + 31"
            text-anchor="middle" fill="#64748b"
            font-size="9" font-family="JetBrains Mono, monospace"
          >
            {{ node.status }}
          </text>
        </template>
      </g>

      <!-- Empty state -->
      <text
        v-if="store.pods.filter(p => p.namespace === 'default').length === 0 && store.deployments.filter(d => d.namespace === 'default').length === 0"
        x="350" y="280" text-anchor="middle" fill="#475569" font-size="13"
      >
        No workloads in default namespace. Try: kubectl create deployment nginx --image=nginx
      </text>
    </svg>
  </div>
</template>

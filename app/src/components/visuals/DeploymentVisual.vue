<script setup lang="ts">
import { computed } from 'vue'
import { useTerminalStore } from '../../stores/terminal'

const props = defineProps<{
  deploymentName?: string
  namespace?: string
}>()

const store = useTerminalStore()

const deployment = computed(() =>
  store.deployments.find(d =>
    d.name === (props.deploymentName || store.deployments[0]?.name) &&
    d.namespace === (props.namespace || 'default')
  )
)

const replicaSet = computed(() =>
  deployment.value
    ? store.replicasets.find(r => r.deployment === deployment.value!.name && r.namespace === deployment.value!.namespace)
    : null
)

const pods = computed(() =>
  replicaSet.value
    ? store.pods.filter(p => p.ownerRef === replicaSet.value!.name && p.namespace === (props.namespace || 'default'))
    : []
)

function podColor(status: string) {
  if (status === 'Running') return '#34d399'
  if (status === 'Pending' || status === 'ContainerCreating') return '#fbbf24'
  if (status === 'Terminating') return '#fb7185'
  return '#475569'
}
</script>

<template>
  <div class="p-4">
    <svg
      v-if="deployment"
      viewBox="0 0 500 300"
      class="w-full max-w-lg mx-auto"
    >
      <!-- Deployment -->
      <rect x="175" y="10" width="150" height="40" rx="8" fill="#0f172a" stroke="#06b6d4" stroke-width="2" />
      <text x="250" y="27" text-anchor="middle" fill="#22d3ee" font-size="11" font-weight="600">Deployment</text>
      <text x="250" y="41" text-anchor="middle" fill="#64748b" font-size="9">{{ deployment.name }}</text>

      <!-- Arrow to ReplicaSet -->
      <line x1="250" y1="50" x2="250" y2="80" stroke="#334155" stroke-width="1.5" />

      <!-- ReplicaSet -->
      <rect x="175" y="80" width="150" height="40" rx="8" fill="#0f172a" stroke="#a78bfa" stroke-width="2" />
      <text x="250" y="97" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="600">ReplicaSet</text>
      <text x="250" y="111" text-anchor="middle" fill="#64748b" font-size="9">{{ replicaSet?.name?.slice(0, 20) || '...' }}</text>

      <!-- Arrows to Pods -->
      <line
        v-for="(pod, i) in pods" :key="pod.name + '-line'"
        x1="250" y1="120"
        :x2="60 + i * (380 / Math.max(pods.length, 1))" y2="160"
        stroke="#334155" stroke-width="1"
      />

      <!-- Pods -->
      <g v-for="(pod, i) in pods" :key="pod.name">
        <rect
          :x="40 + i * (380 / Math.max(pods.length, 1))" y="160"
          width="40" height="40" rx="8"
          fill="#0f172a"
          :stroke="podColor(pod.status)"
          stroke-width="2"
          class="transition-all duration-500"
        >
          <animate
            v-if="pod.status === 'Pending' || pod.status === 'ContainerCreating'"
            attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"
          />
        </rect>
        <text
          :x="60 + i * (380 / Math.max(pods.length, 1))" y="183"
          text-anchor="middle" :fill="podColor(pod.status)" font-size="8"
        >
          Pod
        </text>
        <text
          :x="60 + i * (380 / Math.max(pods.length, 1))" y="215"
          text-anchor="middle" fill="#64748b" font-size="7"
        >
          {{ pod.status }}
        </text>
      </g>

      <!-- Replica count -->
      <text x="250" y="270" text-anchor="middle" fill="#94a3b8" font-size="11">
        {{ deployment.readyReplicas }}/{{ deployment.replicas }} ready
      </text>
    </svg>

    <!-- Empty state -->
    <div v-else class="text-center py-8">
      <p class="text-sm text-slate-500">No deployments found.</p>
      <p class="text-xs text-slate-600 mt-1">Try: kubectl create deployment nginx --image=nginx</p>
    </div>
  </div>
</template>

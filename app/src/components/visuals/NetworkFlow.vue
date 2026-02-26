<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useTerminalStore } from '../../stores/terminal'

const store = useTerminalStore()
const animationOffset = ref(0)
let animFrame: number | null = null

const services = computed(() =>
  store.services.filter(s => s.namespace === 'default' && s.name !== 'kubernetes')
)

const firstService = computed(() => services.value[0])
const targetPods = computed(() => {
  if (!firstService.value) return []
  const selector = firstService.value.selector
  return store.pods.filter(p => {
    if (p.namespace !== 'default') return false
    return Object.entries(selector).every(([k, v]) => p.labels[k] === v)
  })
})

function animate() {
  animationOffset.value = (animationOffset.value + 0.5) % 20
  animFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  animate()
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<template>
  <div class="p-4">
    <svg
      v-if="firstService"
      viewBox="0 0 500 250"
      class="w-full max-w-lg mx-auto"
    >
      <!-- External client -->
      <rect x="10" y="90" width="80" height="40" rx="8" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
      <text x="50" y="112" text-anchor="middle" fill="#94a3b8" font-size="10">Client</text>

      <!-- Arrow: Client -> Service -->
      <line x1="90" y1="110" x2="180" y2="110" stroke="#06b6d4" stroke-width="2"
        :stroke-dasharray="'6,6'" :stroke-dashoffset="animationOffset" />
      <circle cx="140" cy="110" r="3" fill="#06b6d4" opacity="0.8">
        <animate attributeName="cx" values="100;170" dur="1s" repeatCount="indefinite" />
      </circle>

      <!-- Service -->
      <rect x="180" y="85" width="120" height="50" rx="10" fill="#0f172a" stroke="#a78bfa" stroke-width="2" />
      <text x="240" y="106" text-anchor="middle" fill="#c4b5fd" font-size="11" font-weight="600">Service</text>
      <text x="240" y="122" text-anchor="middle" fill="#64748b" font-size="8">{{ firstService.name }}</text>

      <!-- Arrows: Service -> Pods -->
      <g v-for="(pod, i) in targetPods" :key="pod.name">
        <line
          x1="300" :y1="110"
          :x2="370" :y2="50 + i * 60"
          stroke="#34d399" stroke-width="1.5"
          :stroke-dasharray="'4,4'" :stroke-dashoffset="animationOffset"
        />

        <!-- Pod -->
        <rect
          x="370" :y="30 + i * 60"
          width="90" height="40" rx="8"
          fill="#064e3b" stroke="#34d399" stroke-width="1.5"
        />
        <text
          x="415" :y="47 + i * 60"
          text-anchor="middle" fill="#6ee7b7" font-size="9" font-weight="500"
        >
          Pod
        </text>
        <text
          x="415" :y="61 + i * 60"
          text-anchor="middle" fill="#064e3b" font-size="7"
          stroke="#34d399" stroke-width="0.3"
        >
          {{ pod.name.slice(-8) }}
        </text>
      </g>

      <!-- Port info -->
      <text x="240" y="155" text-anchor="middle" fill="#475569" font-size="9">
        :{{ firstService.ports[0]?.port }} -> :{{ firstService.ports[0]?.targetPort }}
      </text>
    </svg>

    <!-- Empty state -->
    <div v-else class="text-center py-8">
      <p class="text-sm text-slate-500">No services found in default namespace.</p>
      <p class="text-xs text-slate-600 mt-1">Create a service to see network flow visualization.</p>
    </div>
  </div>
</template>

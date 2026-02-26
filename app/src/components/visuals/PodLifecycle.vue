<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  autoPlay?: boolean
}>()

const states = ['Pending', 'ContainerCreating', 'Running', 'Terminating', 'Terminated'] as const
const currentState = ref(0)
const isPlaying = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const stateColors: Record<string, { bg: string; border: string; glow: string }> = {
  Pending: { bg: '#422006', border: '#fbbf24', glow: 'rgba(251,191,36,0.3)' },
  ContainerCreating: { bg: '#1e3a5f', border: '#60a5fa', glow: 'rgba(96,165,250,0.3)' },
  Running: { bg: '#064e3b', border: '#34d399', glow: 'rgba(52,211,153,0.3)' },
  Terminating: { bg: '#4c0519', border: '#fb7185', glow: 'rgba(251,113,133,0.3)' },
  Terminated: { bg: '#1e293b', border: '#475569', glow: 'rgba(71,85,105,0.2)' },
}

function play() {
  isPlaying.value = true
  timer = setInterval(() => {
    currentState.value = (currentState.value + 1) % states.length
  }, 1500)
}

function pause() {
  isPlaying.value = false
  if (timer) clearInterval(timer)
}

function reset() {
  pause()
  currentState.value = 0
}

onMounted(() => {
  if (props.autoPlay) play()
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

defineExpose({ play, pause, reset, setState: (idx: number) => { currentState.value = idx } })
</script>

<template>
  <div class="p-4">
    <!-- State diagram -->
    <svg viewBox="0 0 600 100" class="w-full max-w-2xl mx-auto">
      <g v-for="(state, i) in states" :key="state">
        <!-- Connection arrow -->
        <line
          v-if="i < states.length - 1"
          :x1="i * 130 + 100" y1="50"
          :x2="(i + 1) * 130 + 20" y2="50"
          stroke="#334155" stroke-width="2" marker-end="url(#arrowhead)"
        />

        <!-- State circle -->
        <circle
          :cx="i * 130 + 60" cy="50" r="24"
          :fill="i === currentState ? stateColors[state]?.bg : '#0f172a'"
          :stroke="i === currentState ? stateColors[state]?.border : '#334155'"
          stroke-width="2"
          class="transition-all duration-500"
        />
        <circle
          v-if="i === currentState"
          :cx="i * 130 + 60" cy="50" r="28"
          fill="none"
          :stroke="stateColors[state]?.border"
          stroke-width="1" opacity="0.4"
          class="animate-ping"
        />

        <!-- State label -->
        <text
          :x="i * 130 + 60" y="88"
          text-anchor="middle"
          :fill="i === currentState ? stateColors[state]?.border : '#64748b'"
          font-size="10" font-weight="500"
          class="transition-all duration-300"
        >
          {{ state }}
        </text>

        <!-- State icon (simplified) -->
        <text
          :x="i * 130 + 60" y="54"
          text-anchor="middle"
          :fill="i === currentState ? stateColors[state]?.border : '#475569'"
          font-size="14"
        >
          {{ i === 0 ? '...' : i === 1 ? '+' : i === 2 ? '>' : i === 3 ? 'x' : '-' }}
        </text>
      </g>

      <!-- Arrow marker -->
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 Z" fill="#334155" />
        </marker>
      </defs>
    </svg>

    <!-- Controls -->
    <div class="flex items-center justify-center gap-3 mt-4">
      <button
        class="px-3 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        @click="isPlaying ? pause() : play()"
      >
        {{ isPlaying ? 'Pause' : 'Play' }}
      </button>
      <button
        class="px-3 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>

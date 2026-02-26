<script setup lang="ts">
import { ref } from 'vue'
import type { Checkpoint } from '../../types'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  checkpoints: Checkpoint[]
  moduleId: string
  savedAnswers: Record<string, number>
}>()

const emit = defineEmits<{
  answer: [checkpointId: string, answerIndex: number]
}>()

const expandedId = ref<string | null>(null)
const selectedAnswers = ref<Record<string, number>>({ ...props.savedAnswers })

function selectAnswer(checkpointId: string, index: number) {
  selectedAnswers.value[checkpointId] = index
  emit('answer', checkpointId, index)
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}
</script>

<template>
  <div v-if="checkpoints.length > 0" class="mt-12 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
    <h3 class="text-lg font-semibold text-slate-200 mb-4">Knowledge Checkpoint</h3>
    <div class="space-y-4">
      <div
        v-for="(cp, i) in checkpoints"
        :key="cp.id"
        class="p-4 rounded-lg border transition-colors"
        :class="[
          selectedAnswers[cp.id] !== undefined
            ? selectedAnswers[cp.id] === cp.correctIndex
              ? 'border-emerald-400/30 bg-emerald-400/5'
              : 'border-rose-400/30 bg-rose-400/5'
            : 'border-slate-800 bg-slate-800/30'
        ]"
      >
        <button
          class="w-full text-left flex items-start gap-3"
          @click="toggleExpand(cp.id)"
        >
          <span class="text-sm font-mono text-slate-500 mt-0.5">Q{{ i + 1 }}</span>
          <span class="text-sm text-slate-200 flex-1">{{ cp.question }}</span>
          <CheckCircleIcon
            v-if="selectedAnswers[cp.id] === cp.correctIndex"
            class="w-5 h-5 text-emerald-400 flex-shrink-0"
          />
          <XCircleIcon
            v-else-if="selectedAnswers[cp.id] !== undefined"
            class="w-5 h-5 text-rose-400 flex-shrink-0"
          />
        </button>

        <div v-if="expandedId === cp.id && cp.options.length > 0" class="mt-3 ml-8 space-y-2">
          <button
            v-for="(opt, j) in cp.options"
            :key="j"
            class="w-full text-left px-3 py-2 rounded text-sm transition-colors"
            :class="[
              selectedAnswers[cp.id] === j
                ? j === cp.correctIndex
                  ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                  : 'bg-rose-400/20 text-rose-400 border border-rose-400/30'
                : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'
            ]"
            @click="selectAnswer(cp.id, j)"
          >
            {{ opt }}
          </button>
          <p
            v-if="selectedAnswers[cp.id] !== undefined && cp.explanation"
            class="text-xs text-slate-400 mt-2 p-2 bg-slate-800/50 rounded"
          >
            {{ cp.explanation }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

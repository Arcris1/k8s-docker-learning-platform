<script setup lang="ts">
import { ref } from 'vue'
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  code: string
  language: string
  highlightedHtml?: string
  showTryButton?: boolean
}>()

const emit = defineEmits<{
  tryInTerminal: [code: string]
}>()

const copied = ref(false)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = props.code
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}
</script>

<template>
  <div class="code-block rounded-lg border border-slate-800 overflow-hidden my-4">
    <div class="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800">
      <span class="text-xs font-mono text-slate-400">{{ language }}</span>
      <div class="flex items-center gap-2">
        <button
          v-if="showTryButton && (language === 'bash' || language === 'shell')"
          class="flex items-center gap-1 text-xs text-amber-400/80 hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-amber-400/10"
          @click="emit('tryInTerminal', code)"
        >
          <CommandLineIcon class="w-3.5 h-3.5" />
          Try in Terminal
        </button>
        <button
          class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-700"
          @click="copyCode"
        >
          <ClipboardDocumentCheckIcon v-if="copied" class="w-3.5 h-3.5 text-emerald-400" />
          <ClipboardDocumentIcon v-else class="w-3.5 h-3.5" />
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
    <div v-if="highlightedHtml" v-html="highlightedHtml" class="overflow-x-auto" />
    <pre v-else class="p-4 overflow-x-auto bg-slate-900"><code class="text-sm font-mono text-slate-300">{{ code }}</code></pre>
  </div>
</template>

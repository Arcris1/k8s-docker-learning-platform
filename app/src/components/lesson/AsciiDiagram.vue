<script setup lang="ts">
defineProps<{
  content: string
  title?: string
}>()
</script>

<template>
  <div class="ascii-diagram my-6 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
    <div v-if="title" class="px-4 py-2 border-b border-slate-800 bg-slate-800/30">
      <span class="text-xs font-medium text-slate-400">{{ title }}</span>
    </div>
    <pre class="p-4 m-0 border-0 bg-transparent"><code class="text-sm leading-relaxed text-slate-300" style="font-family: 'JetBrains Mono', monospace;">{{ content }}</code></pre>
  </div>
</template>

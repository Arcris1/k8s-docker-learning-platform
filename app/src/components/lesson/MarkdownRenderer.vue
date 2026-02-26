<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue'

const props = defineProps<{
  html: string
}>()

const containerRef = ref<HTMLElement | null>(null)

function enhanceContent() {
  if (!containerRef.value) return

  // Add IDs to headings for anchor navigation
  const headings = containerRef.value.querySelectorAll('h2, h3, h4')
  headings.forEach((h) => {
    if (!h.id) {
      h.id =
        h.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || ''
    }
  })

  // Enhance copy buttons to work with DOM events
  const copyBtns = containerRef.value.querySelectorAll('.copy-btn')
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block')
      const codeEl = codeBlock?.querySelector('code')
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent || '')
        btn.textContent = 'Copied!'
        setTimeout(() => (btn.textContent = 'Copy'), 2000)
      }
    })
  })
}

onMounted(() => enhanceContent())
watch(() => props.html, () => nextTick(() => enhanceContent()))
</script>

<template>
  <div ref="containerRef" v-html="html" />
</template>

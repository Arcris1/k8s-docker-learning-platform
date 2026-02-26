<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { Bars3Icon } from '@heroicons/vue/24/outline'

const route = useRoute()
const emit = defineEmits<{ toggleSidebar: [] }>()

const pageTitle = computed(() => {
  if (route.name === 'dashboard') return 'Dashboard'
  if (route.name === 'tier') return `Tier ${route.params.tierId}`
  if (route.name === 'lesson') return ''
  if (route.name === 'lab') return 'Lab'
  if (route.name === 'commands') return 'Command Reference'
  return ''
})

const breadcrumbs = computed(() => {
  const crumbs: { label: string; path?: string }[] = [{ label: 'Home', path: '/' }]
  if (route.params.tierId) {
    crumbs.push({ label: `Tier ${route.params.tierId}`, path: `/tier/${route.params.tierId}` })
  }
  if (route.params.slug) {
    crumbs.push({
      label: (route.params.slug as string).replace(/-/g, ' '),
      path: `/tier/${route.params.tierId}/module/${route.params.slug}`,
    })
  }
  if (route.params.labId) {
    crumbs.push({ label: `Lab ${route.params.labId}` })
  }
  return crumbs
})
</script>

<template>
  <header class="h-16 flex items-center gap-4 px-6 border-b border-slate-800 bg-slate-900/50">
    <button
      class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
      @click="emit('toggleSidebar')"
    >
      <Bars3Icon class="w-5 h-5" />
    </button>

    <nav class="flex items-center gap-2 text-sm">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span v-if="i > 0" class="text-slate-600">/</span>
        <router-link
          v-if="crumb.path"
          :to="crumb.path"
          class="text-slate-400 hover:text-slate-200 transition-colors capitalize"
        >
          {{ crumb.label }}
        </router-link>
        <span v-else class="text-slate-300 capitalize">{{ crumb.label }}</span>
      </template>
    </nav>

    <h1 v-if="pageTitle" class="ml-auto text-sm font-medium text-slate-300">
      {{ pageTitle }}
    </h1>
  </header>
</template>

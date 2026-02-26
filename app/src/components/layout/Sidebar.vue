<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeIcon,
  AcademicCapIcon,
  CommandLineIcon,
  CubeIcon,
  RocketLaunchIcon,
  StarIcon,
  BookOpenIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const tiers = [
  { id: 1, name: 'Foundations', icon: CubeIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 2, name: 'Intermediate', icon: RocketLaunchIcon, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { id: 3, name: 'Advanced', icon: StarIcon, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 4, name: 'Master', icon: AcademicCapIcon, color: 'text-violet-400', bg: 'bg-violet-400/10' },
]

const navItems = computed(() => [
  { name: 'Dashboard', path: '/', icon: HomeIcon },
  ...tiers.map((t) => ({
    name: `Tier ${t.id}: ${t.name}`,
    path: `/tier/${t.id}`,
    icon: t.icon,
    color: t.color,
    bg: t.bg,
  })),
  { name: 'Command Reference', path: '/commands', icon: CommandLineIcon },
])

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

defineProps<{ collapsed: boolean }>()
</script>

<template>
  <aside
    class="flex flex-col border-r border-slate-800 bg-slate-900/50 transition-all duration-300"
    :class="collapsed ? 'w-16' : 'w-64'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
      <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
        <BookOpenIcon class="w-5 h-5 text-cyan-400" />
      </div>
      <span v-if="!collapsed" class="font-semibold text-slate-100 whitespace-nowrap">
        K8s & Docker
      </span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      <button
        v-for="item in navItems"
        :key="item.path"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
        :class="[
          isActive(item.path)
            ? 'bg-slate-800 text-slate-100'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
        ]"
        @click="router.push(item.path)"
      >
        <component
          :is="item.icon"
          class="w-5 h-5 flex-shrink-0"
          :class="item.color || (isActive(item.path) ? 'text-cyan-400' : '')"
        />
        <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useContentLoader } from '../composables/useContentLoader'
import { useProgress } from '../composables/useProgress'
import { useRouter } from 'vue-router'
import {
  CubeIcon,
  RocketLaunchIcon,
  StarIcon,
  AcademicCapIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  BeakerIcon,
  CommandLineIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { tiers, allModules } = useContentLoader()
const { getTierProgress, overallProgress, recentActivity, completedLabCount } = useProgress()

const tierIcons = [CubeIcon, RocketLaunchIcon, StarIcon, AcademicCapIcon]
const tierColors = [
  { ring: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', gradient: 'from-emerald-500' },
  { ring: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', gradient: 'from-cyan-500' },
  { ring: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', gradient: 'from-amber-500' },
  { ring: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', gradient: 'from-violet-500' },
]

const totalLabs = computed(() => allModules.value.reduce((sum, m) => sum + m.labs.length, 0))

// Find the next module to continue
const nextModule = computed(() => {
  for (const tier of tiers.value) {
    for (const mod of tier.modules) {
      const prog = recentActivity.value.find((a: { id: string }) => a.id === mod.id)
      if (!prog) return { mod, tier }
    }
  }
  const firstTier = tiers.value[0]
  const firstMod = firstTier?.modules[0]
  return firstTier && firstMod ? { mod: firstMod, tier: firstTier } : null
})
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-slate-100 mb-2">K8s & Docker Learning Platform</h1>
      <p class="text-slate-400">Master containerization and orchestration through interactive lessons and labs.</p>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div class="text-2xl font-bold text-slate-100">{{ overallProgress.completed }}/{{ overallProgress.total }}</div>
        <div class="text-xs text-slate-400 mt-1">Modules Completed</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div class="text-2xl font-bold text-slate-100">{{ completedLabCount }}/{{ totalLabs }}</div>
        <div class="text-xs text-slate-400 mt-1">Labs Completed</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div class="text-2xl font-bold text-slate-100">{{ overallProgress.percentage }}%</div>
        <div class="text-xs text-slate-400 mt-1">Overall Progress</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div class="text-2xl font-bold text-slate-100">{{ allModules.length }}</div>
        <div class="text-xs text-slate-400 mt-1">Total Modules</div>
      </div>
    </div>

    <!-- Overall Progress Bar -->
    <div class="mb-10 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-slate-200">Learning Path</h2>
        <button
          v-if="nextModule"
          class="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          @click="router.push(`/tier/${nextModule.tier.id}/module/${nextModule.mod.slug}`)"
        >
          Continue Learning
          <ArrowRightIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Progress track -->
      <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 rounded-full transition-all duration-700"
          :style="{ width: overallProgress.percentage + '%' }"
        />
      </div>

      <!-- Tier milestone markers -->
      <div class="flex items-center justify-between">
        <div
          v-for="(tier, idx) in tiers" :key="tier.id"
          class="flex flex-col items-center gap-1"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors"
            :class="[
              getTierProgress(tier.id).percentage === 100
                ? 'border-emerald-400 bg-emerald-400/20'
                : getTierProgress(tier.id).percentage > 0
                ? (tierColors[idx]?.border || '') + ' ' + (tierColors[idx]?.bg || '')
                : 'border-slate-700 bg-slate-800'
            ]"
          >
            <CheckCircleIcon v-if="getTierProgress(tier.id).percentage === 100" class="w-4 h-4 text-emerald-400" />
            <component v-else :is="tierIcons[idx]" class="w-4 h-4" :class="getTierProgress(tier.id).percentage > 0 ? tierColors[idx]?.ring : 'text-slate-600'" />
          </div>
          <span class="text-xs" :class="getTierProgress(tier.id).percentage > 0 ? 'text-slate-300' : 'text-slate-600'"
          >
            {{ tier.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tier Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <button
        v-for="(tier, idx) in tiers"
        :key="tier.id"
        class="p-6 rounded-xl bg-slate-900/50 border transition-all duration-200 text-left hover:border-slate-600 hover:bg-slate-800/50"
        :class="tierColors[idx]?.border"
        @click="router.push(`/tier/${tier.id}`)"
      >
        <div class="flex items-start gap-4">
          <!-- Progress Ring -->
          <div class="relative w-16 h-16 flex-shrink-0">
            <svg class="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                class="text-slate-800" stroke-width="4" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor"
                :class="tierColors[idx]?.ring" stroke-width="4" stroke-linecap="round"
                :stroke-dasharray="175.93"
                :stroke-dashoffset="175.93 - (175.93 * getTierProgress(tier.id).percentage / 100)"
                class="transition-all duration-700" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <component :is="tierIcons[idx]" class="w-6 h-6" :class="tierColors[idx]?.ring" />
            </div>
          </div>

          <div class="flex-1">
            <h3 class="text-lg font-semibold text-slate-100 mb-1">
              Tier {{ tier.id }}: {{ tier.name }}
            </h3>
            <p class="text-sm text-slate-400 mb-3">{{ tier.description }}</p>
            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span class="flex items-center gap-1">
                <PlayIcon class="w-3.5 h-3.5" />
                {{ tier.modules.length }} modules
              </span>
              <span class="flex items-center gap-1">
                <CheckCircleIcon class="w-3.5 h-3.5" />
                {{ getTierProgress(tier.id).completed }} done
              </span>
              <span class="flex items-center gap-1">
                <BeakerIcon class="w-3.5 h-3.5" />
                {{ tier.modules.reduce((s, m) => s + m.labs.length, 0) }} labs
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <!-- Recent Activity -->
      <div class="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
        <h2 class="text-lg font-semibold text-slate-200 mb-4">Recent Activity</h2>
        <div v-if="recentActivity.length > 0" class="space-y-3">
          <div
            v-for="activity in recentActivity.slice(0, 5)"
            :key="activity.id + activity.date"
            class="flex items-center gap-3 text-sm"
          >
            <ClockIcon class="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span class="text-slate-300">{{ activity.type === 'module' ? 'Module' : 'Lab' }}: {{ activity.id }}</span>
            <span class="text-slate-500 ml-auto text-xs">{{ new Date(activity.date).toLocaleDateString() }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-500">No activity yet. Start learning!</p>
      </div>

      <!-- Quick Links -->
      <div class="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
        <h2 class="text-lg font-semibold text-slate-200 mb-4">Quick Links</h2>
        <div class="space-y-2">
          <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 transition-colors text-left"
            @click="router.push('/commands')"
          >
            <CommandLineIcon class="w-5 h-5 text-cyan-400" />
            Command Reference
          </button>
          <button
            v-if="nextModule"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800/50 transition-colors text-left"
            @click="router.push(`/tier/${nextModule.tier.id}/module/${nextModule.mod.slug}`)"
          >
            <PlayIcon class="w-5 h-5 text-emerald-400" />
            Continue: {{ nextModule.mod.title }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

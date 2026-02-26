<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentLoader } from '../composables/useContentLoader'
import { useProgress } from '../composables/useProgress'
import {
  BookOpenIcon,
  BeakerIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ListBulletIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { getTier } = useContentLoader()
const { getModuleProgress, getTierProgress } = useProgress()

const tierId = computed(() => Number(route.params.tierId))
const tier = computed(() => getTier(tierId.value))
const progress = computed(() => getTierProgress(tierId.value))

const tierColorMap: Record<number, { accent: string; bg: string; border: string }> = {
  1: { accent: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  2: { accent: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  3: { accent: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  4: { accent: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
}
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto" v-if="tier">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-slate-100 mb-2">
        Tier {{ tier.id }}: {{ tier.name }}
      </h1>
      <p class="text-slate-400 mb-4">{{ tier.description }}</p>
      <div class="flex items-center gap-3">
        <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="tierId === 1 ? 'bg-emerald-500' : tierId === 2 ? 'bg-cyan-500' : tierId === 3 ? 'bg-amber-500' : 'bg-violet-500'"
            :style="{ width: progress.percentage + '%' }"
          />
        </div>
        <span class="text-sm text-slate-400">{{ progress.completed }}/{{ progress.total }}</span>
      </div>
    </div>

    <!-- Module List -->
    <div class="space-y-4">
      <button
        v-for="mod in tier.modules"
        :key="mod.id"
        class="w-full p-5 rounded-xl bg-slate-900/50 border transition-all duration-200 text-left hover:bg-slate-800/50 hover:border-slate-600 group"
        :class="tierColorMap[tierId]?.border || 'border-slate-800'"
        @click="router.push(`/tier/${tierId}/module/${mod.slug}`)"
      >
        <div class="flex items-start gap-4">
          <!-- Module Number -->
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
            :class="[
              tierColorMap[tierId]?.bg || 'bg-slate-800',
              tierColorMap[tierId]?.accent || 'text-slate-300',
            ]"
          >
            {{ String(mod.number).padStart(2, '0') }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold text-slate-100 group-hover:text-white truncate">
                {{ mod.title }}
              </h3>
              <CheckCircleIcon
                v-if="getModuleProgress(mod.id).completed"
                class="w-5 h-5 text-emerald-400 flex-shrink-0"
              />
            </div>

            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span class="flex items-center gap-1">
                <ListBulletIcon class="w-3.5 h-3.5" />
                {{ mod.objectives.length }} objectives
              </span>
              <span class="flex items-center gap-1">
                <BookOpenIcon class="w-3.5 h-3.5" />
                {{ mod.sections.length }} sections
              </span>
              <span v-if="mod.labs.length > 0" class="flex items-center gap-1">
                <BeakerIcon class="w-3.5 h-3.5" />
                {{ mod.labs.length }} labs
              </span>
            </div>
          </div>

          <ChevronRightIcon class="w-5 h-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1" />
        </div>
      </button>
    </div>
  </div>
</template>

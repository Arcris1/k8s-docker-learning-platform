<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentLoader } from '../composables/useContentLoader'
import { useProgress } from '../composables/useProgress'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  BeakerIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { getModule, allModules } = useContentLoader()
const { markSectionComplete, getModuleProgress } = useProgress()

const slug = computed(() => route.params.slug as string)
const tierId = computed(() => route.params.tierId as string)
const mod = computed(() => getModule(slug.value))
const contentRef = ref<HTMLElement | null>(null)
const activeSection = ref('')

const moduleProgress = computed(() => mod.value ? getModuleProgress(mod.value.id) : null)

// Adjacent modules for nav
const adjacentModules = computed(() => {
  if (!mod.value) return { prev: undefined, next: undefined }
  const all = allModules.value
  const idx = all.findIndex((m) => m.slug === slug.value)
  return {
    prev: idx > 0 ? all[idx - 1] : undefined,
    next: idx < all.length - 1 ? all[idx + 1] : undefined,
  }
})

// IntersectionObserver for section tracking
onMounted(() => {
  nextTick(() => setupObserver())
})

watch(slug, () => nextTick(() => setupObserver()))

function setupObserver() {
  if (!contentRef.value) return

  const headings = contentRef.value.querySelectorAll('h2, h3')
  if (headings.length === 0) return

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id
          activeSection.value = id
          if (mod.value && id) {
            markSectionComplete(mod.value.id, id)
          }
        }
      }
    },
    { rootMargin: '-20% 0px -60% 0px' }
  )

  headings.forEach((h) => {
    if (!h.id) {
      h.id = h.textContent
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || ''
    }
    observer.observe(h)
  })
}

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="flex" v-if="mod">
    <!-- TOC Sidebar -->
    <aside class="hidden lg:block w-64 flex-shrink-0 border-r border-slate-800 p-4 overflow-y-auto sticky top-0 h-[calc(100vh-4rem)]">
      <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contents</h3>
      <nav class="space-y-1">
        <button
          v-for="section in mod.sections"
          :key="section.id"
          class="w-full text-left text-sm px-2 py-1.5 rounded transition-colors flex items-center gap-2"
          :class="[
            activeSection === section.id
              ? 'text-cyan-400 bg-cyan-400/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
          ]"
          @click="scrollToSection(section.id)"
        >
          <CheckCircleIcon
            v-if="moduleProgress?.sectionsCompleted.includes(section.id)"
            class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"
          />
          <span class="truncate">{{ section.title }}</span>
        </button>
        <!-- Sub-sections -->
        <template v-for="section in mod.sections" :key="section.id + '-children'">
          <button
            v-for="child in section.children"
            :key="child.id"
            class="w-full text-left text-xs px-2 py-1 pl-6 rounded transition-colors text-slate-500 hover:text-slate-300"
            :class="activeSection === child.id ? 'text-cyan-400' : ''"
            @click="scrollToSection(child.id)"
          >
            {{ child.title }}
          </button>
        </template>
      </nav>

      <!-- Labs -->
      <div v-if="mod.labs.length > 0" class="mt-6 pt-4 border-t border-slate-800">
        <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Labs</h3>
        <div class="space-y-1">
          <button
            v-for="lab in mod.labs"
            :key="lab.id"
            class="w-full text-left text-sm px-2 py-1.5 rounded text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10 transition-colors flex items-center gap-2"
            @click="router.push(`/tier/${tierId}/module/${slug}/lab/${lab.id}`)"
          >
            <BeakerIcon class="w-3.5 h-3.5 flex-shrink-0" />
            <span class="truncate">{{ lab.title }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Content -->
    <div class="flex-1 min-w-0 p-8 max-w-4xl">
      <!-- Module Header -->
      <div class="mb-8">
        <div class="text-sm text-slate-500 mb-2">Module {{ mod.number }}</div>
        <h1 class="text-3xl font-bold text-slate-100 mb-4">{{ mod.title }}</h1>

        <!-- Objectives -->
        <div v-if="mod.objectives.length > 0" class="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
          <h3 class="text-sm font-semibold text-slate-300 mb-2">Learning Objectives</h3>
          <ul class="space-y-1">
            <li v-for="(obj, i) in mod.objectives" :key="i" class="text-sm text-slate-400 flex items-start gap-2">
              <span class="text-cyan-400 font-mono text-xs mt-0.5">{{ i + 1 }}.</span>
              {{ obj }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Rendered Markdown Content -->
      <div
        ref="contentRef"
        class="prose-k8s prose prose-invert prose-sm max-w-none
               prose-headings:scroll-mt-20
               prose-h2:text-xl prose-h2:font-bold prose-h2:text-slate-100 prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-800
               prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-200 prose-h3:mt-8 prose-h3:mb-3
               prose-p:text-slate-300 prose-p:leading-relaxed
               prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
               prose-strong:text-slate-100
               prose-code:text-emerald-400 prose-code:bg-slate-800/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
               prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-lg
               prose-table:border-collapse
               prose-th:bg-slate-800/50 prose-th:text-slate-200 prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-slate-700
               prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-slate-800 prose-td:text-slate-300
               prose-li:text-slate-300
               prose-blockquote:border-cyan-400/50 prose-blockquote:text-slate-400"
        v-html="mod.htmlContent"
      />

      <!-- Key Takeaways -->
      <div v-if="mod.keyTakeaways.length > 0" class="mt-12 p-6 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
        <h3 class="text-lg font-semibold text-emerald-400 mb-3">Key Takeaways</h3>
        <ul class="space-y-2">
          <li v-for="(t, i) in mod.keyTakeaways" :key="i" class="text-sm text-slate-300 flex items-start gap-2">
            <CheckCircleIcon class="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            {{ t }}
          </li>
        </ul>
      </div>

      <!-- Navigation -->
      <div class="mt-12 pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          v-if="adjacentModules.prev"
          class="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          @click="router.push(`/tier/${adjacentModules.prev!.tier}/module/${adjacentModules.prev!.slug}`)"
        >
          <ChevronLeftIcon class="w-4 h-4" />
          Module {{ adjacentModules.prev.number }}: {{ adjacentModules.prev.title }}
        </button>
        <div v-else />
        <button
          v-if="adjacentModules.next"
          class="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          @click="router.push(`/tier/${adjacentModules.next!.tier}/module/${adjacentModules.next!.slug}`)"
        >
          Module {{ adjacentModules.next.number }}: {{ adjacentModules.next.title }}
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style>
@reference "../styles/main.css";

/* Code block styling */
.code-block {
  @apply rounded-lg border border-slate-800 overflow-hidden my-4;
}
.code-block-header {
  @apply flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800;
}
.code-lang {
  @apply text-xs font-mono text-slate-400;
}
.copy-btn {
  @apply text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-700;
}
.code-block pre {
  @apply m-0 border-0;
}
.ascii-diagram {
  @apply my-4 p-4 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto;
}
.ascii-diagram pre {
  @apply m-0 border-0 bg-transparent;
}
.ascii-diagram code {
  @apply font-mono text-sm leading-relaxed;
  font-family: 'JetBrains Mono', monospace;
}
</style>

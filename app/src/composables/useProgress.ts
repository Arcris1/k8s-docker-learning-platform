import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProgressStore } from '../stores/progress'
import { useContentLoader } from './useContentLoader'

export function useProgress() {
  const store = useProgressStore()
  const { progress, completedModuleCount, completedLabCount, recentActivity } = storeToRefs(store)
  const { tiers } = useContentLoader()

  function getTierProgress(tierId: number) {
    const tier = tiers.value.find((t) => t.id === tierId)
    if (!tier) return { total: 0, completed: 0, percentage: 0 }
    const total = tier.modules.length
    const completed = tier.modules.filter(
      (m) => store.progress.modules[m.id]?.completed
    ).length
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  function getModuleSectionProgress(moduleId: string, totalSections: number) {
    const mod = store.progress.modules[moduleId]
    if (!mod) return { completed: 0, total: totalSections, percentage: 0 }
    return {
      completed: mod.sectionsCompleted.length,
      total: totalSections,
      percentage:
        totalSections > 0
          ? Math.round((mod.sectionsCompleted.length / totalSections) * 100)
          : 0,
    }
  }

  const overallProgress = computed(() => {
    const totalModules = tiers.value.reduce((sum, t) => sum + t.modules.length, 0)
    return {
      total: totalModules,
      completed: store.completedModuleCount,
      percentage:
        totalModules > 0
          ? Math.round((store.completedModuleCount / totalModules) * 100)
          : 0,
    }
  })

  return {
    getTierProgress,
    getModuleSectionProgress,
    overallProgress,
    progress,
    completedModuleCount,
    completedLabCount,
    recentActivity,
    getModuleProgress: store.getModuleProgress,
    getLabProgress: store.getLabProgress,
    markSectionComplete: store.markSectionComplete,
    markModuleComplete: store.markModuleComplete,
    advanceLabStep: store.advanceLabStep,
    completelab: store.completelab,
    answerCheckpoint: store.answerCheckpoint,
    resetLabProgress: store.resetLabProgress,
  }
}

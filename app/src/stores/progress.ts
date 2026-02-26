import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProgress, ModuleProgress, LabProgress } from '../types'

export const useProgressStore = defineStore('progress', () => {
  const progress = ref<UserProgress>({
    modules: {},
    labs: {},
    lastActivity: new Date().toISOString(),
    totalTimeSpent: 0,
  })

  function getModuleProgress(moduleId: string): ModuleProgress {
    if (!progress.value.modules[moduleId]) {
      progress.value.modules[moduleId] = {
        moduleId,
        sectionsCompleted: [],
        checkpointAnswers: {},
        completed: false,
        lastAccessed: new Date().toISOString(),
      }
    }
    return progress.value.modules[moduleId]
  }

  function markSectionComplete(moduleId: string, sectionId: string) {
    const mod = getModuleProgress(moduleId)
    if (!mod.sectionsCompleted.includes(sectionId)) {
      mod.sectionsCompleted.push(sectionId)
    }
    mod.lastAccessed = new Date().toISOString()
    progress.value.lastActivity = new Date().toISOString()
  }

  function markModuleComplete(moduleId: string) {
    const mod = getModuleProgress(moduleId)
    mod.completed = true
    mod.lastAccessed = new Date().toISOString()
    progress.value.lastActivity = new Date().toISOString()
  }

  function getLabProgress(labId: string): LabProgress {
    if (!progress.value.labs[labId]) {
      progress.value.labs[labId] = {
        labId,
        currentStep: 0,
        stepsCompleted: [],
        completed: false,
        lastAccessed: new Date().toISOString(),
      }
    }
    return progress.value.labs[labId]
  }

  function advanceLabStep(labId: string, stepIndex: number) {
    const lab = getLabProgress(labId)
    if (!lab.stepsCompleted.includes(stepIndex)) {
      lab.stepsCompleted.push(stepIndex)
    }
    lab.currentStep = stepIndex + 1
    lab.lastAccessed = new Date().toISOString()
    progress.value.lastActivity = new Date().toISOString()
  }

  function completelab(labId: string) {
    const lab = getLabProgress(labId)
    lab.completed = true
    lab.lastAccessed = new Date().toISOString()
    progress.value.lastActivity = new Date().toISOString()
  }

  function answerCheckpoint(moduleId: string, checkpointId: string, answerIndex: number) {
    const mod = getModuleProgress(moduleId)
    mod.checkpointAnswers[checkpointId] = answerIndex
    mod.lastAccessed = new Date().toISOString()
    progress.value.lastActivity = new Date().toISOString()
  }

  function resetLabProgress(labId: string) {
    progress.value.labs[labId] = {
      labId,
      currentStep: 0,
      stepsCompleted: [],
      completed: false,
      lastAccessed: new Date().toISOString(),
    }
  }

  const completedModuleCount = computed(() =>
    Object.values(progress.value.modules).filter((m) => m.completed).length
  )

  const completedLabCount = computed(() =>
    Object.values(progress.value.labs).filter((l) => l.completed).length
  )

  const recentActivity = computed(() => {
    const all = [
      ...Object.values(progress.value.modules).map((m) => ({
        type: 'module' as const,
        id: m.moduleId,
        date: m.lastAccessed,
      })),
      ...Object.values(progress.value.labs).map((l) => ({
        type: 'lab' as const,
        id: l.labId,
        date: l.lastAccessed,
      })),
    ]
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
  })

  return {
    progress,
    getModuleProgress,
    markSectionComplete,
    markModuleComplete,
    getLabProgress,
    advanceLabStep,
    completelab,
    answerCheckpoint,
    resetLabProgress,
    completedModuleCount,
    completedLabCount,
    recentActivity,
  }
}, {
  persist: true,
})

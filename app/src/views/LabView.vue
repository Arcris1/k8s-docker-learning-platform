<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import TerminalEmulator from '../components/terminal/TerminalEmulator.vue'
import ClusterDiagram from '../components/visuals/ClusterDiagram.vue'
import DeploymentVisual from '../components/visuals/DeploymentVisual.vue'
import NetworkFlow from '../components/visuals/NetworkFlow.vue'
import PodLifecycle from '../components/visuals/PodLifecycle.vue'
import { useContentLoader } from '../composables/useContentLoader'
import { useProgress } from '../composables/useProgress'
import { useTerminalSession } from '../composables/useTerminalSession'
import { useAnimationController, type VisualPanel } from '../composables/useAnimationController'
import {
  BeakerIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { getModule } = useContentLoader()
const { getLabProgress, advanceLabStep, completelab, resetLabProgress } = useProgress()
const { initLabState, onCommandExecuted, lastCommand } = useTerminalSession()
const { activePanel, onCommandExecuted: onAnimCommand, setPanel } = useAnimationController()
const showVisuals = ref(true)

const terminalRef = ref<InstanceType<typeof TerminalEmulator> | null>(null)

const slug = computed(() => route.params.slug as string)
const tierId = computed(() => route.params.tierId as string)
const labId = computed(() => route.params.labId as string)

const mod = computed(() => getModule(slug.value))
const lab = computed(() => mod.value?.labs.find(l => l.id === labId.value))
const labProgress = computed(() => lab.value ? getLabProgress(lab.value.id) : null)

const currentStepIndex = computed(() => labProgress.value?.currentStep ?? 0)
const currentStep = computed(() => lab.value?.steps[currentStepIndex.value])
const showHint = ref(false)
const hintLevel = ref(0)

// Auto-detect step completion by matching commands
watch(lastCommand, (cmd) => {
  if (!cmd || !currentStep.value || !lab.value) return
  const expected = currentStep.value.expectedCommands
  if (expected.length === 0) return
  const matched = expected.some(exp => {
    const cmdNorm = cmd.trim().replace(/\s+/g, ' ')
    const expNorm = exp.trim().replace(/\s+/g, ' ')
    return cmdNorm.includes(expNorm) || expNorm.includes(cmdNorm)
  })
  if (matched) {
    advanceLabStep(lab.value.id, currentStepIndex.value)
    showHint.value = false
    hintLevel.value = 0
    if (currentStepIndex.value >= (lab.value.steps.length - 1)) {
      completelab(lab.value.id)
    }
  }
})

function handleReset() {
  if (!lab.value) return
  resetLabProgress(lab.value.id)
  initLabState(lab.value.initialState)
  showHint.value = false
  hintLevel.value = 0
}

function showNextHint() {
  if (!currentStep.value) return
  showHint.value = true
  hintLevel.value = Math.min(hintLevel.value + 1, currentStep.value.hints.length)
}

function goToStep(index: number) {
  if (!lab.value) return
  // Allow navigating to completed steps or the next step
  if (index <= currentStepIndex.value || labProgress.value?.stepsCompleted.includes(index)) {
    // Just scroll to that step
  }
}

function handleCommandExecuted(command: string, output: string) {
  onCommandExecuted(command, output)
  onAnimCommand(command, output)
}

const visualTabs: { id: VisualPanel; label: string }[] = [
  { id: 'cluster', label: 'Cluster' },
  { id: 'deployment', label: 'Deployment' },
  { id: 'network', label: 'Network' },
  { id: 'pod-lifecycle', label: 'Pod Lifecycle' },
]

onMounted(() => {
  if (lab.value?.initialState) {
    initLabState(lab.value.initialState)
  }
})
</script>

<template>
  <div class="h-full flex flex-col" v-if="lab">
    <!-- Lab Header -->
    <div class="flex items-center gap-4 px-4 py-3 border-b border-slate-800 bg-slate-900/50">
      <button
        class="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        @click="router.push(`/tier/${tierId}/module/${slug}`)"
      >
        <ChevronLeftIcon class="w-4 h-4" />
        Back
      </button>
      <div class="flex items-center gap-2">
        <BeakerIcon class="w-5 h-5 text-amber-400" />
        <h2 class="text-sm font-semibold text-slate-100">{{ lab.title }}</h2>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <!-- Step progress -->
        <div class="flex items-center gap-1">
          <div
            v-for="(step, i) in lab.steps"
            :key="step.id"
            class="w-2.5 h-2.5 rounded-full transition-colors"
            :class="[
              labProgress?.stepsCompleted.includes(i) ? 'bg-emerald-400' :
              i === currentStepIndex ? 'bg-cyan-400 animate-pulse' :
              'bg-slate-700'
            ]"
          />
        </div>
        <span class="text-xs text-slate-400">
          {{ labProgress?.stepsCompleted.length ?? 0 }}/{{ lab.steps.length }}
        </span>
        <button
          class="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          @click="handleReset"
        >
          <ArrowPathIcon class="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>

    <!-- Split Panes -->
    <Splitpanes class="flex-1">
      <!-- Instructions Panel -->
      <Pane :size="40" :min-size="25">
        <div class="h-full overflow-y-auto p-6">
          <!-- Steps -->
          <div class="space-y-6">
            <div
              v-for="(step, i) in lab.steps"
              :key="step.id"
              class="relative pl-8"
            >
              <!-- Step indicator -->
              <div
                class="absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                :class="[
                  labProgress?.stepsCompleted.includes(i)
                    ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400'
                    : i === currentStepIndex
                    ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                ]"
              >
                <CheckCircleIcon v-if="labProgress?.stepsCompleted.includes(i)" class="w-4 h-4" />
                <span v-else>{{ i + 1 }}</span>
              </div>

              <!-- Connector line -->
              <div
                v-if="i < lab.steps.length - 1"
                class="absolute left-[11px] top-6 w-0.5 h-full"
                :class="labProgress?.stepsCompleted.includes(i) ? 'bg-emerald-400/30' : 'bg-slate-800'"
              />

              <!-- Step content -->
              <div
                class="pb-4"
                :class="[
                  i === currentStepIndex ? 'opacity-100' : 'opacity-60',
                ]"
              >
                <h3 class="text-sm font-semibold text-slate-200 mb-2">
                  Step {{ i + 1 }}: {{ step.instruction }}
                </h3>

                <!-- Expected commands hint -->
                <div v-if="i === currentStepIndex && step.expectedCommands.length > 0" class="mt-2">
                  <p class="text-xs text-slate-500">Expected command{{ step.expectedCommands.length > 1 ? 's' : '' }}:</p>
                  <div class="mt-1 space-y-1">
                    <code
                      v-for="(ec, j) in step.expectedCommands"
                      :key="j"
                      class="block text-xs bg-slate-800/50 text-cyan-400 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-800 transition-colors"
                      @click="terminalRef?.executeAndDisplay(ec)"
                    >
                      $ {{ ec }}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hint Section -->
          <div v-if="currentStep && currentStep.hints.length > 0" class="mt-6 pt-4 border-t border-slate-800">
            <button
              class="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
              @click="showNextHint"
            >
              <LightBulbIcon class="w-4 h-4" />
              {{ showHint ? 'Next Hint' : 'Show Hint' }}
            </button>
            <div v-if="showHint" class="mt-2 space-y-2">
              <div
                v-for="i in hintLevel"
                :key="i"
                class="text-xs text-amber-400/70 bg-amber-400/5 border border-amber-400/10 rounded p-2"
              >
                {{ currentStep.hints[i - 1] }}
              </div>
            </div>
          </div>

          <!-- Lab Complete -->
          <div v-if="labProgress?.completed" class="mt-8 p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
            <div class="flex items-center gap-2 mb-2">
              <CheckCircleIcon class="w-5 h-5 text-emerald-400" />
              <h3 class="text-sm font-semibold text-emerald-400">Lab Complete!</h3>
            </div>
            <p class="text-xs text-slate-400">Great work! You've completed all steps in this lab.</p>
            <button
              class="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              @click="router.push(`/tier/${tierId}/module/${slug}`)"
            >
              Return to lesson
            </button>
          </div>
        </div>
      </Pane>

      <!-- Terminal + Visuals Panel -->
      <Pane :size="60" :min-size="30">
        <div class="h-full flex flex-col">
          <!-- Visual panel toggle + tabs -->
          <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/50">
            <button
              class="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              :class="showVisuals ? 'text-cyan-400 bg-cyan-400/10' : 'text-slate-400 hover:text-slate-200'"
              @click="showVisuals = !showVisuals"
            >
              <EyeIcon class="w-3.5 h-3.5" />
              Visuals
            </button>
            <template v-if="showVisuals">
              <button
                v-for="tab in visualTabs" :key="tab.id"
                class="text-xs px-2 py-1 rounded transition-colors"
                :class="activePanel === tab.id ? 'text-slate-100 bg-slate-700' : 'text-slate-500 hover:text-slate-300'"
                @click="setPanel(tab.id)"
              >
                {{ tab.label }}
              </button>
            </template>
          </div>

          <!-- Visual Panel -->
          <div v-if="showVisuals" class="h-[40%] border-b border-slate-800 overflow-auto bg-slate-950">
            <ClusterDiagram v-if="activePanel === 'cluster'" />
            <DeploymentVisual v-else-if="activePanel === 'deployment'" />
            <NetworkFlow v-else-if="activePanel === 'network'" />
            <PodLifecycle v-else-if="activePanel === 'pod-lifecycle'" :auto-play="true" />
          </div>

          <!-- Terminal -->
          <div class="flex-1 bg-[#0a0f1a]">
            <TerminalEmulator
              ref="terminalRef"
              @command-executed="handleCommandExecuted"
            />
          </div>
        </div>
      </Pane>
    </Splitpanes>
  </div>

  <!-- Fallback if lab not found -->
  <div v-else class="flex items-center justify-center h-full">
    <div class="text-center p-12">
      <BeakerIcon class="w-16 h-16 text-slate-600 mx-auto mb-4" />
      <h2 class="text-xl font-bold text-slate-300 mb-2">Lab not found</h2>
      <button
        class="mt-4 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
        @click="router.push(`/tier/${tierId}/module/${slug}`)"
      >
        Back to Lesson
      </button>
    </div>
  </div>
</template>

<style>
@reference "../styles/main.css";

.splitpanes {
  background: transparent;
}
.splitpanes__pane {
  background: transparent;
}
.splitpanes__splitter {
  @apply bg-slate-800 relative;
  width: 4px;
  min-width: 4px;
}
.splitpanes__splitter:hover {
  @apply bg-cyan-400/50;
}
.splitpanes__splitter::before {
  content: '';
  position: absolute;
  left: -4px;
  right: -4px;
  top: 0;
  bottom: 0;
}
</style>

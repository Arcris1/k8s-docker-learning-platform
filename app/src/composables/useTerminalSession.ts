import { ref, type Ref } from 'vue'
import { useTerminalStore } from '../stores/terminal'
import type { ClusterStateFixture } from '../types'

export function useTerminalSession() {
  const store = useTerminalStore()
  const lastCommand = ref('')
  const lastOutput = ref('')

  function initLabState(fixture?: ClusterStateFixture) {
    store.reset()
    if (fixture) {
      store.loadFixture(fixture)
    }
  }

  function onCommandExecuted(command: string, output: string) {
    lastCommand.value = command
    lastOutput.value = output
  }

  function resetCluster() {
    store.reset()
  }

  return {
    lastCommand,
    lastOutput,
    initLabState,
    onCommandExecuted,
    resetCluster,
    store,
  }
}

import { ref, watch } from 'vue'
import { useTerminalStore } from '../stores/terminal'

export type VisualPanel = 'cluster' | 'pod-lifecycle' | 'deployment' | 'network' | 'none'

export function useAnimationController() {
  const store = useTerminalStore()
  const activePanel = ref<VisualPanel>('cluster')
  const lastEventType = ref('')

  function onCommandExecuted(command: string, _output: string) {
    const cmd = command.trim().toLowerCase()

    // Route to appropriate visual based on command
    if (cmd.includes('kubectl get pods') || cmd.includes('kubectl describe pod')) {
      activePanel.value = 'cluster'
      lastEventType.value = 'pods-viewed'
    } else if (cmd.includes('kubectl create deployment') || cmd.includes('kubectl apply') && cmd.includes('deployment')) {
      activePanel.value = 'deployment'
      lastEventType.value = 'deployment-created'
    } else if (cmd.includes('kubectl scale')) {
      activePanel.value = 'deployment'
      lastEventType.value = 'deployment-scaled'
    } else if (cmd.includes('kubectl delete deployment')) {
      activePanel.value = 'deployment'
      lastEventType.value = 'deployment-deleted'
    } else if (cmd.includes('kubectl expose') || cmd.includes('kubectl get service') || cmd.includes('kubectl get svc')) {
      activePanel.value = 'network'
      lastEventType.value = 'service-changed'
    } else if (cmd.includes('kubectl rollout')) {
      activePanel.value = 'deployment'
      lastEventType.value = 'rollout'
    } else if (cmd.includes('kubectl get nodes') || cmd.includes('kubectl top')) {
      activePanel.value = 'cluster'
      lastEventType.value = 'cluster-viewed'
    } else if (cmd.includes('kubectl apply')) {
      activePanel.value = 'cluster'
      lastEventType.value = 'resource-applied'
    }
  }

  function setPanel(panel: VisualPanel) {
    activePanel.value = panel
  }

  return {
    activePanel,
    lastEventType,
    onCommandExecuted,
    setPanel,
  }
}

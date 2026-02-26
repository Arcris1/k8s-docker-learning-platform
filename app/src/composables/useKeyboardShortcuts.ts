import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

export function useKeyboardShortcuts(callbacks?: {
  toggleSidebar?: () => void
  focusTerminal?: () => void
}) {
  const router = useRouter()

  function handleKeydown(e: KeyboardEvent) {
    // Don't intercept when typing in inputs
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // Ctrl/Cmd + K: focus search (if on command ref page)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      router.push('/commands')
      return
    }

    // Escape: close modals / deselect
    if (e.key === 'Escape') {
      // handled by individual components
      return
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      switch (e.key) {
        case '?':
          // Could show help modal
          break
        case 'b':
          callbacks?.toggleSidebar?.()
          break
        case 't':
          callbacks?.focusTerminal?.()
          break
      }
    }

    // Ctrl + B: toggle sidebar
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      callbacks?.toggleSidebar?.()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}

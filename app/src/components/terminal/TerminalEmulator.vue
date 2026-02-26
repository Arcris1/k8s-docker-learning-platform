<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { executeCommand, getCompletions } from '../simulator/SimulatorEngine'
import { useTerminalStore } from '../../stores/terminal'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  initialCommands?: string[]
}>()

const emit = defineEmits<{
  commandExecuted: [command: string, output: string]
}>()

const terminalRef = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null

const PROMPT = '\x1b[36m$\x1b[0m '
let currentLine = ''
let cursorPos = 0
let historyIndex = -1

function writePrompt() {
  term?.write('\r\n' + PROMPT)
  currentLine = ''
  cursorPos = 0
  historyIndex = -1
}

function clearCurrentLine() {
  term?.write('\r\x1b[K' + PROMPT)
}

function redrawLine() {
  clearCurrentLine()
  term?.write(currentLine)
  // Move cursor to correct position
  const moveBack = currentLine.length - cursorPos
  if (moveBack > 0) {
    term?.write(`\x1b[${moveBack}D`)
  }
}

onMounted(() => {
  if (!terminalRef.value) return

  term = new Terminal({
    theme: {
      background: '#0a0f1a',
      foreground: '#cbd5e1',
      cursor: '#22d3ee',
      cursorAccent: '#0a0f1a',
      selectionBackground: '#334155',
      selectionForeground: '#e2e8f0',
      black: '#0a0f1a',
      red: '#fb7185',
      green: '#34d399',
      yellow: '#fbbf24',
      blue: '#60a5fa',
      magenta: '#a78bfa',
      cyan: '#22d3ee',
      white: '#cbd5e1',
      brightBlack: '#475569',
      brightRed: '#fb7185',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan: '#22d3ee',
      brightWhite: '#f1f5f9',
    },
    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
    fontSize: 13,
    lineHeight: 1.4,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000,
    allowProposedApi: true,
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.loadAddon(new WebLinksAddon())
  term.open(terminalRef.value)
  fitAddon.fit()

  // Welcome message
  term.writeln('\x1b[1m\x1b[36m  K8s & Docker Learning Platform - Terminal Simulator\x1b[0m')
  term.writeln('\x1b[90m  Type "help" for available commands. Use Tab for completion.\x1b[0m')
  term.write('\r\n' + PROMPT)

  // Handle input
  term.onKey(({ key, domEvent }) => {
    const store = useTerminalStore()

    switch (domEvent.key) {
      case 'Enter': {
        const cmd = currentLine.trim()
        term!.write('\r\n')
        if (cmd) {
          const output = executeCommand(cmd)
          if (output === '\x1b[CLEAR]') {
            term!.clear()
            term!.write(PROMPT)
            currentLine = ''
            cursorPos = 0
            return
          }
          if (output) {
            term!.writeln(output)
          }
          emit('commandExecuted', cmd, output)
        }
        writePrompt()
        break
      }

      case 'Backspace': {
        if (cursorPos > 0) {
          currentLine = currentLine.slice(0, cursorPos - 1) + currentLine.slice(cursorPos)
          cursorPos--
          redrawLine()
        }
        break
      }

      case 'Delete': {
        if (cursorPos < currentLine.length) {
          currentLine = currentLine.slice(0, cursorPos) + currentLine.slice(cursorPos + 1)
          redrawLine()
        }
        break
      }

      case 'ArrowUp': {
        const history = store.commandHistory
        if (history.length > 0) {
          if (historyIndex === -1) historyIndex = history.length
          historyIndex = Math.max(0, historyIndex - 1)
          currentLine = history[historyIndex] || ''
          cursorPos = currentLine.length
          redrawLine()
        }
        break
      }

      case 'ArrowDown': {
        const history = store.commandHistory
        if (historyIndex >= 0) {
          historyIndex = Math.min(history.length, historyIndex + 1)
          currentLine = historyIndex < history.length ? history[historyIndex] : ''
          cursorPos = currentLine.length
          redrawLine()
        }
        break
      }

      case 'ArrowLeft': {
        if (cursorPos > 0) {
          cursorPos--
          term!.write(key)
        }
        break
      }

      case 'ArrowRight': {
        if (cursorPos < currentLine.length) {
          cursorPos++
          term!.write(key)
        }
        break
      }

      case 'Home': {
        if (cursorPos > 0) {
          term!.write(`\x1b[${cursorPos}D`)
          cursorPos = 0
        }
        break
      }

      case 'End': {
        const moveRight = currentLine.length - cursorPos
        if (moveRight > 0) {
          term!.write(`\x1b[${moveRight}C`)
          cursorPos = currentLine.length
        }
        break
      }

      case 'Tab': {
        domEvent.preventDefault()
        const completions = getCompletions(currentLine)
        if (completions.length === 1) {
          currentLine = completions[0] + ' '
          cursorPos = currentLine.length
          redrawLine()
        } else if (completions.length > 1) {
          term!.write('\r\n')
          term!.writeln(completions.join('  '))
          term!.write(PROMPT + currentLine)
        }
        break
      }

      default: {
        // Printable characters
        if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          currentLine = currentLine.slice(0, cursorPos) + key + currentLine.slice(cursorPos)
          cursorPos++
          redrawLine()
        }
        // Ctrl+C
        if (domEvent.ctrlKey && domEvent.key === 'c') {
          term!.write('^C')
          writePrompt()
        }
        // Ctrl+L (clear)
        if (domEvent.ctrlKey && domEvent.key === 'l') {
          term!.clear()
          term!.write(PROMPT + currentLine)
        }
        break
      }
    }
  })

  // Handle paste
  term.onData((data) => {
    // Ignore control sequences (already handled by onKey)
    if (data.length > 1 && !data.startsWith('\x1b')) {
      // This is pasted text
      currentLine = currentLine.slice(0, cursorPos) + data + currentLine.slice(cursorPos)
      cursorPos += data.length
      redrawLine()
    }
  })

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalRef.value)

  // Execute initial commands if provided
  if (props.initialCommands?.length) {
    setTimeout(() => {
      props.initialCommands?.forEach((cmd) => {
        currentLine = cmd
        cursorPos = cmd.length
        term!.write(cmd)
        const output = executeCommand(cmd)
        term!.write('\r\n')
        if (output && output !== '\x1b[CLEAR]') term!.writeln(output)
        emit('commandExecuted', cmd, output)
        term!.write(PROMPT)
        currentLine = ''
        cursorPos = 0
      })
    }, 500)
  }
})

onBeforeUnmount(() => {
  term?.dispose()
})

function focus() {
  term?.focus()
}

function executeAndDisplay(command: string) {
  if (!term) return
  currentLine = command
  cursorPos = command.length
  clearCurrentLine()
  term.write(currentLine)
  term.write('\r\n')
  const output = executeCommand(command)
  if (output && output !== '\x1b[CLEAR]') term.writeln(output)
  emit('commandExecuted', command, output)
  writePrompt()
}

defineExpose({ focus, executeAndDisplay })
</script>

<template>
  <div ref="terminalRef" class="h-full w-full" @click="focus" />
</template>

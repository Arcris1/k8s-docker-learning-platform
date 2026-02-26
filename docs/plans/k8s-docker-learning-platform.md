# K8s & Docker Interactive Learning Platform - Implementation Plan

## Context

Personal-use interactive learning platform for Kubernetes and Docker. 16 existing markdown modules (22,662 lines, 752 code blocks, 65+ labs) across 4 tiers need to be transformed into a visual, terminal-driven learning experience. No auth, no database, no SaaS - just a static Vue app.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Vue 3 + Vite + TypeScript | User's choice |
| Styling | TailwindCSS + Headless UI + Heroicons | Full dark-theme control, accessible |
| Content | Build-time markdown parsing via Vite plugin | No runtime cost, HMR in dev |
| Markdown | gray-matter + markdown-it | Plugin system, token stream walking |
| Syntax highlight | Shiki | VS Code-quality, build-time rendered |
| Terminal | xterm.js | Industry standard terminal emulator |
| Diagrams | Vue Flow + custom SVG + CSS animations | Interactive node graphs + lightweight animations |
| State | Pinia + pinia-plugin-persistedstate | Auto localStorage sync |
| Layout | splitpanes | Draggable split-pane for lab view |
| Data storage | localStorage only | Personal use, ~50KB max for progress |

## Project Structure

```
app/
  src/
    main.ts
    App.vue
    router/index.ts
    stores/
      progress.ts          # localStorage progress tracking
      terminal.ts          # Simulated cluster state
    views/
      DashboardView.vue    # Progress overview, learning path
      TierView.vue         # Module list for a tier
      LessonView.vue       # Markdown rendering + section nav
      LabView.vue          # Split: instructions | terminal + visuals
      CommandRefView.vue   # Searchable command reference
    components/
      layout/              # AppShell, Sidebar, TopBar
      lesson/              # MarkdownRenderer, CodeBlock, AsciiDiagram
      terminal/            # TerminalEmulator (xterm.js wrapper)
      simulator/           # SimulatorEngine, KubectlSim, DockerSim, ClusterState
      visuals/             # ClusterDiagram, PodLifecycle, DeploymentVisual, NetworkFlow
    composables/           # useProgress, useTerminalSession, useContentLoader
    types/                 # TypeScript interfaces
    styles/                # Tailwind config, terminal theme, markdown prose
  scripts/
    parse-content.ts       # Build-time .md parser
  vite-plugin-k8s-content.ts  # Vite virtual module plugin
```

## Implementation Phases

### Phase 1: Foundation Scaffold
- Init Vue 3 + Vite + TS + TailwindCSS project in `app/`
- Dark theme app shell with sidebar navigation
- Vue Router with all routes
- Build-time content parser + Vite plugin (parse Module 01 first)
- Shiki code highlighting
- Basic LessonView rendering markdown with syntax-highlighted code blocks
- **Result**: Navigate tiers/modules, read rendered lessons

### Phase 2: Full Content Pipeline
- Parser handles all 16 modules (labs, checkpoints, ASCII diagrams, tables, commands)
- Section navigation (TOC sidebar within lessons)
- CodeBlock component (copy button, language label, "Try in Terminal" button)
- AsciiDiagram component (monospace styled rendering)
- ComparisonTable component (enhanced table styling)
- **Result**: Complete reading experience for all 16 modules

### Phase 3: Terminal Simulator
- xterm.js terminal component with dark theme
- SimulatorEngine (command parser + router)
- ClusterState (reactive in-memory K8s model: pods, deployments, services, nodes, etc.)
- KubectlSimulator: `get`, `apply`, `delete`, `describe`, `scale`, `rollout`, `logs`, `exec`, `top`
- DockerSimulator: `run`, `ps`, `stop`, `rm`, `images`, `build`, `logs`, `network`, `volume`
- Realistic ANSI-colored output, tab-completion, command history
- **Result**: Working simulated terminal for kubectl/docker commands

### Phase 4: Lab Environment
- LabView with splitpanes (instructions | terminal + visuals)
- Lab contexts (initial cluster state, file mappings, expected commands per step)
- Step auto-detection, hint system, lab reset
- Progress tracking integration
- **Result**: Interactive step-by-step labs with terminal

### Phase 5: Visual System
- ClusterDiagram (Vue Flow): control plane + worker nodes + pods + services
- PodLifecycle SVG animation (Pending -> Running -> Terminating)
- DeploymentVisual (Deployment -> ReplicaSet -> Pods tree with rolling update animation)
- NetworkFlow (traffic routing animation: external -> service -> pods)
- AnimationController coordinates terminal commands -> visual updates
- **Result**: Commands visually update diagrams in real-time

### Phase 6: Progress & Polish
- Dashboard with tier progress rings, learning path timeline, recent activity
- Section completion tracking (IntersectionObserver)
- Checkpoint quizzes
- Command reference page with search/filter
- Keyboard shortcuts, responsive design, view transitions
- **Result**: Complete polished platform

## Terminal Simulator Architecture

```
User types command -> xterm.js captures input
  -> SimulatorEngine parses (tool, command, flags, args)
  -> Routes to handler (KubectlSimulator / DockerSimulator)
  -> Handler reads/mutates ClusterState (reactive Pinia store)
  -> Returns ANSI-formatted output string
  -> xterm.js renders output
  -> Vue reactivity propagates state changes to visual components
```

ClusterState model: nodes, namespaces, pods, deployments, replicasets, services, configmaps, secrets, pvcs, pvs, events. Initialized with 3 nodes + kube-system pods. Labs can define initial state fixtures.

## Content Parser Strategy

- Vite virtual module (`virtual:k8s-modules`) - parsed at build time, imported as typed data
- gray-matter for frontmatter + markdown-it for token stream
- Walk tokens to extract: sections (H2/H3), code blocks (with language), labs (under "Hands-On Labs" heading), checkpoints, objectives, key takeaways
- Shiki highlights code blocks at build time
- ASCII diagram detection: code blocks where 40%+ lines contain box-drawing chars
- HMR support: re-parse when .md files change in dev

## Verification

After each phase:
1. `npm run dev` - app starts without errors
2. Navigate all routes
3. Phase 1: Module 01 renders with highlighted code
4. Phase 2: All 16 modules render correctly
5. Phase 3: Type `kubectl get pods`, `docker ps` in terminal and get realistic output
6. Phase 4: Complete a lab with step tracking
7. Phase 5: `kubectl apply` a deployment and see pods appear in diagram
8. Phase 6: Dashboard shows progress, localStorage persists across refreshes

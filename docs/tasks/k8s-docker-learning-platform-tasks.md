# K8s & Docker Interactive Learning Platform - Tasks

> Source plan: [docs/plans/k8s-docker-learning-platform.md](../plans/k8s-docker-learning-platform.md)

---

## Phase 1: Foundation Scaffold
**Progress: 7/7 tasks complete**

- [x] **1.1** Init Vue 3 + Vite + TypeScript project in `app/` with all dependencies (TailwindCSS, Pinia, Vue Router, Shiki, gray-matter, markdown-it, etc.)
- [x] **1.2** Configure TailwindCSS with dark theme defaults and base styles
- [x] **1.3** Build dark-theme app shell with sidebar navigation (`AppShell.vue`, `Sidebar.vue`, `TopBar.vue`)
- [x] **1.4** Set up Vue Router with all routes (`/`, `/tier/:id`, `/tier/:id/module/:slug`, `/tier/:id/module/:slug/lab/:labId`, `/commands`)
- [x] **1.5** Create build-time content parser (`content-parser.ts`) + Vite virtual module plugin (`vite-plugin-k8s-content.ts`) - parses all 16 modules
- [x] **1.6** Integrate Shiki for build-time syntax highlighting of code blocks
- [x] **1.7** Build basic `LessonView.vue` + `MarkdownRenderer.vue` to render parsed markdown with highlighted code

**Phase 1 Verification:**
- [x] `npm run dev` starts without errors
- [x] All routes navigable
- [x] Module 01 renders with syntax-highlighted code blocks

---

## Phase 2: Full Content Pipeline
**Progress: 6/6 tasks complete**

- [x] **2.1** Extend parser to handle all 16 modules - extract labs, checkpoints, ASCII diagrams, tables, commands, objectives, key takeaways
- [x] **2.2** Build section navigation / TOC sidebar within lessons (H2/H3 heading extraction, scroll-to-section)
- [x] **2.3** Build `CodeBlock.vue` component (copy button, language label, "Try in Terminal" button placeholder)
- [x] **2.4** Build `AsciiDiagram.vue` component (detect box-drawing chars, monospace styled rendering)
- [x] **2.5** Build `ComparisonTable.vue` component (enhanced table styling for dark theme)
- [x] **2.6** Wire `TierView.vue` to list all modules per tier with metadata (title, objectives count, lab count)

**Phase 2 Verification:**
- [x] All 16 modules render correctly
- [x] TOC navigation scrolls to sections
- [x] Code blocks have copy button and language label
- [x] ASCII diagrams render in styled monospace blocks
- [x] Tables render with enhanced dark-theme styling

---

## Phase 3: Terminal Simulator
**Progress: 7/7 tasks complete**

- [x] **3.1** Integrate xterm.js - build `TerminalEmulator.vue` wrapper with dark theme, fit addon, input handling
- [x] **3.2** Build `SimulatorEngine` - command parser (splits tool, subcommand, flags, args) + routes to correct handler
- [x] **3.3** Build `ClusterState` Pinia store - reactive in-memory K8s model (nodes, namespaces, pods, deployments, replicasets, services, configmaps, secrets, pvcs, pvs, events) initialized with default cluster (3 nodes + kube-system pods)
- [x] **3.4** Build `KubectlSimulator` - handlers for `get`, `apply`, `delete`, `describe`, `scale`, `rollout`, `logs`, `exec`, `top` with ANSI-colored output
- [x] **3.5** Build `DockerSimulator` - handlers for `run`, `ps`, `stop`, `rm`, `images`, `build`, `logs`, `network`, `volume` with ANSI-colored output
- [x] **3.6** Implement tab-completion and command history (up/down arrow) in terminal
- [x] **3.7** Add `help` command and error handling for unrecognized commands

**Phase 3 Verification:**
- [x] Terminal renders with dark theme, cursor blinking
- [x] `kubectl get pods` returns formatted pod table
- [x] `kubectl get pods -n kube-system` shows system pods
- [x] `docker ps` returns container table
- [x] Tab-completion and history work
- [x] Invalid commands show helpful error messages

---

## Phase 4: Lab Environment
**Progress: 6/6 tasks complete**

- [x] **4.1** Build `LabView.vue` with splitpanes layout (instructions panel | terminal + visuals panel)
- [x] **4.2** Define lab context data model (initial cluster state fixtures, file mappings, expected commands per step, hints)
- [x] **4.3** Extract lab definitions from all 16 modules into structured lab data during build-time parsing
- [x] **4.4** Implement step auto-detection (match terminal commands against expected commands, advance steps)
- [x] **4.5** Build hint system (progressive hints per step) and lab reset functionality
- [x] **4.6** Integrate progress tracking - mark labs/steps as complete in Pinia progress store with localStorage persistence

**Phase 4 Verification:**
- [x] LabView shows split pane with instructions and terminal
- [x] Lab initializes correct cluster state
- [x] Completing expected commands advances to next step
- [x] Hints display progressively
- [x] Lab reset restores initial state
- [x] Progress persists across page refreshes

---

## Phase 5: Visual System
**Progress: 5/5 tasks complete**

- [x] **5.1** Build `ClusterDiagram.vue` using custom SVG - render control plane, worker nodes, pods, services as interactive node graph
- [x] **5.2** Build `PodLifecycle.vue` - SVG animation showing pod states (Pending -> ContainerCreating -> Running -> Terminating -> Terminated)
- [x] **5.3** Build `DeploymentVisual.vue` - Deployment -> ReplicaSet -> Pods tree diagram with rolling update animation
- [x] **5.4** Build `NetworkFlow.vue` - animated traffic routing visualization (external -> service -> pods)
- [x] **5.5** Build `AnimationController` composable - coordinates terminal commands to trigger visual updates (e.g., `kubectl apply` a deployment -> pods appear in ClusterDiagram)

**Phase 5 Verification:**
- [x] Cluster diagram renders nodes and pods
- [x] Pod lifecycle animation plays through states
- [x] `kubectl apply` a deployment visually creates pods in diagram
- [x] `kubectl scale` visually adds/removes pods
- [x] Network flow animates traffic through service to pods

---

## Phase 6: Progress & Polish
**Progress: 6/6 tasks complete**

- [x] **6.1** Build `DashboardView.vue` - tier progress rings, learning path timeline, recent activity feed, stats row
- [x] **6.2** Implement section completion tracking using IntersectionObserver (mark sections read as user scrolls)
- [x] **6.3** Build `CheckpointQuiz.vue` component (extracted from module checkpoints, inline quiz UI)
- [x] **6.4** Build `CommandRefView.vue` - searchable/filterable command reference page (22 kubectl + docker commands)
- [x] **6.5** Add keyboard shortcuts (Ctrl+B sidebar toggle, Ctrl+K command search) via `useKeyboardShortcuts` composable
- [x] **6.6** Add Vue view transitions between routes (`<transition name="fade">` in AppShell)

**Phase 6 Verification:**
- [x] Dashboard shows accurate progress rings per tier
- [x] Scrolling through a lesson marks sections as complete
- [x] Checkpoint quizzes render and track answers
- [x] Command reference is searchable and filterable
- [x] Keyboard shortcuts work
- [x] View transitions animate between routes
- [x] localStorage persists all progress across refreshes

---

## Summary

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| 1 | Foundation Scaffold | 7 | Complete |
| 2 | Full Content Pipeline | 6 | Complete |
| 3 | Terminal Simulator | 7 | Complete |
| 4 | Lab Environment | 6 | Complete |
| 5 | Visual System | 5 | Complete |
| 6 | Progress & Polish | 6 | Complete |
| **Total** | | **37** | **37/37 complete** |

# Project: K8s & Docker Interactive Learning Platform

## Project Conventions

### Plans & Tasks Workflow
- **All plans** must be saved to `docs/plans/<unique-name>.md` before implementation begins.
- **All tasks** derived from a plan must be saved to `docs/tasks/<matching-name>-tasks.md`.
- Task files must match their source plan, be chunked by phase, and include checkboxes with per-phase progress tracking.
- When a new plan is created, always generate a corresponding task file immediately.
- When tasks are completed, update the checkboxes and phase progress in the task file.

### Directory Layout
```
docs/
  plans/    # Implementation plans (one .md per plan, unique name)
  tasks/    # Task breakdowns matching each plan (checkboxes + progress)
```

### Tech Stack
- Vue 3 + Vite + TypeScript
- TailwindCSS + Headless UI + Heroicons
- Pinia + pinia-plugin-persistedstate
- xterm.js, Vue Flow, Shiki, splitpanes
- Build-time markdown parsing (gray-matter + markdown-it)
- localStorage only (no backend, no auth)

### Content
- 16 markdown modules across 4 tiers in `Tier-1-Foundations/`, `Tier-2-Intermediate/`, `Tier-3-Advanced/`, `Tier-4-Master/`
- App source lives in `app/`

# Zooniverse IFE April 2026 Workshop

## Overview
Forkable, config-driven Zooniverse classifier. The "Hello World" of building a custom Panoptes classifier using the SDK approach (direct API calls) rather than forking the full FEM monorepo.

## Tech Stack
- React 18.3.1 + Vite 5.4
- axios for Panoptes REST API calls
- No MST, no styled-components, no monorepo — intentionally minimal

## Architecture

### The Classify Loop
```
App.js initializes:
  1. Fetch project (by ID from config or URL param)
  2. Fetch workflow (specific ID or project's first active)
  3. Fetch subjects (queued endpoint, fallback to subject sets)

Then loops:
  Subject displayed → User answers task → "Done" submits classification → Next subject
```

### Key Files
| File | Purpose |
|------|---------|
| `src/config.js` | Project ID, workflow ID, environment, links — the only file a forker must edit |
| `src/App.js` | Classify loop orchestrator |
| `src/components/SubjectViewer.js` | Renders subject image from Panoptes `locations` array |
| `src/components/TaskUI.js` | Renders workflow `tasks` as interactive forms (single/multiple question types) |
| `src/services/panoptesService.js` | Panoptes API: projects, workflows, subjects, classifications, auth |

### Panoptes API Endpoints Used
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/projects/{id}` | GET | No | Project metadata |
| `/api/workflows/{id}` | GET | No | Workflow + task definitions |
| `/api/subjects/queued?workflow_id={id}` | GET | Optional | Subject queue (primary) |
| `/api/subjects?subject_set_id={id}` | GET | No | Subject fallback |
| `/api/classifications` | POST | Optional | Submit classification |
| `/users/sign_in` | GET+POST | — | CSRF + sign in |
| `/oauth/token` | POST | — | Bearer token |

### Task Type Rendering
`workflow.tasks` is an object like `{ "T0": { type: "single", question: "...", answers: [...] } }`.
- `single` → radio buttons (pick one)
- `multiple` → checkboxes (pick many)
- Unknown types → raw JSON fallback with `<details>`

Task chains are walked via `task.next` (supports branching via per-answer `next`).

## Commands
```bash
npm install      # Install dependencies
npm start        # Dev server on http://localhost:3000
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run lint     # ESLint check
```

## Styling
- CSS custom properties in `src/index.css` for colors, spacing, radii
- Utility classes: `.text-muted`, `.mt-lg`, `.p-sm`, `.flex`, `.success`, `.error`, etc.
- Component classes: `.classify-layout`, `.task-block`, `.subject-viewer`, etc.
- Minimal inline styles only for font-size on semantic elements
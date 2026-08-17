# Electronics Planner

A browser-only planner for DIY electronics projects (Arduino, ESP32, etc.). Track
every component you're using across multiple projects, wire them up on a simple
node-and-line graph, and get an automatic power budget: total current draw,
voltage-mismatch warnings, and how long a given battery will last — accounting
for step-up/down converter efficiency and duty-cycled (sleep mode) loads.

Everything is stored in your browser's `localStorage`. There is no backend and
no account — use **Export backup** (top right) regularly to save a JSON copy,
and **Import backup** to restore it (in this browser or a different one).

## Features

- **Multiple projects**, each with its own component list and wiring graph.
- **Component library** — built-in presets for common boards, sensors,
  actuators, converters, and batteries, plus your own custom parts, reusable
  across all projects.
- **Graph view** — drag components onto a canvas and wire power / ground /
  signal connections between them. A project can contain several
  electrically-independent circuits; they're detected automatically from the
  wiring and calculated separately.
- **Power budget** — per-circuit current draw, converter efficiency losses,
  voltage-range and missing-ground warnings, and a battery runtime estimate
  (with a chart of where the power actually goes).
- **Duty-cycle aware** — components can specify an active current, an idle
  current, and the percentage of time spent active, for realistic runtime
  estimates on sleep-heavy projects.
- **Export/Import** — a full JSON backup of everything, or a single project
  (bundled with the library parts it uses) to share or move between browsers.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm test         # unit tests for the power-calculation engine
```

## Deployment

Pushing to `main` builds the app and deploys it to GitHub Pages via the
workflow in `.github/workflows/deploy.yml`. In the repository's **Settings →
Pages**, set the source to **GitHub Actions** (one-time setup) — the workflow
handles the rest.

The app is a client-side single-page app using a hash-based router
(`/#/project/...`), so it works on GitHub Pages without any server-side
rewrite rules.

# FlowNote

FlowNote is a portfolio-grade infinite canvas whiteboard and diagramming app built from scratch with React, TypeScript, and the Canvas 2D API.

The project focuses on systems-level frontend engineering: custom camera math, a command-pattern history engine, canvas-first interaction architecture, connector geometry, and performance-aware rendering.

## Why This Project Is Technically Interesting

- `Canvas-first architecture`: The app renders via a continuous `requestAnimationFrame` loop while mutable scene state lives in refs, avoiding React re-render overhead in hot paths.
- `Camera and coordinate system`: Implements world/screen transforms, zoom-to-cursor behavior, smooth zoom interpolation, and pan/zoom clamping.
- `Command-based undo/redo`: All mutating actions (create, move, resize, color, text edit, arrow ops, multi-item ops) are reversible with a bounded history stack.
- `Connector engine`: Arrows can be item-attached or free-form, resolve endpoints dynamically, clip to shape edges, support line styles, heads, labels, and hit-testing.
- `Diagramming primitives`: Supports sticky notes plus flowchart-style nodes (rect, ellipse, diamond, cylinder, hexagon, parallelogram, document, triangle).
- `Interaction model`: Multi-select, marquee select, resize handles, contextual menus, keyboard shortcuts, nudge controls, and inline text editing overlay.
- `Persistence`: Debounced localStorage snapshots for scene + camera recovery between sessions.
- `Rendering quality`: HiDPI canvas setup, zoom-invariant strokes/handles, frustum culling, and optional debug overlays (FPS, cursor, origin axes).

## Feature Set

- Infinite canvas with pan and wheel zoom
- Zoom-to-cursor and smooth zoom lerp
- Shape creation via floating toolbar
- Arrow creation and style customization
- Multi-selection, marquee selection, duplicate, delete
- Resize handles and per-item/arrow color changes
- Text editing for shapes and labels for connectors
- Undo/redo with keyboard support
- Auto-save and state restore
- Context menu with action shortcuts
- Debug HUD toggle for instrumentation

## Tech Stack

- React 19
- TypeScript 5
- Vite 8
- Canvas 2D API
- ESLint 9

## Repository Layout

```text
.
|-- README.md                     # Portfolio showcase (this file)
|-- docs/                         # Engineering deep dives
|-- packages/                     # Reusable framework-agnostic packages
|   |-- core-geometry/            # Camera + geometry primitives
|   |-- command-history/          # Generic command undo/redo engine
|   `-- diagram-core/             # Diagram domain logic + commands
`-- flownote/                     # Main application
    |-- src/Components/           # Canvas surface + UI overlays
    |-- src/rendering/            # Grid, items, arrows, HUD, debug renderers
    |-- src/utils/                # App-local helpers (e.g., persistence)
    `-- package.json
```

## Local Development

```bash
cd flownote
npm install
npm run dev
```

Open `http://localhost:5173`.

## Controls

- Pan canvas: drag empty space
- Zoom: mouse wheel
- Select/toggle selection: click, `Shift+Click`
- Marquee select: drag on empty space
- Duplicate: `Ctrl+D`
- Delete: `Delete` or `Backspace`
- Undo / Redo: `Ctrl+Z`, `Ctrl+Shift+Z` (or `Ctrl+Y`)
- Select all: `Ctrl+A`
- Nudge selection: arrow keys (`Shift` for fine nudge)
- Exit/clear selection: `Escape`
- Debug overlay: `Ctrl+Shift+D`
- Edit text: double-click item (double-click arrow to edit label)
- Context actions: right-click

## Engineering Deep Dives

- [Infinite Canvas & Camera System](./docs/01-infinite-canvas.md)
- [Canvas Rendering Pipeline](./docs/02-canvas-rendering.md)
- [Interaction System](./docs/03-interaction-system.md)
- [Performance Techniques](./docs/04-performance.md)

## Build

```bash
cd flownote
npm run build
npm run preview
```

## License

MIT

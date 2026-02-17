# FlowNote

An infinite whiteboard built from scratch with React and the HTML Canvas API. This project explores the core engineering concepts behind apps like Miro, tldraw, and Excalidraw — camera transforms, canvas rendering, interaction handling, and performance optimization — all without high-level canvas libraries.

## Features

- **Infinite canvas** — pan and zoom with no boundaries
- **Zoom-to-cursor** — scroll wheel zooms anchored to the mouse position
- **Draggable items** — click to select, drag to move
- **World-space grid** — infinite grid that scales with zoom
- **Frustum culling** — only visible items are rendered
- **HiDPI support** — crisp rendering on Retina / high-DPI displays
- **Debug HUD** — live FPS, zoom level, and world coordinates

## Tech Stack

| Layer     | Choice                |
|-----------|-----------------------|
| Framework | React 19              |
| Language  | TypeScript 5.9        |
| Bundler   | Vite 8                |
| Rendering | HTML Canvas 2D API    |

## Getting Started

**Prerequisites:** Node.js 18+ and a package manager (npm, yarn, pnpm, or bun).

```bash
# Clone and install
git clone <repo-url>
cd flownote
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
src/
├── Components/
│   └── FlowCanvas.tsx        # Core canvas component (lifecycle, render loop, events)
├── rendering/
│   ├── grid.ts                # World-space grid drawing
│   ├── hud.ts                 # Screen-space debug HUD
│   └── debug.ts               # Origin axes & cursor crosshair
├── utils/
│   ├── camera.ts              # Camera math (screen↔world, zoom)
│   └── hitTest.ts             # Item hit-testing
├── types.ts                   # Shared type definitions
├── App.tsx                    # App root
├── main.tsx                   # Entry point
└── index.css                  # Global styles
```

## Controls

| Action        | Input                          |
|---------------|--------------------------------|
| Pan           | Click + drag on empty space    |
| Zoom          | Scroll wheel                   |
| Select item   | Click on a colored square      |
| Drag item     | Click + drag on a selected item|

## Learning

See the [`/docs`](./docs/) folder for in-depth write-ups on the engineering concepts behind this project:

1. [Infinite Canvas & Camera System](./docs/01-infinite-canvas.md)
2. [Canvas Rendering Pipeline](./docs/02-canvas-rendering.md)
3. [Interaction System](./docs/03-interaction-system.md)
4. [Performance Techniques](./docs/04-performance.md)

## License

MIT

# 04 — Performance Techniques

This document captures the performance strategy currently implemented in FlowNote.

## 1) Canvas-First State Architecture

The render loop is imperative (`requestAnimationFrame`), so hot-path scene state is stored in refs:

- camera and target camera
- items and arrows
- drag state and cursor state
- selection sets
- FPS timers

Why this matters:

- ref mutation does not trigger React reconciliation
- canvas frames are driven directly from current mutable state

React state is still used, but only for UI overlays that need declarative rendering (`Toolbar`, `TextEditor`, `ContextMenu`, `ColorPicker`).

## 2) Frustum Culling for Items

Before item drawing, the viewport is converted to world bounds via `getVisibleBounds(...)`.
Each item is AABB-tested against those bounds; only overlapping items are rendered.

This keeps draw cost proportional to visible content instead of total document size.

## 3) Zoom-Invariant Rendering Details

Several visuals are normalized by zoom (`1 / camera.z`) so they remain legible and stable:

- selection stroke widths
- resize handle sizing
- arrow stroke/dash/head sizing
- marquee border dash spacing
- grid dot radius

This avoids thick/strobing visuals when zooming.

## 4) Efficient Grid Strategy

The background grid is not infinite precomputed geometry.
Each frame, only visible dot intersections are generated/drawn from the current camera window.

There is also an early return when zoom is low enough that grid opacity reaches zero.

## 5) Smoothed FPS Instrumentation

Debug FPS uses an exponential moving average:

```ts
fps = 0.9 * fps + 0.1 * (1000 / deltaMs)
```

EMA avoids noisy per-frame spikes while still reflecting sustained performance changes.

## 6) Debounced Persistence

Canvas state writes are debounced (`createDebouncedSave(500)`), reducing repeated `localStorage` serialization during drag-heavy interactions.

Persistence includes:

- items
- arrows
- camera
- next id

## 7) Bounded History Memory

Undo/redo history is capped (`maxSize = 100` by default) to prevent unbounded memory growth over long sessions.

## Scaling Considerations

Current implementation uses linear scans for:

- item hit testing
- arrow hit testing
- culling checks

Natural next upgrades for larger scenes:

- spatial index (quadtree/R-tree)
- offscreen or layered canvas passes
- dirty-region rendering
- batched GPU rendering (WebGL/WebGPU) for very large node counts

---

**← Back:** [Interaction System](./03-interaction-system.md) | [Project README](../README.md)

# 04 — Performance Techniques

FlowNote renders 1000 items at 60 FPS. This document covers the techniques that make that possible and discusses what to consider as the app scales.

## Refs Instead of React State

In a typical React app, you'd store data in `useState` or `useReducer`. But canvas rendering happens inside a `requestAnimationFrame` loop that fires 60 times per second. If we used React state:

1. Every state update triggers a React re-render.
2. React re-renders diff the virtual DOM and reconcile.
3. This overhead adds latency to every frame.

Since we're drawing directly to a canvas (bypassing React's rendering entirely), React re-renders provide **zero benefit** — they'd only add cost.

**The solution:** store all mutable state in `useRef`:

```typescript
const camera = useRef<Camera>({ x: 100, y: 100, z: 1.5 });
const items  = useRef<Item[]>([]);
const fps    = useRef<number>(60);
```

Refs are mutable objects that persist across renders without triggering them. The render loop reads from these refs directly — no React reconciliation involved.

### When to Use State vs Refs

| Use `useState` when...                  | Use `useRef` when...                     |
|-----------------------------------------|------------------------------------------|
| The value drives UI rendered by React   | The value is consumed by imperative code |
| Changes should trigger a re-render      | Changes should NOT trigger a re-render   |
| Example: toolbar selection, dialogs     | Example: camera position, drag state     |

## Frustum Culling

"Frustum culling" comes from 3D graphics — it means skipping objects that are outside the camera's view. In 2D, this means: **don't draw items that aren't visible on screen**.

With 1000 items scattered across a 4000×4000 world, most are off-screen at any given time. Without culling, we'd issue 1000 `fillRect` calls every frame. With culling, we only draw what's visible.

### Implementation

Before the draw loop, we compute the visible world-space rectangle:

```typescript
const bounds = getVisibleBounds(camera, viewportWidth, viewportHeight);
```

Then for each item, we check for overlap:

```typescript
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  if (
    item.x + ITEM_SIZE > bounds.left  &&
    item.x < bounds.right              &&
    item.y + ITEM_SIZE > bounds.top   &&
    item.y < bounds.bottom
  ) {
    // Item is visible — draw it
    ctx.fillRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);
  }
}
```

This is an **AABB (Axis-Aligned Bounding Box) overlap test** — one of the cheapest spatial checks possible. Four comparisons per item, and we skip all draw calls for items that fail.

### Impact

At default zoom (~1.5x), only a fraction of the 1000 items are on screen. The actual `fillRect` call count drops dramatically, keeping frame times well under the 16.6ms budget for 60 FPS.

## FPS Measurement

We track frame timing using an **exponential moving average** (EMA):

```typescript
const delta = time - lastFrameTime.current;
lastFrameTime.current = time;
fps.current = 0.9 * fps.current + 0.1 * (1000 / Math.max(delta, 0.001));
```

### Why EMA?

Raw FPS values (`1000 / delta`) fluctuate wildly frame-to-frame due to browser scheduling, GC pauses, and system load. EMA smooths these out:

- **0.9 weight on previous value** — older frames contribute, creating stability
- **0.1 weight on current value** — new data is incorporated gradually
- Result: a **readable, stable number** that still responds to real performance changes

The `Math.max(delta, 0.001)` prevents divide-by-zero when two frames have nearly identical timestamps.

## Optimized Draw Loop

The rendering loop uses several micro-optimizations:

```typescript
const totalItems = items.current.length;
const allItems = items.current;

for (let i = 0; i < totalItems; i++) {
  const item = allItems[i];
  // ...
}
```

- **Cache array length** — avoids re-reading `.length` on each iteration
- **Cache array reference** — avoids dereferencing `.current` on each iteration
- **Classic `for` loop** — faster than `forEach` or `for...of` due to no function call overhead or iterator protocol

These matter in hot loops that run 60 times per second.

## Future Considerations

As the app grows, here are techniques to consider:

### Spatial Indexing (Quadtree / R-tree)

Currently, hit testing iterates all 1000 items linearly, and frustum culling checks all items. A **quadtree** partitions items spatially so both operations can skip entire regions:

```
┌───────────┬───────────┐
│  NW       │  NE       │     Only check items in
│  (3 items)│  (2 items)│     the quadrant the cursor
├───────────┼───────────┤     is in → O(log n) instead
│  SW       │  SE       │     of O(n)
│  (5 items)│  (1 item) │
└───────────┴───────────┘
```

### Dirty-Rect Rendering

Instead of redrawing the entire canvas every frame, track which regions changed and only repaint those. This is complex to implement correctly but can dramatically reduce per-frame work when only a small area changes (e.g. dragging a single item).

### Layer Separation

Use multiple stacked canvases:
- **Background layer** — grid (rarely changes, can be cached)
- **Content layer** — items (changes on drag/zoom)
- **UI layer** — HUD, cursors (changes every frame but is small)

This avoids re-rendering the grid every frame when only an item moves.

### WebGL / WebGPU

For 10,000+ items with complex shapes and effects, Canvas2D becomes a bottleneck. WebGL provides GPU-accelerated rendering with batched draw calls. Libraries like PixiJS can help bridge the gap.

---

**← Back:** [Interaction System](./03-interaction-system.md) | [All docs](../README.md#learning)

# 02 — Canvas Rendering Pipeline

This document describes the current frame pipeline in `flownote/src/Components/FlowCanvas.tsx` and rendering modules under `flownote/src/rendering/`.

## Render Loop

FlowNote renders with `requestAnimationFrame` and performs a full redraw per frame.

High-level frame sequence:

1. Compute frame delta and smoothed FPS
2. Lerp current camera toward target camera
3. Reset DPR transform and clear canvas
4. Fill background color
5. Compute visible world bounds
6. Enter world-space transform (`translate + scale`)
7. Draw world content (grid, items, arrows, previews, debug)
8. Restore to screen space
9. Draw screen-space HUD (debug mode only)
10. Schedule next frame

## DPR / HiDPI Strategy

On resize:

- Canvas backing store uses physical pixels (`width/height * dpr`)
- CSS size uses logical pixels (`style.width/style.height`)
- Context is scaled once by `dpr`

Per frame:

```ts
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

This resets transform safely so camera transforms do not accumulate.

## World-Space Draw Order

Inside the camera transform block, FlowNote draws in this order:

1. Dot grid (`drawGrid`)
2. Items (with frustum culling)
3. Selection visuals and resize handles
4. Arrows/connectors
5. Arrow preview while creating a connector
6. Marquee rectangle while selecting
7. Debug crosshair + origin axes (if debug enabled)

Order matters because hit behavior and perceived z-index follow visual stacking.

## Dot Grid Rendering

The grid is a world-space dot matrix, not line-based graph paper.

Implementation traits:

- Computes visible world extents from camera
- Snaps to nearest grid intersections
- Draws only visible dots
- Fades dot opacity at low zoom to reduce clutter
- Uses zoom-compensated radius for consistent screen appearance

## Item Rendering

Item rendering is type-dispatched in `rendering/items.ts` and supports:

- `sticky`, `rect`, `ellipse`
- `diamond`, `cylinder`, `hexagon`
- `parallelogram`, `document`, `triangle`

Text is wrapped and vertically centered per shape bounds. Selection visuals are zoom-invariant, and resize handles are rendered only on the primary selected item.

## Arrow Rendering

`rendering/arrows.ts` resolves connector endpoints dynamically:

- Item-attached endpoints clip to item edges
- Free-form endpoints use stored points
- Line styles: solid, dashed, dotted
- Arrow heads: start/end/both/none
- Optional labels rotate with edge direction and flip for readability

Arrow hit testing is distance-to-segment with zoom-scaled tolerance.

## Screen-Space Draw Pass

After `ctx.restore()`, debug HUD is drawn in screen coordinates (fixed to viewport, not camera).

---

**Next:** [Interaction System →](./03-interaction-system.md)

# 02 — Canvas Rendering Pipeline

This document covers how FlowNote draws each frame — the render loop, DPR handling, camera transforms, and grid rendering.

## The Render Loop

Canvas apps don't re-render like the DOM. Instead, we use a `requestAnimationFrame` loop that runs at the display's refresh rate (typically 60 Hz):

```typescript
const render = (time: number) => {
  // 1. Clear the canvas
  // 2. Apply camera transform
  // 3. Draw world-space content (grid, items, debug overlays)
  // 4. Restore transform
  // 5. Draw screen-space content (HUD)
  // 6. Request next frame

  reqIdRef.current = requestAnimationFrame(render);
};

// Kick off the loop
requestAnimationFrame(render);
```

Each frame is a **full redraw** — we clear the entire canvas and repaint everything from scratch. This is the simplest approach and works well for our item count. More advanced techniques like dirty-rect tracking can reduce per-frame work but add significant complexity.

### Frame Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  requestAnimationFrame callback                     │
│                                                     │
│  1. Calculate FPS                                   │
│  2. Reset transform → clear → fill background       │
│  3. Compute visible bounds (for culling)             │
│  4. ctx.save()                                      │
│  5. ctx.translate(pan) + ctx.scale(zoom)             │
│  6. Draw grid                                       │
│  7. Draw items (culled)                              │
│  8. Draw crosshair + origin axes                    │
│  9. ctx.restore()                                   │
│ 10. Draw HUD (screen-space, unaffected by camera)   │
│ 11. requestAnimationFrame(render)  ← schedule next   │
└─────────────────────────────────────────────────────┘
```

## DPR (Device Pixel Ratio) Handling

On high-DPI displays (Retina, 4K), one CSS pixel maps to 2+ physical pixels. A 1920×1080 viewport on a 2x display has 3840×2160 physical pixels. If we set canvas dimensions to 1920×1080, the browser upscales and everything looks blurry.

**The fix:**

```typescript
const dpr = window.devicePixelRatio || 1;

// Set the canvas buffer to the physical resolution
canvas.width  = window.innerWidth  * dpr;
canvas.height = window.innerHeight * dpr;

// Set the CSS display size to the logical resolution
canvas.style.width  = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;

// Scale all drawing operations by DPR
ctx.scale(dpr, dpr);
```

After this setup, when we draw at logical coordinates (e.g. `fillRect(0, 0, 100, 100)`), the canvas internally renders at `dpr` times the resolution, producing sharp output.

### Reset Per Frame

The `ctx.scale(dpr, dpr)` is applied once during resize. Each frame, we reset to the DPR-scaled identity before drawing:

```typescript
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

This ensures our camera transform doesn't accumulate with the DPR scale.

## Camera Transform

After clearing the background, we apply the camera as a 2D affine transform:

```typescript
ctx.save();
ctx.translate(camera.x, camera.y);   // Pan
ctx.scale(camera.z, camera.z);       // Zoom
// ... draw all world-space content here ...
ctx.restore();
```

Everything drawn between `save()` and `restore()` lives in **world space**. After `restore()`, we're back in **screen space** for HUD elements.

### Zoom-Invariant Line Width

When zoomed in, a `lineWidth: 1` line becomes thicker (because 1 world pixel = multiple screen pixels). To keep lines visually consistent, we divide by zoom:

```typescript
ctx.lineWidth = 2 / camera.z;
```

## Grid Rendering

The infinite grid is drawn by computing which grid lines fall within the viewport, then drawing only those lines — not an infinitely large grid ([`grid.ts`](../src/rendering/grid.ts)):

```typescript
// Convert viewport edges to world-space
const startX = (0 - panX) / zoom;
const endX   = (viewportWidth - panX) / zoom;

// Snap to nearest grid line
const minX = Math.floor(startX / gridSize) * gridSize;
const maxX = Math.ceil(endX / gridSize) * gridSize;

// Draw only the visible lines
for (let x = minX; x <= maxX; x += gridSize) {
  ctx.moveTo(x, startY);
  ctx.lineTo(x, endY);
}
```

This ensures that no matter how far you pan or how much you zoom, only the visible portion of the grid is drawn.

## World-Space vs Screen-Space Drawing

| What we draw        | Coordinate space | When (in frame) |
|---------------------|------------------|-----------------|
| Grid                | World            | After camera transform |
| Items               | World            | After camera transform |
| Crosshair, axes     | World            | After camera transform |
| FPS / zoom HUD      | Screen           | After `ctx.restore()` |

Screen-space elements stay fixed on screen regardless of pan/zoom. World-space elements move and scale with the camera.

---

**Next:** [Interaction System →](./03-interaction-system.md)

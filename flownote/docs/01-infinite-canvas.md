# 01 — Infinite Canvas & Camera System

The foundation of any whiteboard app is the **infinite canvas** — a virtual 2D plane with no fixed boundaries. Users navigate it by panning (translating) and zooming (scaling). This document covers how we model the camera and perform coordinate space conversions.

## The Camera Model

Our camera is represented by three numbers:

```typescript
type Camera = {
  x: number;  // horizontal pan offset (screen pixels)
  y: number;  // vertical pan offset (screen pixels)
  z: number;  // zoom factor (1 = 100%)
};
```

- `x` and `y` are **screen-space offsets** — they tell us how many pixels to shift the world before drawing it.
- `z` is the **zoom factor** — world-space distances are multiplied by `z` when drawn to screen.

> **Why store pan in screen pixels?**
> It makes the `ctx.translate(camera.x, camera.y)` call trivial and keeps the panning math simple (just add the mouse delta directly).

## Coordinate Spaces

There are two coordinate spaces at play:

| Space       | Description                                           |
|-------------|-------------------------------------------------------|
| **Screen**  | Raw pixel position on the viewport (e.g. mouse event) |
| **World**   | Position in the infinite canvas plane                  |

Every mouse event gives us **screen** coordinates. To know what the user clicked on, we need to convert to **world** coordinates.

### Screen → World

To convert a screen position to world:

```
worldX = (screenX - camera.x) / camera.z
worldY = (screenY - camera.y) / camera.z
```

1. **Subtract the pan offset** — undo the translation.
2. **Divide by zoom** — undo the scaling.

In code ([`camera.ts`](../src/utils/camera.ts)):

```typescript
export function screenToWorld(screenX: number, screenY: number, camera: Camera): Point {
  return {
    x: (screenX - camera.x) / camera.z,
    y: (screenY - camera.y) / camera.z,
  };
}
```

### World → Screen

The reverse operation (used when drawing) is handled by the Canvas2D transform:

```typescript
ctx.translate(camera.x, camera.y);
ctx.scale(camera.z, camera.z);
```

After these calls, any coordinates passed to `ctx.fillRect(worldX, worldY, ...)` are automatically converted to screen space by the GPU.

## Panning

Panning is straightforward. On `pointerdown`, we record the starting mouse position and camera offset. On `pointermove`, we add the delta:

```typescript
// On pointer down (camera mode):
dragStart = { x: e.clientX, y: e.clientY };
camStart  = { x: camera.x,  y: camera.y  };

// On pointer move:
camera.x = camStart.x + (e.clientX - dragStart.x);
camera.y = camStart.y + (e.clientY - dragStart.y);
```

We store `camStart` so the pan is always relative to where the drag began, preventing drift from accumulated floating-point errors.

## Zoom-to-Cursor

Naive zooming (just changing `z`) would zoom toward the top-left corner. Users expect zoom to be **anchored to the cursor** — the world point under the mouse stays fixed.

The algorithm ([`camera.ts`](../src/utils/camera.ts)):

```typescript
export function zoomAtPoint(camera: Camera, screenX: number, screenY: number, wheelDelta: number): Camera {
  // 1. Find the world point under the cursor
  const worldX = (screenX - camera.x) / camera.z;
  const worldY = (screenY - camera.y) / camera.z;

  // 2. Compute new zoom (clamped)
  const zoomFactor = Math.exp(-wheelDelta * 0.001);
  const newZoom = clamp(camera.z * zoomFactor, 0.1, 10);

  // 3. Re-derive pan so the world point stays at the same screen pixel
  return {
    x: screenX - worldX * newZoom,
    y: screenY - worldY * newZoom,
    z: newZoom,
  };
}
```

**Why does step 3 work?** The screen position of a world point is `screenX = worldX * zoom + panX`. If we want `screenX` to stay the same after zoom changes, we solve for `panX`:

```
panX = screenX - worldX * newZoom
```

### Exponential vs Linear Scaling

We use `Math.exp(-delta * 0.001)` rather than a linear multiplier. This makes zooming feel proportional — zooming out from 10x and from 0.5x both feel the same speed, because we're scaling by a *ratio* rather than a fixed increment.

## Visible Bounds

For [frustum culling](./04-performance.md), we need to know which rectangle of the world is currently visible:

```typescript
export function getVisibleBounds(camera: Camera, viewportWidth: number, viewportHeight: number): WorldBounds {
  return {
    left:   -camera.x / camera.z,
    top:    -camera.y / camera.z,
    right:  (viewportWidth  - camera.x) / camera.z,
    bottom: (viewportHeight - camera.y) / camera.z,
  };
}
```

This is simply `screenToWorld` applied to the four corners of the viewport.

---

**Next:** [Canvas Rendering Pipeline →](./02-canvas-rendering.md)

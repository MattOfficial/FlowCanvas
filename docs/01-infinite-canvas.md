# 01 — Infinite Canvas & Camera System

FlowNote is built around an unbounded world-space canvas. The camera is the core abstraction that maps this world to screen pixels and back.

This document reflects the current implementation in `flownote/src/utils/camera.ts` and `flownote/src/Components/FlowCanvas.tsx`.

## Camera Model

```ts
type Camera = {
  x: number; // pan offset in screen pixels
  y: number; // pan offset in screen pixels
  z: number; // zoom factor
};
```

The runtime uses two camera refs:

- `camera.current`: camera used for rendering this frame
- `targetCamera.current`: camera destination after input updates

Wheel zoom updates `targetCamera`; the render loop interpolates `camera` toward it for smooth motion.

## Coordinate Spaces

- Screen space: pointer coordinates from browser events
- World space: item and connector coordinates on the infinite plane

Screen-to-world conversion:

```ts
worldX = (screenX - camera.x) / camera.z
worldY = (screenY - camera.y) / camera.z
```

All hit testing and drag calculations are done in world space.

## Pan

Pan starts on pointer down by recording:

- drag start pointer (`dragStart`)
- camera origin at drag start (`camStart`)

On pointer move:

```ts
camera.x = camStart.x + (e.clientX - dragStart.x);
camera.y = camStart.y + (e.clientY - dragStart.y);
targetCamera.x = camera.x;
targetCamera.y = camera.y;
```

Keeping pan in screen pixels makes this update direct and stable.

## Zoom-to-Cursor

`zoomAtPoint(...)` keeps the world point under the cursor visually anchored while zooming:

1. Resolve the cursor's world point from current camera
2. Compute exponential zoom factor from wheel delta
3. Clamp zoom to `[0.1, 10]`
4. Recompute pan so the same world point maps to the same screen point

This is the behavior users expect from whiteboard tools.

## Smooth Zoom Interpolation

The render loop applies a lerp each frame:

```ts
camera.x = lerp(camera.x, targetCamera.x, 0.15);
camera.y = lerp(camera.y, targetCamera.y, 0.15);
camera.z = lerp(camera.z, targetCamera.z, 0.15);
```

When values are close enough, the camera snaps exactly to target to avoid endless tiny deltas.

## Visible Bounds

`getVisibleBounds(...)` converts the viewport rectangle to world coordinates:

```ts
{
  left: -camera.x / camera.z,
  top: -camera.y / camera.z,
  right: (viewportWidth - camera.x) / camera.z,
  bottom: (viewportHeight - camera.y) / camera.z,
}
```

These bounds are used for frustum culling in the item draw pass.

---

**Next:** [Canvas Rendering Pipeline →](./02-canvas-rendering.md)

# 03 — Interaction System

Canvas elements don't have built-in DOM events like `onClick` or `onDrag`. We have to implement all interaction from scratch using raw pointer events and coordinate math. This document covers hit testing, selection, and our dual drag-mode system.

## Event Setup

We listen to three pointer events:

| Event          | Where attached       | Purpose                     |
|----------------|---------------------|-----------------------------|
| `pointerdown`  | `<canvas>` (React)   | Start drag, detect hits     |
| `pointermove`  | `window`             | Track cursor, execute drag  |
| `pointerup`    | `window`             | End drag                    |

`pointermove` and `pointerup` are on `window` rather than the canvas so dragging continues even if the cursor leaves the canvas bounds. This prevents the drag getting "stuck" if the user moves the mouse quickly off-screen.

## Hit Testing

When the user clicks the canvas, we need to determine *what* they clicked on. Since Canvas2D doesn't track objects (it's just pixels), we do manual **hit testing** — iterating through our item list and checking if the click coordinate falls within each item's bounding box.

From [`hitTest.ts`](../src/utils/hitTest.ts):

```typescript
export function hitTestItems(worldX: number, worldY: number, items: Item[], itemSize: number): Item | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (
      worldX >= item.x &&
      worldX <= item.x + itemSize &&
      worldY >= item.y &&
      worldY <= item.y + itemSize
    ) {
      return item;
    }
  }
  return null;
}
```

### Why Reverse Order?

Items are drawn in array order — index 0 is drawn first (bottom), and the last index is drawn on top. To match visual z-ordering, we iterate **in reverse** so the topmost visible item is hit first. If we iterated forward, clicking an overlapping stack would always select the bottom item.

### Screen → World Before Testing

The click event provides screen coordinates (`e.clientX`, `e.clientY`). Before hit testing, we convert to world coordinates:

```typescript
const worldPos = screenToWorld(e.clientX, e.clientY, camera);
const hitItem = hitTestItems(worldPos.x, worldPos.y, items, ITEM_SIZE);
```

This ensures hit testing works correctly regardless of the current pan and zoom.

## Dual Drag Modes

A single `pointerdown` can start two very different interactions:

```
pointerdown
    │
    ▼
Hit an item? ──yes──▶ Start ITEM drag
    │
    no
    │
    ▼
Start CAMERA drag (pan)
```

We track the mode with a `dragMode` ref that is set on `pointerdown` and read on each `pointermove`:

```typescript
if (hitItem) {
  dragMode.current = "item";
  selectedId.current = hitItem.id;
} else {
  dragMode.current = "camera";
}
```

During `pointermove`, the behavior branches:

### Camera Pan

```typescript
if (dragMode === "camera") {
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  camera.x = camStart.x + dx;
  camera.y = camStart.y + dy;
}
```

The delta is computed from the **original** drag start position, not the previous frame. This prevents floating-point drift and makes the pan feel solid.

### Item Drag

```typescript
if (dragMode === "item") {
  item.x = worldPos.x - dragOffset.x;
  item.y = worldPos.y - dragOffset.y;
}
```

## Drag Offset — Why It Matters

Without the offset, the item's top-left corner would snap to the cursor on the first movement. The offset preserves the relative position between the cursor and the item's origin:

```
 ┌───────────┐
 │           │   Without offset: item snaps so (0,0) = cursor
 │     ✕     │   With offset: item moves naturally, cursor stays
 │  cursor   │   at the same relative position within the item
 └───────────┘
```

On `pointerdown`, we record how far the cursor is from the item's top-left:

```typescript
dragOffset = {
  x: worldPos.x - hitItem.x,
  y: worldPos.y - hitItem.y,
};
```

Then on every `pointermove`, we subtract this offset to get the correct item position:

```typescript
item.x = worldPos.x - dragOffset.x;
item.y = worldPos.y - dragOffset.y;
```

## Selection Highlight

When an item is selected, we draw a white stroke border around it during rendering:

```typescript
if (item.id === selectedId.current) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4 / camera.z;  // zoom-invariant width
  ctx.strokeRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);
}
```

The line width is divided by zoom so the border looks the same thickness at any zoom level.

## Cursor Tracking

The cursor's world-space position is updated on every `pointermove`, regardless of drag state:

```typescript
cursor.current = screenToWorld(e.clientX, e.clientY, camera.current);
```

This is used by the debug crosshair (drawn in world space) and the HUD (displaying world coordinates in screen space).

---

**Next:** [Performance Techniques →](./04-performance.md)

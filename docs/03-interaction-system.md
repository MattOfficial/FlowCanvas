# 03 — Interaction System

Canvas has no object model, so FlowNote implements interaction behavior directly from pointer/keyboard events plus world-space math.

This file documents the current interaction architecture in `flownote/src/Components/FlowCanvas.tsx`.

## Event Wiring

Pointer and keyboard listeners:

- `pointerdown` on `<canvas>`: dispatches tool/select behavior
- `pointermove` on `window`: updates cursor and active drag
- `pointerup` on `window`: finalizes drag commands
- `wheel` on `<canvas>`: zoom-to-cursor
- `keydown` on `window`: shortcuts (undo/redo, duplicate, delete, select-all, nudge, debug toggle)

Using `window` for move/up prevents drag loss when pointer leaves canvas bounds.

## Hit Testing

All pointer positions are converted to world space first.

### Item Hit Test

`hitTestItems(...)` checks per-item bounds in reverse draw order:

- reverse iteration makes topmost item win
- item `width/height` is used (not a fixed size)

### Arrow Hit Test

`hitTestArrows(...)` computes point-to-segment distance with a zoom-adjusted tolerance.

Before testing, connected arrows resolve their live endpoints from attached items.

## Drag Modes

Interaction state is modeled with explicit drag modes:

- `camera`
- `item`
- `resize`
- `marquee`
- `arrow`

Mode is chosen on pointer down and governs pointer move/up behavior.

## Selection Model

Selection supports:

- Multi-select via `Shift+Click`
- Marquee selection on empty-space drag
- Primary selected item tracking (used for resize handles)
- Independent arrow selection

Clicking empty space clears selection and starts marquee mode.

## Item Drag and Resize

### Multi-item drag

On drag start, original positions of selected items are snapshotted.
During drag, all selected items move by world-space delta from the drag anchor.

On pointer up, movement is committed as:

- `MoveItemCommand` for single-item moves
- `MultiMoveItemsCommand` for multi-item moves

### Resize

Resize starts when pointer hits one of four corner handles on the primary selected item.
The original box is cached; pointer movement updates size/position based on active handle.
Final box is committed through `ResizeItemCommand`.

## Tool Dispatch

`activeTool` controls pointer-down behavior:

- `select`: hit test, select, drag, marquee, resize
- shape tools (`sticky`, `rect`, etc.): create item at pointer and return to select
- `arrow`: start connector drag from item center or free point and show live preview

## Arrow Interaction

Arrow creation workflow:

1. Pointer down captures `from` source (item id or free point)
2. Pointer move updates preview endpoint
3. Pointer up resolves `to` target and creates arrow command (if distance threshold passes)

Arrow context menu supports:

- Line style (solid/dashed/dotted)
- Head direction presets (end/start/both/none)
- Label add/edit
- Color change
- Delete

## Keyboard Shortcuts

Implemented shortcuts:

- `Ctrl+Z`: undo
- `Ctrl+Shift+Z` or `Ctrl+Y`: redo
- `Ctrl+A`: select all items
- `Ctrl+D`: duplicate selected items
- `Delete` / `Backspace`: delete selected items/arrows
- Arrow keys: nudge selected items (`Shift` for fine nudge)
- `Escape`: reset to select mode and clear context UI
- `Ctrl+Shift+D`: debug overlay toggle

## Text Editing Overlay

Double-click item opens `TextEditor` (HTML `<textarea>` overlay) aligned to item bounds transformed into screen space.

Double-click arrow prompts for label editing.

---

**Next:** [Performance Techniques →](./04-performance.md)

# @flownote/diagram-core

Framework-agnostic diagram domain primitives extracted from FlowNote.

Versioning: experimental `0.x` (breaking changes can ship in minor releases).

## Install

```bash
npm i @flownote/diagram-core
```

## API

- Types: `DiagramItem`, `DiagramArrow`, `ItemType`, `LineStyle`, `ArrowHead`, `SelectionState`
- Pure helpers: `hitTestItems`, `hitTestArrows`, `resolveArrowEndpoints`, `computeResize`, `computeMarqueeSelection`, `nudgeSelection`, `duplicateItems`
- Mutation commands:
  - item: create, move, resize, delete, edit text, change color, multi-move, multi-delete
  - arrow: create, delete, style change, label edit

## Example

```ts
import {
  computeResize,
  hitTestItems,
  MoveItemCommand,
  type DiagramItem,
} from "@flownote/diagram-core";

const selected = hitTestItems(120, 90, items);
const nextBounds = computeResize({ x: 10, y: 10, w: 120, h: 80 }, "se", { x: 160, y: 130 });
const cmd = new MoveItemCommand(selected as DiagramItem, 10, 10, 30, 30);
```

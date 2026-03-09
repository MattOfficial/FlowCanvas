# @flownote/core-geometry

Framework-agnostic camera transforms and geometry primitives extracted from FlowNote.

Versioning: experimental `0.x` (breaking changes can ship in minor releases).

## Install

```bash
npm i @flownote/core-geometry
```

## API

- Types: `Point`, `Rect`, `WorldBounds`, `Camera`, `ResizeHandle`
- Functions: `screenToWorld`, `worldToScreen`, `getVisibleBounds`, `zoomAtPoint`, `lerp`, `pointInRect`, `aabbIntersects`, `distancePointToSegment`

## Example

```ts
import { screenToWorld, zoomAtPoint } from "@flownote/core-geometry";

const world = screenToWorld(200, 120, { x: 100, y: 80, z: 1.5 });
const nextCamera = zoomAtPoint({ x: 100, y: 80, z: 1.5 }, 200, 120, -100);
```

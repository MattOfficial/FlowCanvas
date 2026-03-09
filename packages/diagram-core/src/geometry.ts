import {
  aabbIntersects,
  distancePointToSegment,
  pointInRect,
  type Point,
  type Rect,
  type ResizeHandle,
} from "@flownote/core-geometry";
import type { DiagramArrow, DiagramItem } from "./types.js";

const EDGE_PADDING = 4;
const DEFAULT_ARROW_HIT_TOLERANCE = 8;

export type ResizeOrigin = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MoveEntry<TItem extends DiagramItem = DiagramItem> = {
  item: TItem;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
};

function itemCenter(item: DiagramItem): Point {
  return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
}

function toRect(item: DiagramItem): Rect {
  return {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };
}

function clipToEdge(item: DiagramItem, target: Point): Point {
  const center = itemCenter(item);
  const dx = target.x - center.x;
  const dy = target.y - center.y;

  if (dx === 0 && dy === 0) return center;

  const halfW = item.width / 2 + EDGE_PADDING;
  const halfH = item.height / 2 + EDGE_PADDING;

  const scaleX = halfW / Math.abs(dx || 0.001);
  const scaleY = halfH / Math.abs(dy || 0.001);
  const scale = Math.min(scaleX, scaleY);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

function rectFromPoints(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);

  return { x, y, width, height };
}

export function hitTestItems(
  worldX: number,
  worldY: number,
  items: DiagramItem[],
): DiagramItem | null {
  const point: Point = { x: worldX, y: worldY };

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (pointInRect(point, toRect(item))) {
      return item;
    }
  }

  return null;
}

export function resolveArrowEndpoints(
  arrow: DiagramArrow,
  items: DiagramItem[],
): { from: Point; to: Point } {
  let from = arrow.fromPoint;
  let to = arrow.toPoint;

  const fromItem = arrow.fromId !== null ? items.find((item) => item.id === arrow.fromId) ?? null : null;
  const toItem = arrow.toId !== null ? items.find((item) => item.id === arrow.toId) ?? null : null;

  if (fromItem && toItem) {
    from = clipToEdge(fromItem, itemCenter(toItem));
    to = clipToEdge(toItem, itemCenter(fromItem));
  } else if (fromItem) {
    from = clipToEdge(fromItem, to);
  } else if (toItem) {
    to = clipToEdge(toItem, from);
  }

  return { from, to };
}

export function hitTestArrows(
  worldX: number,
  worldY: number,
  arrows: DiagramArrow[],
  items: DiagramItem[],
  zoom: number,
  tolerancePx: number = DEFAULT_ARROW_HIT_TOLERANCE,
): DiagramArrow | null {
  const tolerance = tolerancePx / zoom;
  const point: Point = { x: worldX, y: worldY };

  for (let i = arrows.length - 1; i >= 0; i--) {
    const arrow = arrows[i];
    const { from, to } = resolveArrowEndpoints(arrow, items);
    const distance = distancePointToSegment(point, from, to);
    if (distance <= tolerance) {
      return arrow;
    }
  }

  return null;
}

export function computeResize(
  origin: ResizeOrigin,
  handle: ResizeHandle,
  cursor: Point,
  minSize: number = 40,
): { x: number; y: number; width: number; height: number } {
  let x = origin.x;
  let y = origin.y;
  let width = origin.w;
  let height = origin.h;

  if (handle === "se") {
    width = Math.max(minSize, cursor.x - origin.x);
    height = Math.max(minSize, cursor.y - origin.y);
  } else if (handle === "sw") {
    width = Math.max(minSize, origin.x + origin.w - cursor.x);
    height = Math.max(minSize, cursor.y - origin.y);
    x = origin.x + origin.w - width;
  } else if (handle === "ne") {
    width = Math.max(minSize, cursor.x - origin.x);
    height = Math.max(minSize, origin.y + origin.h - cursor.y);
    y = origin.y + origin.h - height;
  } else if (handle === "nw") {
    width = Math.max(minSize, origin.x + origin.w - cursor.x);
    height = Math.max(minSize, origin.y + origin.h - cursor.y);
    x = origin.x + origin.w - width;
    y = origin.y + origin.h - height;
  }

  return { x, y, width, height };
}

export function computeMarqueeSelection(
  items: DiagramItem[],
  start: Point,
  end: Point,
  minDragThreshold: number = 2,
): Set<number> | null {
  const marquee = rectFromPoints(start, end);
  if (marquee.width <= minDragThreshold && marquee.height <= minDragThreshold) {
    return null;
  }

  const nextSelection = new Set<number>();
  for (const item of items) {
    if (aabbIntersects(toRect(item), marquee)) {
      nextSelection.add(item.id);
    }
  }

  return nextSelection;
}

export function nudgeSelection<TItem extends DiagramItem>(
  items: TItem[],
  selectedIds: Set<number>,
  dx: number,
  dy: number,
): MoveEntry<TItem>[] {
  const entries: MoveEntry<TItem>[] = [];

  for (const item of items) {
    if (!selectedIds.has(item.id)) continue;

    const entry: MoveEntry<TItem> = {
      item,
      oldX: item.x,
      oldY: item.y,
      newX: item.x + dx,
      newY: item.y + dy,
    };

    item.x = entry.newX;
    item.y = entry.newY;
    entries.push(entry);
  }

  return entries;
}

export function duplicateItems<TItem extends DiagramItem>(
  items: TItem[],
  selectedIds: Set<number>,
  nextId: () => number,
  offset: number = 20,
): { duplicates: TItem[]; selectedIds: Set<number> } {
  const duplicates: TItem[] = [];
  const newSelection = new Set<number>();

  for (const original of items) {
    if (!selectedIds.has(original.id)) continue;

    const duplicate = {
      ...original,
      id: nextId(),
      x: original.x + offset,
      y: original.y + offset,
    };

    duplicates.push(duplicate);
    newSelection.add(duplicate.id);
  }

  return {
    duplicates,
    selectedIds: newSelection,
  };
}

import { describe, expect, it } from "vitest";
import {
  computeMarqueeSelection,
  computeResize,
  duplicateItems,
  hitTestArrows,
  hitTestItems,
  nudgeSelection,
  resolveArrowEndpoints,
  type DiagramArrow,
  type DiagramItem,
} from "../src/index";

function makeItem(partial: Partial<DiagramItem>): DiagramItem {
  return {
    id: partial.id ?? 1,
    type: partial.type ?? "rect",
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 100,
    height: partial.height ?? 100,
    color: partial.color ?? "#fff",
    text: partial.text ?? "",
  };
}

function makeArrow(partial: Partial<DiagramArrow>): DiagramArrow {
  return {
    id: partial.id ?? 1,
    fromId: partial.fromId ?? null,
    toId: partial.toId ?? null,
    fromPoint: partial.fromPoint ?? { x: 0, y: 0 },
    toPoint: partial.toPoint ?? { x: 100, y: 0 },
    color: partial.color ?? "#fff",
    lineStyle: partial.lineStyle ?? "solid",
    headEnd: partial.headEnd ?? "arrow",
    headStart: partial.headStart ?? "none",
    label: partial.label ?? "",
  };
}

describe("diagram-core geometry", () => {
  it("returns topmost item for overlapping hit tests", () => {
    const items = [
      makeItem({ id: 1, x: 0, y: 0, width: 100, height: 100 }),
      makeItem({ id: 2, x: 20, y: 20, width: 100, height: 100 }),
    ];

    const hit = hitTestItems(40, 40, items);
    expect(hit?.id).toBe(2);
  });

  it("resolves arrow endpoints for attached and free combinations", () => {
    const itemA = makeItem({ id: 1, x: 0, y: 0, width: 100, height: 100 });
    const itemB = makeItem({ id: 2, x: 200, y: 0, width: 100, height: 100 });
    const items = [itemA, itemB];

    const bothAttached = makeArrow({ fromId: 1, toId: 2, fromPoint: { x: 10, y: 10 }, toPoint: { x: 20, y: 20 } });
    const both = resolveArrowEndpoints(bothAttached, items);
    expect(both.from.x).toBeCloseTo(104, 6);
    expect(both.from.y).toBeCloseTo(50, 6);
    expect(both.to.x).toBeCloseTo(196, 6);
    expect(both.to.y).toBeCloseTo(50, 6);

    const fromAttached = makeArrow({ fromId: 1, toId: null, toPoint: { x: 300, y: 50 } });
    const partial = resolveArrowEndpoints(fromAttached, items);
    expect(partial.from.x).toBeCloseTo(104, 6);
    expect(partial.to).toEqual({ x: 300, y: 50 });
  });

  it("returns topmost arrow for hit tests", () => {
    const arrows = [
      makeArrow({ id: 1, fromPoint: { x: 0, y: 0 }, toPoint: { x: 100, y: 0 } }),
      makeArrow({ id: 2, fromPoint: { x: 0, y: 0 }, toPoint: { x: 100, y: 0 } }),
    ];

    const hit = hitTestArrows(50, 2, arrows, [], 1);
    expect(hit?.id).toBe(2);
  });

  it("computes resize bounds per corner handle", () => {
    const origin = { x: 100, y: 100, w: 80, h: 60 };

    expect(computeResize(origin, "se", { x: 220, y: 190 }, 40)).toEqual({
      x: 100,
      y: 100,
      width: 120,
      height: 90,
    });

    expect(computeResize(origin, "sw", { x: 120, y: 170 }, 40)).toEqual({
      x: 120,
      y: 100,
      width: 60,
      height: 70,
    });

    expect(computeResize(origin, "ne", { x: 170, y: 120 }, 40)).toEqual({
      x: 100,
      y: 120,
      width: 70,
      height: 40,
    });

    expect(computeResize(origin, "nw", { x: 140, y: 120 }, 40)).toEqual({
      x: 140,
      y: 120,
      width: 40,
      height: 40,
    });
  });

  it("computes marquee selection, nudge, and duplicate behavior", () => {
    const items = [
      makeItem({ id: 1, x: 0, y: 0 }),
      makeItem({ id: 2, x: 200, y: 200 }),
    ];

    const selection = computeMarqueeSelection(items, { x: -10, y: -10 }, { x: 120, y: 120 });
    expect(selection).toEqual(new Set([1]));

    const entries = nudgeSelection(items, new Set([1]), 10, -5);
    expect(entries).toHaveLength(1);
    expect(items[0].x).toBe(10);
    expect(items[0].y).toBe(-5);

    let nextId = 100;
    const duplicated = duplicateItems(items, new Set([1]), () => nextId++);
    expect(duplicated.duplicates).toHaveLength(1);
    expect(duplicated.duplicates[0].id).toBe(100);
    expect(duplicated.duplicates[0].x).toBe(30);
    expect(duplicated.duplicates[0].y).toBe(15);
  });
});

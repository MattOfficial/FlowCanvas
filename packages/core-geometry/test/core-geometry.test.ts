import { describe, expect, it } from "vitest";
import {
  aabbIntersects,
  distancePointToSegment,
  getVisibleBounds,
  pointInRect,
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
} from "../src/index";

describe("core-geometry", () => {
  it("round-trips world <-> screen transforms", () => {
    const camera = { x: 120, y: -40, z: 2.5 };
    const worldPoint = { x: 44, y: -18 };
    const screenPoint = worldToScreen(worldPoint.x, worldPoint.y, camera);
    const roundTripped = screenToWorld(screenPoint.x, screenPoint.y, camera);

    expect(roundTripped.x).toBeCloseTo(worldPoint.x, 8);
    expect(roundTripped.y).toBeCloseTo(worldPoint.y, 8);
  });

  it("keeps anchor point stable while zooming at cursor", () => {
    const camera = { x: 100, y: 80, z: 1.5 };
    const cursor = { x: 240, y: 180 };

    const worldBefore = screenToWorld(cursor.x, cursor.y, camera);
    const next = zoomAtPoint(camera, cursor.x, cursor.y, -140);
    const worldAfter = screenToWorld(cursor.x, cursor.y, next);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 8);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 8);
  });

  it("computes visible bounds in world-space", () => {
    const bounds = getVisibleBounds({ x: 100, y: 50, z: 2 }, 400, 300);
    expect(bounds).toEqual({
      left: -50,
      top: -25,
      right: 150,
      bottom: 125,
    });
  });

  it("handles rect point and AABB intersection edge cases", () => {
    expect(pointInRect({ x: 10, y: 10 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(true);
    expect(pointInRect({ x: 10.001, y: 10 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);

    expect(aabbIntersects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 9, y: 9, width: 10, height: 10 },
    )).toBe(true);

    expect(aabbIntersects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it("computes distance from point to segment including degenerate segment", () => {
    const dist1 = distancePointToSegment(
      { x: 5, y: 5 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    );
    expect(dist1).toBeCloseTo(5, 8);

    const dist2 = distancePointToSegment(
      { x: 3, y: 4 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    );
    expect(dist2).toBeCloseTo(5, 8);
  });
});

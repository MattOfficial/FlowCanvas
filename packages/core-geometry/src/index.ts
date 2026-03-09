export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WorldBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Camera = {
  x: number;
  y: number;
  z: number;
};

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 10;
const DEFAULT_ZOOM_SENSITIVITY = 0.001;

export interface ZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  sensitivity?: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function screenToWorld(screenX: number, screenY: number, camera: Camera): Point {
  return {
    x: (screenX - camera.x) / camera.z,
    y: (screenY - camera.y) / camera.z,
  };
}

export function worldToScreen(worldX: number, worldY: number, camera: Camera): Point {
  return {
    x: worldX * camera.z + camera.x,
    y: worldY * camera.z + camera.y,
  };
}

export function getVisibleBounds(
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
): WorldBounds {
  return {
    left: -camera.x / camera.z,
    top: -camera.y / camera.z,
    right: (viewportWidth - camera.x) / camera.z,
    bottom: (viewportHeight - camera.y) / camera.z,
  };
}

export function zoomAtPoint(
  camera: Camera,
  screenX: number,
  screenY: number,
  wheelDelta: number,
  options: ZoomOptions = {},
): Camera {
  const minZoom = options.minZoom ?? DEFAULT_MIN_ZOOM;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;
  const sensitivity = options.sensitivity ?? DEFAULT_ZOOM_SENSITIVITY;

  const worldX = (screenX - camera.x) / camera.z;
  const worldY = (screenY - camera.y) / camera.z;

  const zoomFactor = Math.exp(-wheelDelta * sensitivity);
  const newZoom = Math.max(minZoom, Math.min(maxZoom, camera.z * zoomFactor));

  return {
    x: screenX - worldX * newZoom,
    y: screenY - worldY * newZoom,
    z: newZoom,
  };
}

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function aabbIntersects(a: Rect, b: Rect): boolean {
  return (
    a.x + a.width > b.x &&
    a.x < b.x + b.width &&
    a.y + a.height > b.y &&
    a.y < b.y + b.height
  );
}

export function distancePointToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
}

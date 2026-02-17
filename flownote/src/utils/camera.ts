/**
 * Camera math utilities for the infinite canvas.
 *
 * The camera is defined by three values:
 *   - `x`, `y` — pan offset in screen pixels
 *   - `z` — zoom factor (1 = 100%)
 *
 * Screen-to-world conversion:
 *   worldX = (screenX - camera.x) / camera.z
 *   worldY = (screenY - camera.y) / camera.z
 */

import type { Camera, Point, WorldBounds } from "../types";

/** Minimum allowed zoom level. */
const MIN_ZOOM = 0.1;
/** Maximum allowed zoom level. */
const MAX_ZOOM = 10;

/**
 * Converts a screen-space coordinate to world-space.
 *
 * The transform undoes the camera's pan and zoom so that a pixel position
 * on screen maps to the corresponding position in the infinite world.
 */
export function screenToWorld(screenX: number, screenY: number, camera: Camera): Point {
    return {
        x: (screenX - camera.x) / camera.z,
        y: (screenY - camera.y) / camera.z,
    };
}

/**
 * Computes the axis-aligned bounding box of the viewport in world-space.
 *
 * Used for frustum culling — only items that overlap these bounds need
 * to be drawn.
 */
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

/**
 * Applies a zoom delta while keeping the given screen point fixed.
 *
 * This creates the natural "zoom toward cursor" effect: the world point
 * under the cursor stays in place while everything else scales around it.
 *
 * Algorithm:
 *   1. Find the world-space position under the cursor.
 *   2. Compute the new zoom level with exponential scaling.
 *   3. Re-derive pan so the same world point lands at the same screen pixel.
 */
export function zoomAtPoint(
    camera: Camera,
    screenX: number,
    screenY: number,
    wheelDelta: number,
): Camera {
    const worldX = (screenX - camera.x) / camera.z;
    const worldY = (screenY - camera.y) / camera.z;

    const zoomFactor = Math.exp(-wheelDelta * 0.001);
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.z * zoomFactor));

    return {
        x: screenX - worldX * newZoom,
        y: screenY - worldY * newZoom,
        z: newZoom,
    };
}

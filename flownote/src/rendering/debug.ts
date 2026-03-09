/**
 * Debug overlays drawn in world-space.
 *
 * These helpers render visual aids (origin axes, cursor crosshair) that
 * exist in the world coordinate system and are subject to the camera
 * transform.
 */

import type { Point } from "@flownote/core-geometry";

/**
 * Draws the origin axes — a red horizontal (X) and green vertical (Y)
 * line at world-space origin (0, 0).
 *
 * Line width is divided by zoom to keep a consistent visual thickness.
 */
export function drawOriginAxes(ctx: CanvasRenderingContext2D, zoom: number): void {
    // X axis (red)
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(100, 0);
    ctx.strokeStyle = "#ff5555";
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    // Y axis (green)
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, 100);
    ctx.strokeStyle = "#55ff55";
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
}

/**
 * Draws a small crosshair at the cursor's world-space position.
 *
 * Useful for debugging coordinate transforms — confirms that the
 * screen-to-world conversion is placing the cursor correctly.
 */
export function drawCrosshair(
    ctx: CanvasRenderingContext2D,
    cursor: Point,
    zoom: number,
): void {
    ctx.beginPath();
    ctx.moveTo(cursor.x - 10, cursor.y);
    ctx.lineTo(cursor.x + 10, cursor.y);
    ctx.moveTo(cursor.x, cursor.y - 10);
    ctx.lineTo(cursor.x, cursor.y + 10);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
}


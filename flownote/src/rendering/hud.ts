/**
 * Heads-up display (HUD) rendered in screen-space.
 *
 * Displays debug information (FPS, zoom, cursor coordinates) overlaid
 * on top of the canvas, independent of the camera transform.
 */

import type { Point } from "../types";

/**
 * Draws the debug HUD in the top-right corner of the viewport.
 *
 * This is drawn in screen-space (after `ctx.restore()`) so it stays
 * fixed regardless of pan/zoom.
 */
export function drawHUD(
    ctx: CanvasRenderingContext2D,
    fps: number,
    zoom: number,
    cursorWorld: Point,
    viewportWidth: number,
): void {
    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 14px monospace";

    ctx.fillText(`FPS: ${Math.round(fps)}`, viewportWidth - 80, 25);
    ctx.fillText(`Zoom: ${zoom.toFixed(2)}x`, viewportWidth - 80, 45);
    ctx.fillText(
        `World: ${Math.round(cursorWorld.x)}, ${Math.round(cursorWorld.y)}`,
        viewportWidth - 250,
        85,
    );
}

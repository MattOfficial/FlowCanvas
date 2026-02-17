/**
 * Grid rendering for the infinite canvas.
 *
 * Draws only the grid lines that fall within the current viewport,
 * avoiding unnecessary draw calls for off-screen geometry.
 */

import type { Camera } from "../types";

/** Default spacing between grid lines in world-space pixels. */
const DEFAULT_GRID_SIZE = 50;

/**
 * Draws a world-space grid that extends across the visible viewport.
 *
 * The grid is computed by converting the viewport edges to world-space,
 * snapping to the nearest grid line, and drawing only within that range.
 * Line width is divided by zoom so grid lines appear a consistent
 * thickness regardless of zoom level.
 */
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    viewportWidth: number,
    viewportHeight: number,
    gridSize: number = DEFAULT_GRID_SIZE,
): void {
    const { x: panX, y: panY, z: zoom } = camera;

    // Convert viewport edges to world-space
    const startX = (0 - panX) / zoom;
    const endX = (viewportWidth - panX) / zoom;
    const startY = (0 - panY) / zoom;
    const endY = (viewportHeight - panY) / zoom;

    // Snap to nearest grid line
    const minX = Math.floor(startX / gridSize) * gridSize;
    const maxX = Math.ceil(endX / gridSize) * gridSize;
    const minY = Math.floor(startY / gridSize) * gridSize;
    const maxY = Math.ceil(endY / gridSize) * gridSize;

    ctx.beginPath();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1 / zoom;

    for (let x = minX; x <= maxX; x += gridSize) {
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
    }

    for (let y = minY; y <= maxY; y += gridSize) {
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
    }

    ctx.stroke();
}

/**
 * Dot grid rendering for the infinite canvas.
 *
 * Draws small circles at grid intersections within the visible viewport,
 * similar to Miro/Figma. Dot opacity fades based on zoom level for a
 * clean look at extreme zoom-out.
 */

import type { Camera } from "../types";

/** Default spacing between grid dots in world-space pixels. */
const DEFAULT_GRID_SIZE = 50;

/** Dot radius in world-space pixels. */
const DOT_RADIUS = 1.5;

/** Zoom range within which dots are fully visible. */
const FADE_MIN_ZOOM = 0.15;
const FADE_MAX_ZOOM = 0.6;

/**
 * Computes dot opacity based on current zoom level.
 * Fully visible at zoom >= FADE_MAX_ZOOM, fades to 0 at FADE_MIN_ZOOM.
 */
function getDotOpacity(zoom: number): number {
    if (zoom >= FADE_MAX_ZOOM) return 1;
    if (zoom <= FADE_MIN_ZOOM) return 0;
    return (zoom - FADE_MIN_ZOOM) / (FADE_MAX_ZOOM - FADE_MIN_ZOOM);
}

/**
 * Draws a world-space dot grid across the visible viewport.
 *
 * Only dots that fall within the current camera view are drawn.
 * Opacity fades at low zoom levels to avoid visual clutter. Dot size
 * is divided by zoom for a consistent screen-space appearance.
 */
export function drawGrid(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    viewportWidth: number,
    viewportHeight: number,
    gridSize: number = DEFAULT_GRID_SIZE,
): void {
    const { x: panX, y: panY, z: zoom } = camera;

    const opacity = getDotOpacity(zoom);
    if (opacity <= 0) return;

    // Convert viewport edges to world-space
    const startX = (0 - panX) / zoom;
    const endX = (viewportWidth - panX) / zoom;
    const startY = (0 - panY) / zoom;
    const endY = (viewportHeight - panY) / zoom;

    // Snap to nearest grid intersection
    const minX = Math.floor(startX / gridSize) * gridSize;
    const maxX = Math.ceil(endX / gridSize) * gridSize;
    const minY = Math.floor(startY / gridSize) * gridSize;
    const maxY = Math.ceil(endY / gridSize) * gridSize;

    const r = DOT_RADIUS / zoom;

    ctx.fillStyle = `rgba(255, 255, 255, ${(0.2 * opacity).toFixed(3)})`;

    ctx.beginPath();
    for (let x = minX; x <= maxX; x += gridSize) {
        for (let y = minY; y <= maxY; y += gridSize) {
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
        }
    }
    ctx.fill();
}

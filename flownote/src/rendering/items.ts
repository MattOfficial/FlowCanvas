/**
 * Item rendering — per-type draw functions.
 *
 * Each item type (sticky, rect, ellipse) has its own visual style.
 * All functions draw in world-space and expect the camera transform
 * to already be applied to the context.
 */

import type { Item } from "../types";

/** Corner radius for sticky notes (world-space pixels). */
const STICKY_RADIUS = 8;

/** Shadow blur for sticky notes. */
const STICKY_SHADOW_BLUR = 12;

/**
 * Draws a rounded rectangle path (utility for sticky notes).
 */
function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Draws a sticky note — rounded rectangle with a soft shadow and
 * slightly transparent pastel fill.
 */
function drawSticky(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
): void {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = STICKY_SHADOW_BLUR / zoom;
    ctx.shadowOffsetX = 2 / zoom;
    ctx.shadowOffsetY = 2 / zoom;

    ctx.fillStyle = item.color;
    roundedRect(ctx, item.x, item.y, item.width, item.height, STICKY_RADIUS);
    ctx.fill();
    ctx.restore();

    // Draw text if present
    if (item.text) {
        drawItemText(ctx, item, zoom);
    }
}

/**
 * Draws a rectangle item — sharp corners with a subtle border.
 */
function drawRect(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
): void {
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.width, item.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(item.x, item.y, item.width, item.height);

    if (item.text) {
        drawItemText(ctx, item, zoom);
    }
}

/**
 * Draws an ellipse item centered within its bounding box.
 */
function drawEllipse(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
): void {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const rx = item.width / 2;
    const ry = item.height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1 / zoom;
    ctx.stroke();

    if (item.text) {
        drawItemText(ctx, item, zoom);
    }
}

/**
 * Draws centered text within an item's bounds.
 */
function drawItemText(
    ctx: CanvasRenderingContext2D,
    item: Item,
    _zoom: number,
): void {
    const fontSize = Math.max(12, Math.min(16, item.height * 0.12));
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Simple single-line text (multi-line can be added in Step 5)
    const maxWidth = item.width - 16;
    ctx.fillText(
        item.text,
        item.x + item.width / 2,
        item.y + item.height / 2,
        maxWidth,
    );

    // Reset alignment
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}

/**
 * Draws a single item by dispatching to the correct type-specific renderer.
 */
export function drawItem(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
): void {
    switch (item.type) {
        case "sticky":
            drawSticky(ctx, item, zoom);
            break;
        case "rect":
            drawRect(ctx, item, zoom);
            break;
        case "ellipse":
            drawEllipse(ctx, item, zoom);
            break;
    }
}

/**
 * Draws a selection highlight around an item (white border).
 */
export function drawSelectionHighlight(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
): void {
    ctx.strokeStyle = "#4a9eff";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    if (item.type === "ellipse") {
        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, item.width / 2 + 4 / zoom, item.height / 2 + 4 / zoom, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        const pad = 4 / zoom;
        ctx.strokeRect(item.x - pad, item.y - pad, item.width + pad * 2, item.height + pad * 2);
    }

    ctx.setLineDash([]);
}

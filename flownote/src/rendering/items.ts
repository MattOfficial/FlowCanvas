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

/** Padding inside items for text rendering. */
const TEXT_PADDING = 14;

/** Line height multiplier for multi-line text. */
const LINE_HEIGHT = 1.35;

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
    hideText: boolean,
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

    if (item.text && !hideText) {
        drawItemText(ctx, item, "#1a1a2e");
    }
}

/**
 * Draws a rectangle item — sharp corners with a subtle border.
 */
function drawRect(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
    hideText: boolean,
): void {
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.width, item.height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(item.x, item.y, item.width, item.height);

    if (item.text && !hideText) {
        drawItemText(ctx, item, "rgba(255, 255, 255, 0.85)");
    }
}

/**
 * Draws an ellipse item centered within its bounding box.
 */
function drawEllipse(
    ctx: CanvasRenderingContext2D,
    item: Item,
    zoom: number,
    hideText: boolean,
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

    if (item.text && !hideText) {
        drawItemText(ctx, item, "rgba(255, 255, 255, 0.85)");
    }
}

/**
 * Word-wraps text into lines that fit within the given max width.
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string[] {
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
        if (paragraph === "") {
            lines.push("");
            continue;
        }

        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }
    }

    return lines;
}

/**
 * Draws multi-line text within an item's bounds with word wrapping.
 * Text is vertically centered within the item.
 */
function drawItemText(
    ctx: CanvasRenderingContext2D,
    item: Item,
    color: string,
): void {
    const fontSize = Math.max(12, Math.min(16, item.height * 0.1));
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxWidth = item.width - TEXT_PADDING * 2;
    const lineSpacing = fontSize * LINE_HEIGHT;
    const lines = wrapText(ctx, item.text, maxWidth);

    // Vertically center the block of text
    const totalTextHeight = lines.length * lineSpacing;
    const startY = item.y + (item.height - totalTextHeight) / 2 + lineSpacing / 2;
    const centerX = item.x + item.width / 2;

    for (let i = 0; i < lines.length; i++) {
        const lineY = startY + i * lineSpacing;
        // Only draw lines that are within the item bounds
        if (lineY > item.y && lineY < item.y + item.height) {
            ctx.fillText(lines[i], centerX, lineY, maxWidth);
        }
    }

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
    hideText: boolean = false,
): void {
    switch (item.type) {
        case "sticky":
            drawSticky(ctx, item, zoom, hideText);
            break;
        case "rect":
            drawRect(ctx, item, zoom, hideText);
            break;
        case "ellipse":
            drawEllipse(ctx, item, zoom, hideText);
            break;
    }
}

/**
 * Draws a selection highlight around an item (dashed blue border).
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

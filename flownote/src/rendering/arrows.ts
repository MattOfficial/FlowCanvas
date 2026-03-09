/**
 * Arrow rendering utilities.
 *
 * Endpoint resolution and hit-testing are intentionally kept in
 * `@flownote/diagram-core` so this module stays render-only.
 */

import type { Point } from "@flownote/core-geometry";
import {
    resolveArrowEndpoints,
    type DiagramArrow as Arrow,
    type DiagramItem as Item,
} from "@flownote/diagram-core";

/** Arrowhead size in world pixels. */
const HEAD_SIZE = 12;

/**
 * Draws an arrowhead at `tip` pointing in the direction from `tail` to `tip`.
 */
function drawArrowhead(
    ctx: CanvasRenderingContext2D,
    tail: Point,
    tip: Point,
    size: number,
    color: string,
): void {
    const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
    const left = angle - Math.PI / 6;
    const right = angle + Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - size * Math.cos(left), tip.y - size * Math.sin(left));
    ctx.lineTo(tip.x - size * Math.cos(right), tip.y - size * Math.sin(right));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

/**
 * Sets the line dash pattern for a given line style.
 */
function applyLineStyle(
    ctx: CanvasRenderingContext2D,
    style: Arrow["lineStyle"],
    zoom: number,
): void {
    switch (style) {
        case "dashed":
            ctx.setLineDash([10 / zoom, 5 / zoom]);
            break;
        case "dotted":
            ctx.setLineDash([3 / zoom, 4 / zoom]);
            break;
        default:
            ctx.setLineDash([]);
    }
}

/**
 * Draws a single arrow on the canvas.
 */
export function drawArrow(
    ctx: CanvasRenderingContext2D,
    arrow: Arrow,
    items: Item[],
    zoom: number,
    isSelected: boolean,
): void {
    const { from, to } = resolveArrowEndpoints(arrow, items);
    const headSize = HEAD_SIZE / zoom;

    // Selection highlight (drawn behind the arrow)
    if (isSelected) {
        ctx.strokeStyle = "#4a9eff";
        ctx.lineWidth = 4 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    // Arrow line
    ctx.strokeStyle = arrow.color;
    ctx.lineWidth = 2 / zoom;
    applyLineStyle(ctx, arrow.lineStyle, zoom);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Arrowheads
    if (arrow.headEnd === "arrow") {
        drawArrowhead(ctx, from, to, headSize, arrow.color);
    }
    if (arrow.headStart === "arrow") {
        drawArrowhead(ctx, to, from, headSize, arrow.color);
    }

    // Label
    if (arrow.label) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const fontSize = 13 / zoom;

        ctx.save();
        ctx.translate(midX, midY);

        // Rotate label to follow the line angle (flip for readability)
        let angle = Math.atan2(to.y - from.y, to.x - from.x);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
        ctx.rotate(angle);

        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textWidth = ctx.measureText(arrow.label).width;
        const padX = 6 / zoom;
        const padY = 3 / zoom;
        const bgW = textWidth + padX * 2;
        const bgH = fontSize + padY * 2;

        // Background pill (manual rounded rect for compatibility)
        ctx.fillStyle = "rgba(20, 20, 35, 0.85)";
        const r = bgH / 2;
        const x0 = -bgW / 2;
        const y0 = -bgH / 2;
        ctx.beginPath();
        ctx.moveTo(x0 + r, y0);
        ctx.lineTo(x0 + bgW - r, y0);
        ctx.arc(x0 + bgW - r, y0 + r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(x0 + r, y0 + bgH);
        ctx.arc(x0 + r, y0 + r, r, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fill();

        // Text
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(arrow.label, 0, 0);
        ctx.restore();
    }
}

/**
 * Draws a preview arrow while the user is dragging to create one.
 */
export function drawArrowPreview(
    ctx: CanvasRenderingContext2D,
    from: Point,
    to: Point,
    zoom: number,
): void {
    const headSize = HEAD_SIZE / zoom;

    ctx.strokeStyle = "rgba(74, 158, 255, 0.6)";
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Preview arrowhead
    drawArrowhead(ctx, from, to, headSize, "rgba(74, 158, 255, 0.6)");
}

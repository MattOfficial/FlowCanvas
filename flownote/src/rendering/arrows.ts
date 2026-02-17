/**
 * Arrow rendering and hit-testing utilities.
 *
 * Arrows connect two items (via fromId/toId) or two free-form points.
 * Connected arrows calculate their endpoints from the item centers,
 * clipping to the item bounding box edges.
 */

import type { Arrow, Item, Point } from "../types";

/** Padding between item edge and arrow endpoint (world pixels). */
const EDGE_PADDING = 4;

/** Arrowhead size in world pixels. */
const HEAD_SIZE = 12;

/** Hit-test tolerance distance in world pixels (scaled by zoom). */
const HIT_TOLERANCE = 8;

// ── Anchor point calculation ─────────────────────────────────────────

/**
 * Returns the center of an item's bounding box.
 */
function itemCenter(item: Item): Point {
    return { x: item.x + item.width / 2, y: item.y + item.height / 2 };
}

/**
 * Clamps a line from `from` to the edge of `item`'s bounding box.
 * Returns the point on the rectangle edge closest to `from` along the
 * line from itemCenter(item) → from.
 */
function clipToEdge(item: Item, target: Point): Point {
    const center = itemCenter(item);
    const dx = target.x - center.x;
    const dy = target.y - center.y;

    if (dx === 0 && dy === 0) return center;

    const halfW = item.width / 2 + EDGE_PADDING;
    const halfH = item.height / 2 + EDGE_PADDING;

    // Scale factor to reach the edge
    const scaleX = halfW / Math.abs(dx || 0.001);
    const scaleY = halfH / Math.abs(dy || 0.001);
    const scale = Math.min(scaleX, scaleY);

    return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
    };
}

/**
 * Resolves an arrow's endpoints based on whether it's connected to items.
 * For connected endpoints, computes the edge-clipped position.
 */
export function resolveArrowEndpoints(
    arrow: Arrow,
    items: Item[],
): { from: Point; to: Point } {
    let from = arrow.fromPoint;
    let to = arrow.toPoint;

    const fromItem = arrow.fromId !== null ? items.find((i) => i.id === arrow.fromId) : null;
    const toItem = arrow.toId !== null ? items.find((i) => i.id === arrow.toId) : null;

    if (fromItem && toItem) {
        from = clipToEdge(fromItem, itemCenter(toItem));
        to = clipToEdge(toItem, itemCenter(fromItem));
    } else if (fromItem) {
        from = clipToEdge(fromItem, to);
    } else if (toItem) {
        to = clipToEdge(toItem, from);
    }

    return { from, to };
}

// ── Drawing ──────────────────────────────────────────────────────────

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

// ── Hit testing ──────────────────────────────────────────────────────

/**
 * Distance from a point to a line segment.
 */
function distToSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = a.x + t * dx;
    const projY = a.y + t * dy;

    return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Returns the topmost arrow under the given world-space coordinate,
 * or null if none was hit.
 */
export function hitTestArrows(
    worldX: number,
    worldY: number,
    arrows: Arrow[],
    items: Item[],
    zoom: number,
): Arrow | null {
    const tolerance = HIT_TOLERANCE / zoom;

    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        const { from, to } = resolveArrowEndpoints(arrow, items);
        const dist = distToSegment({ x: worldX, y: worldY }, from, to);

        if (dist <= tolerance) {
            return arrow;
        }
    }

    return null;
}

/**
 * Shared type definitions for FlowNote.
 */

/** Represents the 2D camera state for the infinite canvas. */
export type Camera = {
    /** Horizontal pan offset in screen pixels. */
    x: number;
    /** Vertical pan offset in screen pixels. */
    y: number;
    /** Zoom level (1 = 100%, >1 = zoomed in, <1 = zoomed out). */
    z: number;
};

/** Visual types an item can be. */
export type ItemType = "sticky" | "rect" | "ellipse" | "diamond" | "cylinder" | "hexagon" | "parallelogram" | "document" | "triangle";

/** A draggable item on the canvas. */
export type Item = {
    id: number;
    type: ItemType;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    text: string;
};

/** Line style for arrows. */
export type LineStyle = "solid" | "dashed" | "dotted";

/** Arrow head style. */
export type ArrowHead = "arrow" | "none";

/** An arrow / connector between two items or two free-form points. */
export type Arrow = {
    id: number;
    /** Connected item at the start (null for free-form). */
    fromId: number | null;
    /** Connected item at the end (null for free-form). */
    toId: number | null;
    /** World-space start point (raw position or computed from fromId). */
    fromPoint: Point;
    /** World-space end point (raw position or computed from toId). */
    toPoint: Point;
    /** Visual color. */
    color: string;
    /** Line style. */
    lineStyle: LineStyle;
    /** Head at the end of the arrow. */
    headEnd: ArrowHead;
    /** Head at the start of the arrow (for bidirectional). */
    headStart: ArrowHead;
    /** Optional text label displayed at the midpoint of the arrow. */
    label: string;
};

/** The current active tool mode. */
export type ToolMode = "select" | "arrow" | "sticky" | "rect" | "ellipse" | "diamond" | "cylinder" | "hexagon" | "parallelogram" | "document" | "triangle";

/** The mutually exclusive drag interaction modes. */
export type DragMode = "camera" | "item" | "resize" | "marquee" | "arrow";

/** Identifies which resize handle is active. */
export type ResizeHandle = "nw" | "ne" | "sw" | "se";

/** An axis-aligned bounding box in world space. */
export type WorldBounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

/** A 2D point. */
export type Point = {
    x: number;
    y: number;
};

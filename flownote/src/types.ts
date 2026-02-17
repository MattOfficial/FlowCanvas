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
export type ItemType = "sticky" | "rect" | "ellipse";

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

/** The current active tool mode. */
export type ToolMode = "select" | "sticky" | "rect" | "ellipse";

/** The mutually exclusive drag interaction modes. */
export type DragMode = "camera" | "item";

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

import type { Point } from "@flownote/core-geometry";

export type ItemType =
  | "sticky"
  | "rect"
  | "ellipse"
  | "diamond"
  | "cylinder"
  | "hexagon"
  | "parallelogram"
  | "document"
  | "triangle";

export type LineStyle = "solid" | "dashed" | "dotted";

export type ArrowHead = "arrow" | "none";

export type DiagramItem = {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
};

export type DiagramArrow = {
  id: number;
  fromId: number | null;
  toId: number | null;
  fromPoint: Point;
  toPoint: Point;
  color: string;
  lineStyle: LineStyle;
  headEnd: ArrowHead;
  headStart: ArrowHead;
  label: string;
};

export type SelectionState = {
  selectedIds: Set<number>;
  primarySelectedId: number | null;
  selectedArrowId: number | null;
};

export type ArrowStyleProp = "lineStyle" | "headEnd" | "headStart" | "color";

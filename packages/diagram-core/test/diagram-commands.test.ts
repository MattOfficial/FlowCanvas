import { describe, expect, it } from "vitest";
import { History } from "@flownote/command-history";
import {
  ChangeArrowStyleCommand,
  CreateArrowCommand,
  CreateItemCommand,
  DeleteArrowCommand,
  DeleteItemCommand,
  EditArrowLabelCommand,
  EditTextCommand,
  MoveItemCommand,
  ResizeItemCommand,
  type DiagramArrow,
  type DiagramItem,
} from "../src/index";

function makeItem(overrides: Partial<DiagramItem> = {}): DiagramItem {
  return {
    id: overrides.id ?? 1,
    type: overrides.type ?? "rect",
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 100,
    height: overrides.height ?? 60,
    color: overrides.color ?? "#fff",
    text: overrides.text ?? "",
  };
}

function makeArrow(overrides: Partial<DiagramArrow> = {}): DiagramArrow {
  return {
    id: overrides.id ?? 1,
    fromId: overrides.fromId ?? null,
    toId: overrides.toId ?? null,
    fromPoint: overrides.fromPoint ?? { x: 0, y: 0 },
    toPoint: overrides.toPoint ?? { x: 100, y: 100 },
    color: overrides.color ?? "#fff",
    lineStyle: overrides.lineStyle ?? "solid",
    headEnd: overrides.headEnd ?? "arrow",
    headStart: overrides.headStart ?? "none",
    label: overrides.label ?? "",
  };
}

describe("diagram-core commands", () => {
  it("keeps undo/redo parity for item mutations", () => {
    const history = new History();
    const items: DiagramItem[] = [];
    const item = makeItem({ id: 1, text: "hello" });

    history.push(new CreateItemCommand(items, item));
    expect(items).toHaveLength(1);

    history.push(new MoveItemCommand(item, 0, 0, 40, 20));
    expect({ x: item.x, y: item.y }).toEqual({ x: 40, y: 20 });

    history.push(new ResizeItemCommand(item, 40, 20, 100, 60, 40, 20, 120, 90));
    expect({ width: item.width, height: item.height }).toEqual({ width: 120, height: 90 });

    history.push(new EditTextCommand(item, "hello", "world"));
    expect(item.text).toBe("world");

    history.push(new DeleteItemCommand(items, item));
    expect(items).toHaveLength(0);

    history.undo(); // delete
    history.undo(); // edit text
    history.undo(); // resize
    history.undo(); // move
    expect(items).toHaveLength(1);
    expect(item.text).toBe("hello");
    expect({ x: item.x, y: item.y, width: item.width, height: item.height }).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 60,
    });

    history.redo();
    history.redo();
    history.redo();
    history.redo();
    expect(items).toHaveLength(0);
  });

  it("keeps undo/redo parity for arrow mutations", () => {
    const history = new History();
    const arrows: DiagramArrow[] = [];
    const arrow = makeArrow({ id: 7, label: "" });

    history.push(new CreateArrowCommand(arrows, arrow));
    expect(arrows).toHaveLength(1);

    history.push(new ChangeArrowStyleCommand(arrow, "lineStyle", "dashed"));
    history.push(new ChangeArrowStyleCommand(arrow, "color", "#00ff00"));
    history.push(new EditArrowLabelCommand(arrow, "", "edge-label"));
    expect(arrow.lineStyle).toBe("dashed");
    expect(arrow.color).toBe("#00ff00");
    expect(arrow.label).toBe("edge-label");

    history.push(new DeleteArrowCommand(arrows, arrow));
    expect(arrows).toHaveLength(0);

    history.undo(); // delete
    history.undo(); // label
    history.undo(); // color
    history.undo(); // style
    expect(arrows).toHaveLength(1);
    expect(arrow.lineStyle).toBe("solid");
    expect(arrow.color).toBe("#fff");
    expect(arrow.label).toBe("");

    history.redo();
    history.redo();
    history.redo();
    history.redo();
    expect(arrows).toHaveLength(0);
  });
});

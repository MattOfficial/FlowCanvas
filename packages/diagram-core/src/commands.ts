import type { Command } from "@flownote/command-history";
import type { ArrowStyleProp, DiagramArrow, DiagramItem } from "./types.js";
import type { MoveEntry } from "./geometry.js";

export class CreateItemCommand implements Command {
  readonly description: string;
  private readonly items: DiagramItem[];
  private readonly item: DiagramItem;

  constructor(items: DiagramItem[], item: DiagramItem) {
    this.items = items;
    this.item = item;
    this.description = `Create ${item.type}`;
  }

  execute(): void {
    this.items.push(this.item);
  }

  undo(): void {
    const index = this.items.indexOf(this.item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }
}

export class MoveItemCommand implements Command {
  readonly description = "Move item";
  private readonly item: DiagramItem;
  private readonly oldX: number;
  private readonly oldY: number;
  private readonly newX: number;
  private readonly newY: number;

  constructor(item: DiagramItem, oldX: number, oldY: number, newX: number, newY: number) {
    this.item = item;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }

  execute(): void {
    this.item.x = this.newX;
    this.item.y = this.newY;
  }

  undo(): void {
    this.item.x = this.oldX;
    this.item.y = this.oldY;
  }
}

export class DeleteItemCommand implements Command {
  readonly description: string;
  private readonly items: DiagramItem[];
  private readonly item: DiagramItem;
  private index = -1;

  constructor(items: DiagramItem[], item: DiagramItem) {
    this.items = items;
    this.item = item;
    this.description = `Delete ${item.type}`;
  }

  execute(): void {
    this.index = this.items.indexOf(this.item);
    if (this.index !== -1) {
      this.items.splice(this.index, 1);
    }
  }

  undo(): void {
    if (this.index !== -1) {
      this.items.splice(this.index, 0, this.item);
    } else {
      this.items.push(this.item);
    }
  }
}

export class EditTextCommand implements Command {
  readonly description = "Edit text";
  private readonly item: DiagramItem;
  private readonly oldText: string;
  private readonly newText: string;

  constructor(item: DiagramItem, oldText: string, newText: string) {
    this.item = item;
    this.oldText = oldText;
    this.newText = newText;
  }

  execute(): void {
    this.item.text = this.newText;
  }

  undo(): void {
    this.item.text = this.oldText;
  }
}

export class ResizeItemCommand implements Command {
  readonly description = "Resize item";
  private readonly item: DiagramItem;
  private readonly oldX: number;
  private readonly oldY: number;
  private readonly oldW: number;
  private readonly oldH: number;
  private readonly newX: number;
  private readonly newY: number;
  private readonly newW: number;
  private readonly newH: number;

  constructor(
    item: DiagramItem,
    oldX: number,
    oldY: number,
    oldW: number,
    oldH: number,
    newX: number,
    newY: number,
    newW: number,
    newH: number,
  ) {
    this.item = item;
    this.oldX = oldX;
    this.oldY = oldY;
    this.oldW = oldW;
    this.oldH = oldH;
    this.newX = newX;
    this.newY = newY;
    this.newW = newW;
    this.newH = newH;
  }

  execute(): void {
    this.item.x = this.newX;
    this.item.y = this.newY;
    this.item.width = this.newW;
    this.item.height = this.newH;
  }

  undo(): void {
    this.item.x = this.oldX;
    this.item.y = this.oldY;
    this.item.width = this.oldW;
    this.item.height = this.oldH;
  }
}

export class MultiMoveItemsCommand<TItem extends DiagramItem = DiagramItem> implements Command {
  readonly description = "Move items";
  private readonly entries: MoveEntry<TItem>[];

  constructor(entries: MoveEntry<TItem>[]) {
    this.entries = entries;
  }

  execute(): void {
    for (const entry of this.entries) {
      entry.item.x = entry.newX;
      entry.item.y = entry.newY;
    }
  }

  undo(): void {
    for (const entry of this.entries) {
      entry.item.x = entry.oldX;
      entry.item.y = entry.oldY;
    }
  }
}

export class MultiDeleteItemsCommand implements Command {
  readonly description: string;
  private readonly items: DiagramItem[];
  private readonly deletedItems: Array<{ item: DiagramItem; index: number }>;

  constructor(items: DiagramItem[], toDelete: DiagramItem[]) {
    this.items = items;
    this.description = `Delete ${toDelete.length} items`;
    this.deletedItems = [];

    for (const item of toDelete) {
      const index = items.indexOf(item);
      if (index !== -1) {
        this.deletedItems.push({ item, index });
      }
    }

    this.deletedItems.sort((a, b) => b.index - a.index);
  }

  execute(): void {
    for (const entry of this.deletedItems) {
      const index = this.items.indexOf(entry.item);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    }
  }

  undo(): void {
    const ascending = [...this.deletedItems].sort((a, b) => a.index - b.index);
    for (const entry of ascending) {
      this.items.splice(entry.index, 0, entry.item);
    }
  }
}

export class ChangeColorCommand implements Command {
  readonly description: string;
  private readonly entries: Array<{ item: DiagramItem; oldColor: string }>;
  private readonly newColor: string;

  constructor(targets: DiagramItem[], newColor: string) {
    this.newColor = newColor;
    this.description = targets.length > 1
      ? `Change color of ${targets.length} items`
      : "Change color";
    this.entries = targets.map((item) => ({ item, oldColor: item.color }));
  }

  execute(): void {
    for (const entry of this.entries) {
      entry.item.color = this.newColor;
    }
  }

  undo(): void {
    for (const entry of this.entries) {
      entry.item.color = entry.oldColor;
    }
  }
}

export class CreateArrowCommand implements Command {
  readonly description = "Create arrow";
  private readonly arrows: DiagramArrow[];
  private readonly arrow: DiagramArrow;

  constructor(arrows: DiagramArrow[], arrow: DiagramArrow) {
    this.arrows = arrows;
    this.arrow = arrow;
  }

  execute(): void {
    this.arrows.push(this.arrow);
  }

  undo(): void {
    const index = this.arrows.indexOf(this.arrow);
    if (index !== -1) {
      this.arrows.splice(index, 1);
    }
  }
}

export class DeleteArrowCommand implements Command {
  readonly description = "Delete arrow";
  private readonly arrows: DiagramArrow[];
  private readonly arrow: DiagramArrow;
  private index = -1;

  constructor(arrows: DiagramArrow[], arrow: DiagramArrow) {
    this.arrows = arrows;
    this.arrow = arrow;
  }

  execute(): void {
    this.index = this.arrows.indexOf(this.arrow);
    if (this.index !== -1) {
      this.arrows.splice(this.index, 1);
    }
  }

  undo(): void {
    if (this.index !== -1) {
      this.arrows.splice(this.index, 0, this.arrow);
    }
  }
}

export class ChangeArrowStyleCommand implements Command {
  readonly description = "Change arrow style";
  private readonly arrow: DiagramArrow;
  private readonly prop: ArrowStyleProp;
  private readonly oldValue: string;
  private readonly newValue: string;

  constructor(arrow: DiagramArrow, prop: ArrowStyleProp, newValue: string) {
    this.arrow = arrow;
    this.prop = prop;
    this.oldValue = arrow[prop] as string;
    this.newValue = newValue;
  }

  execute(): void {
    (this.arrow as Record<string, unknown>)[this.prop] = this.newValue;
  }

  undo(): void {
    (this.arrow as Record<string, unknown>)[this.prop] = this.oldValue;
  }
}

export class EditArrowLabelCommand implements Command {
  readonly description = "Edit arrow label";
  private readonly arrow: DiagramArrow;
  private readonly oldLabel: string;
  private readonly newLabel: string;

  constructor(arrow: DiagramArrow, oldLabel: string, newLabel: string) {
    this.arrow = arrow;
    this.oldLabel = oldLabel;
    this.newLabel = newLabel;
  }

  execute(): void {
    this.arrow.label = this.newLabel;
  }

  undo(): void {
    this.arrow.label = this.oldLabel;
  }
}

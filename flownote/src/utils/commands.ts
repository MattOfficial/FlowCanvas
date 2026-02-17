/**
 * Concrete command implementations for undoable canvas actions.
 *
 * Each command captures the state needed to execute and reverse itself.
 * Commands are passed to `History.push()` for automatic undo/redo support.
 */

import type { Arrow, Item } from "../types";
import type { Command } from "./history";

/**
 * Command: Create a new item on the canvas.
 *
 * Execute: adds the item to the array.
 * Undo: removes the item from the array.
 */
export class CreateItemCommand implements Command {
    readonly description: string;
    private items: Item[];
    private item: Item;

    constructor(items: Item[], item: Item) {
        this.items = items;
        this.item = item;
        this.description = `Create ${item.type}`;
    }

    execute(): void {
        this.items.push(this.item);
    }

    undo(): void {
        const idx = this.items.indexOf(this.item);
        if (idx !== -1) {
            this.items.splice(idx, 1);
        }
    }
}

/**
 * Command: Move an item to a new position.
 *
 * Execute: sets item to the new position.
 * Undo: restores item to the old position.
 */
export class MoveItemCommand implements Command {
    readonly description = "Move item";
    private item: Item;
    private oldX: number;
    private oldY: number;
    private newX: number;
    private newY: number;

    constructor(item: Item, oldX: number, oldY: number, newX: number, newY: number) {
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

/**
 * Command: Delete an item from the canvas.
 *
 * Execute: removes the item from the array.
 * Undo: re-inserts the item at its original index.
 */
export class DeleteItemCommand implements Command {
    readonly description: string;
    private items: Item[];
    private item: Item;
    private index: number = -1;

    constructor(items: Item[], item: Item) {
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

/**
 * Command: Edit an item's text content.
 *
 * Execute: sets item.text to the new value.
 * Undo: restores item.text to the old value.
 */
export class EditTextCommand implements Command {
    readonly description = "Edit text";
    private item: Item;
    private oldText: string;
    private newText: string;

    constructor(item: Item, oldText: string, newText: string) {
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

/**
 * Command: Resize (and potentially reposition) an item.
 *
 * Captures the full bounding box before and after so that both
 * position and size are restored on undo.
 */
export class ResizeItemCommand implements Command {
    readonly description = "Resize item";
    private item: Item;
    private oldX: number;
    private oldY: number;
    private oldW: number;
    private oldH: number;
    private newX: number;
    private newY: number;
    private newW: number;
    private newH: number;

    constructor(
        item: Item,
        oldX: number, oldY: number, oldW: number, oldH: number,
        newX: number, newY: number, newW: number, newH: number,
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

/**
 * Command: Move multiple items at once.
 *
 * Captures each item's old and new position for undoing multi-drag.
 */
export class MultiMoveItemsCommand implements Command {
    readonly description = "Move items";
    private entries: { item: Item; oldX: number; oldY: number; newX: number; newY: number }[];

    constructor(entries: { item: Item; oldX: number; oldY: number; newX: number; newY: number }[]) {
        this.entries = entries;
    }

    execute(): void {
        for (const e of this.entries) {
            e.item.x = e.newX;
            e.item.y = e.newY;
        }
    }

    undo(): void {
        for (const e of this.entries) {
            e.item.x = e.oldX;
            e.item.y = e.oldY;
        }
    }
}

/**
 * Command: Delete multiple items at once.
 */
export class MultiDeleteItemsCommand implements Command {
    readonly description: string;
    private itemsArray: Item[];
    private deletedItems: { item: Item; index: number }[] = [];

    constructor(itemsArray: Item[], toDelete: Item[]) {
        this.itemsArray = itemsArray;
        this.description = `Delete ${toDelete.length} items`;
        // Capture items and their indices (sorted descending for safe splice)
        for (const item of toDelete) {
            const idx = itemsArray.indexOf(item);
            if (idx !== -1) {
                this.deletedItems.push({ item, index: idx });
            }
        }
        this.deletedItems.sort((a, b) => b.index - a.index);
    }

    execute(): void {
        for (const entry of this.deletedItems) {
            const idx = this.itemsArray.indexOf(entry.item);
            if (idx !== -1) {
                this.itemsArray.splice(idx, 1);
            }
        }
    }

    undo(): void {
        // Re-insert in ascending index order
        const sorted = [...this.deletedItems].sort((a, b) => a.index - b.index);
        for (const entry of sorted) {
            this.itemsArray.splice(entry.index, 0, entry.item);
        }
    }
}

/**
 * Command: Change the color of one or more items.
 */
export class ChangeColorCommand implements Command {
    readonly description: string;
    private entries: { item: Item; oldColor: string }[];
    private newColor: string;

    constructor(targets: Item[], newColor: string) {
        this.newColor = newColor;
        this.description = targets.length > 1
            ? `Change color of ${targets.length} items`
            : "Change color";
        this.entries = targets.map((item) => ({ item, oldColor: item.color }));
    }

    execute(): void {
        for (const e of this.entries) {
            e.item.color = this.newColor;
        }
    }

    undo(): void {
        for (const e of this.entries) {
            e.item.color = e.oldColor;
        }
    }
}

/**
 * Command: Create a new arrow on the canvas.
 */
export class CreateArrowCommand implements Command {
    readonly description = "Create arrow";
    private arrowsArray: Arrow[];
    private arrow: Arrow;

    constructor(arrowsArray: Arrow[], arrow: Arrow) {
        this.arrowsArray = arrowsArray;
        this.arrow = arrow;
    }

    execute(): void {
        this.arrowsArray.push(this.arrow);
    }

    undo(): void {
        const idx = this.arrowsArray.indexOf(this.arrow);
        if (idx !== -1) this.arrowsArray.splice(idx, 1);
    }
}

/**
 * Command: Delete an arrow from the canvas.
 */
export class DeleteArrowCommand implements Command {
    readonly description = "Delete arrow";
    private arrowsArray: Arrow[];
    private arrow: Arrow;
    private index = -1;

    constructor(arrowsArray: Arrow[], arrow: Arrow) {
        this.arrowsArray = arrowsArray;
        this.arrow = arrow;
    }

    execute(): void {
        this.index = this.arrowsArray.indexOf(this.arrow);
        if (this.index !== -1) this.arrowsArray.splice(this.index, 1);
    }

    undo(): void {
        if (this.index !== -1) {
            this.arrowsArray.splice(this.index, 0, this.arrow);
        }
    }
}

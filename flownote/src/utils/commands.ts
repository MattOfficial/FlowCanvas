/**
 * Concrete command implementations for undoable canvas actions.
 *
 * Each command captures the state needed to execute and reverse itself.
 * Commands are passed to `History.push()` for automatic undo/redo support.
 */

import type { Item } from "../types";
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

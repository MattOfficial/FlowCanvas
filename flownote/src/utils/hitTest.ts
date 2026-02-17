/**
 * Hit-testing utilities for canvas items.
 *
 * Items are tested in reverse draw order (last drawn = on top) so the
 * topmost visual item is returned first.
 */

import type { Item } from "../types";

/**
 * Returns the topmost item under the given world-space coordinate, or `null`
 * if no item was hit.
 *
 * Iterates in reverse order to respect z-ordering — items drawn later
 * appear on top and should be selected first.
 */
export function hitTestItems(
    worldX: number,
    worldY: number,
    items: Item[],
    itemSize: number,
): Item | null {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (
            worldX >= item.x &&
            worldX <= item.x + itemSize &&
            worldY >= item.y &&
            worldY <= item.y + itemSize
        ) {
            return item;
        }
    }
    return null;
}

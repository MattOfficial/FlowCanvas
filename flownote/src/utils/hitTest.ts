/**
 * Hit-testing utilities for canvas items.
 *
 * Items are tested in reverse draw order (last drawn = on top) so the
 * topmost visual item is returned first. Each item uses its own
 * width/height for bounds checking.
 */

import type { Item } from "../types";

/**
 * Returns the topmost item under the given world-space coordinate, or `null`
 * if no item was hit.
 *
 * For ellipses, an approximate bounding-box test is used (sufficient for
 * selection; a precise ellipse-point test can be added later).
 */
export function hitTestItems(
    worldX: number,
    worldY: number,
    items: Item[],
): Item | null {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (
            worldX >= item.x &&
            worldX <= item.x + item.width &&
            worldY >= item.y &&
            worldY <= item.y + item.height
        ) {
            return item;
        }
    }
    return null;
}

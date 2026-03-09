/**
 * Canvas state persistence via localStorage.
 *
 * Saves and loads the full canvas state (items, arrows, camera, nextId)
 * so work is preserved across page reloads. Writes are debounced to
 * avoid excessive serialization on every frame or drag event.
 */

import type { Camera } from "@flownote/core-geometry";
import type { DiagramArrow as Arrow, DiagramItem as Item } from "@flownote/diagram-core";

const STORAGE_KEY = "flownote-canvas";

/** The shape of the data we persist. */
interface CanvasState {
    items: Item[];
    arrows: Arrow[];
    camera: Camera;
    nextId: number;
}

/**
 * Saves the current canvas state to localStorage.
 */
export function saveState(
    items: Item[],
    arrows: Arrow[],
    camera: Camera,
    nextId: number,
): void {
    try {
        const state: CanvasState = { items, arrows, camera, nextId };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Silently ignore quota errors
    }
}

/**
 * Loads the canvas state from localStorage.
 * Returns null if no saved state exists or if parsing fails.
 */
export function loadState(): CanvasState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw) as CanvasState;

        // Basic validation
        if (!Array.isArray(state.items) || typeof state.nextId !== "number") {
            return null;
        }

        // Backwards compat: arrows may not exist in old saves
        if (!Array.isArray(state.arrows)) {
            state.arrows = [];
        }

        return state;
    } catch {
        return null;
    }
}

/**
 * Creates a debounced save function. Calls to the returned function
 * are coalesced — only the last call within `delayMs` actually writes.
 */
export function createDebouncedSave(delayMs: number = 500) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (items: Item[], arrows: Arrow[], camera: Camera, nextId: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            saveState(items, arrows, camera, nextId);
            timer = null;
        }, delayMs);
    };
}


/**
 * Canvas state persistence via localStorage.
 *
 * Saves and loads the full canvas state (items, camera, nextId) so
 * work is preserved across page reloads. Writes are debounced to
 * avoid excessive serialization on every frame or drag event.
 */

import type { Camera, Item } from "../types";

const STORAGE_KEY = "flownote-canvas";

/** The shape of the data we persist. */
interface CanvasState {
    items: Item[];
    camera: Camera;
    nextId: number;
}

/**
 * Saves the current canvas state to localStorage.
 */
export function saveState(items: Item[], camera: Camera, nextId: number): void {
    try {
        const state: CanvasState = { items, camera, nextId };
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

    return (items: Item[], camera: Camera, nextId: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            saveState(items, camera, nextId);
            timer = null;
        }, delayMs);
    };
}

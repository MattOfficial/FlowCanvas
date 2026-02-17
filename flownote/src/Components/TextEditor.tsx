/**
 * TextEditor — HTML textarea overlay for editing item text.
 *
 * Rendered as a fixed-position div that sits over the canvas, aligned
 * exactly with the item's screen-space bounding box. Commits text
 * changes on blur or Escape, and notifies the parent via callback.
 */

import { useEffect, useRef } from "react";
import type { Camera, Item } from "../types";
import "./TextEditor.css";

type TextEditorProps = {
    item: Item;
    camera: Camera;
    onCommit: (newText: string) => void;
    onCancel: () => void;
};

/**
 * Converts an item's world-space bounds to screen-space pixel coordinates.
 */
function worldToScreen(item: Item, camera: Camera) {
    return {
        left: item.x * camera.z + camera.x,
        top: item.y * camera.z + camera.y,
        width: item.width * camera.z,
        height: item.height * camera.z,
    };
}

export const TextEditor = ({ item, camera, onCommit, onCancel }: TextEditorProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const initialText = useRef(item.text);

    useEffect(() => {
        // Auto-focus and select all text when the editor opens
        const ta = textareaRef.current;
        if (ta) {
            ta.focus();
            ta.select();
        }
    }, []);

    const screen = worldToScreen(item, camera);

    const fontSize = Math.max(12, Math.min(16, item.height * 0.1)) * camera.z;
    const isDark = item.type === "sticky";

    const handleBlur = () => {
        const newText = textareaRef.current?.value ?? "";
        if (newText !== initialText.current) {
            onCommit(newText);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            // Cancel — revert to original text
            onCancel();
        }
        // Stop keyboard shortcuts from bubbling to canvas
        e.stopPropagation();
    };

    return (
        <div
            className="text-editor-overlay"
            style={{
                left: screen.left,
                top: screen.top,
                width: screen.width,
                height: screen.height,
            }}
        >
            <textarea
                ref={textareaRef}
                className={`text-editor-textarea ${isDark ? "dark-text" : "light-text"}`}
                defaultValue={item.text}
                placeholder="Type here..."
                style={{ fontSize }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
};

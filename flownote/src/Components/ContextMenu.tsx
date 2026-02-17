/**
 * ContextMenu — a floating right-click context menu for the canvas.
 *
 * Shows contextual actions based on what was right-clicked:
 *   - On an item: Duplicate, Select All, Delete
 *   - On empty space: Select All
 *
 * Closes on any click outside, on action, or on Escape.
 */

import { useEffect, useRef } from "react";
import "./ContextMenu.css";

export interface ContextMenuAction {
    label: string;
    shortcut?: string;
    danger?: boolean;
    action: () => void;
}

interface ContextMenuProps {
    x: number;
    y: number;
    actions: ContextMenuAction[];
    onClose: () => void;
}

export const ContextMenu = ({ x, y, actions, onClose }: ContextMenuProps) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        // Delay to avoid immediate close from the right-click event itself
        requestAnimationFrame(() => {
            window.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("keydown", handleKey);
        });

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // Adjust position to keep menu on screen
    const style: React.CSSProperties = {
        left: Math.min(x, window.innerWidth - 200),
        top: Math.min(y, window.innerHeight - actions.length * 36 - 16),
    };

    return (
        <div className="context-menu" ref={menuRef} style={style}>
            {actions.map((action, i) =>
                action.label === "---" ? (
                    <div key={i} className="context-menu-separator" />
                ) : (
                    <div
                        key={i}
                        className={`context-menu-item${action.danger ? " danger" : ""}`}
                        onClick={() => {
                            action.action();
                            onClose();
                        }}
                    >
                        <span>{action.label}</span>
                        {action.shortcut && (
                            <span className="context-menu-shortcut">{action.shortcut}</span>
                        )}
                    </div>
                ),
            )}
        </div>
    );
};

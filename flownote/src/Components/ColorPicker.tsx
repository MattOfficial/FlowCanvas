/**
 * ColorPicker — a floating color swatch grid.
 *
 * Shows a palette of preset colors. Clicking a swatch fires `onSelect`
 * with the hex color string. Closes automatically on selection or
 * outside click / Escape.
 */

import { useEffect, useRef } from "react";
import "./ColorPicker.css";

/** Curated palette — warm pastels, cool tones, and neutrals. */
const PALETTE = [
    "#FFEB3B", "#FF9800", "#FF5722", "#E91E63", "#9C27B0",
    "#673AB7", "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
    "#009688", "#4CAF50", "#8BC34A", "#CDDC39", "#FFC107",
    "#795548", "#607D8B", "#9E9E9E", "#F5F5F5", "#263238",
];

interface ColorPickerProps {
    x: number;
    y: number;
    currentColor?: string;
    onSelect: (color: string) => void;
    onClose: () => void;
}

export const ColorPicker = ({ x, y, currentColor, onSelect, onClose }: ColorPickerProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        requestAnimationFrame(() => {
            window.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("keydown", handleKey);
        });

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // Keep on screen
    const style: React.CSSProperties = {
        left: Math.min(x, window.innerWidth - 190),
        top: Math.min(y, window.innerHeight - 160),
    };

    return (
        <div className="color-picker-overlay" ref={ref} style={style}>
            <div className="color-picker-grid">
                {PALETTE.map((color) => (
                    <div
                        key={color}
                        className={`color-swatch${currentColor === color ? " active" : ""}`}
                        style={{ background: color }}
                        onClick={() => {
                            onSelect(color);
                            onClose();
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

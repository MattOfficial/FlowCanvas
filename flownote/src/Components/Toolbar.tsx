/**
 * Toolbar — floating bottom-center toolbar for selecting tools.
 *
 * Renders as an HTML overlay on top of the canvas. Communicates the
 * active tool mode to the parent via callback.
 */

import type { ToolMode } from "../types";
import "./Toolbar.css";

type ToolbarProps = {
    activeTool: ToolMode;
    onToolChange: (tool: ToolMode) => void;
};

/** Icon SVGs for each tool (inline to avoid asset dependencies). */

const CursorIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
    </svg>
);

const StickyIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h9l5-5V5a2 2 0 00-2-2z" />
        <path d="M14 17v4l5-5h-4a1 1 0 00-1 1z" />
    </svg>
);

const RectIcon = () => (
    <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
);

const EllipseIcon = () => (
    <svg viewBox="0 0 24 24">
        <ellipse cx="12" cy="12" rx="10" ry="7" />
    </svg>
);

type ToolDef = {
    mode: ToolMode;
    label: string;
    icon: React.ReactNode;
};

const tools: ToolDef[] = [
    { mode: "select", label: "Select", icon: <CursorIcon /> },
];

const shapes: ToolDef[] = [
    { mode: "sticky", label: "Sticky Note", icon: <StickyIcon /> },
    { mode: "rect", label: "Rectangle", icon: <RectIcon /> },
    { mode: "ellipse", label: "Ellipse", icon: <EllipseIcon /> },
];

export const Toolbar = ({ activeTool, onToolChange }: ToolbarProps) => {
    return (
        <div className="toolbar">
            {tools.map((t) => (
                <button
                    key={t.mode}
                    className={`toolbar-btn ${activeTool === t.mode ? "active" : ""}`}
                    onClick={() => onToolChange(t.mode)}
                >
                    {t.icon}
                    <span className="toolbar-tooltip">{t.label}</span>
                </button>
            ))}
            <div className="toolbar-separator" />
            {shapes.map((t) => (
                <button
                    key={t.mode}
                    className={`toolbar-btn ${activeTool === t.mode ? "active" : ""}`}
                    onClick={() => onToolChange(t.mode)}
                >
                    {t.icon}
                    <span className="toolbar-tooltip">{t.label}</span>
                </button>
            ))}
        </div>
    );
};

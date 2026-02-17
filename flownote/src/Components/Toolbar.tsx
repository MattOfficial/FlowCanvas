/**
 * Toolbar — floating bottom-center toolbar for selecting tools.
 *
 * Renders as an HTML overlay on top of the canvas. Communicates the
 * active tool mode to the parent via callback. Tools are organized
 * into: Select, Basic Shapes, and Diagram Shapes.
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

const DiamondIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M12 2L22 12L12 22L2 12Z" />
    </svg>
);

const CylinderIcon = () => (
    <svg viewBox="0 0 24 24">
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="currentColor" strokeWidth="0" />
    </svg>
);

const HexagonIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M6 3L18 3L23 12L18 21L6 21L1 12Z" />
    </svg>
);

const ParallelogramIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M8 4L22 4L16 20L2 20Z" />
    </svg>
);

const DocumentIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M4 3h16v15c-2.67 2-5.33 0-8 2-2.67-2-5.33 0-8-2V3z" />
    </svg>
);

const TriangleIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M12 3L22 21H2Z" />
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

const ArrowIcon = () => (
    <svg viewBox="0 0 24 24">
        <path d="M4 20L20 4M20 4H10M20 4V14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const connectorTools: ToolDef[] = [
    { mode: "arrow", label: "Arrow", icon: <ArrowIcon /> },
];

const basicShapes: ToolDef[] = [
    { mode: "sticky", label: "Sticky Note", icon: <StickyIcon /> },
    { mode: "rect", label: "Rectangle", icon: <RectIcon /> },
    { mode: "ellipse", label: "Ellipse", icon: <EllipseIcon /> },
];

const diagramShapes: ToolDef[] = [
    { mode: "diamond", label: "Diamond", icon: <DiamondIcon /> },
    { mode: "cylinder", label: "Cylinder", icon: <CylinderIcon /> },
    { mode: "hexagon", label: "Hexagon", icon: <HexagonIcon /> },
    { mode: "parallelogram", label: "Parallelogram", icon: <ParallelogramIcon /> },
    { mode: "document", label: "Document", icon: <DocumentIcon /> },
    { mode: "triangle", label: "Triangle", icon: <TriangleIcon /> },
];

const renderGroup = (
    items: ToolDef[],
    activeTool: ToolMode,
    onToolChange: (tool: ToolMode) => void,
) =>
    items.map((t) => (
        <button
            key={t.mode}
            className={`toolbar-btn ${activeTool === t.mode ? "active" : ""}`}
            onClick={() => onToolChange(t.mode)}
        >
            {t.icon}
            <span className="toolbar-tooltip">{t.label}</span>
        </button>
    ));

export const Toolbar = ({ activeTool, onToolChange }: ToolbarProps) => {
    return (
        <div className="toolbar">
            {renderGroup(tools, activeTool, onToolChange)}
            <div className="toolbar-separator" />
            {renderGroup(connectorTools, activeTool, onToolChange)}
            <div className="toolbar-separator" />
            {renderGroup(basicShapes, activeTool, onToolChange)}
            <div className="toolbar-separator" />
            {renderGroup(diagramShapes, activeTool, onToolChange)}
        </div>
    );
};

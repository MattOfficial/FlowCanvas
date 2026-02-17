/**
 * FlowCanvas — the core infinite canvas component.
 *
 * Renders a full-viewport HTML canvas with:
 *   - Pannable/zoomable camera with smooth zoom interpolation
 *   - Draggable items with multi-selection
 *   - Shift+click to toggle items in/out of selection
 *   - Marquee (rubber-band) selection on empty space
 *   - Multi-drag and multi-delete
 *   - Tool-based item creation (sticky, rect, ellipse)
 *   - Double-click to edit text on items
 *   - Undo/redo via command pattern (Ctrl+Z / Ctrl+Shift+Z)
 *   - Auto-save to localStorage (debounced)
 *   - World-space dot grid
 *   - Context-aware cursor styles
 *   - Optional debug overlays (toggle with Ctrl+Shift+D)
 *
 * All mutable state lives in refs to avoid React re-renders — the
 * canvas is driven entirely by a `requestAnimationFrame` loop.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Camera, DragMode, Item, ItemType, Point, ResizeHandle, ToolMode } from "../types";
import { screenToWorld, getVisibleBounds, zoomAtPoint } from "../utils/camera";
import { hitTestItems } from "../utils/hitTest";
import { History } from "../utils/history";
import {
  CreateItemCommand,
  MoveItemCommand,
  DeleteItemCommand,
  EditTextCommand,
  ResizeItemCommand,
  MultiMoveItemsCommand,
  MultiDeleteItemsCommand,
  ChangeColorCommand,
} from "../utils/commands";
import { loadState, createDebouncedSave } from "../utils/storage";
import { drawGrid } from "../rendering/grid";
import { drawHUD } from "../rendering/hud";
import { drawOriginAxes, drawCrosshair } from "../rendering/debug";
import { drawItem, drawSelectionHighlight, drawResizeHandles, hitTestResizeHandle, RESIZE_CURSORS } from "../rendering/items";
import { Toolbar } from "./Toolbar";
import { TextEditor } from "./TextEditor";
import { ContextMenu, type ContextMenuAction } from "./ContextMenu";
import { ColorPicker } from "./ColorPicker";

/** Interpolation speed for smooth zoom (0–1, higher = snappier). */
const ZOOM_LERP_SPEED = 0.15;

/** Background color — warm dark neutral. */
const BG_COLOR = "#1a1a2e";

/** Default dimensions for new items by type. */
const DEFAULT_SIZES: Record<ItemType, { width: number; height: number }> = {
  sticky: { width: 200, height: 200 },
  rect: { width: 180, height: 120 },
  ellipse: { width: 160, height: 120 },
  diamond: { width: 140, height: 140 },
  cylinder: { width: 120, height: 160 },
  hexagon: { width: 160, height: 120 },
  parallelogram: { width: 180, height: 100 },
  document: { width: 160, height: 140 },
  triangle: { width: 140, height: 130 },
};

/** Pastel colors for sticky notes, cycling through these on creation. */
const STICKY_COLORS = ["#FFEB3B", "#FF9800", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"];

/** Minimum item size when resizing (world-space pixels). */
const MIN_ITEM_SIZE = 40;

/** Default color for rect/ellipse items. */
const SHAPE_COLOR = "rgba(255, 255, 255, 0.08)";

/** Nudge distance in world pixels (normal / with Shift). */
const NUDGE_NORMAL = 10;
const NUDGE_FINE = 1;

/** Linear interpolation between two values. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number>(0);

  // ── Tool state (React state — drives Toolbar re-renders) ───────────
  const [activeTool, setActiveTool] = useState<ToolMode>("select");
  const activeToolRef = useRef<ToolMode>("select");

  // ── Camera ──────────────────────────────────────────────────────────
  const camera = useRef<Camera>({ x: 100, y: 100, z: 1.5 });
  const targetCamera = useRef<Camera>({ x: 100, y: 100, z: 1.5 });

  // ── Drag state ──────────────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragModeRef = useRef<DragMode>("camera");
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const camStart = useRef<Point>({ x: 0, y: 0 });

  // ── Multi-drag origins — position snapshot for each selected item ──
  const multiDragOrigins = useRef<Map<number, Point>>(new Map());

  // ── Resize state ─────────────────────────────────────────────────────
  const activeHandle = useRef<ResizeHandle | null>(null);
  /** Original bounding box when resize drag starts. */
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // ── Selection (Set for multi-select) ────────────────────────────────
  const selectedIds = useRef<Set<number>>(new Set());
  /** The "primary" selected item for resize handles (last clicked). */
  const primarySelectedId = useRef<number | null>(null);

  // ── Marquee state ───────────────────────────────────────────────────
  const marqueeStart = useRef<Point>({ x: 0, y: 0 });
  const marqueeEnd = useRef<Point>({ x: 0, y: 0 });

  // ── Text editing (React state — drives TextEditor rendering) ────────
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  /** Ref mirror of editingItem's ID so the render loop can access it. */
  const editingIdRef = useRef<number | null>(null);

  // ── Context menu (React state — drives ContextMenu rendering) ─────
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    actions: ContextMenuAction[];
  } | null>(null);

  // ── Color picker (React state) ──────────────────────────────────────
  const [colorPicker, setColorPicker] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // ── Undo/Redo ───────────────────────────────────────────────────────
  const history = useRef(new History());

  // ── Persistence ─────────────────────────────────────────────────────
  const debouncedSave = useRef(createDebouncedSave(500));

  /** Triggers a debounced save of the current canvas state. */
  const triggerSave = () => {
    debouncedSave.current(items.current, camera.current, nextId.current);
  };

  // ── Debug mode (toggle with Ctrl+Shift+D) ───────────────────────────
  const debugMode = useRef(false);

  // ── FPS tracking ────────────────────────────────────────────────────
  const lastFrameTime = useRef<number>(0);
  const fps = useRef<number>(60);

  // ── World data ──────────────────────────────────────────────────────
  const items = useRef<Item[]>([]);
  const nextId = useRef(0);
  const cursor = useRef<Point>({ x: 0, y: 0 });
  const stickyColorIndex = useRef(0);

  // ── Rehydrate from localStorage on mount ────────────────────────────
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      items.current = saved.items;
      nextId.current = saved.nextId;
      camera.current = { ...saved.camera };
      targetCamera.current = { ...saved.camera };
    }
  }, []);

  /** Keep the ref in sync when React state changes. */
  const handleToolChange = useCallback((tool: ToolMode) => {
    setActiveTool(tool);
    activeToolRef.current = tool;
  }, []);

  /** Called when the text editor commits a change. */
  const handleTextCommit = useCallback((newText: string) => {
    const item = editingItem;
    if (item) {
      const oldText = item.text;
      history.current.push(new EditTextCommand(item, oldText, newText));
      triggerSave();
    }
    setEditingItem(null);
    editingIdRef.current = null;
  }, [editingItem]);

  /** Called when the text editor is cancelled. */
  const handleTextCancel = useCallback(() => {
    setEditingItem(null);
    editingIdRef.current = null;
  }, []);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Resize handler ────────────────────────────────────────────────
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    // ── Cursor style helper ───────────────────────────────────────────
    const updateCursor = (e: PointerEvent) => {
      const tool = activeToolRef.current;

      if (isDragging.current) {
        if (dragModeRef.current === "camera") canvas.style.cursor = "grabbing";
        else if (dragModeRef.current === "marquee") canvas.style.cursor = "crosshair";
        else if (dragModeRef.current === "resize" && activeHandle.current)
          canvas.style.cursor = RESIZE_CURSORS[activeHandle.current];
        else canvas.style.cursor = "move";
        return;
      }

      if (tool !== "select") {
        canvas.style.cursor = "crosshair";
        return;
      }

      const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);

      // Check resize handles first on the primary selected item
      if (primarySelectedId.current !== null) {
        const selItem = items.current.find((i) => i.id === primarySelectedId.current);
        if (selItem) {
          const handle = hitTestResizeHandle(worldPos.x, worldPos.y, selItem, camera.current.z);
          if (handle) {
            canvas.style.cursor = RESIZE_CURSORS[handle];
            return;
          }
        }
      }

      const hover = hitTestItems(worldPos.x, worldPos.y, items.current);
      canvas.style.cursor = hover ? "move" : "grab";
    };

    // ── Pointer: move ─────────────────────────────────────────────────
    const handleMove = (e: PointerEvent) => {
      cursor.current = screenToWorld(e.clientX, e.clientY, camera.current);
      updateCursor(e);

      if (!isDragging.current) return;

      if (dragModeRef.current === "camera") {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        camera.current.x = camStart.current.x + dx;
        camera.current.y = camStart.current.y + dy;
        targetCamera.current.x = camera.current.x;
        targetCamera.current.y = camera.current.y;
      } else if (dragModeRef.current === "item" && selectedIds.current.size > 0) {
        // Multi-drag: move all selected items relative to the drag anchor
        const dx = cursor.current.x - dragStart.current.x;
        const dy = cursor.current.y - dragStart.current.y;
        for (const item of items.current) {
          if (selectedIds.current.has(item.id)) {
            const origin = multiDragOrigins.current.get(item.id);
            if (origin) {
              item.x = origin.x + dx;
              item.y = origin.y + dy;
            }
          }
        }
      } else if (dragModeRef.current === "resize" && primarySelectedId.current !== null && activeHandle.current) {
        const item = items.current.find((i) => i.id === primarySelectedId.current);
        if (item) {
          const orig = resizeOrigin.current;
          const handle = activeHandle.current;
          const wx = cursor.current.x;
          const wy = cursor.current.y;

          let newX = item.x, newY = item.y, newW = item.width, newH = item.height;

          if (handle === "se") {
            newW = Math.max(MIN_ITEM_SIZE, wx - orig.x);
            newH = Math.max(MIN_ITEM_SIZE, wy - orig.y);
          } else if (handle === "sw") {
            newW = Math.max(MIN_ITEM_SIZE, (orig.x + orig.w) - wx);
            newH = Math.max(MIN_ITEM_SIZE, wy - orig.y);
            newX = (orig.x + orig.w) - newW;
          } else if (handle === "ne") {
            newW = Math.max(MIN_ITEM_SIZE, wx - orig.x);
            newH = Math.max(MIN_ITEM_SIZE, (orig.y + orig.h) - wy);
            newY = (orig.y + orig.h) - newH;
          } else if (handle === "nw") {
            newW = Math.max(MIN_ITEM_SIZE, (orig.x + orig.w) - wx);
            newH = Math.max(MIN_ITEM_SIZE, (orig.y + orig.h) - wy);
            newX = (orig.x + orig.w) - newW;
            newY = (orig.y + orig.h) - newH;
          }

          item.x = newX;
          item.y = newY;
          item.width = newW;
          item.height = newH;
        }
      } else if (dragModeRef.current === "marquee") {
        marqueeEnd.current = { ...cursor.current };
      }
    };

    // ── Pointer: up — finalize drag commands ─────────────────────────
    const handleUp = (e: PointerEvent) => {
      if (isDragging.current) {
        if (dragModeRef.current === "item" && selectedIds.current.size > 0) {
          // Build multi-move command entries
          const entries: { item: Item; oldX: number; oldY: number; newX: number; newY: number }[] = [];
          for (const item of items.current) {
            if (selectedIds.current.has(item.id)) {
              const origin = multiDragOrigins.current.get(item.id);
              if (origin && (item.x !== origin.x || item.y !== origin.y)) {
                entries.push({
                  item,
                  oldX: origin.x,
                  oldY: origin.y,
                  newX: item.x,
                  newY: item.y,
                });
              }
            }
          }
          if (entries.length === 1) {
            // Use single move command for single item moves
            const e = entries[0];
            history.current.push(new MoveItemCommand(e.item, e.oldX, e.oldY, e.newX, e.newY));
            triggerSave();
          } else if (entries.length > 1) {
            history.current.push(new MultiMoveItemsCommand(entries));
            triggerSave();
          }
          multiDragOrigins.current.clear();
        }

        if (dragModeRef.current === "resize" && primarySelectedId.current !== null) {
          const item = items.current.find((i) => i.id === primarySelectedId.current);
          if (item) {
            const orig = resizeOrigin.current;
            if (
              item.x !== orig.x || item.y !== orig.y ||
              item.width !== orig.w || item.height !== orig.h
            ) {
              const cmd = new ResizeItemCommand(
                item,
                orig.x, orig.y, orig.w, orig.h,
                item.x, item.y, item.width, item.height,
              );
              history.current.push({
                description: cmd.description,
                execute: () => cmd.execute(),
                undo: () => cmd.undo(),
              });
              triggerSave();
            }
            activeHandle.current = null;
          }
        }

        if (dragModeRef.current === "marquee") {
          // Finalize marquee: select items within the rectangle
          const x1 = Math.min(marqueeStart.current.x, marqueeEnd.current.x);
          const y1 = Math.min(marqueeStart.current.y, marqueeEnd.current.y);
          const x2 = Math.max(marqueeStart.current.x, marqueeEnd.current.x);
          const y2 = Math.max(marqueeStart.current.y, marqueeEnd.current.y);

          // Only select if we actually dragged a meaningful area
          if (Math.abs(x2 - x1) > 2 || Math.abs(y2 - y1) > 2) {
            const newSelection = new Set<number>();
            for (const item of items.current) {
              // Item intersects the rectangle
              if (
                item.x + item.width > x1 &&
                item.x < x2 &&
                item.y + item.height > y1 &&
                item.y < y2
              ) {
                newSelection.add(item.id);
              }
            }
            selectedIds.current = newSelection;
            primarySelectedId.current = newSelection.size > 0
              ? [...newSelection][newSelection.size - 1]
              : null;
          }
        }
      }

      isDragging.current = false;
      updateCursor(e);
    };

    // ── Wheel: zoom ───────────────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetCamera.current = zoomAtPoint(
        targetCamera.current,
        e.clientX,
        e.clientY,
        e.deltaY,
      );
    };

    // ── Keyboard ──────────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // Debug toggle
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        debugMode.current = !debugMode.current;
        return;
      }

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        history.current.undo();
        triggerSave();
        // Clear selection for any items that no longer exist
        for (const id of selectedIds.current) {
          if (!items.current.find((i) => i.id === id)) {
            selectedIds.current.delete(id);
          }
        }
        if (primarySelectedId.current !== null && !selectedIds.current.has(primarySelectedId.current)) {
          primarySelectedId.current = null;
        }
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (
        (e.ctrlKey && e.shiftKey && e.key === "Z") ||
        (e.ctrlKey && !e.shiftKey && e.key === "y")
      ) {
        e.preventDefault();
        history.current.redo();
        triggerSave();
        return;
      }

      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        selectedIds.current = new Set(items.current.map((i) => i.id));
        primarySelectedId.current = items.current.length > 0
          ? items.current[items.current.length - 1].id
          : null;
        return;
      }

      // Delete selected items: Delete or Backspace
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.current.size > 0
      ) {
        e.preventDefault();
        const toDelete = items.current.filter((i) => selectedIds.current.has(i.id));
        if (toDelete.length === 1) {
          history.current.push(new DeleteItemCommand(items.current, toDelete[0]));
        } else if (toDelete.length > 1) {
          history.current.push(new MultiDeleteItemsCommand(items.current, toDelete));
        }
        selectedIds.current = new Set();
        primarySelectedId.current = null;
        triggerSave();
        return;
      }

      // Escape — return to select mode and clear selection
      if (e.key === "Escape") {
        activeToolRef.current = "select";
        setActiveTool("select");
        selectedIds.current = new Set();
        primarySelectedId.current = null;
        setContextMenu(null);
        return;
      }

      // Duplicate: Ctrl+D
      if (e.ctrlKey && e.key === "d" && selectedIds.current.size > 0) {
        e.preventDefault();
        const offset = 20;
        const newIds = new Set<number>();
        const toDuplicate = items.current.filter((i) => selectedIds.current.has(i.id));
        for (const orig of toDuplicate) {
          const dup: Item = {
            ...orig,
            id: nextId.current++,
            x: orig.x + offset,
            y: orig.y + offset,
          };
          history.current.push(new CreateItemCommand(items.current, dup));
          newIds.add(dup.id);
        }
        selectedIds.current = newIds;
        primarySelectedId.current = newIds.size > 0 ? [...newIds][newIds.size - 1] : null;
        triggerSave();
        return;
      }

      // Arrow keys: nudge selected items
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
        selectedIds.current.size > 0
      ) {
        e.preventDefault();
        const dist = e.shiftKey ? NUDGE_FINE : NUDGE_NORMAL;
        let dx = 0, dy = 0;
        if (e.key === "ArrowUp") dy = -dist;
        if (e.key === "ArrowDown") dy = dist;
        if (e.key === "ArrowLeft") dx = -dist;
        if (e.key === "ArrowRight") dx = dist;

        const entries: { item: Item; oldX: number; oldY: number; newX: number; newY: number }[] = [];
        for (const item of items.current) {
          if (selectedIds.current.has(item.id)) {
            entries.push({
              item,
              oldX: item.x,
              oldY: item.y,
              newX: item.x + dx,
              newY: item.y + dy,
            });
            item.x += dx;
            item.y += dy;
          }
        }
        if (entries.length === 1) {
          const en = entries[0];
          history.current.push(new MoveItemCommand(en.item, en.oldX, en.oldY, en.newX, en.newY));
        } else if (entries.length > 1) {
          history.current.push(new MultiMoveItemsCommand(entries));
        }
        triggerSave();
        return;
      }
    };

    // ── Render loop ───────────────────────────────────────────────────
    const render = (time: number) => {
      if (!ctx || !canvas) return;

      // FPS
      const delta = time - lastFrameTime.current;
      lastFrameTime.current = time;
      fps.current = 0.9 * fps.current + 0.1 * (1000 / Math.max(delta, 0.001));

      // Smooth zoom interpolation
      camera.current.x = lerp(camera.current.x, targetCamera.current.x, ZOOM_LERP_SPEED);
      camera.current.y = lerp(camera.current.y, targetCamera.current.y, ZOOM_LERP_SPEED);
      camera.current.z = lerp(camera.current.z, targetCamera.current.z, ZOOM_LERP_SPEED);

      if (Math.abs(camera.current.z - targetCamera.current.z) < 0.0001) {
        camera.current.x = targetCamera.current.x;
        camera.current.y = targetCamera.current.y;
        camera.current.z = targetCamera.current.z;
      }

      // Clear
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      const bounds = getVisibleBounds(camera.current, logicalWidth, logicalHeight);

      // ── World-space ─────────────────────────────────────────────────
      ctx.save();
      ctx.translate(camera.current.x, camera.current.y);
      ctx.scale(camera.current.z, camera.current.z);

      drawGrid(ctx, camera.current, logicalWidth, logicalHeight);

      // Draw items (frustum-culled)
      for (let i = 0; i < items.current.length; i++) {
        const item = items.current[i];
        if (
          item.x + item.width > bounds.left &&
          item.x < bounds.right &&
          item.y + item.height > bounds.top &&
          item.y < bounds.bottom
        ) {
          drawItem(ctx, item, camera.current.z, item.id === editingIdRef.current);

          if (selectedIds.current.has(item.id)) {
            drawSelectionHighlight(ctx, item, camera.current.z);
            // Only draw resize handles on the primary selected item
            if (item.id === primarySelectedId.current) {
              drawResizeHandles(ctx, item, camera.current.z);
            }
          }
        }
      }

      // Draw marquee rectangle
      if (isDragging.current && dragModeRef.current === "marquee") {
        const mx1 = Math.min(marqueeStart.current.x, marqueeEnd.current.x);
        const my1 = Math.min(marqueeStart.current.y, marqueeEnd.current.y);
        const mw = Math.abs(marqueeEnd.current.x - marqueeStart.current.x);
        const mh = Math.abs(marqueeEnd.current.y - marqueeStart.current.y);

        ctx.fillStyle = "rgba(74, 158, 255, 0.1)";
        ctx.fillRect(mx1, my1, mw, mh);
        ctx.strokeStyle = "rgba(74, 158, 255, 0.6)";
        ctx.lineWidth = 1 / camera.current.z;
        ctx.setLineDash([6 / camera.current.z, 4 / camera.current.z]);
        ctx.strokeRect(mx1, my1, mw, mh);
        ctx.setLineDash([]);
      }

      // Debug overlays
      if (debugMode.current) {
        drawCrosshair(ctx, cursor.current, camera.current.z);
        drawOriginAxes(ctx, camera.current.z);
      }

      ctx.restore();

      // ── Screen-space ────────────────────────────────────────────────
      if (debugMode.current) {
        drawHUD(ctx, fps.current, camera.current.z, cursor.current, logicalWidth);
      }

      reqIdRef.current = requestAnimationFrame(render);
    };

    // ── Subscribe ─────────────────────────────────────────────────────
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    reqIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(reqIdRef.current);
    };
  }, []);

  /**
   * Builds and returns a new item definition (does NOT add to canvas).
   */
  const buildItem = (worldX: number, worldY: number, type: ItemType): Item => {
    const size = DEFAULT_SIZES[type];
    let color: string;

    if (type === "sticky") {
      color = STICKY_COLORS[stickyColorIndex.current % STICKY_COLORS.length];
      stickyColorIndex.current++;
    } else {
      color = SHAPE_COLOR;
    }

    return {
      id: nextId.current++,
      type,
      x: worldX - size.width / 2,
      y: worldY - size.height / 2,
      width: size.width,
      height: size.height,
      color,
      text: "",
    };
  };

  /**
   * Pointer-down handler — dispatches to placement, resize, item drag,
   * marquee selection, or camera pan.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Close context menu on any click
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    // Ignore clicks while editing text
    if (editingItem) return;

    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const tool = activeToolRef.current;

    // ── Placement mode: create a new item via command ────────────────
    if (tool !== "select") {
      const newItem = buildItem(worldPos.x, worldPos.y, tool);
      history.current.push(new CreateItemCommand(items.current, newItem));
      selectedIds.current = new Set([newItem.id]);
      primarySelectedId.current = newItem.id;
      activeToolRef.current = "select";
      setActiveTool("select");
      triggerSave();
      return;
    }

    // ── Select mode ─────────────────────────────────────────────
    // First: check resize handles on the primary selected item
    if (primarySelectedId.current !== null) {
      const selItem = items.current.find((i) => i.id === primarySelectedId.current);
      if (selItem) {
        const handle = hitTestResizeHandle(worldPos.x, worldPos.y, selItem, camera.current.z);
        if (handle) {
          isDragging.current = true;
          dragModeRef.current = "resize";
          activeHandle.current = handle;
          resizeOrigin.current = {
            x: selItem.x,
            y: selItem.y,
            w: selItem.width,
            h: selItem.height,
          };
          return;
        }
      }
    }

    // Then: hit test for items
    const hitItem = hitTestItems(worldPos.x, worldPos.y, items.current);

    if (hitItem) {
      if (e.shiftKey) {
        // Shift+click: toggle this item in/out of the selection
        if (selectedIds.current.has(hitItem.id)) {
          selectedIds.current.delete(hitItem.id);
          if (primarySelectedId.current === hitItem.id) {
            const remaining = [...selectedIds.current];
            primarySelectedId.current = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          }
        } else {
          selectedIds.current.add(hitItem.id);
          primarySelectedId.current = hitItem.id;
        }
        return;
      }

      // Normal click
      if (!selectedIds.current.has(hitItem.id)) {
        selectedIds.current = new Set([hitItem.id]);
        primarySelectedId.current = hitItem.id;
      }

      // Start multi-drag
      isDragging.current = true;
      dragModeRef.current = "item";
      dragStart.current = { ...worldPos };
      multiDragOrigins.current.clear();
      for (const item of items.current) {
        if (selectedIds.current.has(item.id)) {
          multiDragOrigins.current.set(item.id, { x: item.x, y: item.y });
        }
      }
    } else {
      // Click on empty space
      if (!e.shiftKey) {
        selectedIds.current = new Set();
        primarySelectedId.current = null;
        isDragging.current = true;
        dragModeRef.current = "marquee";
        marqueeStart.current = { ...worldPos };
        marqueeEnd.current = { ...worldPos };
      }
    }
  };

  /**
   * Double-click handler — opens the text editor on the clicked item.
   */
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const hitItem = hitTestItems(worldPos.x, worldPos.y, items.current);

    if (hitItem) {
      selectedIds.current = new Set([hitItem.id]);
      primarySelectedId.current = hitItem.id;
      setEditingItem(hitItem);
      editingIdRef.current = hitItem.id;
    }
  };

  /**
   * Right-click handler — shows context menu with relevant actions.
   */
  const onContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const hitItem = hitTestItems(worldPos.x, worldPos.y, items.current);

    const actions: ContextMenuAction[] = [];

    if (hitItem) {
      // Right-clicked on an item: select it if not already
      if (!selectedIds.current.has(hitItem.id)) {
        selectedIds.current = new Set([hitItem.id]);
        primarySelectedId.current = hitItem.id;
      }

      const count = selectedIds.current.size;
      const label = count > 1 ? `Duplicate ${count} Items` : "Duplicate";
      const delLabel = count > 1 ? `Delete ${count} Items` : "Delete";

      actions.push({
        label,
        shortcut: "Ctrl+D",
        action: () => {
          const offset = 20;
          const newIds = new Set<number>();
          const toDup = items.current.filter((i) => selectedIds.current.has(i.id));
          for (const orig of toDup) {
            const dup: Item = {
              ...orig,
              id: nextId.current++,
              x: orig.x + offset,
              y: orig.y + offset,
            };
            history.current.push(new CreateItemCommand(items.current, dup));
            newIds.add(dup.id);
          }
          selectedIds.current = newIds;
          primarySelectedId.current = newIds.size > 0 ? [...newIds][newIds.size - 1] : null;
          triggerSave();
        },
      });

      actions.push({
        label: "Change Color",
        action: () => {
          // Store the screen position for the color picker and close context menu
          setColorPicker({ x: e.clientX, y: e.clientY });
        },
      });

      actions.push({ label: "---", action: () => { } });

      actions.push({
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          selectedIds.current = new Set(items.current.map((i) => i.id));
          primarySelectedId.current = items.current.length > 0
            ? items.current[items.current.length - 1].id
            : null;
        },
      });

      actions.push({ label: "---", action: () => { } });

      actions.push({
        label: delLabel,
        shortcut: "Del",
        danger: true,
        action: () => {
          const toDelete = items.current.filter((i) => selectedIds.current.has(i.id));
          if (toDelete.length === 1) {
            history.current.push(new DeleteItemCommand(items.current, toDelete[0]));
          } else if (toDelete.length > 1) {
            history.current.push(new MultiDeleteItemsCommand(items.current, toDelete));
          }
          selectedIds.current = new Set();
          primarySelectedId.current = null;
          triggerSave();
        },
      });
    } else {
      // Right-clicked on empty space
      actions.push({
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => {
          selectedIds.current = new Set(items.current.map((i) => i.id));
          primarySelectedId.current = items.current.length > 0
            ? items.current[items.current.length - 1].id
            : null;
        },
      });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, actions });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{ display: "block", touchAction: "none", cursor: "grab" }}
      />
      <Toolbar activeTool={activeTool} onToolChange={handleToolChange} />
      {editingItem && (
        <TextEditor
          item={editingItem}
          camera={camera.current}
          onCommit={handleTextCommit}
          onCancel={handleTextCancel}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextMenu.actions}
          onClose={() => setContextMenu(null)}
        />
      )}
      {colorPicker && (
        <ColorPicker
          x={colorPicker.x}
          y={colorPicker.y}
          currentColor={
            primarySelectedId.current !== null
              ? items.current.find((i) => i.id === primarySelectedId.current)?.color
              : undefined
          }
          onSelect={(color) => {
            const targets = items.current.filter((i) => selectedIds.current.has(i.id));
            if (targets.length > 0) {
              history.current.push(new ChangeColorCommand(targets, color));
              triggerSave();
            }
          }}
          onClose={() => setColorPicker(null)}
        />
      )}
    </>
  );
};

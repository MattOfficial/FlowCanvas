/**
 * FlowCanvas — the core infinite canvas component.
 *
 * Renders a full-viewport HTML canvas with:
 *   - Pannable/zoomable camera with smooth zoom interpolation
 *   - Draggable items with selection
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
} from "../utils/commands";
import { loadState, createDebouncedSave } from "../utils/storage";
import { drawGrid } from "../rendering/grid";
import { drawHUD } from "../rendering/hud";
import { drawOriginAxes, drawCrosshair } from "../rendering/debug";
import { drawItem, drawSelectionHighlight, drawResizeHandles, hitTestResizeHandle, RESIZE_CURSORS } from "../rendering/items";
import { Toolbar } from "./Toolbar";
import { TextEditor } from "./TextEditor";

/** Interpolation speed for smooth zoom (0–1, higher = snappier). */
const ZOOM_LERP_SPEED = 0.15;

/** Background color — warm dark neutral. */
const BG_COLOR = "#1a1a2e";

/** Default dimensions for new items by type. */
const DEFAULT_SIZES: Record<ItemType, { width: number; height: number }> = {
  sticky: { width: 200, height: 200 },
  rect: { width: 180, height: 120 },
  ellipse: { width: 160, height: 120 },
};

/** Pastel colors for sticky notes, cycling through these on creation. */
const STICKY_COLORS = ["#FFEB3B", "#FF9800", "#4CAF50", "#2196F3", "#E91E63", "#9C27B0"];

/** Minimum item size when resizing (world-space pixels). */
const MIN_ITEM_SIZE = 40;

/** Default color for rect/ellipse items. */
const SHAPE_COLOR = "rgba(255, 255, 255, 0.08)";

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
  const dragOffset = useRef<Point>({ x: 0, y: 0 });
  /** Original position of an item when drag starts (for MoveItemCommand). */
  const itemDragOrigin = useRef<Point>({ x: 0, y: 0 });

  // ── Resize state ─────────────────────────────────────────────────────
  const activeHandle = useRef<ResizeHandle | null>(null);
  /** Original bounding box when resize drag starts. */
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // ── Selection ───────────────────────────────────────────────────────
  const selectedId = useRef<number | null>(null);

  // ── Text editing (React state — drives TextEditor rendering) ────────
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  /** Ref mirror of editingItem's ID so the render loop can access it. */
  const editingIdRef = useRef<number | null>(null);

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

    // ── Cursor style helper ───────────────────────────────────────
    const updateCursor = (e: PointerEvent) => {
      const tool = activeToolRef.current;

      if (isDragging.current) {
        if (dragModeRef.current === "camera") canvas.style.cursor = "grabbing";
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

      // Check resize handles first on the selected item
      if (selectedId.current !== null) {
        const selItem = items.current.find((i) => i.id === selectedId.current);
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
      } else if (dragModeRef.current === "item" && selectedId.current !== null) {
        const item = items.current.find((i) => i.id === selectedId.current);
        if (item) {
          item.x = cursor.current.x - dragOffset.current.x;
          item.y = cursor.current.y - dragOffset.current.y;
        }
      } else if (dragModeRef.current === "resize" && selectedId.current !== null && activeHandle.current) {
        const item = items.current.find((i) => i.id === selectedId.current);
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
      }
    };

    // ── Pointer: up — finalize drag commands ─────────────────────────
    const handleUp = (e: PointerEvent) => {
      if (isDragging.current && selectedId.current !== null) {
        const item = items.current.find((i) => i.id === selectedId.current);

        if (item && dragModeRef.current === "item") {
          const origin = itemDragOrigin.current;
          if (item.x !== origin.x || item.y !== origin.y) {
            const cmd = new MoveItemCommand(
              item,
              origin.x,
              origin.y,
              item.x,
              item.y,
            );
            history.current.push({
              description: cmd.description,
              execute: () => cmd.execute(),
              undo: () => cmd.undo(),
            });
            triggerSave();
          }
        }

        if (item && dragModeRef.current === "resize") {
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
        if (
          selectedId.current !== null &&
          !items.current.find((i) => i.id === selectedId.current)
        ) {
          selectedId.current = null;
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

      // Delete selected item: Delete or Backspace
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId.current !== null
      ) {
        const item = items.current.find((i) => i.id === selectedId.current);
        if (item) {
          e.preventDefault();
          history.current.push(new DeleteItemCommand(items.current, item));
          selectedId.current = null;
          triggerSave();
        }
        return;
      }

      // Escape — return to select mode
      if (e.key === "Escape") {
        activeToolRef.current = "select";
        setActiveTool("select");
        selectedId.current = null;
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

          if (item.id === selectedId.current) {
            drawSelectionHighlight(ctx, item, camera.current.z);
            drawResizeHandles(ctx, item, camera.current.z);
          }
        }
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
   * Pointer-down handler — dispatches to placement, item drag, or camera pan.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Ignore clicks while editing text
    if (editingItem) return;

    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const tool = activeToolRef.current;

    // ── Placement mode: create a new item via command ────────────────
    if (tool === "sticky" || tool === "rect" || tool === "ellipse") {
      const newItem = buildItem(worldPos.x, worldPos.y, tool);
      history.current.push(new CreateItemCommand(items.current, newItem));
      selectedId.current = newItem.id;
      activeToolRef.current = "select";
      setActiveTool("select");
      triggerSave();
      return;
    }

    // ── Select mode: check resize handles, then items, then camera pan ──
    // First: check if clicking a resize handle on the selected item
    if (selectedId.current !== null) {
      const selItem = items.current.find((i) => i.id === selectedId.current);
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
      selectedId.current = hitItem.id;
      isDragging.current = true;
      dragModeRef.current = "item";
      dragOffset.current = {
        x: worldPos.x - hitItem.x,
        y: worldPos.y - hitItem.y,
      };
      itemDragOrigin.current = { x: hitItem.x, y: hitItem.y };
    } else {
      selectedId.current = null;
      isDragging.current = true;
      dragModeRef.current = "camera";
      dragStart.current = { x: e.clientX, y: e.clientY };
      camStart.current = { x: camera.current.x, y: camera.current.y };
      targetCamera.current.x = camera.current.x;
      targetCamera.current.y = camera.current.y;
    }
  };

  /**
   * Double-click handler — opens the text editor on the clicked item.
   */
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const hitItem = hitTestItems(worldPos.x, worldPos.y, items.current);

    if (hitItem) {
      selectedId.current = hitItem.id;
      setEditingItem(hitItem);
      editingIdRef.current = hitItem.id;
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
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
    </>
  );
};

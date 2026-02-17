/**
 * FlowCanvas — the core infinite canvas component.
 *
 * Renders a full-viewport HTML canvas with:
 *   - Pannable/zoomable camera with smooth zoom interpolation
 *   - Draggable items with selection
 *   - World-space dot grid
 *   - Context-aware cursor styles
 *   - Optional debug overlays (toggle with Ctrl+Shift+D)
 *
 * All mutable state lives in refs to avoid React re-renders — the
 * canvas is driven entirely by a `requestAnimationFrame` loop.
 */

import { useEffect, useRef } from "react";
import type { Camera, DragMode, Item, Point } from "../types";
import { screenToWorld, getVisibleBounds, zoomAtPoint } from "../utils/camera";
import { hitTestItems } from "../utils/hitTest";
import { drawGrid } from "../rendering/grid";
import { drawHUD } from "../rendering/hud";
import { drawOriginAxes, drawCrosshair } from "../rendering/debug";

/** Side length of every item square in world-space pixels. */
const ITEM_SIZE = 50;

/** Interpolation speed for smooth zoom (0–1, higher = snappier). */
const ZOOM_LERP_SPEED = 0.15;

/** Background color — warm dark neutral. */
const BG_COLOR = "#1a1a2e";

/** Linear interpolation between two values. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number>(0);

  // ── Camera ──────────────────────────────────────────────────────────
  /** The camera values currently being rendered (smoothly interpolated). */
  const camera = useRef<Camera>({ x: 100, y: 100, z: 1.5 });
  /** The target camera values (set instantly by input, rendered toward). */
  const targetCamera = useRef<Camera>({ x: 100, y: 100, z: 1.5 });

  // ── Drag state ──────────────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragModeRef = useRef<DragMode>("camera");
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const camStart = useRef<Point>({ x: 0, y: 0 });
  const dragOffset = useRef<Point>({ x: 0, y: 0 });

  // ── Selection ───────────────────────────────────────────────────────
  const selectedId = useRef<number | null>(null);

  // ── Debug mode (toggle with Ctrl+Shift+D) ───────────────────────────
  const debugMode = useRef(false);

  // ── FPS tracking (only active in debug mode) ────────────────────────
  const lastFrameTime = useRef<number>(0);
  const fps = useRef<number>(60);

  // ── World data ──────────────────────────────────────────────────────
  const items = useRef<Item[]>([]);
  const cursor = useRef<Point>({ x: 0, y: 0 });

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
      if (isDragging.current) {
        canvas.style.cursor =
          dragModeRef.current === "camera" ? "grabbing" : "move";
        return;
      }
      const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
      const hover = hitTestItems(worldPos.x, worldPos.y, items.current, ITEM_SIZE);
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
        // Keep target in sync during pan so zoom lerp doesn't fight
        targetCamera.current.x = camera.current.x;
        targetCamera.current.y = camera.current.y;
      } else if (dragModeRef.current === "item" && selectedId.current !== null) {
        const item = items.current.find((i) => i.id === selectedId.current);
        if (item) {
          item.x = cursor.current.x - dragOffset.current.x;
          item.y = cursor.current.y - dragOffset.current.y;
        }
      }
    };

    // ── Pointer: up ───────────────────────────────────────────────────
    const handleUp = (e: PointerEvent) => {
      isDragging.current = false;
      updateCursor(e);
    };

    // ── Wheel: zoom ───────────────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Update the target — the render loop will smoothly interpolate
      targetCamera.current = zoomAtPoint(
        targetCamera.current,
        e.clientX,
        e.clientY,
        e.deltaY,
      );
    };

    // ── Keyboard: debug toggle ────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        debugMode.current = !debugMode.current;
      }
    };

    // ── Render loop ───────────────────────────────────────────────────
    const render = (time: number) => {
      if (!ctx || !canvas) return;

      // FPS calculation (exponential moving average)
      const delta = time - lastFrameTime.current;
      lastFrameTime.current = time;
      fps.current = 0.9 * fps.current + 0.1 * (1000 / Math.max(delta, 0.001));

      // ── Smooth zoom interpolation ─────────────────────────────────
      camera.current.x = lerp(camera.current.x, targetCamera.current.x, ZOOM_LERP_SPEED);
      camera.current.y = lerp(camera.current.y, targetCamera.current.y, ZOOM_LERP_SPEED);
      camera.current.z = lerp(camera.current.z, targetCamera.current.z, ZOOM_LERP_SPEED);

      // Snap when close enough to avoid endless micro-animations
      if (Math.abs(camera.current.z - targetCamera.current.z) < 0.0001) {
        camera.current.x = targetCamera.current.x;
        camera.current.y = targetCamera.current.y;
        camera.current.z = targetCamera.current.z;
      }

      // Reset transform and clear
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Compute visible bounds for frustum culling
      const bounds = getVisibleBounds(camera.current, logicalWidth, logicalHeight);

      // ── World-space drawing (affected by camera) ──────────────────
      ctx.save();
      ctx.translate(camera.current.x, camera.current.y);
      ctx.scale(camera.current.z, camera.current.z);

      drawGrid(ctx, camera.current, logicalWidth, logicalHeight);

      // Draw items (only those within the viewport)
      for (let i = 0; i < items.current.length; i++) {
        const item = items.current[i];
        if (
          item.x + ITEM_SIZE > bounds.left &&
          item.x < bounds.right &&
          item.y + ITEM_SIZE > bounds.top &&
          item.y < bounds.bottom
        ) {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);

          // Selection highlight
          if (item.id === selectedId.current) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4 / camera.current.z;
            ctx.strokeRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);
          }
        }
      }

      // ── Debug overlays (only when debug mode is active) ───────────
      if (debugMode.current) {
        drawCrosshair(ctx, cursor.current, camera.current.z);
        drawOriginAxes(ctx, camera.current.z);
      }

      ctx.restore();

      // ── Screen-space drawing ──────────────────────────────────────
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

    // ── Cleanup ───────────────────────────────────────────────────────
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
   * Pointer-down handler — determines whether the user clicked an item
   * (start item drag) or empty space (start camera pan).
   */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY, camera.current);
    const hitItem = hitTestItems(worldPos.x, worldPos.y, items.current, ITEM_SIZE);

    if (hitItem) {
      selectedId.current = hitItem.id;
      isDragging.current = true;
      dragModeRef.current = "item";
      dragOffset.current = {
        x: worldPos.x - hitItem.x,
        y: worldPos.y - hitItem.y,
      };
    } else {
      selectedId.current = null;
      isDragging.current = true;
      dragModeRef.current = "camera";
      dragStart.current = { x: e.clientX, y: e.clientY };
      camStart.current = { x: camera.current.x, y: camera.current.y };
      // Sync target on pan start
      targetCamera.current.x = camera.current.x;
      targetCamera.current.y = camera.current.y;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      style={{ display: "block", touchAction: "none", cursor: "grab" }}
    />
  );
};

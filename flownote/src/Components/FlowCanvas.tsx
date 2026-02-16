import { useEffect, useRef } from "react";

type Item = {
  id: number;
  x: number;
  y: number;
  color: string;
};

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number>(0);

  // We start zoomed in (1.5x) and panned slightly (100px)
  const camera = useRef({ x: 100, y: 100, z: 1.5 });

  // Refs to track camera drag
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const camStart = useRef({ x: 0, y: 0 });

  // Tracking FPS
  const lastFrameTime = useRef<number>(0);
  const fps = useRef<number>(60);

  // Holds array of items to stress test system
  const items = useRef<Item[]>([]);

  // Interaction State
  const selectedId = useRef<number | null>(null);
  const dragMode = useRef<"camera" | "item">("camera");
  const dragOffset = useRef({ x: 0, y: 0 }); // Stores the offset from item top-left

  // MISSING REF 1: Track cursor in World Space
  const cursor = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Helper: Screen -> World Conversion ---
    // MISSING FUNCTION 2: Defined inside useEffect so listeners can use it
    const screenToWorld = (screenX: number, screenY: number) => {
      return {
        x: (screenX - camera.current.x) / camera.current.z,
        y: (screenY - camera.current.y) / camera.current.z,
      };
    };

    // --- Resize Logic ---
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    // --- Interaction Handlers ---
    const handleMove = (e: PointerEvent) => {
      // Update cursor for debug UI
      const worldPos = screenToWorld(e.clientX, e.clientY);
      cursor.current = { x: worldPos.x, y: worldPos.y };

      if (!isDragging.current) return;

      // BRANCH LOGIC BASED ON MODE
      if (dragMode.current === "camera") {
        // --- Pan Camera ---
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        camera.current.x = camStart.current.x + dx;
        camera.current.y = camStart.current.y + dy;
      } else if (dragMode.current === "item" && selectedId.current !== null) {
        // --- Drag Item ---
        const item = items.current.find((i) => i.id === selectedId.current);
        if (item) {
          // Apply the reverse offset logic
          item.x = worldPos.x - dragOffset.current.x;
          item.y = worldPos.y - dragOffset.current.y;
        }
      }
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    const drawGrid = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
    ) => {
      const zoom = camera.current.z;
      const panX = camera.current.x;
      const panY = camera.current.y;

      const startX = (0 - panX) / zoom;
      const endX = (width - panX) / zoom;
      const startY = (0 - panY) / zoom;
      const endY = (height - panY) / zoom;

      const gridSize = 50;

      const minX = Math.floor(startX / gridSize) * gridSize;
      const maxX = Math.ceil(endX / gridSize) * gridSize;
      const minY = Math.floor(startY / gridSize) * gridSize;
      const maxY = Math.ceil(endY / gridSize) * gridSize;

      ctx.beginPath();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1 / zoom;

      for (let x = minX; x <= maxX; x += gridSize) {
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
      }

      for (let y = minY; y <= maxY; y += gridSize) {
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
      }

      ctx.stroke();
    };

    // Generate 1000 items if empty
    if (items.current.length === 0) {
      const colors = [
        "#ff5555",
        "#55ff55",
        "#5555ff",
        "#ffff55",
        "#ff55ff",
        "#55ffff",
      ];
      for (let i = 0; i < 1000; i++) {
        items.current.push({
          id: i,
          x: Math.random() * 4000 - 2000,
          y: Math.random() * 4000 - 2000,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    // --- The Render Loop ---
    const render = (time: number) => {
      if (!ctx || !canvas) return;

      const delta = time - lastFrameTime.current;
      lastFrameTime.current = time;

      const currentFPS = 1000 / Math.max(delta, 0.001);
      fps.current = 0.9 * fps.current + 0.1 * currentFPS;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      const zoom = camera.current.z;
      const panX = camera.current.x;
      const panY = camera.current.y;

      const viewLeft = -panX / zoom;
      const viewTop = -panY / zoom;
      const viewRight = (logicalWidth - panX) / zoom;
      const viewBottom = (logicalHeight - panY) / zoom;

      ctx.save();
      ctx.translate(camera.current.x, camera.current.y);
      ctx.scale(camera.current.z, camera.current.z);

      drawGrid(ctx, logicalWidth, logicalHeight);

      const itemSize = 50;
      const totalItems = items.current.length;
      const allItems = items.current;

      for (let i = 0; i < totalItems; i++) {
        const item = allItems[i];

        if (
          item.x + itemSize > viewLeft &&
          item.x < viewRight &&
          item.y + itemSize > viewTop &&
          item.y < viewBottom
        ) {
          ctx.fillStyle = item.color;
          ctx.fillRect(item.x, item.y, itemSize, itemSize);
          if (item.id === selectedId.current) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4 / zoom; // Keep border consistent visually
            ctx.strokeRect(item.x, item.y, itemSize, itemSize);
          }
        }
      }

      // Draw Crosshair at Mouse
      ctx.beginPath();
      ctx.moveTo(cursor.current.x - 10, cursor.current.y);
      ctx.lineTo(cursor.current.x + 10, cursor.current.y);
      ctx.moveTo(cursor.current.x, cursor.current.y - 10);
      ctx.lineTo(cursor.current.x, cursor.current.y + 10);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Draw Origin
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(100, 0);
      ctx.strokeStyle = "#ff5555";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(0, 100);
      ctx.strokeStyle = "#55ff55";
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      ctx.fillStyle = "#5588ff";
      ctx.fillRect(50, 50, 50, 50);

      ctx.restore();

      // Draw UI
      ctx.fillStyle = "#00ff00";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`FPS: ${Math.round(fps.current)}`, logicalWidth - 80, 25);
      ctx.fillText(
        `Zoom: ${camera.current.z.toFixed(2)}x`,
        logicalWidth - 80,
        45,
      );
      ctx.fillText(
        `World: ${Math.round(cursor.current.x)}, ${Math.round(cursor.current.y)}`,
        logicalWidth - 250,
        85,
      );

      reqIdRef.current = requestAnimationFrame(render);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const oldZoom = camera.current.z;
      const worldX = (mouseX - camera.current.x) / oldZoom;
      const worldY = (mouseY - camera.current.y) / oldZoom;
      const zoomFactor = Math.exp(-e.deltaY * 0.001);
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * zoomFactor));
      camera.current.x = mouseX - worldX * newZoom;
      camera.current.y = mouseY - worldY * newZoom;
      camera.current.z = newZoom;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    reqIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(reqIdRef.current);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const zoom = camera.current.z;
    const worldX = (e.clientX - camera.current.x) / zoom;
    const worldY = (e.clientY - camera.current.y) / zoom;

    let hitItem: Item | null = null;
    const allItems = items.current;
    const size = 50;

    for (let i = allItems.length - 1; i >= 0; i--) {
      const item = allItems[i];
      if (
        worldX >= item.x &&
        worldX <= item.x + size &&
        worldY >= item.y &&
        worldY <= item.y + size
      ) {
        hitItem = item;
        break;
      }
    }

    if (hitItem) {
      selectedId.current = hitItem.id;
      isDragging.current = true;
      dragMode.current = "item";
      dragOffset.current = {
        x: worldX - hitItem.x,
        y: worldY - hitItem.y,
      };
    } else {
      selectedId.current = null;
      isDragging.current = true;
      dragMode.current = "camera";
      dragStart.current = { x: e.clientX, y: e.clientY };
      camStart.current = { x: camera.current.x, y: camera.current.y };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      style={{ display: "block", touchAction: "none" }}
    />
  );
};

import { useEffect, useRef } from "react";

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqIdRef = useRef<number>(0);

  // We start zoomed in (1.5x) and panned slightly (100px)
  const camera = useRef({ x: 100, y: 100, z: 1.5 });

  // We track if we are dragging, where we started interacting, and where the camera was
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const camStart = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Resize Logic (same as before) ---
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    // We put move/up on window so we don't lose the drag if cursor leaves canvas
    const handleMove = (e: PointerEvent) => {
      if (!isDragging.current) return;

      // Calculate how far we moved since the "down" event
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      // Apply that difference to the *initial* camera position
      camera.current.x = camStart.current.x + dx;
      camera.current.y = camStart.current.y + dy;
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

      // Determine the visible world bounds
      // We divide by zoom to convert Screen Pixels -> World Units
      const startX = (0 - panX) / zoom;
      const endX = (width - panX) / zoom;
      const startY = (0 - panY) / zoom;
      const endY = (height - panY) / zoom;

      const gridSize = 50; // Distance between lines

      // Calculate the first grid line index to draw
      // e.g. if startX is 120, and grid is 50, we start at 100 (2 * 50)
      const minX = Math.floor(startX / gridSize) * gridSize;
      const maxX = Math.ceil(endX / gridSize) * gridSize;
      const minY = Math.floor(startY / gridSize) * gridSize;
      const maxY = Math.ceil(endY / gridSize) * gridSize;

      ctx.beginPath();
      ctx.strokeStyle = "#333"; // Dark grey lines
      ctx.lineWidth = 1 / zoom; // Keep lines 1px wide regardless of zoom!

      // Vertical lines
      for (let x = minX; x <= maxX; x += gridSize) {
        ctx.moveTo(x, minY);
        ctx.lineTo(x, maxY);
      }

      // Horizontal lines
      for (let y = minY; y <= maxY; y += gridSize) {
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
      }

      ctx.stroke();
    };

    // --- The Render Loop ---
    const render = () => {
      if (!ctx || !canvas) return;

      // Reset to default identity matrix (scaled by dpr)
      // This undoes the camera transform from the previous frame
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // --- 2. Apply Camera Transform (World Space) ---
      ctx.save(); // Save "Screen Space" state

      // Translate first (Pan)
      ctx.translate(camera.current.x, camera.current.y);
      // Scale second (Zoom)
      ctx.scale(camera.current.z, camera.current.z);

      drawGrid(ctx, logicalWidth, logicalHeight);

      // --- 3. Draw World Content ---
      // Draw the "Origin" (0,0) marker

      // X Axis (Red)
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(100, 0);
      ctx.strokeStyle = "#ff5555";
      ctx.lineWidth = 2; // Becomes 3px visual width at 1.5x zoom
      ctx.stroke();

      // Y Axis (Green)
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(0, 100);
      ctx.strokeStyle = "#55ff55";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Reference box at (50, 50)
      ctx.fillStyle = "#5588ff";
      ctx.fillRect(50, 50, 50, 50);

      ctx.restore(); // Restore to clean state for next operations (if any)

      reqIdRef.current = requestAnimationFrame(render);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Stop the browser from scrolling the page

      // 1. Get mouse position relative to the canvas
      // (We assume canvas is top-left 0,0 for now. If not, we'd need getBoundingClientRect)
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 2. Calculate World Point BEFORE zoom
      const oldZoom = camera.current.z;
      const worldX = (mouseX - camera.current.x) / oldZoom;
      const worldY = (mouseY - camera.current.y) / oldZoom;

      // 3. Determine New Zoom
      // DeltaY is usually +/- 100. We scale it down to a factor like 1.1 or 0.9
      const zoomFactor = Math.exp(-e.deltaY * 0.001);
      // Clamp zoom to reasonable limits (e.g., 0.1x to 10x)
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * zoomFactor));

      // 4. Calculate New Pan to keep the world point fixed
      // Screen = World * Zoom + Pan  =>  Pan = Screen - (World * Zoom)
      camera.current.x = mouseX - worldX * newZoom;
      camera.current.y = mouseY - worldY * newZoom;
      camera.current.z = newZoom;
    };

    // Initialize
    resize();
    render(); // Start the loop

    // Event Listeners
    window.addEventListener("resize", resize);

    window.addEventListener("pointermove", handleMove); // <--- NEW
    window.addEventListener("pointerup", handleUp); // <--- NEW
    // Add Wheel listener with { passive: false } so we can preventDefault()
    canvas.addEventListener("wheel", handleWheel, { passive: false }); // <--- NEW

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handleMove); // <--- NEW
      window.removeEventListener("pointerup", handleUp); // <--- NEW
      canvas.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(reqIdRef.current); // Stop the loop!
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDragging.current = true;

    // Record where the mouse is NOW
    dragStart.current = { x: e.clientX, y: e.clientY };

    // Record where the camera is NOW
    camStart.current = { x: camera.current.x, y: camera.current.y };
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown} // <--- NEW
      style={{ display: "block", touchAction: "none" }} // touch-action: none prevents scrolling on mobile
    />
  );
};

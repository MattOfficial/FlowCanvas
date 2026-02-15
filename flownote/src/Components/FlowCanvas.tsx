import { useEffect, useRef } from "react";

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Store the animation frame ID so we can cancel it on unmount
  const reqIdRef = useRef<number>(0);

  // 2. Mutable state for the "Scene" (Phase 1 will expand this)
  // We use a ref so changing it doesn't trigger React renders
  const frameCount = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Resize Logic (same as before) ---
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    // --- The Render Loop ---
    const render = () => {
      // 0. Safety check (context might be lost)
      if (!ctx || !canvas) return;

      // 1. Clear the entire screen (in logical pixels)
      // Note: We use the canvas.width / dpr to get logical width because we scaled the context
      const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      // 2. Draw Background
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // 3. Draw Test Animation (Moving Box)
      frameCount.current++;
      const t = frameCount.current * 0.02; // Time factor

      const x = 100 + Math.cos(t) * 50;
      const y = 100 + Math.sin(t) * 50;

      ctx.fillStyle = "#ff0055";
      ctx.fillRect(x, y, 50, 50);

      // 4. Request the next frame
      reqIdRef.current = requestAnimationFrame(render);
    };

    // Initialize
    resize();
    render(); // Start the loop

    // Event Listeners
    window.addEventListener("resize", resize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(reqIdRef.current); // Stop the loop!
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
};

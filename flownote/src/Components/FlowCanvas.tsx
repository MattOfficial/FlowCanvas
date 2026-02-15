import { useEffect, useRef } from "react";

export const FlowCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      // 1. Get the logical size of the window
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 2. Get the device pixel ratio (1 on standard, 2+ on retina)
      const dpr = window.devicePixelRatio || 1;

      // 3. Set the "actual" size of the canvas buffer (physical pixels)
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // 4. Set the "display" size via CSS (logical pixels)
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // 5. Scale the context so we can draw in logical coordinates
      ctx.scale(dpr, dpr);

      // --- Test Draw ---
      // Clear screen
      ctx.fillStyle = "#1e1e1e";
      ctx.fillRect(0, 0, width, height);

      // Draw a sharp red line to prove high-DPI works
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(250, 250);
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 2; // Will physically be 4px on DPR=2
      ctx.stroke();
    };

    // Initial resize
    resize();

    // Listen for window resize
    window.addEventListener("resize", resize);

    // Cleanup listener on unmount
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block" }} // Removes inline-block scrollbar weirdness
    />
  );
};

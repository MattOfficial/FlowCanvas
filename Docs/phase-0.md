# 📝 Phase 0: Foundations & Architecture

Goal: Establish a high-performance, pixel-perfect HTML5 Canvas shell in React.

## 1. Canvas vs. DOM

**DOM (Retained Mode):** You give the browser elements (div, svg), and it handles the pixels. Good for layout and text.

**Canvas (Immediate Mode):** You command the browser to draw pixels frame-by-frame. You are responsible for layout, hit-testing, and optimizations.

## 2. High DPI (Retina) Rendering

**Problem:** One CSS pixel (logical) can map to multiple physical screen pixels. A standard `<canvas width="500">` looks blurry on Retina screens because the browser stretches the image.

**Solution:**

**Buffer Size:** Set canvas.width = clientWidth \* window.devicePixelRatio.

**Display Size:** Set canvas.style.width = clientWidth + 'px'.

**Context Scale:** ctx.scale(dpr, dpr) to normalize drawing operations to logical coordinates.

## 3. The Render Loop

**Mechanism:** requestAnimationFrame(callback) syncs updates to the monitor's refresh rate (usually 60Hz), preventing screen tearing and saving battery when the tab is inactive.

**Cleanup:** Always store the request ID (reqIdRef.current) and call cancelAnimationFrame on component unmount to prevent memory leaks ("zombie loops").

## 4. React Integration

**Performance Rule:** Never store high-frequency data (mouse coordinates, camera position, frame count) in `useState`.

Why? `useState` triggers a React Commit/Render pass. Doing this 60 times a second kills performance.

**Fix:** Use `useRef` for mutable render state. It updates instantly without notifying React.

# 🧠 Interview Checkpoints

<div style="color:cyan;font-weight:bold;">Q: Why do we scale the canvas context by devicePixelRatio?</div>

<div style="color:wheat;font-weight:400;">A: To ensure drawing commands (like rect(0,0,10,10)) map 1:1 with CSS logical pixels, while the backing store maintains high-resolution physical pixels for crisp rendering.</div>

<div style="color:cyan;font-weight:bold;">Q: Why use useRef instead of useState for the camera position?</div>

<div style="color:wheat;font-weight:400;">A: To avoid triggering React's reconciliation process on every frame (60fps), which would cause significant CPU overhead and dropped frames.</div>

<div style="color:cyan;font-weight:bold;">Q: What happens if you change canvas.width?</div>

<div style="color:wheat;font-weight:400;">A: It clears the canvas pixels and resets the context state (transforms, styles) back to default.</div>

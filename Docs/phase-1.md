### 📝 Phase 1: The Infinite Canvas

**Goal:** Break free from the screen bounds by implementing a 2D Camera (Pan + Zoom) and an infinite background grid.

#### 1. The Camera Model (Coordinate Systems)

We separated two distinct coordinate spaces:

- **Screen Space:** The physical pixels on the monitor (0,0 is top-left of the canvas).
- **World Space:** The infinite plane where our content lives.

**The Transform Matrix:**
We apply transforms in this specific order to simplify panning:

1. **Translate (Pan):** Moves the origin.
2. **Scale (Zoom):** Scales relative to the _new_ origin.

- **Why this order?** It allows 1:1 panning. Moving the mouse 10px moves the world 10px on the screen, regardless of zoom level. If we scaled first, panning would feel "slippery" or too fast/slow depending on the zoom.

#### 2. Interaction Math

**Dragging (Pan):**

- **Strategy:** "Delta from Start".
- **On Down:** Record `StartMouse` and `StartCamera`.
- **On Move:** `CurrentCamera = StartCamera + (CurrentMouse - StartMouse)`.
- **Implementation:** Attach `pointermove` to `window` (not canvas) so the drag doesn't break if the user moves the mouse outside the browser window.

**Zooming (Zoom-to-Cursor):**

- **Goal:** Keep the point under the mouse stationary in World Space.
- **The Algorithm:**

1. Calculate **World Mouse** _before_ zoom:
2. Calculate **New Pan**:
3. This effectively "slides" the world so that ends up back under the mouse pointer after scaling.

#### 3. Rendering The Infinite Grid

We cannot draw infinite lines. We use **Culling** to draw only what is visible.

- **View Bounds:** We calculate the visible World Start/End coordinates:
-
-

- **Grid Snapping:** We use `Math.floor` to snap the starting line to the nearest grid interval. This prevents lines from "swimming" or sticking to the screen edge while panning.
- **Line Width:** We set `ctx.lineWidth = 1 / Zoom`. This counteracts the global scale transform, ensuring grid lines remain exactly 1 logical pixel wide on screen, even when zoomed in 10x.

---

### 🧠 Interview Checkpoints

- **Q: Why do we attach `pointermove` to `window`?**
- **A:** To capture events even if the cursor leaves the canvas or the browser window (capture phase), preventing the "stuck drag" bug.

- **Q: How do you keep lines sharp while zooming?**
- **A:** By scaling the line width inversely to the zoom level (`1 / zoom`).

- **Q: What is "Culling" in 2D?**
- **A:** Calculating the visible viewport bounds (AABB) and only issuing draw commands for objects that intersect those bounds.

---

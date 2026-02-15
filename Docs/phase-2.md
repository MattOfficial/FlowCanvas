# 📝 Phase 2: High-Performance Rendering

**Goal:** Maintain a buttery smooth 60fps even when the world contains thousands of objects.

#### 1. Performance Monitoring (FPS)

We cannot optimize what we cannot measure.

- **The Metric:** We calculate the time difference (`delta`) between the current frame and the previous frame.
-

- **Smoothing:** Instant FPS jitters wildly. We use a **Weighted Moving Average** to make it readable:
- `fps = 0.9 * oldFPS + 0.1 * newFPS`

- **Zombie Loops:** A common bug where `cancelAnimationFrame` isn't called on cleanup, leaving multiple render loops running in the background (causing FPS to report 200+ or 400+).

#### 2. Frustum Culling (The Viewport Check)

Naive rendering draws every object in the array, even if it's miles off-screen. This chokes the GPU.

- **The Solution:** Only issue draw commands for objects currently inside the camera's view.
- **The Math:** Calculate the **World View Bounds** once per frame:
- `Left = (0 - PanX) / Zoom`
- `Right = (ScreenWidth - PanX) / Zoom`

- **The Check:** An Axis-Aligned Bounding Box (AABB) intersection test.
- `if (Item.Right > View.Left && Item.Left < View.Right ...)`

- **Result:** We can have 10,000 items in memory, but if we only see 50, we only draw 50.

#### 3. Micro-Optimizations (Garbage Collection)

In a 60hz loop, you have ~16ms to do everything.

- **The Enemy:** **Garbage Collection (GC)**. If you create new objects or arrays _inside_ the loop (allocations), the browser eventually pauses execution to clean up memory, causing visual "stutter."
- **The Fixes:**

1. **Hoist Constants:** Move `const size = 50` outside the loop.
2. **Avoid Array Methods:** `forEach` creates a callback function context for every item. A standard `for (let i=0...)` loop is faster and allocates less memory in hot paths.
3. **Stable References:** Store data in `useRef` or outside React state to prevent React from re-allocating closures.

---

### 🧠 Interview Checkpoints

- **Q: How do you handle 10,000 items on a canvas without lag?**
- **A:** By implementing **Frustum Culling** to ensure we only draw items visible in the viewport. For even larger datasets (100k+), I would use a **Spatial Index** like a Quadtree to skip iterating over off-screen items entirely.

- **Q: Why is `for` preferred over `forEach` in a render loop?**
- **A:** `forEach` invokes a function call for every element, adding overhead to the call stack. A `for` loop is raw iteration, which is faster and reduces scope allocations that trigger Garbage Collection.

- **Q: What causes "GC Thrashing" or stutter in canvas apps?**
- **A:** Allocating memory (objects, vectors, closures) inside the render loop. The GC has to pause the main thread to reclaim that memory, causing frame drops.

---

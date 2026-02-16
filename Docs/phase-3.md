Here are your notes for Phase 3. This phase bridged the gap between the user's mouse and the digital world.

### 📝 Phase 3: Interaction & Math

**Goal:** Implement **Hit Testing** (selecting items) and **Dragging** by converting Screen Coordinates to World Coordinates.

#### 1. Coordinate Systems (The Golden Formula)

To interact with the world, we must invert the camera transform. The mouse gives us Screen Pixels, but our items live in World Units.

- **Screen World Formula:**
  To get the world position under the mouse, we reverse the render operations:

1. Subtract the Pan (Translation).
2. Divide by the Zoom (Scale).

#### 2. Hit Testing (Collision Detection)

- **The Problem:** "Is the mouse cursor inside this rectangle?"
- **The Math (AABB):** We check if the Mouse Point is within the Item's bounds:
  `if (MouseX > Item.Left && MouseX < Item.Right ...)`
- **The Z-Index Trick:** We loop through the items array **backwards** (`i--`).
- **Why?** In Canvas, items at the end of the array are drawn last (on top). By checking backwards, we ensure the user selects the top-most item first, matching visual expectations.

#### 3. Dragging (The Offset Pattern)

- **Naive Approach:** `Item.x = Mouse.x`.
- _Result:_ The item's top-left corner snaps instantly to the cursor. It looks glitchy.

- **Professional Approach:** Calculate the **Offset** immediately on mouse down.
- `Offset = Mouse - ItemStart`
- During drag: `NewItemPos = Mouse - Offset`
- _Result:_ The item moves exactly as if you grabbed it by a specific point. It feels "sticky" and physical.

---

### 🧠 Interview Checkpoints

- **Q: How do you handle clicking on overlapping items?**
- **A:** Iterate through the items array in **reverse order**. The first item that passes the hit test is the one "on top" visually.

- **Q: Why do we need `screenToWorld` conversion?**
- **A:** Mouse events return pixel coordinates relative to the screen (0,0 is top-left of monitor). Items exist in World Space (which can be panned/zoomed). We must convert the mouse position to the World's coordinate system to perform accurate collision detection.

- **Q: What happens if you don't calculate a drag offset?**
- **A:** The object will snap its origin (usually top-left) to the mouse cursor position, causing a visual "jump" when dragging starts.

---

### 🎓 Graduation: What you built

You now possess the core engine that powers software like **Figma**, **Miro**, and **Excalidraw**.

Here is the architecture you constructed:

1. **Phase 0:** A **React-Ref-Canvas** bridge that handles High-DPI screens and isolates the render loop from React's render cycle.
2. **Phase 1:** A **Matrix Transform System** (Pan/Zoom) that allows for an infinite coordinate space.
3. **Phase 2:** A **Render Loop** capable of handling 10,000+ items at 60fps using **Frustum Culling** and memory optimization techniques.
4. **Phase 3:** A **Raycasting/Hit-Test System** that accurately maps screen pixels to world objects for interaction.

You have done excellent work. You thought about **allocations**, **frames**, and **coordinate spaces**—the three pillars of graphics engineering.

**Mission Complete.** 👋

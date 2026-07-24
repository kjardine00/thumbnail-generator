# Shape Outline Canvas — Project TODO

Randomly place shape outlines on a sized canvas, shuffle them, and export a correctly scaled PNG.

---

## 1. Domain model & data structures

Define pure types first so UI and export share one source of truth.

- [ ] **`CanvasSpec`**
  - Physical size: `widthIn`, `heightIn`
  - Export DPI (default `300` for print-quality PNGs)
  - Derived: `widthPx` / `heightPx` = inches × DPI
  - Display scale: how many CSS pixels represent one inch on screen (or “fit to viewport”)
  - Background color
  - Options: `showOverflow` (draw parts of shapes outside the canvas bounds in the preview)
- [ ] **`ShapeType`** — start with `circle | square | triangle`; leave room for more (`ellipse`, `hexagon`, `star`, etc.)
- [ ] **`ShapeInstance`**
  - `id`, `type`
  - Position: `x`, `y` in **canvas pixel space** (export coords), not screen coords
  - Size: e.g. `size` (bounding box) or type-specific (`radius`, `width`/`height`)
  - `rotation` (degrees or radians — pick one and stick to it)
  - Style: `strokeColor`, `strokeWidth` (in canvas px, or in inches then convert)
- [ ] **`ShapeRequest` / sidebar config** — per-type quantity (or total count + type mix)
- [ ] **`PlacementConstraints`**
  - Min/max size (inches or px)
  - Rotation range (e.g. 0–360)
  - Rule: at least some portion of each shape must intersect the canvas (partial off-canvas OK)
- [ ] **`AppState`** — canvas + list of `ShapeInstance` + UI flags; keep generation pure so shuffle = regenerate from config + seed

---

## 2. Coordinate & scale system (critical)

Screen preview must look small; export must match physical inches × DPI.

- [ ] Pick a single **canonical space**: canvas pixels at export DPI
- [ ] Preview: render at `displayScale` (fit width/height into viewport while preserving aspect ratio)
- [ ] Convert UI interactions (if any later) from screen → canvas coords via `1 / displayScale`
- [ ] Stroke width: decide whether it scales with DPI (recommended: define in inches or “points”, convert to px at export DPI so print weight looks right)
- [ ] Document the formula somewhere in code comments:  
  `exportPx = inches * dpi`, `previewCssPx = exportPx * (previewInchesPerCssInch / dpi)` or fit-to-box

---

## 3. Shape geometry & placement

- [ ] Pure functions: path / draw for each `ShapeType` given center, size, rotation
- [ ] **Random placement algorithm**
  - Sample position, size, rotation within constraints
  - Reject or nudge if shape does **not** intersect the canvas AABB (keep partial overlaps)
  - Allow full overlaps between shapes
- [ ] **Shuffle** — regenerate all instance transforms (position, size, rotation) from current quantity config; optionally keep a `seed` for reproducible shuffles later
- [ ] Decide origin convention: top-left vs center of shape (center + rotation is usually simpler)

---

## 4. Rendering (preview)

- [ ] Landing page: full-height layout with **sidebar** + **canvas stage**
- [ ] Choose renderer: **SVG** (easy outlines + overflow) or **Canvas 2D** (closer to export). Prefer one path that both preview and export can share, or SVG preview + Canvas export from the same `ShapeInstance[]`
- [ ] Draw outlines only (no fill), unless a fill toggle is added later
- [ ] **Overflow toggle**
  - On: show a larger stage / clip-path off so off-canvas strokes are visible (e.g. dimmed outside a canvas frame)
  - Off: clip drawing to the canvas rectangle
- [ ] Visual canvas frame (border/shadow) so the printable area is obvious when overflow is on
- [ ] Responsive: canvas fits viewport; sidebar collapses or stacks on small screens

---

## 5. Sidebar / controls

- [ ] Shape list with quantity inputs (Circle, Triangle, Square, …)
- [ ] Canvas size inputs: width × height in **inches** (decimals OK, e.g. 8.5 × 11)
- [ ] Optional presets: Letter, A4, Square, Custom
- [ ] DPI selector (or advanced section; default 300)
- [ ] Min/max shape size controls
- [ ] Stroke color + stroke width
- [ ] Background color
- [ ] **Shuffle** button
- [ ] **Show overflow** toggle
- [ ] **Export PNG** button
- [ ] Show live readout: physical size, export pixel size, and current preview scale (so inches don’t feel mysterious)

---

## 6. PNG export

- [ ] Build offscreen canvas at full `widthPx × heightPx`
- [ ] Draw background, then each shape in canvas pixel space (ignore `showOverflow` for export — clip to bounds)
- [ ] Download as `.png` with a sensible filename (`canvas-8.5x11-300dpi.png` or timestamp)
- [ ] Verify: exported pixel dimensions === `round(inches * dpi)`
- [ ] Handle large exports (e.g. 11×17 @ 300 DPI) — memory limits, disable button or warn if too big

---

## 7. App shell & UX polish

- [ ] Empty state: no shapes yet → prompt to set quantities and shuffle/generate
- [ ] Auto-generate on first load with sensible defaults (e.g. a few of each shape on Letter)
- [ ] Disable export when there are zero shapes
- [ ] Loading / busy state during shuffle or large export
- [ ] Keyboard: Enter to shuffle when focused in sidebar (nice-to-have)
- [ ] Basic a11y: labels on inputs, button names, focus order

---

## 8. Project setup (Next.js)

- [ ] Read current Next.js docs under `node_modules/next/dist/docs/` before adding APIs
- [ ] Client component(s) for interactive canvas (mark `"use client"` where needed)
- [ ] Folder layout suggestion:
  - `lib/types.ts` — domain types
  - `lib/geometry.ts` — shape paths / intersection helpers
  - `lib/placement.ts` — random placement + shuffle
  - `lib/exportPng.ts` — rasterize + download
  - `components/Sidebar.tsx`, `CanvasStage.tsx`, etc.
- [ ] Keep generation/export logic testable and free of React where possible

---

## 9. Stretch / later (optional)

- [ ] More shapes (pentagon, hexagon, star, line, rounded rect)
- [ ] Seeded RNG + “copy seed” for sharing layouts
- [ ] Undo / redo shuffle
- [ ] Lock individual shapes while shuffling the rest
- [ ] Drag / rotate shapes manually after generation
- [ ] Export SVG as well as PNG
- [ ] Fill color toggle, dashed strokes
- [ ] Save/load config as JSON
- [ ] Print CSS (`@media print`) using physical inches

---

## Suggested build order

1. Types + inches↔px + display scale helpers  
2. Geometry + placement (unit-test intersection / partial off-canvas)  
3. Preview renderer + overflow clip toggle  
4. Sidebar controls wired to state  
5. Shuffle  
6. PNG export at real DPI  
7. Presets, polish, edge cases  

---

## Open decisions (resolve as you build)

| Topic | Options / note |
| --- | --- |
| Preview tech | SVG vs Canvas 2D vs both |
| Size model | Single `size` vs width/height per shape |
| Quantity UX | Per-type counts vs total + random type mix |
| Stroke units | Inches vs CSS px vs export px |
| Default canvas | e.g. 8.5×11 in @ 300 DPI, fit preview to ~min(90vw, 70vh) |
| Overflow styling | Dim outside region vs hide entirely when toggle off |

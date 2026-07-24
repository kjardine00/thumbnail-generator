import type { ShapeInstance, ShapeType } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function rotatePoint(x: number, y: number, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** Local (pre-rotation) outline points centered at origin. */
export function localOutlinePoints(type: ShapeType, size: number): Point[] {
  const h = size / 2;
  switch (type) {
    case "square":
      return [
        { x: -h, y: -h },
        { x: h, y: -h },
        { x: h, y: h },
        { x: -h, y: h },
      ];
    case "triangle": {
      // Equilateral triangle inscribed in the size×size box.
      const height = (Math.sqrt(3) / 2) * size;
      const top = -height / 2;
      const bottom = height / 2;
      return [
        { x: 0, y: top },
        { x: h, y: bottom },
        { x: -h, y: bottom },
      ];
    }
    case "circle":
      // Polygon approximation for bounds / optional path fallback.
      return Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        return { x: Math.cos(a) * h, y: Math.sin(a) * h };
      });
  }
}

export function worldOutlinePoints(shape: ShapeInstance): Point[] {
  return localOutlinePoints(shape.type, shape.size).map((p) => {
    const r = rotatePoint(p.x, p.y, shape.rotation);
    return { x: r.x + shape.x, y: r.y + shape.y };
  });
}

/** Axis-aligned bounds of the rotated shape (geometry only, ignoring stroke). */
export function shapeBounds(shape: ShapeInstance): Rect {
  if (shape.type === "circle") {
    const r = shape.size / 2;
    return {
      minX: shape.x - r,
      minY: shape.y - r,
      maxX: shape.x + r,
      maxY: shape.y + r,
    };
  }

  const points = worldOutlinePoints(shape);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export function intersectsCanvas(
  shape: ShapeInstance,
  canvasWidthPx: number,
  canvasHeightPx: number,
): boolean {
  return rectsIntersect(shapeBounds(shape), {
    minX: 0,
    minY: 0,
    maxX: canvasWidthPx,
    maxY: canvasHeightPx,
  });
}

/** Uniform random point inside the filled shape (local geometry). */
function samplePointInShape(shape: ShapeInstance): Point {
  if (shape.type === "circle") {
    const r = shape.size / 2;
    const theta = Math.random() * Math.PI * 2;
    const radius = r * Math.sqrt(Math.random());
    return {
      x: shape.x + radius * Math.cos(theta),
      y: shape.y + radius * Math.sin(theta),
    };
  }

  if (shape.type === "triangle") {
    const [a, b, c] = worldOutlinePoints(shape);
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    return {
      x: u * a.x + v * b.x + w * c.x,
      y: u * a.y + v * b.y + w * c.y,
    };
  }

  // Square: sample in local box, then rotate into world space.
  const h = shape.size / 2;
  const localX = (Math.random() * 2 - 1) * h;
  const localY = (Math.random() * 2 - 1) * h;
  const rotated = rotatePoint(localX, localY, shape.rotation);
  return { x: rotated.x + shape.x, y: rotated.y + shape.y };
}

/**
 * Approximate fraction of the shape's area that lies on the canvas
 * via Monte Carlo sampling of interior points.
 */
export function canvasCoverageRatio(
  shape: ShapeInstance,
  canvasWidthPx: number,
  canvasHeightPx: number,
  samples = 96,
): number {
  let onCanvas = 0;
  for (let i = 0; i < samples; i++) {
    const p = samplePointInShape(shape);
    if (
      p.x >= 0 &&
      p.x <= canvasWidthPx &&
      p.y >= 0 &&
      p.y <= canvasHeightPx
    ) {
      onCanvas++;
    }
  }
  return onCanvas / samples;
}

export function hasMinimumCanvasCoverage(
  shape: ShapeInstance,
  canvasWidthPx: number,
  canvasHeightPx: number,
  minRatio = 1 / 3,
): boolean {
  return canvasCoverageRatio(shape, canvasWidthPx, canvasHeightPx) >= minRatio;
}

/** Half-extents of the rotated AABB — used when sampling centers. */
export function rotatedHalfExtents(type: ShapeType, size: number, rotationDeg: number): {
  halfW: number;
  halfH: number;
} {
  if (type === "circle") {
    const r = size / 2;
    return { halfW: r, halfH: r };
  }

  const points = localOutlinePoints(type, size).map((p) =>
    rotatePoint(p.x, p.y, rotationDeg),
  );
  let maxX = 0;
  let maxY = 0;
  for (const p of points) {
    maxX = Math.max(maxX, Math.abs(p.x));
    maxY = Math.max(maxY, Math.abs(p.y));
  }
  return { halfW: maxX, halfH: maxY };
}

export function svgPathForShape(shape: ShapeInstance): string {
  if (shape.type === "circle") {
    // Circle path via arc; rotation is a no-op visually.
    const r = shape.size / 2;
    return [
      `M ${shape.x + r} ${shape.y}`,
      `A ${r} ${r} 0 1 1 ${shape.x - r} ${shape.y}`,
      `A ${r} ${r} 0 1 1 ${shape.x + r} ${shape.y}`,
    ].join(" ");
  }

  const points = worldOutlinePoints(shape);
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return [
    `M ${first.x} ${first.y}`,
    ...rest.map((p) => `L ${p.x} ${p.y}`),
    "Z",
  ].join(" ");
}

/** Point-in-polygon (ray cast). Works for convex outlines we use. */
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Treat shapes as filled for grabbing (outlines alone are too thin to hit). */
export function hitTestShape(
  shape: ShapeInstance,
  point: Point,
  paddingPx = 0,
): boolean {
  if (shape.type === "circle") {
    const dx = point.x - shape.x;
    const dy = point.y - shape.y;
    const r = shape.size / 2 + paddingPx;
    return dx * dx + dy * dy <= r * r;
  }

  const bounds = shapeBounds(shape);
  if (
    point.x < bounds.minX - paddingPx ||
    point.x > bounds.maxX + paddingPx ||
    point.y < bounds.minY - paddingPx ||
    point.y > bounds.maxY + paddingPx
  ) {
    return false;
  }

  return pointInPolygon(point, worldOutlinePoints(shape));
}

/** Top-most shape under a point (last in array draws on top). */
export function hitTestShapes(
  shapes: ShapeInstance[],
  point: Point,
  paddingPx = 0,
): ShapeInstance | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (hitTestShape(shapes[i], point, paddingPx)) {
      return shapes[i];
    }
  }
  return null;
}

export function drawShapeOnContext(
  ctx: CanvasRenderingContext2D,
  shape: ShapeInstance,
  strokeWidthPx: number,
): void {
  ctx.save();
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = strokeWidthPx;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (shape.type === "circle") {
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const points = worldOutlinePoints(shape);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

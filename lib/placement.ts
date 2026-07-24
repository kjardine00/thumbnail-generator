import {
  hasMinimumCanvasCoverage,
  rotatedHalfExtents,
} from "./geometry";
import { inchesToPx } from "./scale";
import type {
  AppConfig,
  ShapeInstance,
  ShapeQuantities,
  ShapeType,
} from "./types";
import { SHAPE_TYPES, STROKE_WIDTH_IN } from "./types";

/** At least this fraction of each shape must lie on the canvas. */
const MIN_CANVAS_COVERAGE = 1 / 3;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function placeOne(
  type: ShapeType,
  config: AppConfig,
  widthPx: number,
  heightPx: number,
): ShapeInstance {
  const { constraints, style, canvas } = config;
  const minSize = inchesToPx(constraints.minSizeIn, canvas.dpi);
  const maxSize = inchesToPx(constraints.maxSizeIn, canvas.dpi);
  const safeMax = Math.max(minSize, maxSize);

  for (let attempt = 0; attempt < 80; attempt++) {
    const size = randomBetween(minSize, safeMax);
    const rotation = randomBetween(constraints.rotationMin, constraints.rotationMax);
    const { halfW, halfH } = rotatedHalfExtents(type, size, rotation);

    // Allow up to ~2/3 of the AABB off-canvas per axis; coverage check enforces 1/3 area.
    const x = randomBetween((-2 / 3) * halfW, widthPx + (2 / 3) * halfW);
    const y = randomBetween((-2 / 3) * halfH, heightPx + (2 / 3) * halfH);

    const shape: ShapeInstance = {
      id: createId(),
      type,
      x,
      y,
      size,
      rotation,
      strokeColor: style.strokeColor,
      strokeWidthIn: STROKE_WIDTH_IN,
    };

    if (hasMinimumCanvasCoverage(shape, widthPx, heightPx, MIN_CANVAS_COVERAGE)) {
      return shape;
    }
  }

  // Fallback: center on canvas so coverage is well above 1/3.
  const size = randomBetween(minSize, safeMax);
  return {
    id: createId(),
    type,
    x: widthPx / 2,
    y: heightPx / 2,
    size,
    rotation: randomBetween(constraints.rotationMin, constraints.rotationMax),
    strokeColor: style.strokeColor,
    strokeWidthIn: STROKE_WIDTH_IN,
  };
}

export function totalQuantity(quantities: ShapeQuantities): number {
  return SHAPE_TYPES.reduce((sum, type) => sum + Math.max(0, quantities[type] | 0), 0);
}

/** Build a fresh set of shapes from quantities + placement constraints. */
export function generateShapes(config: AppConfig): ShapeInstance[] {
  const widthPx = Math.round(config.canvas.widthIn * config.canvas.dpi);
  const heightPx = Math.round(config.canvas.heightIn * config.canvas.dpi);
  const shapes: ShapeInstance[] = [];

  for (const type of SHAPE_TYPES) {
    const count = Math.max(0, Math.floor(config.quantities[type]));
    for (let i = 0; i < count; i++) {
      shapes.push(placeOne(type, config, widthPx, heightPx));
    }
  }

  return shapes;
}

/** Shuffle = regenerate transforms for current quantity config. */
export function shuffleShapes(config: AppConfig): ShapeInstance[] {
  return generateShapes(config);
}

export type ShapeType = "circle" | "square" | "triangle";

export const SHAPE_TYPES: ShapeType[] = ["circle", "square", "triangle"];

export const SHAPE_LABELS: Record<ShapeType, string> = {
  circle: "Circle",
  square: "Square",
  triangle: "Triangle",
};

export interface CanvasSpec {
  widthIn: number;
  heightIn: number;
  dpi: number;
  backgroundColor: string;
  showOverflow: boolean;
}

export interface ShapeStyle {
  strokeColor: string;
  /** Stroke weight in inches; converted to px at export DPI. */
  strokeWidthIn: number;
}

export interface ShapeInstance {
  id: string;
  type: ShapeType;
  /** Center X in canvas pixel space (export coords). */
  x: number;
  /** Center Y in canvas pixel space (export coords). */
  y: number;
  /** Axis-aligned bounding box size in canvas pixels (before rotation). */
  size: number;
  /** Rotation in degrees. */
  rotation: number;
  strokeColor: string;
  strokeWidthIn: number;
}

export type ShapeQuantities = Record<ShapeType, number>;

export interface PlacementConstraints {
  minSizeIn: number;
  maxSizeIn: number;
  rotationMin: number;
  rotationMax: number;
}

export interface AppConfig {
  canvas: CanvasSpec;
  quantities: ShapeQuantities;
  style: ShapeStyle;
  constraints: PlacementConstraints;
}

export const CANVAS_PRESETS = [
  { id: "letter", label: "Letter", widthIn: 8.5, heightIn: 11 },
  { id: "a4", label: "A4", widthIn: 8.27, heightIn: 11.69 },
  { id: "square", label: "Square", widthIn: 8, heightIn: 8 },
  { id: "tabloid", label: "Tabloid", widthIn: 11, heightIn: 17 },
] as const;

/** Soft cap on total export pixels to avoid browser OOM. */
export const MAX_EXPORT_PIXELS = 25_000_000;

/** Fixed pixel density for digital PNG export (not user-facing). */
export const DIGITAL_DPI = 150;

/** Fixed outline weight in inches (not user-facing). */
export const STROKE_WIDTH_IN = 0.025;

export const DEFAULT_CONFIG: AppConfig = {
  canvas: {
    widthIn: 8.5,
    heightIn: 11,
    dpi: DIGITAL_DPI,
    backgroundColor: "#ffffff",
    showOverflow: false,
  },
  quantities: {
    circle: 1,
    square: 1,
    triangle: 1,
  },
  style: {
    strokeColor: "#ff0000",
    strokeWidthIn: STROKE_WIDTH_IN,
  },
  constraints: {
    minSizeIn: 4,
    maxSizeIn: 8,
    rotationMin: 0,
    rotationMax: 360,
  },
};

"use client";

import { hitTestShapes, svgPathForShape } from "@/lib/geometry";
import { canvasPixelSize, fitDisplayScale, strokeWidthPx } from "@/lib/scale";
import type { CanvasSpec, ShapeInstance } from "@/lib/types";
import { useEffect, useRef, useState, type PointerEvent } from "react";

interface CanvasStageProps {
  canvas: CanvasSpec;
  shapes: ShapeInstance[];
  onShapesChange: (shapes: ShapeInstance[]) => void;
}

/** Extra margin around the canvas when overflow is visible, in canvas px. */
function overflowPadPx(widthPx: number, heightPx: number): number {
  return Math.round(Math.max(widthPx, heightPx) * 0.12);
}

function clientToCanvasPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

interface DragState {
  id: string;
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
}

export function CanvasStage({ canvas, shapes, onShapesChange }: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const shapesRef = useRef(shapes);
  const dragRef = useRef<DragState | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  shapesRef.current = shapes;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBox({ w: rect.width, h: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { widthPx, heightPx } = canvasPixelSize(canvas);
  const pad = canvas.showOverflow ? overflowPadPx(widthPx, heightPx) : 0;
  const viewW = widthPx + pad * 2;
  const viewH = heightPx + pad * 2;

  const scale = fitDisplayScale(viewW, viewH, box.w, box.h);
  const displayW = viewW * scale;
  const displayH = viewH * scale;
  const frameStroke = Math.max(widthPx, heightPx) * 0.0015;
  const hitPadding = Math.max(widthPx, heightPx) * 0.008;

  const moveShapeToFront = (list: ShapeInstance[], id: string) => {
    const index = list.findIndex((s) => s.id === id);
    if (index < 0 || index === list.length - 1) return list;
    const next = list.slice();
    const [item] = next.splice(index, 1);
    next.push(item);
    return next;
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;

    const point = clientToCanvasPoint(svg, e.clientX, e.clientY);
    if (!point) return;

    const hit = hitTestShapes(shapesRef.current, point, hitPadding);
    if (!hit) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id: hit.id,
      originX: hit.x,
      originY: hit.y,
      pointerId: e.pointerId,
      startX: point.x,
      startY: point.y,
    };
    setDraggingId(hit.id);
    onShapesChange(moveShapeToFront(shapesRef.current, hit.id));
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const point = clientToCanvasPoint(svg, e.clientX, e.clientY);
    if (!point) return;

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) {
      const hit = hitTestShapes(shapesRef.current, point, hitPadding);
      setHoverId(hit?.id ?? null);
      return;
    }

    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    const nextX = drag.originX + dx;
    const nextY = drag.originY + dy;

    onShapesChange(
      shapesRef.current.map((shape) =>
        shape.id === drag.id ? { ...shape, x: nextX, y: nextY } : shape,
      ),
    );
  };

  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDraggingId(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
    >
      {scale > 0 && (
        <svg
          ref={svgRef}
          width={displayW}
          height={displayH}
          viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
          className={`max-h-full max-w-full touch-none shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${
            draggingId ? "cursor-grabbing" : hoverId ? "cursor-grab" : "cursor-default"
          }`}
          role="img"
          aria-label={`Canvas preview ${canvas.widthIn} by ${canvas.heightIn} inches. Drag shapes to reposition.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => {
            if (!dragRef.current) setHoverId(null);
          }}
        >
          <defs>
            <clipPath id="canvas-clip">
              <rect x={0} y={0} width={widthPx} height={heightPx} />
            </clipPath>
          </defs>

          {canvas.showOverflow && (
            <rect
              x={-pad}
              y={-pad}
              width={viewW}
              height={viewH}
              fill="#d4d0c8"
            />
          )}

          <rect
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            fill={canvas.backgroundColor}
          />

          {canvas.showOverflow &&
            shapes.map((shape) => (
              <path
                key={`overflow-${shape.id}`}
                d={svgPathForShape(shape)}
                fill="none"
                stroke={shape.strokeColor}
                strokeWidth={strokeWidthPx(shape.strokeWidthIn, canvas.dpi)}
                strokeOpacity={0.28}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
            ))}

          <g clipPath="url(#canvas-clip)" style={{ pointerEvents: "none" }}>
            {shapes.map((shape) => {
              const active = shape.id === draggingId || shape.id === hoverId;
              const base = strokeWidthPx(shape.strokeWidthIn, canvas.dpi);
              return (
                <path
                  key={shape.id}
                  d={svgPathForShape(shape)}
                  fill="none"
                  stroke={shape.strokeColor}
                  strokeWidth={active ? base * 1.35 : base}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          <rect
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={frameStroke}
            style={{ pointerEvents: "none" }}
          />
        </svg>
      )}
    </div>
  );
}

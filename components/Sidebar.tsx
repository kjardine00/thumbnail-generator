"use client";

import { canvasPixelSize } from "@/lib/scale";
import type { AppConfig, ShapeType } from "@/lib/types";
import {
  CANVAS_PRESETS,
  MAX_EXPORT_PIXELS,
  SHAPE_LABELS,
  SHAPE_TYPES,
  STROKE_WIDTH_IN,
} from "@/lib/types";
import type { ReactNode } from "react";

interface SidebarProps {
  config: AppConfig;
  shapeCount: number;
  exporting: boolean;
  exportError: string | null;
  onChange: (next: AppConfig) => void;
  onShuffle: () => void;
  onExport: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-[#3a4150] bg-[#0f1117] px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-500";

export function Sidebar({
  config,
  shapeCount,
  exporting,
  exportError,
  onChange,
  onShuffle,
  onExport,
}: SidebarProps) {
  const { canvas, quantities, style, constraints } = config;
  const { widthPx, heightPx } = canvasPixelSize(canvas);
  const totalPx = widthPx * heightPx;
  const tooLarge = totalPx > MAX_EXPORT_PIXELS;

  const patchCanvas = (partial: Partial<AppConfig["canvas"]>) =>
    onChange({ ...config, canvas: { ...canvas, ...partial } });

  const patchQuantities = (type: ShapeType, value: number) =>
    onChange({
      ...config,
      quantities: { ...quantities, [type]: Math.max(0, value) },
    });

  const patchStyle = (partial: Partial<AppConfig["style"]>) =>
    onChange({
      ...config,
      style: { ...style, ...partial, strokeWidthIn: STROKE_WIDTH_IN },
    });

  const patchConstraints = (partial: Partial<AppConfig["constraints"]>) =>
    onChange({
      ...config,
      constraints: { ...constraints, ...partial },
    });

  const activePreset = CANVAS_PRESETS.find(
    (p) => p.widthIn === canvas.widthIn && p.heightIn === canvas.heightIn,
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#2a2f3a] bg-[#1a1d26] text-zinc-100 md:w-80 md:shrink-0">
      <div className="border-b border-[#2a2f3a] px-5 py-4">
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-zinc-50">
          Thumbnail Generator
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Canvas
          </h2>

          <Field label="Preset">
            <select
              className={inputClass}
              value={activePreset?.id ?? "custom"}
              onChange={(e) => {
                const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value);
                if (preset) {
                  patchCanvas({ widthIn: preset.widthIn, heightIn: preset.heightIn });
                }
              }}
            >
              {CANVAS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.widthIn}×{p.heightIn} in)
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Width (in)">
              <input
                type="number"
                min={0.5}
                max={40}
                step={0.01}
                className={inputClass}
                value={canvas.widthIn}
                onChange={(e) =>
                  patchCanvas({ widthIn: Math.max(0.5, Number(e.target.value) || 0.5) })
                }
              />
            </Field>
            <Field label="Height (in)">
              <input
                type="number"
                min={0.5}
                max={40}
                step={0.01}
                className={inputClass}
                value={canvas.heightIn}
                onChange={(e) =>
                  patchCanvas({ heightIn: Math.max(0.5, Number(e.target.value) || 0.5) })
                }
              />
            </Field>
          </div>

          <Field label="Background">
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded-md border border-[#3a4150] bg-[#0f1117] p-1"
              value={canvas.backgroundColor}
              onChange={(e) => patchCanvas({ backgroundColor: e.target.value })}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Shapes
          </h2>
          {SHAPE_TYPES.map((type) => (
            <Field key={type} label={SHAPE_LABELS[type]}>
              <input
                type="number"
                min={0}
                max={200}
                step={1}
                className={inputClass}
                value={quantities[type]}
                onChange={(e) =>
                  patchQuantities(type, Math.floor(Number(e.target.value) || 0))
                }
              />
            </Field>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min size (in)">
              <input
                type="number"
                min={0.1}
                max={20}
                step={0.05}
                className={inputClass}
                value={constraints.minSizeIn}
                onChange={(e) =>
                  patchConstraints({
                    minSizeIn: Math.max(0.1, Number(e.target.value) || 0.1),
                  })
                }
              />
            </Field>
            <Field label="Max size (in)">
              <input
                type="number"
                min={0.1}
                max={20}
                step={0.05}
                className={inputClass}
                value={constraints.maxSizeIn}
                onChange={(e) =>
                  patchConstraints({
                    maxSizeIn: Math.max(0.1, Number(e.target.value) || 0.1),
                  })
                }
              />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Stroke
          </h2>
          <Field label="Color">
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded-md border border-[#3a4150] bg-[#0f1117] p-1"
              value={style.strokeColor}
              onChange={(e) => patchStyle({ strokeColor: e.target.value })}
            />
          </Field>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            View
          </h2>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-200">
            <input
              type="checkbox"
              className="size-4 accent-zinc-100"
              checked={canvas.showOverflow}
              onChange={(e) => patchCanvas({ showOverflow: e.target.checked })}
            />
            Show off-canvas outlines
          </label>
        </section>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#2a2f3a] px-5 py-4">
        {exportError && (
          <p className="text-xs leading-relaxed text-red-400" role="alert">
            {exportError}
          </p>
        )}
        <button
          type="button"
          onClick={onShuffle}
          className="rounded-md bg-zinc-100 px-3 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-white"
        >
          Shuffle shapes
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={shapeCount === 0 || exporting || tooLarge}
          className="rounded-md border border-[#3a4150] bg-[#0f1117] px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-[#161a22] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting ? "Exporting…" : "Export PNG"}
        </button>
      </div>
    </aside>
  );
}

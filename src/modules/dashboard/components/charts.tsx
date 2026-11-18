"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import { SERIES, type SeriesColor } from "../colors";
import { compactTaka, formatTaka } from "../format";

const gridLine = "stroke-gray-100 dark:stroke-gray-800";
const axisText = "fill-gray-400 text-[11px] dark:fill-gray-500";
const ring = "stroke-white dark:stroke-gray-900";

/** The element's width, kept up to date (0 until it has been measured in the browser). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A unique id usable in an SVG url(#…) reference (React's ids contain characters that break it). */
function useSvgId() {
  return `wash-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/** A round axis top and its step: 0..max split into `count` equal steps of 1, 2, 2.5 or 5 × 10ⁿ. */
function niceScale(max: number, count = 3) {
  if (max <= 0) return { top: count, step: 1 };
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  return { top: step * count, step };
}

export function Legend({ items }: { items: { label: string; dot: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", item.dot)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  // Kept inside the chart: flips to the left of the pointer past the middle.
  const left = x > width / 2;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
      style={left ? { right: width - x + 12 } : { left: x + 12 }}
    >
      {children}
    </div>
  );
}

function TooltipRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        <span className={cn("size-2 rounded-full", dot)} aria-hidden />
        {label}
      </span>
      <span className="font-medium text-gray-800 tabular-nums dark:text-white/90">{value}</span>
    </div>
  );
}

/** A vertical wash in the series colour (currentColor), strong at the line and fading to nothing. */
function Wash({ id, opacity }: { id: string; opacity: number }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="currentColor" stopOpacity={opacity} />
        <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

/** The trend line of a stat tile, with a gradient wash under it. Not interactive. */
export function Sparkline({ values, color, label }: { values: number[]; color: SeriesColor; label: string }) {
  const id = useSvgId();
  const width = 104;
  const height = 44;
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - 4 - (v / max) * (height - 8);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={cn("shrink-0", color.text)}>
      <Wash id={id} opacity={0.35} />
      <path d={`${line}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={color.stroke} />
    </svg>
  );
}

export type TrendPoint = { label: string; current: number | null; previous: number | null };

/**
 * The period's amounts as a line (with a wash) against the previous period's, point by point. Hover (or touch)
 * shows a crosshair with both values. `ticks` are the indexes that get an axis label.
 */
export function TrendChart({
  points,
  ticks,
  currentLabel,
  previousLabel,
  height = 240,
}: {
  points: TrendPoint[];
  ticks: number[];
  currentLabel: string;
  previousLabel: string;
  height?: number;
}) {
  const washId = useSvgId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 12, bottom: 24, left: 44 };
  const plotWidth = Math.max(width - pad.left - pad.right, 0);
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(0, ...points.flatMap((p) => [p.current ?? 0, p.previous ?? 0]));
  const { top, step } = niceScale(max);
  const x = (i: number) => pad.left + (points.length > 1 ? (i / (points.length - 1)) * plotWidth : plotWidth / 2);
  const y = (v: number) => pad.top + plotHeight - (v / top) * plotHeight;

  const path = (key: "current" | "previous") => {
    let d = "";
    points.forEach((p, i) => {
      const v = p[key];
      if (v === null) return;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return d;
  };
  const currentPath = path("current");
  const previousPath = path("previous");
  const lastCurrent = points.reduce((last, p, i) => (p.current !== null ? i : last), -1);
  const area = lastCurrent > 0 ? `${currentPath}L${x(lastCurrent)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const gridValues = Array.from({ length: top / step + 1 }, (_, i) => i * step);

  function pick(clientX: number, rect: DOMRect) {
    const ratio = (clientX - rect.left - pad.left) / Math.max(plotWidth, 1);
    setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  }

  const hovered = hover === null ? null : points[hover];
  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${currentLabel} against ${previousLabel}`}
          onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerDown={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          className={cn("touch-pan-y", SERIES.sales.text)}
        >
          <Wash id={washId} opacity={0.28} />
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className={gridLine} strokeWidth={1} />
              <text x={pad.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className={axisText}>
                {compactTaka(v)}
              </text>
            </g>
          ))}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className={axisText}>
              {points[i]?.label}
            </text>
          ))}
          {area && <path d={area} fill={`url(#${washId})`} />}
          {previousPath && (
            <path d={previousPath} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={SERIES.previous.stroke} />
          )}
          {currentPath && (
            <path d={currentPath} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className={SERIES.sales.stroke} />
          )}
          {lastCurrent >= 0 && hover === null && (
            <circle cx={x(lastCurrent)} cy={y(points[lastCurrent].current ?? 0)} r={4} strokeWidth={2} className={cn(SERIES.sales.fill, ring)} />
          )}
          {hovered && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotHeight} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth={1} />
              {hovered.previous !== null && (
                <circle cx={x(hover)} cy={y(hovered.previous)} r={4} strokeWidth={2} className={cn(SERIES.previous.fill, ring)} />
              )}
              {hovered.current !== null && (
                <circle cx={x(hover)} cy={y(hovered.current)} r={4} strokeWidth={2} className={cn(SERIES.sales.fill, ring)} />
              )}
            </g>
          )}
        </svg>
      )}
      {hovered && hover !== null && (
        <Tooltip x={x(hover)} width={width}>
          <p className="font-medium text-gray-800 dark:text-white/90">{hovered.label}</p>
          <TooltipRow label={currentLabel} value={hovered.current === null ? "—" : formatTaka(hovered.current)} dot={SERIES.sales.dot} />
          <TooltipRow label={previousLabel} value={hovered.previous === null ? "—" : formatTaka(hovered.previous)} dot={SERIES.previous.dot} />
        </Tooltip>
      )}
      <table className="sr-only">
        <caption>{`${currentLabel} and ${previousLabel}`}</caption>
        <thead>
          <tr>
            <th scope="col">Point</th>
            <th scope="col">{currentLabel}</th>
            <th scope="col">{previousLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>{p.current === null ? "—" : formatTaka(p.current)}</td>
              <td>{p.previous === null ? "—" : formatTaka(p.previous)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type BarSeries = { key: string; label: string; color: SeriesColor };
export type BarGroup = { label: string; values: Record<string, number> };

/** Side-by-side bars per group (weeks or months); hovering a group shows its values. Bars are at most 24px wide. */
export function GroupedBarChart({ groups, series, height = 240 }: { groups: BarGroup[]; series: BarSeries[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 24, left: 44 };
  const plotWidth = Math.max(width - pad.left - pad.right, 0);
  const plotHeight = height - pad.top - pad.bottom;
  const max = Math.max(0, ...groups.flatMap((g) => series.map((s) => g.values[s.key] ?? 0)));
  const { top, step } = niceScale(max);
  const band = groups.length ? plotWidth / groups.length : 0;
  const gap = 2;
  const barWidth = Math.max(4, Math.min(24, (band * 0.6 - gap * (series.length - 1)) / series.length));
  const groupWidth = barWidth * series.length + gap * (series.length - 1);
  const y = (v: number) => pad.top + plotHeight - (v / top) * plotHeight;
  const gridValues = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const hovered = hover === null ? null : groups[hover];

  /** A bar with a 4px rounded top and a square foot on the baseline. */
  const bar = (left: number, value: number) => {
    const h = Math.max(0, (value / top) * plotHeight);
    if (h === 0) return "";
    const r = Math.min(4, h, barWidth / 2);
    const base = pad.top + plotHeight;
    const t = base - h;
    return `M${left},${base}V${t + r}Q${left},${t} ${left + r},${t}H${left + barWidth - r}Q${left + barWidth},${t} ${left + barWidth},${t + r}V${base}Z`;
  };

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(" and ")} onPointerLeave={() => setHover(null)}>
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} className={gridLine} strokeWidth={1} />
              <text x={pad.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className={axisText}>
                {compactTaka(v)}
              </text>
            </g>
          ))}
          {groups.map((group, gi) => {
            const start = pad.left + gi * band + (band - groupWidth) / 2;
            return (
              <g key={group.label}>
                {hover === gi && (
                  <rect x={pad.left + gi * band + 2} y={pad.top} width={band - 4} height={plotHeight} rx={6} className="fill-gray-100/70 dark:fill-white/[0.04]" />
                )}
                {series.map((s, si) => (
                  <path key={s.key} d={bar(start + si * (barWidth + gap), group.values[s.key] ?? 0)} className={s.color.fill} />
                ))}
                <text x={pad.left + gi * band + band / 2} y={height - 6} textAnchor="middle" className={axisText}>
                  {group.label}
                </text>
                {/* The hit area is the whole band, bigger than the bars. */}
                <rect
                  x={pad.left + gi * band}
                  y={pad.top}
                  width={band}
                  height={plotHeight + pad.bottom}
                  fill="transparent"
                  onPointerEnter={() => setHover(gi)}
                  onPointerDown={() => setHover(gi)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hovered && hover !== null && (
        <Tooltip x={pad.left + hover * band + band / 2} width={width}>
          <p className="font-medium text-gray-800 dark:text-white/90">{hovered.label}</p>
          {series.map((s) => (
            <TooltipRow key={s.key} label={s.label} value={formatTaka(hovered.values[s.key] ?? 0)} dot={s.color.dot} />
          ))}
        </Tooltip>
      )}
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.label}>
              <th scope="row">{g.label}</th>
              {series.map((s) => (
                <td key={s.key}>{formatTaka(g.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type DonutPart = { name: string; value: number; stroke: string; dot: string };

/**
 * Parts of one whole as a ring with a 2px gap between parts, the total in the middle and a legend with each
 * part's value and share. Hovering a part (or its legend row) shows it in the middle.
 */
export function DonutChart({
  parts,
  centerLabel,
  centerValue,
  valueFormat = "count",
}: {
  parts: DonutPart[];
  centerLabel: string;
  centerValue: string;
  /** How values read: a count ("1,234") or money ("৳ 12,85,000"; "৳ 12.9L" in the middle). */
  valueFormat?: "count" | "taka";
}) {
  const format = (v: number) => (valueFormat === "taka" ? formatTaka(v) : v.toLocaleString("en-IN"));
  const centerFormat = (v: number) => (valueFormat === "taka" ? `৳ ${compactTaka(v)}` : v.toLocaleString("en-IN"));
  const [hover, setHover] = useState<number | null>(null);
  const size = 168;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const visible = parts.filter((p) => p.value > 0).length;
  const gap = visible > 1 ? 2 : 0;
  const share = (v: number) => (total ? `${((v / total) * 100).toFixed(1)}%` : "0%");
  // Each part's arc length and where it starts along the ring.
  const lengths = parts.map((part) => (total ? (part.value / total) * circumference : 0));
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((sum, length) => sum + length, 0));
  const hovered = hover === null ? null : parts[hover];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerLabel}: ${centerValue}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-gray-800" />
          {parts.map((part, i) => {
            if (lengths[i] <= 0) return null;
            const dash = Math.max(lengths[i] - gap, 0);
            return (
              <circle
                key={part.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={hover === i ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-starts[i]}
                className={cn(part.stroke, "transition-[stroke-width,opacity]", hover !== null && hover !== i && "opacity-40")}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold text-gray-800 dark:text-white/90">{hovered ? centerFormat(hovered.value) : centerValue}</span>
          <span className="max-w-24 truncate text-xs text-gray-500 dark:text-gray-400">{hovered ? hovered.name : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5">
        {parts.map((part, i) => (
          <li
            key={part.name}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            className={cn("flex items-start gap-2 text-sm", hover !== null && hover !== i && "opacity-50")}
          >
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", part.dot)} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-gray-700 dark:text-gray-300">{part.name}</span>
              <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                {format(part.value)} · {share(part.value)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

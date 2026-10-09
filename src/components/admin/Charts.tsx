'use client';

import { useState } from 'react';

type Slice = { label: string; value: number; color?: string };
type SeriesPoint = { label?: string; day?: string; month?: string; count: number };

const PALETTE = ['#D97706', '#292524', '#78716C', '#F59E0B', '#16A34A', '#DC2626', '#0EA5E9'];

function pointLabel(d: SeriesPoint) {
  return d.label || d.month || d.day || '';
}

function defaultFormat(v: number) {
  return v.toLocaleString();
}

function ChartTooltip({
  x,
  anchorY,
  chartWidth,
  text,
}: {
  x: number;
  anchorY: number;
  chartWidth: number;
  text: string;
}) {
  const width = Math.max(64, Math.round(text.length * 6.4) + 20);
  const height = 24;
  const left = Math.min(Math.max(x - width / 2, 4), chartWidth - width - 4);
  const top = Math.max(anchorY - height - 8, 2);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={width} height={height} rx={7} fill="#1C1917" />
      <text
        x={left + width / 2}
        y={top + 16}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}

export function BarChart({
  data,
  height = 180,
  legend = 'Bookings',
  formatValue = defaultFormat,
}: {
  data: SeriesPoint[];
  height?: number;
  legend?: string;
  formatValue?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const barWidth = data.length > 8 ? 22 : 28;
  const gap = data.length > 8 ? 22 : 16;
  const leftPad = 20;
  const rightPad = 20;
  const topPad = 36;
  const bottomPad = 30;
  const viewHeight = topPad + height + bottomPad;
  const chartWidth = Math.max(
    480,
    leftPad + rightPad + data.length * (barWidth + gap) - gap,
  );
  const slot = (chartWidth - leftPad - rightPad) / Math.max(data.length, 1);
  const hoveredPoint = hovered !== null ? data[hovered] : null;

  return (
    <div>
      <div className="mb-5 flex items-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-primary" />
          {legend}
        </span>
      </div>
      <div className="w-full overflow-x-auto -mx-1 px-1 touch-pan-x">
        <svg
          viewBox={`0 0 ${chartWidth} ${viewHeight}`}
          className="block w-full h-auto"
          style={{ minWidth: Math.round(chartWidth * 0.7) }}
          role="img"
          aria-label={legend}
          onMouseLeave={() => setHovered(null)}
        >
          <line
            x1={leftPad}
            x2={chartWidth - rightPad}
            y1={topPad + height}
            y2={topPad + height}
            stroke="#E7E5E4"
            strokeWidth="1"
          />
          {data.map((d, i) => {
            const rawLabel = pointLabel(d);
            const h = Math.max(d.count > 0 ? 4 : 0, (d.count / max) * height);
            const x = leftPad + i * slot + (slot - barWidth) / 2;
            const y = topPad + height - h;
            const isHovered = hovered === i;
            return (
              <g key={`${rawLabel}-${i}`}>
                {isHovered && (
                  <rect
                    x={leftPad + i * slot + 4}
                    y={topPad - 6}
                    width={slot - 8}
                    height={height + 6}
                    rx={8}
                    fill="#D97706"
                    opacity={0.06}
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={6}
                  fill="#D97706"
                  opacity={hovered === null || isHovered ? 0.9 : 0.45}
                  className="transition-opacity"
                />
                <text
                  x={x + barWidth / 2}
                  y={topPad + height + 20}
                  textAnchor="middle"
                  fill={isHovered ? '#1C1917' : '#78716C'}
                  fontSize="10"
                  fontWeight={isHovered ? 700 : 400}
                >
                  {rawLabel}
                </text>
                {d.count > 0 && !isHovered && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#1C1917"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {formatValue(d.count)}
                  </text>
                )}
                <rect
                  x={leftPad + i * slot}
                  y={0}
                  width={slot}
                  height={viewHeight}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onTouchStart={() => setHovered(i)}
                >
                  <title>{`${rawLabel}: ${formatValue(d.count)}`}</title>
                </rect>
              </g>
            );
          })}
          {hoveredPoint && hovered !== null && (
            <ChartTooltip
              x={leftPad + hovered * slot + slot / 2}
              anchorY={topPad + height - Math.max(hoveredPoint.count > 0 ? 4 : 0, (hoveredPoint.count / max) * height)}
              chartWidth={chartWidth}
              text={`${pointLabel(hoveredPoint)} · ${formatValue(hoveredPoint.count)}`}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 180,
  legend = 'Users',
  formatValue = defaultFormat,
}: {
  data: SeriesPoint[];
  height?: number;
  legend?: string;
  formatValue?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const leftPad = 28;
  const rightPad = 28;
  const topPad = 36;
  const bottomPad = 30;
  const viewHeight = topPad + height + bottomPad;
  const chartWidth = Math.max(480, leftPad + rightPad + Math.max(data.length - 1, 1) * 52);
  const plotWidth = chartWidth - leftPad - rightPad;
  const plotHeight = height;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? leftPad + plotWidth / 2
        : leftPad + (i / (data.length - 1)) * plotWidth;
    const y = topPad + plotHeight - (d.count / max) * plotHeight;
    return { x, y, label: pointLabel(d), count: d.count };
  });

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const area =
    points.length > 0
      ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${(topPad + plotHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(topPad + plotHeight).toFixed(1)} Z`
      : '';

  return (
    <div>
      <div className="mb-5 flex items-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="inline-block w-4 h-0.5 rounded-full bg-primary" />
          {legend}
        </span>
      </div>
      <div className="w-full overflow-x-auto -mx-1 px-1 touch-pan-x">
        <svg
          viewBox={`0 0 ${chartWidth} ${viewHeight}`}
          className="block w-full h-auto"
          style={{ minWidth: Math.round(chartWidth * 0.7) }}
          role="img"
          aria-label={legend}
          onMouseLeave={() => setHovered(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = topPad + plotHeight * (1 - t);
            return (
              <line
                key={t}
                x1={leftPad}
                x2={chartWidth - rightPad}
                y1={y}
                y2={y}
                stroke="#E7E5E4"
                strokeWidth="1"
              />
            );
          })}
          {area && <path d={area} fill="#D97706" opacity="0.12" />}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {hovered !== null && points[hovered] && (
            <line
              x1={points[hovered].x}
              x2={points[hovered].x}
              y1={topPad}
              y2={topPad + plotHeight}
              stroke="#D97706"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          )}
          {points.map((p, i) => {
            const isHovered = hovered === i;
            return (
              <g key={`${p.label}-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#D97706' : '#FFFFFF'}
                  stroke="#D97706"
                  strokeWidth="2"
                />
                {p.count > 0 && !isHovered && (
                  <text
                    x={p.x}
                    y={p.y - 12}
                    textAnchor="middle"
                    fill="#1C1917"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {formatValue(p.count)}
                  </text>
                )}
                <text
                  x={p.x}
                  y={topPad + plotHeight + 20}
                  textAnchor="middle"
                  fill={isHovered ? '#1C1917' : '#78716C'}
                  fontSize="10"
                  fontWeight={isHovered ? 700 : 400}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
          {points.map((p, i) => {
            const half = points.length > 1 ? plotWidth / (points.length - 1) / 2 : plotWidth / 2;
            const left = Math.max(0, p.x - half);
            const right = Math.min(chartWidth, p.x + half);
            return (
              <rect
                key={`hit-${i}`}
                x={i === 0 ? 0 : left}
                y={0}
                width={(i === points.length - 1 ? chartWidth : right) - (i === 0 ? 0 : left)}
                height={viewHeight}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onTouchStart={() => setHovered(i)}
              >
                <title>{`${p.label}: ${formatValue(p.count)}`}</title>
              </rect>
            );
          })}
          {hovered !== null && points[hovered] && (
            <ChartTooltip
              x={points[hovered].x}
              anchorY={points[hovered].y - 4}
              chartWidth={chartWidth}
              text={`${points[hovered].label} · ${formatValue(points[hovered].count)}`}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export function HorizontalBars({ data }: { data: Slice[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-foreground capitalize">{d.label}</span>
            <span className="text-muted-foreground font-bold">{d.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color || PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

export function DonutChart({ data, size = 160 }: { data: Slice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#E7E5E4" strokeWidth="18" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={d.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={d.color || PALETTE[i % PALETTE.length]}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" fill="#1C1917" fontSize="22" fontWeight="800">
          {data.reduce((s, d) => s + d.value, 0)}
        </text>
        <text x="80" y="94" textAnchor="middle" fill="#78716C" fontSize="10" fontWeight="600">
          TOTAL
        </text>
      </svg>
      <ul className="space-y-2 text-sm w-full">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-foreground">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color || PALETTE[i % PALETTE.length] }}
              />
              {d.label}
            </span>
            <span className="font-bold text-muted-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

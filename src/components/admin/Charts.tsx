'use client';

type Slice = { label: string; value: number; color?: string };

const PALETTE = ['#D97706', '#292524', '#78716C', '#F59E0B', '#16A34A', '#DC2626', '#0EA5E9'];

export function BarChart({
  data,
  height = 180,
}: {
  data: { label?: string; day?: string; count: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barWidth = 22;
  const gap = 12;
  const leftPad = 16;
  const rightPad = 16;
  const chartWidth = Math.max(
    280,
    leftPad + rightPad + data.length * (barWidth + gap) - gap
  );

  return (
    <div className="w-full overflow-x-auto -mx-1 px-1 touch-pan-x">
      <svg
        width={chartWidth}
        height={height + 40}
        viewBox={`0 0 ${chartWidth} ${height + 40}`}
        className="block max-w-none"
        style={{ minWidth: chartWidth }}
        role="img"
        aria-label="New users over the last 14 days"
      >
        {data.map((d, i) => {
          const rawLabel = d.label || d.day || '';
          const shortLabel = rawLabel.length > 5 ? rawLabel.slice(5) : rawLabel;
          const h = Math.max(d.count > 0 ? 4 : 0, (d.count / max) * height);
          const x = leftPad + i * (barWidth + gap);
          const y = height - h + 10;
          return (
            <g key={`${rawLabel}-${i}`}>
              <rect x={x} y={y} width={barWidth} height={h} rx={6} fill="#D97706" opacity={0.85} />
              <text
                x={x + barWidth / 2}
                y={height + 28}
                textAnchor="middle"
                fill="#78716C"
                fontSize="9"
              >
                {shortLabel}
              </text>
              {d.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fill="#1C1917"
                  fontSize="10"
                  fontWeight="700"
                >
                  {d.count}
                </text>
              )}
            </g>
          );
        })}
      </svg>
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

import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import type { WaterfallStep } from "../../data/types";
import { Panel } from "../ui/Panel";
import { compact } from "../../lib/format";

const W = 440;
const H = 470;
const M = { top: 34, right: 18, bottom: 48, left: 52 };

export function EmissionsWaterfall({ steps }: { steps: WaterfallStep[] }) {
  const geom = useMemo(() => {
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    let running = 0;
    const bars = steps.map((s) => {
      if (s.kind === "total") {
        return { ...s, start: 0, end: running };
      }
      const start = running;
      const end = running + s.value;
      running = end;
      return { ...s, start, end };
    });
    const maxTop = Math.max(...bars.map((b) => Math.max(b.start, b.end))) * 1.1;
    const y = scaleLinear().domain([0, maxTop]).range([M.top + ih, M.top]);
    const slot = iw / bars.length;
    const bw = slot * 0.56;
    const x = (i: number) => M.left + (i + 0.5) * slot;
    return { bars, y, x, bw, ih, maxTop };
  }, [steps]);

  const yTicks = geom.y.ticks(5);

  return (
    <Panel
      eyebrow="Attribution · tonnes CO₂e"
      title="Avoided emissions by pathway"
      subtitle="Contribution of each recovery pathway to net avoided emissions for the period."
      bodyClassName="flex min-h-0 flex-col"
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full min-h-0 flex-1">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={geom.y(t)} y2={geom.y(t)} stroke="#EAF0F1" />
            <text x={M.left - 6} y={geom.y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint" style={{ fontSize: 9.5 }}>
              {compact(t, 0)}
            </text>
          </g>
        ))}

        {geom.bars.map((b, i) => {
          const top = Math.min(geom.y(b.start), geom.y(b.end));
          const h = Math.abs(geom.y(b.start) - geom.y(b.end));
          const cx = geom.x(i);
          const next = geom.bars[i + 1];
          return (
            <g key={b.key}>
              {next && b.kind !== "total" && (
                <line
                  x1={cx + geom.bw / 2}
                  x2={geom.x(i + 1) - geom.bw / 2}
                  y1={geom.y(b.end)}
                  y2={geom.y(b.end)}
                  stroke="#C4D2D6"
                  strokeDasharray="2 2"
                />
              )}
              <rect
                x={cx - geom.bw / 2}
                y={top}
                width={geom.bw}
                height={Math.max(1.5, h)}
                rx={2.5}
                fill={b.color}
                opacity={b.kind === "total" ? 1 : 0.92}
              />
              <text x={cx} y={top - 6} textAnchor="middle" className="fill-ink" style={{ fontSize: 11, fontWeight: 600 }}>
                {b.value >= 0 ? "" : "−"}
                {compact(Math.abs(b.value), 1)}
              </text>
              <text x={cx} y={H - 20} textAnchor="middle" className="fill-ink-soft" style={{ fontSize: 10 }}>
                {b.label}
              </text>
            </g>
          );
        })}
        <line x1={M.left} x2={W - M.right} y1={geom.y(0)} y2={geom.y(0)} stroke="#C4D2D6" />
        <text x={M.left} y={M.top - 14} textAnchor="start" className="fill-ink-faint" style={{ fontSize: 9.5 }}>
          t CO₂e
        </text>
      </svg>
    </Panel>
  );
}

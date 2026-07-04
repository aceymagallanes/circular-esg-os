import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import type { AnomalyPoint } from "../../data/types";
import { Panel } from "../ui/Panel";

const W = 780;
const H = 250;
const M = { top: 18, right: 14, bottom: 26, left: 38 };

export function AnomalyTimeSeries({
  title,
  points,
}: {
  title: string;
  points: AnomalyPoint[];
}) {
  const geom = useMemo(() => {
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const x = scaleLinear().domain([0, points.length - 1]).range([M.left, M.left + iw]);
    const mean = points[0]?.mean ?? 0;
    const band = points[0]?.band ?? 0;
    const vals = points.map((p) => p.value);
    const lo = Math.min(...vals, mean - band) - 0.005;
    const hi = Math.max(...vals, mean + band) + 0.005;
    const y = scaleLinear().domain([Math.max(0, lo), Math.min(1, hi)]).range([M.top + ih, M.top]);
    const path = d3line<AnomalyPoint>().x((_, i) => x(i)).y((d) => y(d.value)).curve(curveMonotoneX)(points) || "";
    return { x, y, mean, band, path, ih };
  }, [points]);

  const anomalies = points.filter((p) => p.isAnomaly);
  const yTicks = geom.y.ticks(3);

  return (
    <Panel
      eyebrow="Statistical control · ±2σ"
      title={title}
      subtitle="Monthly performance against a two-sigma control envelope. Observations beyond the band are flagged for review."
      right={
        <span className={`rounded-md px-2 py-1 font-mono text-[10px] ${anomalies.length ? "bg-alert/10 text-alert" : "bg-loop/10 text-loop"}`}>
          {anomalies.length ? `${anomalies.length} flagged` : "in control"}
        </span>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={geom.y(t)} y2={geom.y(t)} stroke="#EEF4F5" />
            <text x={M.left - 6} y={geom.y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint" style={{ fontSize: 9 }}>
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* control band */}
        <rect
          x={M.left}
          y={geom.y(geom.mean + geom.band)}
          width={W - M.right - M.left}
          height={Math.abs(geom.y(geom.mean - geom.band) - geom.y(geom.mean + geom.band))}
          fill="#0E6C77"
          opacity={0.06}
        />
        <line x1={M.left} x2={W - M.right} y1={geom.y(geom.mean)} y2={geom.y(geom.mean)} stroke="#6B8390" strokeDasharray="3 3" />
        <text x={W - M.right} y={geom.y(geom.mean) - 4} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 8.5 }}>
          μ = {(geom.mean * 100).toFixed(1)}%
        </text>

        {/* series */}
        <path d={geom.path} fill="none" stroke="#0E6C77" strokeWidth={2} />

        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={geom.x(i)} cy={geom.y(p.value)} r={p.isAnomaly ? 4 : 2} fill={p.isAnomaly ? "#C24A44" : "#0E6C77"} stroke="#fff" strokeWidth={p.isAnomaly ? 1 : 0} />
            {p.isAnomaly && (
              <>
                <circle cx={geom.x(i)} cy={geom.y(p.value)} r={7} fill="none" stroke="#C24A44" strokeOpacity={0.5} />
                <text x={geom.x(i)} y={geom.y(p.value) - 11} textAnchor="middle" className="fill-alert" style={{ fontSize: 8.5, fontWeight: 600 }}>
                  {p.label} · z{p.z.toFixed(1)}
                </text>
              </>
            )}
          </g>
        ))}

        {points.filter((_, i) => i % 4 === 0 || i === points.length - 1).map((p, _i) => (
          <text key={p.index} x={geom.x(points.indexOf(p))} y={H - 8} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 9 }}>
            {p.label}
          </text>
        ))}
      </svg>

      {anomalies.length > 0 && (
        <p className="mt-1 text-[11px] leading-snug text-ink-soft">
          <span className="font-medium text-alert">Exception:</span> diversion declined to{" "}
          {(Math.min(...anomalies.map((a) => a.value)) * 100).toFixed(1)}%, consistent with a regional
          collection or logistics disruption. Recommend reconciliation against chain-of-custody records in the Evidence Vault.
        </p>
      )}
    </Panel>
  );
}

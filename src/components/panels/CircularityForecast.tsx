import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveMonotoneX } from "d3-shape";
import type { ForecastPoint } from "../../data/types";
import { Panel } from "../ui/Panel";

const W = 780;
const H = 300;
const M = { top: 16, right: 16, bottom: 26, left: 38 };

export function CircularityForecast({ data, target = 0.74 }: { data: ForecastPoint[]; target?: number }) {
  const geom = useMemo(() => {
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;
    const x = scaleLinear().domain([0, data.length - 1]).range([M.left, M.left + iw]);
    const vals = data.flatMap((d) => [d.actual, d.fitted, d.forecast, d.lo, d.hi].filter((v): v is number => v != null));
    const lo = Math.min(...vals) - 0.03;
    const hi = Math.max(...vals, target) + 0.03;
    const y = scaleLinear().domain([Math.max(0, lo), Math.min(1, hi)]).range([M.top + ih, M.top]);

    const actual = data.filter((d) => d.actual != null);
    const forecast = data.filter((d) => d.forecast != null);

    const lineA = d3line<ForecastPoint>().x((d) => x(d.index)).y((d) => y(d.actual!)).curve(curveMonotoneX);
    const lineFit = d3line<ForecastPoint>().defined((d) => d.fitted != null).x((d) => x(d.index)).y((d) => y(d.fitted!));
    const lineF = d3line<ForecastPoint>().x((d) => x(d.index)).y((d) => y(d.forecast!)).curve(curveMonotoneX);
    const band = d3area<ForecastPoint>().x((d) => x(d.index)).y0((d) => y(d.lo!)).y1((d) => y(d.hi!)).curve(curveMonotoneX);

    const firstForecastX = forecast.length ? x(forecast[0].index) : x(data.length - 1);
    return {
      x, y, ih,
      actualPath: lineA(actual) || "",
      fitPath: lineFit(data) || "",
      forecastPath: lineF(forecast) || "",
      bandPath: band(forecast) || "",
      firstForecastX,
      actual,
      forecast,
    };
  }, [data, target]);

  const yTicks = geom.y.ticks(4);

  return (
    <Panel
      eyebrow="Forecast · trend & confidence interval"
      title="Circularity rate — trajectory and outlook"
      subtitle="Value-retained share of intake, with fitted trend and a six-month projection at a 95% confidence interval."
      right={<span className="rounded-md bg-loop/10 px-2 py-1 font-mono text-[10px] text-loop">Target {(target * 100).toFixed(0)}%</span>}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* gridlines + y labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={geom.y(t)} y2={geom.y(t)} stroke="#EAF0F1" />
            <text x={M.left - 6} y={geom.y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint" style={{ fontSize: 9.5 }}>
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* forecast region shading */}
        <rect x={geom.firstForecastX} y={M.top} width={W - M.right - geom.firstForecastX} height={geom.ih} fill="#0096D6" opacity={0.04} />
        <line x1={geom.firstForecastX} x2={geom.firstForecastX} y1={M.top} y2={M.top + geom.ih} stroke="#0096D6" strokeDasharray="2 3" opacity={0.4} />
        <text x={geom.firstForecastX + 4} y={M.top + 10} className="fill-hp" style={{ fontSize: 9, fontWeight: 600 }}>
          FORECAST
        </text>

        {/* target line */}
        <line x1={M.left} x2={W - M.right} y1={geom.y(target)} y2={geom.y(target)} stroke="#2FA37A" strokeDasharray="4 4" strokeWidth={1.2} opacity={0.7} />

        {/* confidence band */}
        <path d={geom.bandPath} fill="#0096D6" opacity={0.14} />
        {/* fitted trend */}
        <path d={geom.fitPath} fill="none" stroke="#6B8390" strokeWidth={1} strokeDasharray="3 3" />
        {/* actual */}
        <path d={geom.actualPath} fill="none" stroke="#0E6C77" strokeWidth={2.2} />
        {/* forecast */}
        <path d={geom.forecastPath} fill="none" stroke="#0096D6" strokeWidth={2.2} strokeDasharray="5 4" />

        {/* endpoint markers */}
        {geom.actual.length > 0 && (
          <circle cx={geom.x(geom.actual[geom.actual.length - 1].index)} cy={geom.y(geom.actual[geom.actual.length - 1].actual!)} r={3} fill="#0E6C77" />
        )}
        {geom.forecast.length > 0 && (
          <circle cx={geom.x(geom.forecast[geom.forecast.length - 1].index)} cy={geom.y(geom.forecast[geom.forecast.length - 1].forecast!)} r={3} fill="#0096D6" />
        )}

        {/* x labels (sparse) */}
        {data.filter((_, i) => i % 4 === 0 || i === data.length - 1).map((d) => (
          <text key={d.index} x={geom.x(d.index)} y={H - 8} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 9 }}>
            {d.label}
          </text>
        ))}
      </svg>
    </Panel>
  );
}

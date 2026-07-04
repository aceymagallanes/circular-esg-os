import { useMemo } from "react";
import type { ControlTowerView, FlowLink } from "../../data/types";
import { Panel } from "../ui/Panel";
import { compact, pct } from "../../lib/format";

// teal(low) → green(high) circularity ramp
function circColor(t: number): string {
  const a = [14, 108, 119]; // #0E6C77
  const b = [47, 163, 122]; // #2FA37A
  const c = [223, 138, 43]; // amber for low
  // low<0.4 amber-ish, else teal→green
  if (t < 0.42) {
    const k = t / 0.42;
    return `rgb(${c.map((v, i) => Math.round(v + (a[i] - v) * k)).join(",")})`;
  }
  const k = (t - 0.42) / 0.58;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;
}

function curve(f: FlowLink): string {
  const { from, to } = f;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const bow = 6;
  const cx = mx + (nx / len) * bow;
  const cy = my + (ny / len) * bow;
  return `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
}

export function NetworkFlowMap({ view }: { view: ControlTowerView }) {
  const flows = view.networkFlows;
  const maxV = Math.max(1, ...flows.map((f) => f.value));

  const hubThroughput = useMemo(() => {
    const map = new Map<string, number>();
    flows.forEach((f) => map.set(f.to.label, (map.get(f.to.label) || 0) + f.value));
    return map;
  }, [flows]);

  return (
    <Panel
      eyebrow="Reverse logistics · APJ network"
      title="Collection to certified recovery hubs"
      subtitle="Node size denotes recovered volume; flow colour denotes circularity rate. Processing hubs are R2v3 / e-Stewards certified."
      right={<CircLegend />}
      bodyClassName="pt-2"
    >
      <div className="relative">
        <svg viewBox="0 0 100 96" className="w-full" style={{ height: "auto" }}>
          <defs>
            <radialGradient id="ocean" cx="55%" cy="40%" r="80%">
              <stop offset="0%" stopColor="#EEF4F5" />
              <stop offset="100%" stopColor="#E2EBEC" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="96" fill="url(#ocean)" rx="2" />
          {/* graticule */}
          {[16, 32, 48, 64, 80].map((gx) => (
            <line key={"v" + gx} x1={gx} y1="2" x2={gx} y2="94" stroke="#D3E0E1" strokeWidth="0.2" />
          ))}
          {[16, 32, 48, 64, 80].map((gy) => (
            <line key={"h" + gy} x1="2" y1={gy} x2="98" y2={gy} stroke="#D3E0E1" strokeWidth="0.2" />
          ))}

          {/* flows */}
          {flows.map((f, i) => {
            const w = 0.5 + (f.value / maxV) * 2.6;
            const col = circColor(f.circularity);
            return (
              <g key={i}>
                <path d={curve(f)} fill="none" stroke={col} strokeOpacity={0.28} strokeWidth={w} />
                <path d={curve(f)} fill="none" stroke={col} strokeWidth={Math.max(0.4, w * 0.5)} className="flow-dash" strokeLinecap="round" />
              </g>
            );
          })}

          {/* hubs */}
          {view.nodes.hubs.map((h) => {
            const thr = hubThroughput.get(h.name) || 0;
            if (thr === 0) return null;
            return (
              <g key={h.id}>
                <rect x={h.x - 1.7} y={h.y - 1.7} width={3.4} height={3.4} rx={0.6} fill="#0B1E27" transform={`rotate(45 ${h.x} ${h.y})`} />
                <rect x={h.x - 0.8} y={h.y - 0.8} width={1.6} height={1.6} fill="#E08A2B" transform={`rotate(45 ${h.x} ${h.y})`} />
                <text x={h.x} y={h.y - 3} textAnchor="middle" style={{ fontSize: 2.3, fontWeight: 600 }} className="fill-ink">
                  {h.name.replace(" Recovery Hub", "").replace(" Materials Hub", "")}
                </text>
                <text x={h.x} y={h.y + 4.4} textAnchor="middle" style={{ fontSize: 1.9 }} className="fill-ink-faint">
                  {compact(thr, 0)}u
                </text>
              </g>
            );
          })}

          {/* regions */}
          {flows.map((f, i) => {
            const r = 1.4 + Math.sqrt(f.value / maxV) * 3.2;
            const col = circColor(f.circularity);
            return (
              <g key={"r" + i}>
                <circle cx={f.from.x} cy={f.from.y} r={r} fill={col} fillOpacity={0.85} stroke="#fff" strokeWidth={0.4}>
                  <title>
                    {f.from.label}: {compact(f.value, 1)} units · circularity {pct(f.circularity, 0)}
                  </title>
                </circle>
                <text x={f.from.x} y={f.from.y - r - 0.8} textAnchor="middle" style={{ fontSize: 2.5, fontWeight: 600 }} className="fill-ink">
                  {f.from.label}
                </text>
                <text x={f.from.x} y={f.from.y + 0.9} textAnchor="middle" style={{ fontSize: 2, fontWeight: 600 }} className="fill-white">
                  {pct(f.circularity, 0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}

function CircLegend() {
  return (
    <div className="flex items-center gap-2 text-[9px] text-ink-faint">
      <span>≤40%</span>
      <span className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg,#E08A2B,#0E6C77,#2FA37A)" }} />
      <span>≥70% circular</span>
    </div>
  );
}

import { useMemo, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyLeft } from "d3-sankey";
import type { SankeyGraph } from "../../data/types";
import { Panel } from "../ui/Panel";
import { compact } from "../../lib/format";

const W = 940;
const H = 400;

export function MaterialFlowSankey({ graph }: { graph: SankeyGraph }) {
  const [hover, setHover] = useState<number | null>(null);

  const layout = useMemo(() => {
    const idToIndex = new Map(graph.nodes.map((n, i) => [n.id, i]));
    const nodes = graph.nodes.map((n) => ({ ...n }));
    const links = graph.links
      .filter((l) => idToIndex.has(l.source) && idToIndex.has(l.target))
      .map((l) => ({
        source: idToIndex.get(l.source)!,
        target: idToIndex.get(l.target)!,
        value: l.value,
      }));

    const gen = sankey<any, any>()
      .nodeWidth(12)
      .nodePadding(19)
      .nodeAlign(sankeyLeft) // keeps a clean category | pathway | material 3-column grid
      .extent([[140, 36], [W - 108, H - 16]]);

    return gen({ nodes, links });
  }, [graph]);

  const linkPath = sankeyLinkHorizontal();

  return (
    <Panel
      eyebrow="Material flow analysis"
      title="End-to-end material flow"
      subtitle="Recovered assets traced from device family, through recovery pathway, to certified material stream. Flow width represents volume; colour denotes destination."
      right={<Legend />}
      bodyClassName="pt-2"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* column captions */}
        <text x={20} y={13} className="fill-ink-faint" style={{ fontSize: 9, letterSpacing: "0.1em" }}>DEVICE FAMILY</text>
        <text x={W / 2} y={13} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 9, letterSpacing: "0.1em" }}>RECOVERY PATHWAY</text>
        <text x={W - 12} y={13} textAnchor="end" className="fill-ink-faint" style={{ fontSize: 9, letterSpacing: "0.1em" }}>MATERIAL STREAM</text>

        {/* links — coloured by destination node */}
        <g fill="none">
          {layout.links.map((l: any, i: number) => {
            const active = hover == null || hover === l.source.index || hover === l.target.index;
            return (
              <path
                key={i}
                d={linkPath(l) || ""}
                stroke={l.target.color}
                strokeOpacity={active ? (hover == null ? 0.34 : 0.55) : 0.07}
                strokeWidth={Math.max(1, l.width)}
                className="transition-[stroke-opacity] duration-200"
              >
                <title>
                  {l.source.label} → {l.target.label}: {compact(l.value, 1)}
                </title>
              </path>
            );
          })}
        </g>

        {/* nodes */}
        <g>
          {layout.nodes.map((n: any) => {
            const active = hover == null || hover === n.index;
            const cx = (n.x0 + n.x1) / 2;
            const cy = (n.y0 + n.y1) / 2;
            let lx = cx, ly = cy, anchor: "start" | "end" | "middle" = "middle", dy = "0.32em";
            if (n.kind === "category") { lx = n.x0 - 9; anchor = "end"; }
            else if (n.kind === "material") { lx = n.x1 + 9; anchor = "start"; }
            else { ly = n.y0 - 6; anchor = "middle"; dy = "0"; } // pathway label above node
            return (
              <g
                key={n.index}
                onMouseEnter={() => setHover(n.index)}
                onMouseLeave={() => setHover(null)}
                className="cursor-default"
              >
                <rect
                  x={n.x0}
                  y={n.y0}
                  width={n.x1 - n.x0}
                  height={Math.max(2, n.y1 - n.y0)}
                  rx={2.5}
                  fill={n.color}
                  opacity={active ? 1 : 0.3}
                />
                <text
                  x={lx}
                  y={ly}
                  dy={dy}
                  textAnchor={anchor}
                  className="fill-ink"
                  style={{ fontSize: n.kind === "material" ? 11 : 11.5, fontWeight: n.kind === "category" ? 600 : n.kind === "disposition" ? 600 : 500 }}
                  opacity={active ? 1 : 0.4}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </Panel>
  );
}

function Legend() {
  const items = [
    { c: "#123B47", t: "Device family" },
    { c: "#0096D6", t: "Pathway" },
    { c: "#C67A46", t: "Material" },
  ];
  return (
    <div className="flex gap-3">
      {items.map((i) => (
        <span key={i.t} className="inline-flex items-center gap-1.5 text-[10px] text-ink-soft">
          <span className="h-2 w-2 rounded-sm" style={{ background: i.c }} />
          {i.t}
        </span>
      ))}
    </div>
  );
}

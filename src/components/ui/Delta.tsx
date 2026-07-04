import { signed } from "../../lib/format";

interface DeltaProps {
  value: number; // relative % or points
  points?: boolean; // true → "pts", false → "%"
  goodIsUp?: boolean;
  size?: "sm" | "md";
}

export function Delta({ value, points = false, goodIsUp = true, size = "sm" }: DeltaProps) {
  const positive = value >= 0;
  const good = goodIsUp ? positive : !positive;
  const color = Math.abs(value) < 0.05 ? "text-ink-faint bg-canvas-sunken" : good ? "text-loop bg-loop/10" : "text-alert bg-alert/10";
  const arrow = positive ? "▲" : "▼";
  const text = size === "md" ? "text-[13px]" : "text-[11px]";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono ${text} ${color}`}>
      <span className="text-[8px] leading-none">{arrow}</span>
      {signed(value)} {points ? "pts" : "%"}
    </span>
  );
}

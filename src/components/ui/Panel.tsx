import React from "react";

interface PanelProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Panel({ eyebrow, title, subtitle, right, className = "", bodyClassName = "", children }: PanelProps) {
  return (
    <section
      className={`animate-rise flex flex-col rounded-xl2 border border-line bg-canvas-panel shadow-panel ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-0.5 font-mono text-[10px] uppercase tracking-caps text-ink-faint">
              {eyebrow}
            </div>
          )}
          <h3 className="font-display text-[15px] font-semibold leading-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-snug text-ink-soft">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className={`flex-1 px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

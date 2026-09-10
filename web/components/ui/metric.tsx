import type { ReactNode } from "react";

export interface MetricProps {
  label: string;
  value: string;
  note?: string;
}

export function Metric({ label, value, note }: MetricProps): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base leading-6 text-muted-foreground">{label}</span>
      <span className="font-mono text-[2rem] leading-none tabular-nums">{value}</span>
      {note ? (
        <span className="max-w-[32ch] text-base leading-6 text-subtle-foreground">{note}</span>
      ) : null}
    </div>
  );
}

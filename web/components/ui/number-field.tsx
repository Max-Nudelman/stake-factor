"use client";

import type { ReactNode } from "react";

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function NumberField({ label, value, min, max, onChange }: NumberFieldProps): ReactNode {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-base leading-6 text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event): void => {
          const next: number = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, Math.round(next))));
          }
        }}
        className="w-40 rounded-[6px] border border-input bg-background px-4 py-2 font-mono text-base leading-6 tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      />
    </label>
  );
}

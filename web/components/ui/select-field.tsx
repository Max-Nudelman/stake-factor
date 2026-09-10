"use client";

import type { ReactNode } from "react";

export interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, onChange }: SelectFieldProps): ReactNode {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-base leading-6 text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event): void => onChange(event.target.value)}
        className="rounded-[6px] border border-input bg-background px-4 py-2 text-base leading-6 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {options.map(
          (option: string): ReactNode => (
            <option key={option} value={option}>
              {option}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

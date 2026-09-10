"use client";

import type { ReactNode } from "react";

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  choices,
  onChange,
}: ChoiceGroupProps<T>): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base leading-6 text-muted-foreground">{label}</span>
      <div className="flex gap-2" role="group" aria-label={label}>
        {choices.map(
          (choice: Choice<T>): ReactNode => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={choice.value === value}
              onClick={(): void => onChange(choice.value)}
              className={
                choice.value === value
                  ? "rounded-[6px] border border-brand-accent bg-brand-accent px-4 py-2 text-base leading-6 text-brand-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                  : "rounded-[6px] border border-input bg-background px-4 py-2 text-base leading-6 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              }
            >
              {choice.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

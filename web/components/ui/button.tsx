"use client";

import type { ReactNode } from "react";

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ children, onClick, disabled = false }: ButtonProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[6px] bg-primary px-6 py-2 text-base leading-6 text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

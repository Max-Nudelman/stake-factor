import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps): ReactNode {
  return <div className="rounded-[6px] border border-border bg-card">{children}</div>;
}

export interface CardHeaderProps {
  title: string;
  note?: string;
  children?: ReactNode;
}

export function CardHeader({ title, note, children }: CardHeaderProps): ReactNode {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border px-6 py-4">
      <h2 className="display text-[1.75rem]">{title}</h2>
      {note ? <p className="max-w-[60ch] text-base leading-6 text-muted-foreground">{note}</p> : null}
      {children}
    </div>
  );
}

export interface CardBodyProps {
  children: ReactNode;
}

export function CardBody({ children }: CardBodyProps): ReactNode {
  return <div className="px-6 py-6">{children}</div>;
}

import type { ReactNode } from "react";

export interface ProseProps {
  children: ReactNode;
}

/**
 * The reading column. Narrow and centred, with the text left aligned inside it.
 * Measure is the single biggest lever on whether a long page gets read, so
 * everything that is sentences lives in here and everything that is a chart
 * breaks out past it.
 */
export function Prose({ children }: ProseProps): ReactNode {
  return <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">{children}</div>;
}

export interface SubheadProps {
  children: ReactNode;
}

/** Italic serif, marking a turn in the argument without competing with a section. */
export function Subhead({ children }: SubheadProps): ReactNode {
  return (
    <h3 className="display mt-8 text-[1.6rem] text-muted-foreground italic">{children}</h3>
  );
}

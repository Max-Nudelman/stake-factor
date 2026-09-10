import type { ReactNode } from "react";
import { Prose } from "@/components/ui/prose";

export interface FigureProps {
  /** Figure number, passed explicitly so order does not depend on render timing. */
  index: number;
  title: string;
  /** What the reader should take from it. Stated as a claim, not a description. */
  caption: string;
  /** Where the numbers came from. Always names a file or a row count. */
  source: string;
  children: ReactNode;
}

/**
 * Title and caption sit in the reading column. The chart itself breaks out to
 * full width, which is the contrast that makes a long page navigable.
 */
export function Figure({ index, title, caption, source, children }: FigureProps): ReactNode {
  return (
    <figure className="m-0 flex flex-col gap-8">
      <Prose>
        <figcaption className="flex flex-col gap-2">
          <span className="font-mono text-base leading-6 text-brand-accent tabular-nums">
            Figure {String(index).padStart(2, "0")}
          </span>
          <span className="text-lg leading-8">{title}</span>
        </figcaption>
      </Prose>
      <div className="rounded-[6px] border border-border bg-card px-6 py-8">{children}</div>
      <Prose>
        <figcaption className="flex flex-col gap-2">
          <span className="text-base leading-7 text-muted-foreground">{caption}</span>
          <span className="text-base leading-6 text-subtle-foreground">{source}</span>
        </figcaption>
      </Prose>
    </figure>
  );
}

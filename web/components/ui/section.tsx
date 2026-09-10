import type { ReactNode } from "react";

export interface SectionProps {
  id?: string;
  /** Section number, set beside the title so the argument has an order. */
  index?: number;
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * A section opens with a centred number and title, then runs full width so
 * figures can break out past the reading column. No box: the heading and the
 * space around it do the separating.
 */
export function Section({ id, index, title, note, action, children }: SectionProps): ReactNode {
  return (
    <section id={id} className="scroll-mt-24 py-16">
      <header className="flex flex-col items-center gap-6 pb-16 text-center">
        <h2 className="display flex flex-wrap items-center justify-center gap-4 text-[clamp(1.9rem,4vw,2.6rem)]">
          {index !== undefined ? (
            <>
              <span className="font-mono text-[0.9em] text-muted-foreground tabular-nums">
                {String(index).padStart(2, "0")}
              </span>
              {/* Typographic rule standing in for a dash, so the heading reads
                  as a label without putting a dash into the writing. */}
              <span aria-hidden="true" className="h-px w-12 bg-border" />
            </>
          ) : null}
          <span>{title}</span>
        </h2>
        {note ? (
          <p className="max-w-[52ch] text-base leading-7 text-muted-foreground">{note}</p>
        ) : null}
        {action ? <div className="flex justify-center">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

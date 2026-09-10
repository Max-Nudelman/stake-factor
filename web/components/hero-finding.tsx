import type { ReactNode } from "react";

/**
 * The finding is a comparison, so the page leads with the comparison rather
 * than with four equal tiles. Both numbers are areas under the same ROC curve,
 * so they sit on one scale and can be read against each other directly.
 */
export function HeroFinding(): ReactNode {
  return (
    <div className="mx-auto grid max-w-[860px] gap-12 border-y border-border py-12 text-center md:grid-cols-2">
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-[clamp(3.5rem,9vw,5.5rem)] leading-none text-brand-accent tabular-nums">
          0.98
        </span>
        <span className="max-w-[30ch] text-base leading-7">
          How cleanly closing line value separates a sharp, after five settled bets.
        </span>
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-[clamp(3.5rem,9vw,5.5rem)] leading-none text-muted-foreground tabular-nums">
          0.61
        </span>
        <span className="max-w-[30ch] text-base leading-7 text-muted-foreground">
          The best realized profit and loss ever manages, and it needs a hundred.
        </span>
      </div>
    </div>
  );
}

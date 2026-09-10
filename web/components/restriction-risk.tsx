import type { ReactNode } from "react";
import { Prose, Subhead } from "@/components/ui/prose";

/**
 * The qualitative half of the threshold argument. Everything else in this
 * section prices a false positive in money. This is the part the cost model
 * cannot see, and it pushes the same way.
 */
export function RestrictionRisk(): ReactNode {
  return (
    <Prose>
      <Subhead>Why restricting a sharp is more dangerous than it looks</Subhead>
      <p className="text-base leading-8">
        Sharp bettors are usually the customers who understand the mechanics of a book best.
        They tend to specialise, and they specialise in the markets a book prices least
        confidently, which are the same markets it charges the most margin on. Those markets
        exist for people who want a fast result or who follow something niche, and the pricing
        behind them is often further behind the curve.
      </p>
      <p className="text-base leading-8">
        Sharps are also market makers on the customer side. They are visible in the betting
        community and their opinions carry weight. Restrict one too early and the cost is not
        just the handle you turned away. They talk, publicly, and the reputational damage can
        run well past whatever that account was ever going to win.
      </p>
      <p className="text-base leading-8">
        That asymmetry is why the threshold matters more than the detector. Everything above
        prices one side of a false positive, the money. It cannot price the rest: a profitable
        customer lost, and a public argument the book did not need to have. Both push the same
        way, toward a rule that is efficient and deliberately conservative rather than simply
        aggressive.
      </p>
    </Prose>
  );
}

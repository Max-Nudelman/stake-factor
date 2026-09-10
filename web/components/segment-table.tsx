import type { ReactNode } from "react";
import { specOf, type Archetype } from "@/lib/archetypes";
import type { SegmentSummary } from "@/lib/detect";
import { count, money, percent, signedPercent } from "@/lib/format";

export interface SegmentTableProps {
  segments: SegmentSummary[];
}

export function SegmentTable({ segments }: SegmentTableProps): ReactNode {
  const ordered: SegmentSummary[] = [...segments].sort(
    (a: SegmentSummary, b: SegmentSummary): number => b.bookPnl - a.bookPnl,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-base leading-6">
        <caption className="mb-4 text-left text-base leading-6 text-muted-foreground">
          Ordered by what the book takes. Hold is the book&apos;s margin on that segment, so a
          negative hold is money leaving the building.
        </caption>
        <thead>
          <tr className="border-b border-border text-left font-sans text-muted-foreground">
            <th scope="col" className="py-2 pr-6 font-normal">Segment</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Accounts</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Bets</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Handle</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Book profit</th>
            <th scope="col" className="py-2 pr-6 text-right font-normal">Hold</th>
            <th scope="col" className="py-2 text-right font-normal">Mean CLV</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((row: SegmentSummary): ReactNode => {
            const kind: Archetype = row.kind;
            return (
              <tr key={kind} className="border-b border-border align-top">
                <th scope="row" className="py-4 pr-6 text-left font-normal">
                  <span className="block">{specOf(kind).label}</span>
                  <span className="block max-w-[48ch] text-muted-foreground">
                    {specOf(kind).description}
                  </span>
                </th>
                <td className="py-4 pr-6 text-right font-mono tabular-nums">{count(row.accounts)}</td>
                <td className="py-4 pr-6 text-right font-mono tabular-nums">{count(row.bets)}</td>
                <td className="py-4 pr-6 text-right font-mono tabular-nums">{money(row.handle)}</td>
                <td className="py-4 pr-6 text-right font-mono tabular-nums">{money(row.bookPnl)}</td>
                <td className="py-4 pr-6 text-right font-mono tabular-nums">{percent(row.bookHold, 2)}</td>
                <td className="py-4 text-right font-mono tabular-nums">{signedPercent(row.meanClv, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

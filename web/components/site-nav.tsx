import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
}

const ITEMS: NavItem[] = [
  { href: "#market", label: "The market" },
  { href: "#segments", label: "Segments" },
  { href: "#signal", label: "The signal" },
  { href: "#detection", label: "Detection" },
  { href: "#policy", label: "Policy" },
  { href: "#method", label: "Method" },
];

export function SiteNav(): ReactNode {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
        <span className="font-mono text-base leading-6">Stake Factor</span>
        <span className="flex flex-wrap gap-x-6 gap-y-2">
          {ITEMS.map((item: NavItem): ReactNode => (
            <a
              key={item.href}
              href={item.href}
              className="text-base leading-6 text-muted-foreground hover:text-brand-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {item.label}
            </a>
          ))}
        </span>
      </div>
    </nav>
  );
}

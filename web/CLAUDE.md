# Stake Factor, web

The interactive write-up for this repository's analysis. It runs the model in the browser
rather than replaying figures: `lib/simulate.ts` and `lib/detect.ts` are ports of
`src/simulate.py` and `src/detect.py` one level up, and they bet into the real market layer
in `data/market-layer.json`.

Audience is recruiters and interviewers at sportsbooks, so precision beats decoration and
every number on the page has to be traceable to a file in this repo.

## Stack

- Next.js, App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint and format | `npm run lint` |

## UI work

`DESIGN.md` is the strict source of truth for all component implementation and styling. Read it before writing markup or CSS. Do not improvise design system tokens; if a value is missing, add it to `DESIGN.md` first.

Its values mirror `max-portfolio/assets/css/style.css`, because this page ships inside that
site. Changing a colour or a face here without changing it there is a bug, not a variation.

## Deploying

`npm run build:portfolio` and `npm run build:standalone` produce the two static exports. See
the Publishing section of `README.md`. Never run a build while `next dev` is running; they
fight over `.next` and the export silently comes out empty.

## Code style

- Functional components only.
- Explicit TypeScript types. No implicit `any`, and every exported surface is annotated.
- Components are atomic and live in `/components/ui`.

## Prohibitions

- No inline styles. Tailwind utility classes mapped to design tokens, always.
- No third party UI or layout packages without explicit permission. Adding a shadcn/ui component through its own CLI does not count as a third party install.
- No odd-numbered Tailwind spacing utilities. The grid is 8px, so `p-3` and `p-5` are off grid.

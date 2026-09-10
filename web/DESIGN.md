# DESIGN.md

Source of truth for UI implementation in this project. Do not improvise design system tokens. If a value you need is not here, add it here first, then use it.

Generated from the `frontend-design-principles` skill (brand spec v1.0.0). Judgment rules live in that skill; concrete values live in this file.

## Principles that constrain every component

1. **Grounding.** Layout, headers, and cards are anchored in real content and the actual audience. No filler, no lorem ipsum, no placeholder imagery.
2. **Typography.** Two font families, total. Active headlines, short sentences, line length under 80 characters. No single word accents, no fake semantic labels, no all caps eyebrows.
3. **Structure.** A line, border, or alternating color is allowed only where it encodes a real informational split or sequence. Decoration is not a reason.
4. **Motion.** Non user triggered animation is reserved for singular focal moments. Generic loading shimmers and page entry animations are prohibited unless functional.
5. **Two passes.** Pass 1 plans structure, tokens, and copy constraints. Pass 2 reviews against these limits and rewrites copy to minimalism in active voice.

## Token contract

Tailwind v4. Tokens are declared once in `app/globals.css` and consumed as utility classes.
Never hardcode a hex value in a component.

**These values are taken from `max-portfolio/assets/css/style.css`.** This page is part of
that site, so the two files have to agree. Changing a value here without changing it there is
a bug, not a variation.

```css
:root {
  /* Surfaces */
  --background: #0B0D10;   /* portfolio --ink   */
  --foreground: #E8EAED;   /* portfolio --text  */
  --card: #121519;         /* portfolio --ink-2 */
  --accent: #1B2027;       /* portfolio --ink-3, hovered surfaces */

  /* Primary: main interactive elements and primary text */
  --primary: #E8EAED;
  --primary-hover: #FFFFFF;
  --primary-foreground: #0B0D10;

  /* Brand accent: clickable, selected, focused. Not a surface. */
  --brand-accent: #5EE6A8;         /* portfolio --accent, mint */
  --brand-accent-foreground: #0B0D10;
  --brand-accent-dim: #2C6E52;

  /* Text ramp */
  --muted-foreground: #A0A8B4;     /* portfolio --text-2 */
  --subtle-foreground: #6C7684;    /* portfolio --text-3, captions */

  /* Status. Status only, never decoration. */
  --success: #5EE6A8;
  --warning: #F5A524;              /* portfolio --warn */
  --destructive: #F5646C;

  /* Lines and focus */
  --border: #262C35;               /* portfolio --line */
  --ring: #5EE6A8;

  --radius: 6px;

  /* Data series, stepped for the dark ground. See "Data visualisation". */
  --series-1: #D95926;
  --series-2: #3987E5;
  --grid-line: #262C35;
}
```

## Color usage rules

| Token | Allowed use | Never |
|---|---|---|
| `primary` | Main interactive elements, primary text | Backgrounds of large regions |
| `brand-accent` | Links, selection, focus rings, the single hero figure | Decorative fills, hover surfaces, chart marks |
| `success` / `warning` / `destructive` | Status of a real thing | Positive framing, emphasis, chart series |
| `card` | Raised groupings of controls | Page background, wrapping a chart |
| `accent` | Hovered surfaces | Anything at rest |
| `border` | Real informational splits | Decorative rules |
| `series-1` / `series-2` | Chart marks | Interface chrome, text |

Mint is the one colour that means "you can click this". It is spent on interaction and on
the single hero number, and nowhere else. That is why no chart mark is mint.

## Typography

Three faces, matching the portfolio: **Instrument Serif** for display, **Inter** for reading,
**IBM Plex Mono** for anything numeric.

**This deliberately breaks the two family limit in the skill's principles.** The reason is
principle 1, grounding: the live site at max-nudelman.github.io already publishes these three,
and a page that dropped the serif to satisfy a generic cap would look like a different
author's work. Each face has a distinct job and none is decorative. Do not add a fourth.

| Level | Class | Face |
|---|---|---|
| H1 | `display text-[clamp(2.6rem,7vw,4.4rem)]` | Instrument Serif, 400 |
| H2 | `display text-[clamp(1.9rem,4vw,2.6rem)]` | Instrument Serif, 400 |
| Hero figure | `font-mono text-[clamp(3.5rem,10vw,6.5rem)]` | Plex Mono |
| Body | `text-base leading-7` | Inter |
| Data | `font-mono tabular-nums` | Plex Mono |

The `.display` class in `globals.css` carries the serif's weight, tracking and 1.06 line
height. Reading blocks cap at `max-w-[72ch]`; the standfirst caps at `max-w-[68ch]`.

## Layout and spacing

8px baseline grid. Every margin, padding, and gap is a multiple of 8, which in Tailwind means even-numbered spacing utilities: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px). Odd utilities such as `p-3` and `p-5` are off grid and prohibited.

Page container: `mx-auto max-w-[1120px] px-6`, matching the portfolio's `--page`.

Shadows are shallow and flat, `shadow-flat` only. No multi layered blurs, no colored shadows.

## Components

**Sections, not boxes.** A `Section` is a top rule plus a serif heading, and its content sits
on the page ground. Charts read at full width that way. Reach for `Card` only where a real
grouping of controls needs lifting off the page, which in this project is the run panel and
nothing else. A box drawn around a chart adds a border that separates nothing.

**Buttons.** `rounded-[6px]`. Active and hover states shift colour instantly, so no
`transition-*` on colour.

**Focus.** Every interactive element shows `focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2`. Accessibility, not decoration, and not optional.

## Derived values

The portfolio stylesheet did not define these, because a static site does not need them.
They are marked so they can be overridden without archaeology.

| Token | Chosen | Reasoning |
|---|---|---|
| `--primary` | `#E8EAED` | On a dark ground the primary interactive fill is the text colour, not the near black. Its foreground is `#0B0D10`, so a primary button reads as an inverted chip. |
| `--destructive` | `#F5646C` | The portfolio defines no error colour. This is its amber `--warn` rotated to red at the same lightness, so it holds contrast on `#0B0D10` where a standard red does not. |
| `--subtle-foreground` | `#6C7684` | The portfolio's `--text-3`. Named separately from `--muted-foreground` because captions and chart labels need a third step, and shadcn only ships two. |
| `--radius` | `6px` | Softer than the 4px in the original brand spec, matching the portfolio's own corners. |

## Data visualisation

| Token | Value | Use |
|---|---|---|
| `series-1` | `#D95926` | The series a section is about. Adverse accounts, and closing line value. |
| `series-2` | `#3987E5` | The comparison series. Everyone else, and realized profit and loss. |
| `grid-line` | `#262C35` | Axis and gridlines. Same value as `border`, named separately so a chart can recede. |

**Why these two.** They are slots 2 and 1 of the validated categorical palette in the
`dataviz` skill, taken from that palette's **dark** column because this page has a dark
ground. Two series is the cap; a third would need a validator run this project has not done.

Mint and aqua are both excluded. Mint means "clickable" here, and aqua sits close enough to
mint to blur that meaning.

**Polarity is position.** Gains and losses are drawn against a zero baseline and read by which
side of the line a bar falls on. Status colours stay reserved, so nothing in a chart is green
or red.

**Identity is never colour alone.** Every series carries a direct label, and every chart has
its numbers available as a table.

## Light mode

Not defined. The portfolio is dark only, so this project ships dark only rather than inventing
a light ramp. Supply light values, and re-step the series colours against a light surface,
before any light variant is written.

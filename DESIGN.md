# Design

Visual system for lalida.me — **Warm Editorial Journal**. A trusted writer-researcher's page: literate, warm, calm, credible. Design IS the product (brand register).

## Theme

Light, warm, editorial. Physical scene: a well-made printed field guide or a thoughtful essay in a good magazine, read in soft daylight. Authority through typography, hierarchy, and restraint; warmth through a committed terracotta accent, a real serif, and generous space — never through pastels or effects.

Color strategy: **Committed accent on warm paper.** A single warm paper surface carries most of the page; terracotta is the one identity color, used deliberately (rules, links, one door, key marks). Sage is a quiet secondary for the second door and small accents. Everything is OKLCH.

## Color Palette

Tokens (CSS custom properties, OKLCH):

| Token | OKLCH | Role |
|---|---|---|
| `--paper` | `oklch(0.976 0.007 75)` | Page background — warm off-white, low chroma toward the brand's warm hue (not generic cream) |
| `--surface` | `oklch(0.955 0.011 70)` | Raised panels, alternating sections |
| `--surface-sage` | `oklch(0.955 0.018 150)` | The "For teams" door / cool-side panels |
| `--ink` | `oklch(0.27 0.018 55)` | Primary text — warm espresso near-black (not pure black) |
| `--ink-soft` | `oklch(0.44 0.017 55)` | Secondary text, meta — verified ≥ 4.5:1 on `--paper` |
| `--ink-faint` | `oklch(0.56 0.014 55)` | Captions, timestamps — use only ≥ ~14px |
| `--terracotta` | `oklch(0.585 0.135 42)` | Primary accent — clay/terracotta |
| `--terracotta-deep` | `oklch(0.485 0.13 40)` | Accent text on paper needing 4.5:1 (links) |
| `--terracotta-wash` | `oklch(0.94 0.03 45)` | Tint fills behind terracotta elements |
| `--sage` | `oklch(0.58 0.045 155)` | Secondary accent |
| `--sage-deep` | `oklch(0.44 0.045 158)` | Sage text needing contrast |
| `--line` | `oklch(0.885 0.012 65)` | Hairline borders, rules |

Contrast: `--ink` and `--ink-soft` on `--paper`/`--surface` clear AA for body. `--terracotta-deep` for any terracotta text at body size; base `--terracotta` only for large text, fills, and non-text marks. Placeholder/caption text never below `--ink-faint`.

## Typography

Contrast pairing (serif display + humanist sans), not two similar sans.

- `--font-display`: **Fraunces** (variable serif, high optical warmth; opsz + soft weight). Hero, section headings, pull-quotes. Load weights ~400/500/600 + italic; use higher `opsz` at display sizes.
- `--font-body`: **Inter**. Body, meta, labels, nav. Weights 400/500/600.

Rules:
- Display heading clamp max ≤ 6rem; letter-spacing ≥ -0.03em (Fraunces is soft — around -0.01 to -0.02em is plenty). Use `text-wrap: balance` on h1–h3.
- Body 1rem–1.125rem, line-height ~1.65, measure capped 65–72ch, `text-wrap: pretty`.
- Kickers/labels: Inter, small caps or uppercase with modest tracking — used **sparingly** (not an eyebrow above every section; the brand ban applies). One deliberate label style, deployed only where it earns its place.
- Fraunces italic is the warmth lever for pull-quotes and the throughline line.

## Layout

- Editorial column grid: content max-width ~1120px; text blocks constrained to a readable measure inside wider section frames.
- Generous, varied vertical rhythm (section padding scales with clamp); alternate `--paper` and `--surface` bands for cadence — not uniform blocks.
- **Two doors**: a two-column feature ("For parents" / "For teams") is the signature hub element — terracotta side + sage side, equal weight.
- Selected Work: editorial case entries (title, impact, press links, screenshot) — generous, not neon carousels. Flexbox/grid as fits; `repeat(auto-fit, minmax(280px, 1fr))` for card-free responsive rows.
- Testimonials from real quotes set as large Fraunces-italic pull-quotes.
- Radii restrained: 10–14px on panels/images; pill only for tags/buttons. No 24px+ card rounding. Arch/rounded-top frame permitted for the portrait as an editorial motif.
- Semantic z-index scale; no arbitrary 9999.

## Motion

Calm and intentional. Ease-out (quart/quint), no bounce.
- Gentle on-scroll reveals that **enhance already-visible content** (never gate visibility): small translate + fade, staggered within a list where it fits the content, not one uniform reflex on every section.
- Hover: subtle lift/underline-grow on links and case entries; terracotta underline animation on nav/links.
- Every animation has a `prefers-reduced-motion: reduce` fallback (instant/crossfade). Nothing blocks reading.

## Components

- **Nav**: text nav, terracotta active/hover underline. Sticky, quiet.
- **Buttons**: primary = terracotta fill on paper (ink or paper text at AA); secondary = ink outline 1px OR sage. One border OR one ≤8px shadow, never both (avoid ghost-card).
- **Case entry**: heading (Fraunces) + impact paragraph + inline press links (terracotta-deep) + screenshot in a soft frame.
- **Two-door panels**: terracotta-wash / sage-tinted surfaces, each with heading, one-line promise, and its own CTA set.
- **Pull-quote**: large Fraunces italic, terracotta rule or mark, attribution in Inter meta.
- **Timeline / experience**: full-border or hairline-separated entries — never a colored left-stripe (brand ban).
- **Social row**: TikTok / Instagram / YouTube / LinkedIn / email as clean labeled links.

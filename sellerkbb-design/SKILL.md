---
name: sellerkbb-design
description: Design system skill for sellerkbb. Activate when building UI components, pages, or any visual elements. Provides exact color tokens, typography scale, spacing grid, component patterns, and craft rules. Read references/DESIGN.md before writing any CSS or JSX.
---

# sellerkbb Design System

You are building UI for **sellerkbb**. Light-themed, warm palette, sans-serif typography (Be Vietnam Pro), compact density on a 4px grid, expressive motion.

## Visual Reference

**IMPORTANT**: Study ALL screenshots below before writing any UI. Match colors, typography, spacing, layout, and motion exactly as shown.

### Homepage

![sellerkbb Homepage](screenshots/homepage.png)

> Read `references/DESIGN.md` for full token details.

## Design Philosophy

- **Layered depth** — use shadow tokens to create a sense of physical layering. Each elevation level has a specific shadow.
- **Gradient accents** — gradients are used thoughtfully for emphasis, not decoration.
- **Single typeface** — Be Vietnam Pro carries all text. Hierarchy comes from size, weight, and color — never font mixing.
- **compact density** — 4px base grid. Every dimension is a multiple of 4.
- **warm palette** — the color temperature runs warm, matching the sans-serif typography.
- **Restrained accent** — `#e7abc7` is the only pop of color. Used exclusively for CTAs, links, focus rings, and active states.
- **Expressive motion** — animations are an integral part of the experience. Use spring physics and layout animations.

## Color System

### Core Palette

| Role | Token | Hex | Use |
|------|-------|-----|-----|
| Background | `--background` | `#f0faf6` | Page/app background |
| Surface | `--surface` | `#ffffff` | Cards, panels, modals |
| Text Muted | `--text-muted` | `#58394a` | Captions, placeholders |
| Accent | `--accent` | `#e7abc7` | CTAs, links, focus rings |
| Border | `--border` | `#604654` | Dividers, card borders |

### Status Colors

| Status | Hex | Use |
|--------|-----|-----|
| Success | `#2f6d50` | Confirmations, positive trends |
| Danger | `#f8c4dc` | Errors, destructive actions |

### Extended Palette

- `#a65a7b`
- `#a34773`
- **muted:** `#715665` — Secondary text, placeholder text
- **text:** `#422d38`
- `#8d4969`
- `#cce7dd`
- **muted:** `#856d79` — Secondary text, placeholder text
- `#7c6070`

### CSS Variable Tokens

```css
--muted: #856d79;
--accent: #eb8db9;
--accent-strong: #d96ca3;
--accent-soft: #fde4f0;
--muted: #7d7077;
--accent: #d86f9f;
--accent-strong: #c75f90;
--accent-soft: #f8e7ef;
--muted: #88717d;
--accent: #e7a3c0;
--accent-strong: #d77ca5;
--accent-soft: #fdeaf2;
--muted: #75616b;
```

## Typography

### Font Stack

- **Be Vietnam Pro** — Heading 1, Heading 2, Body, Caption

### Font Sources

```css
@font-face {
  font-family: "Be Vietnam Pro";
  src: url("fonts/BeVietnamPro-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Be Vietnam Pro";
  src: url("fonts/BeVietnamPro-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

### Type Scale

| Role | Family | Size | Weight |
|------|--------|------|--------|
| Heading 1 | Be Vietnam Pro | 28px | 700 |
| Heading 2 | Be Vietnam Pro | 24px | 700 |
| Body | Be Vietnam Pro | 10.5px | 400 |
| Caption | Be Vietnam Pro | 12px | 400 |

### Typography Rules

- All text uses **Be Vietnam Pro** — never add another font family
- Max 3-4 font sizes per screen
- Headings: weight 600-700, body: weight 400
- Use color and opacity for text hierarchy, not additional font sizes
- Line height: 1.5 for body, 1.2 for headings

## Spacing & Layout

### Base Grid: 4px

Every dimension (margin, padding, gap, width, height) must be a multiple of **4px**.

### Spacing Scale

`2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24` px

### Spacing as Meaning

| Spacing | Use |
|---------|-----|
| 4-8px | Tight: related items (icon + label, avatar + name) |
| 12-16px | Medium: between groups within a section |
| 24-32px | Wide: between distinct sections |
| 48px+ | Vast: major page section breaks |

### Border Radius

Scale: `2px, 4px, 6px, 7px, 8px, 9px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 999px, inherit`
Default: `12px`

### Container

Max-width: `1100px`, centered with auto margins.

### Breakpoints

| Name | Value |
|------|-------|
| xs | 340px |
| xs | 350px |
| xs | 360px |
| xs | 420px |
| xs | 430px |
| xs | 480px |
| sm | 520px |
| md | 700px |
| md | 701px |
| lg | 900px |
| lg | 1000px |
| xl | 1050px |
| xl | 1100px |

Mobile-first: design for small screens, layer on responsive overrides.

## Component Patterns

### Card

```css
.card {
  background: #ffffff;
  border: 1px solid #604654;
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-md);
}
```

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
```

### Button

```css
/* Primary */
.btn-primary {
  background: #e7abc7;
  color: #cccccc;
  border-radius: 12px;
  padding: 8px 16px;
  font-weight: 500;
  transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.9; }

/* Ghost */
.btn-ghost {
  background: transparent;
  border: 1px solid #604654;
  color: #cccccc;
  border-radius: 12px;
  padding: 8px 16px;
}
```

```html
<button class="btn-primary">Get Started</button>
<button class="btn-ghost">Learn More</button>
```

### Input

```css
.input {
  background: #f0faf6;
  border: 1px solid #604654;
  border-radius: 12px;
  padding: 8px 12px;
  color: #cccccc;
  font-size: 14px;
}
.input:focus { border-color: #e7abc7; outline: none; }
```

```html
<input class="input" type="text" placeholder="Search..." />
```

### Badge / Chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  background: #ffffff;
  color: #58394a;
}
```

```html
<span class="badge">New</span>
<span class="badge">Beta</span>
```

### Modal / Dialog

```css
.modal-backdrop { background: rgba(0, 0, 0, 0.6); }
.modal {
  background: #ffffff;
  border: 1px solid #604654;
  border-radius: inherit;
  padding: 24px;
  max-width: 480px;
  width: 90vw;
  box-shadow: 0 3px 10px rgba(144,77,111,.04);
}
```

```html
<div class="modal-backdrop">
  <div class="modal">
    <h2>Dialog Title</h2>
    <p>Dialog content.</p>
    <button class="btn-primary">Confirm</button>
    <button class="btn-ghost">Cancel</button>
  </div>
</div>
```

### Table

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 500;
  font-size: 12px;
  color: #58394a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #604654;
}
.table td {
  padding: 12px;
  border-bottom: 1px solid #604654;
}
```

```html
<table class="table">
  <thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>
    <tr><td>Item One</td><td>Active</td><td>Jan 1</td></tr>
    <tr><td>Item Two</td><td>Pending</td><td>Jan 2</td></tr>
  </tbody>
</table>
```

### Navigation

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #604654;
}
.nav-link {
  color: #58394a;
  padding: 8px 12px;
  border-radius: 12px;
  transition: color 150ms;
}
.nav-link.active { color: #e7abc7; }
```

```html
<nav class="nav">
  <a href="/" class="nav-link active">Home</a>
  <a href="/about" class="nav-link">About</a>
  <a href="/pricing" class="nav-link">Pricing</a>
  <button class="btn-primary" style="margin-left: auto">Get Started</button>
</nav>
```

### Extracted Components

These components were found in the codebase:

**Button** (`html`)

**Card** (`html`)
- Variants: `open-note`

**Badge** (`html`)

**Modal** (`html`)

**List** (`html`)

## Page Structure

The following page sections were detected:

- **Navigation** — Top navigation bar
- **Hero** — Hero/banner section with headline and CTAs
- **Stats** — Statistics/metrics display
- **Cards** — Grid of 38 card elements (38 items)

When building pages, follow this section order and structure.

## Animation & Motion

This project uses **expressive motion**. Animations are part of the design language.

### CSS Animations

- `data-refresh-spin`
- `account-modal-in`
- `section-enter`
- `statusDotPulse`
- `sync-spin`

### Motion Tokens

- **Duration scale:** `.001ms`, `120ms`, `140ms`, `150ms`, `160ms`, `180ms`, `200ms`, `220ms`, `240ms`, `350ms`
- **Easing functions:** `ease`, `cubic-bezier(.22,.61,.36,1)`, `ease-out`
- **Animated properties:** `transform`, `box-shadow`, `border-color`, `background-color`, `opacity`, `color`

### Motion Guidelines

- **Duration:** Use values from the duration scale above. Short (.001ms) for micro-interactions, long (350ms) for page transitions
- **Easing:** Use `ease` as the default easing curve
- **Direction:** Elements enter from bottom/right, exit to top/left
- **Reduced motion:** Always respect `prefers-reduced-motion` — disable animations when set

## Depth & Elevation

### Shadow Tokens

- Subtle: `0 1px 2px rgba(67,42,54,.025)`
- Subtle: `inset 0 0 0 1px #e0bdcd`
- Subtle: `0 0 0 2px rgba(216,111,159,.08)`
- Raised (cards, buttons): `var(--shadow-md)`
- Raised (cards, buttons): `var(--shadow-sm)`
- Raised (cards, buttons): `0 0 0 4px rgba(238,147,189,.12)`

### Z-Index Scale

`1, 2, 10, 20, 39, 40, 90, 115, 120`

Use these exact values — never invent z-index values.

## Anti-Patterns (Never Do)

- **No blur effects** — no backdrop-blur, no filter: blur()
- **No zebra striping** — tables and lists use borders for separation
- **No invented colors** — every hex value must come from the palette above
- **No arbitrary spacing** — every dimension is a multiple of 4px
- **No extra fonts** — only Be Vietnam Pro are allowed
- **No arbitrary border-radius** — use the scale: 2px, 4px, 6px, 7px, 8px, 9px, 10px, 11px, 12px, 13px
- **No opacity for disabled states** — use muted colors instead

## Workflow

1. **Read** `references/DESIGN.md` before writing any UI code
2. **Pick colors** from the Color System section — never invent new ones
3. **Set typography** — Be Vietnam Pro only, using the type scale
4. **Build layout** on the 4px grid — check every margin, padding, gap
5. **Match components** to patterns above before creating new ones
6. **Apply elevation** — use shadow tokens
7. **Validate** — every value traces back to a design token. No magic numbers.

## Brand Spec

- **Favicon:** `/khangbaby-mascot.png`
- **Site URL:** `https://sellerkbb.doanhsokpis.workers.dev/`
- **Brand color:** `#e7abc7`
- **Brand typeface:** Be Vietnam Pro

## Quick Reference

```
Background:     #f0faf6
Surface:        #ffffff
Text:           (not extracted) / #58394a
Accent:         #e7abc7
Border:         #604654
Font:           Be Vietnam Pro
Spacing:        4px grid
Radius:         12px
Components:     9 detected
```

## When to Trigger

Activate this skill when:
- Creating new components, pages, or visual elements for sellerkbb
- Writing CSS, Tailwind classes, styled-components, or inline styles
- Building page layouts, templates, or responsive designs
- Reviewing UI code for design consistency
- The user mentions "sellerkbb" design, style, UI, or theme
- Generating mockups, wireframes, or visual prototypes

---

# Full Reference Files

> Every output file is embedded below. Claude has full design system context from /skills alone.

## Design System Tokens (DESIGN.md)

# sellerkbb DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 20 · Fonts: 1 · Components: 9
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: expressive

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![sellerkbb Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a warm, approachable feel. The light background emphasizes content clarity. Typography uses **Be Vietnam Pro** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. The palette is predominantly monochromatic with **#e7abc7** as the single accent color — used sparingly for interactive elements and emphasis. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#f0faf6` | background | Page background, darkest surface |
| surface | `#ffffff` | surface | Card and panel backgrounds |
| surface-strong | `#fde8f2` | surface | Card and panel backgrounds |
| surface | `#fff9e9` | surface | Card and panel backgrounds |
| text-muted | `#58394a` | text-muted | Captions, placeholders, secondary info |
| border | `#604654` | border | Dividers, card borders, outlines |
| accent | `#e7abc7` | accent | CTAs, links, focus rings, active states |
| danger | `#f8c4dc` | danger | Error states, destructive actions |
| success | `#2f6d50` | success | Success states, positive indicators |
| unknown | `#a65a7b` | unknown | Palette color |
| unknown | `#a34773` | unknown | Palette color |
| muted | `#715665` | unknown | Palette color |
| text | `#422d38` | unknown | Palette color |
| unknown | `#8d4969` | unknown | Palette color |
| unknown | `#cce7dd` | unknown | Palette color |
| muted | `#856d79` | unknown | Palette color |
| unknown | `#7c6070` | unknown | Palette color |
| unknown | `#bfe8d1` | unknown | Palette color |
| unknown | `#8d4356` | unknown | Palette color |
| unknown | `#f8d6de` | unknown | Palette color |

### CSS Variable Tokens

```css
--muted: #856d79;
--accent: #eb8db9;
--accent-strong: #d96ca3;
--accent-soft: #fde4f0;
--muted: #7d7077;
--accent: #d86f9f;
--accent-strong: #c75f90;
--accent-soft: #f8e7ef;
--muted: #88717d;
--accent: #e7a3c0;
--accent-strong: #d77ca5;
--accent-soft: #fdeaf2;
--muted: #75616b;
```


---

## 3. Typography Rules

**Font Stack:**
- **Be Vietnam Pro** — Heading 1, Heading 2, Body, Caption

**Font Sources:**

```css
@font-face {
  font-family: "Be Vietnam Pro";
  src: url("fonts/BeVietnamPro-Bold.ttf") format("truetype");
  font-weight: 700;
}
@font-face {
  font-family: "Be Vietnam Pro";
  src: url("fonts/BeVietnamPro-Regular.ttf") format("truetype");
  font-weight: 400;
}
```

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | Be Vietnam Pro | 28px | 700 |
| Heading 2 | Be Vietnam Pro | 24px | 700 |
| Body | Be Vietnam Pro | 10.5px | 400 |
| Caption | Be Vietnam Pro | 12px | 400 |

**Typographic Rules:**
- Use **Be Vietnam Pro** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

### Navigation (1)

**Navigation** — `html`

### Data Display (3)

**Card** — `html`
- Variants: `open-note`

**Badge** — `html`

**List** — `html`

### Data Input (2)

**Button** — `html`
- Animation: 

**Input** — `html`
- State: :focus, :placeholder

### Overlay (1)

**Modal** — `html`

### Media (2)

**Image** — `html`

**Map/Canvas** — `html`



---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** 2px, 4px, 6px, 7px, 8px, 9px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 18px, 999px, inherit
- **Max content width:** 1100px

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `0 1px 2px rgba(67,42,54,.025)`
- `inset 0 0 0 1px #e0bdcd`
- `0 0 0 2px rgba(216,111,159,.08)`

### Raised — cards, buttons, interactive elements

- `var(--shadow-md)`
- `var(--shadow-sm)`
- `0 0 0 4px rgba(238,147,189,.12)`

### Floating — dropdowns, popovers, modals

- `0 3px 10px rgba(144,77,111,.04)`
- `0 6px 17px rgba(190,89,140,.09)`
- `0 7px 18px rgba(189,78,132,.15)`

### Overlay — full-screen overlays, top-level dialogs

- `0 10px 22px rgba(189,78,132,.2)`
- `0 24px 70px rgba(100,61,80,.22)`
- `inset 4px 0 0#d56e9e,0 18px 46px rgba(151,88,117,.20),0 5px 14px rgba(126,72,97,.11)`

### Z-Index Scale

`1, 2, 10, 20, 39, 40, 90, 115, 120`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes data-refresh-spin`
- `@keyframes account-modal-in`
- `@keyframes section-enter`
- `@keyframes statusDotPulse`
- `@keyframes sync-spin`
- `@keyframes dialog-enter`

### Animated Components

- **Button**: 

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#e7abc7` for interactive elements (buttons, links, focus rings)
- Use `#f0faf6` as the primary page background
- Use **Be Vietnam Pro** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 2px, 4px, 6px, 7px, 8px
- Reuse existing components from Section 4 before creating new ones

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use Be Vietnam Pro consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't duplicate component patterns — check Section 4 first
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| xs | 340px | css |
| xs | 350px | css |
| xs | 360px | css |
| xs | 420px | css |
| xs | 430px | css |
| xs | 480px | css |
| sm | 520px | css |
| md | 700px | css |
| md | 701px | css |
| lg | 900px | css |
| lg | 1000px | css |
| xl | 1050px | css |
| xl | 1100px | css |

**Approach:** Use `@media (min-width: ...)` queries matching the breakpoints above.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #ffffff
Border: 1px solid #604654
Radius: 12px
Padding: 16px
Font: Be Vietnam Pro
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg #e7abc7, text white
Ghost: bg transparent, border #604654
Padding: 8px 16px
Radius: 12px
Hover: opacity 0.9 or lighter shade
Focus: ring with #e7abc7
```

### Build a Page Layout

```
Background: #f0faf6
Max-width: 1100px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #ffffff
Label: #58394a (muted, 12px, uppercase)
Value: var(--text-primary) (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #f0faf6
Input border: 1px solid #604654
Focus: border-color #e7abc7
Label: #58394a 12px
Spacing: 16px between fields
Radius: 12px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: Be Vietnam Pro, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

## Bundled Fonts (fonts/)

The following font files are bundled in the `fonts/` directory:

- `fonts/BeVietnamPro-Black.ttf`
- `fonts/BeVietnamPro-Bold.ttf`
- `fonts/BeVietnamPro-ExtraBold.ttf`
- `fonts/BeVietnamPro-ExtraLight.ttf`
- `fonts/BeVietnamPro-Light.ttf`
- `fonts/BeVietnamPro-Medium.ttf`
- `fonts/BeVietnamPro-Regular.ttf`
- `fonts/BeVietnamPro-SemiBold.ttf`
- `fonts/BeVietnamPro-Thin.ttf`

Use these local font files in `@font-face` declarations instead of fetching from Google Fonts.

## Homepage Screenshots (screenshots/)

![homepage.png](screenshots/homepage.png)


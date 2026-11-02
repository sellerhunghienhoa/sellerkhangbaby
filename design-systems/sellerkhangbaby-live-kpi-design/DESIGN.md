# sellerkhangbaby-live-kpi DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 20 · Fonts: 1 · Components: 0
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: expressive

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a neutral, approachable feel. The light background emphasizes content clarity. Typography uses **sans-serif** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 2, 4, 6, 8, 10, 12, 14, 16px. Motion is expressive — spring physics, layout animations, and staggered reveals are part of the visual language.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#ffffff` | background | Page background, darkest surface |
| surface | `#fffbeb` | surface | Card and panel backgrounds |
| text-primary | `#2a1220` | text-primary | Headings and body text |
| text-muted | `#94a3b8` | text-muted | Captions, placeholders, secondary info |
| border | `#6b5560` | border | Dividers, card borders, outlines |
| danger | `#e11d48` | danger | Error states, destructive actions |
| success | `#10b981` | success | Success states, positive indicators |
| warning | `#f59e0b` | warning | Warning states, caution indicators |
| info | `#a78bfa` | info | Informational highlights |
| unknown | `#f8f1f5` | unknown | Palette color |
| unknown | `#efc9da` | unknown | Palette color |
| unknown | `#ecfdf5` | unknown | Palette color |
| unknown | `#fb7185` | unknown | Palette color |
| unknown | `#fef3c7` | unknown | Palette color |
| unknown | `#fb923c` | unknown | Palette color |
| unknown | `#047857` | unknown | Palette color |
| unknown | `#7c3aed` | unknown | Palette color |
| unknown | `#e5e7eb` | unknown | Palette color |
| unknown | `#d97706` | unknown | Palette color |
| unknown | `#16a34a` | unknown | Palette color |

### CSS Variable Tokens

```css
--muted: #7A5266;
```


---

## 3. Typography Rules

**Font Stack:**
- **sans-serif** — Heading 1, Heading 2, Heading 3, Body, Caption

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | sans-serif | 31px | 700 |
| Heading 2 | sans-serif | 21px | 700 |
| Heading 3 | sans-serif | 20px | 700 |
| Body | sans-serif | 15.5px | 400 |
| Caption | sans-serif | 15px | 400 |

**Typographic Rules:**
- Use **sans-serif** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

No components detected. Scan `src/components/` or `components/` to populate this section.

---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24
- **Border radius:** 0 4px 4px 0, 0 12px 12px 0, 0 99px 99px 0, 0 0 4px 4px, 2px, 7px, 8px, 9px, 10px, 11px, 12px, 12px 0 0 12px, 13px, 14px, 16px, 18px, 20px, 22px, 24px, 24px 24px 0 0, 99px, 99px 0 0 99px, 999px
- **Max content width:** 100%

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

- `0 1px 2px rgba(0,0,0,0.12)`
- `0 1px 2px rgba(16,185,129,0.12)`
- `0 1px 2px rgba(15,23,42,.08),0 0 0 1px rgba(124,58,237,.15)`

### Raised — cards, buttons, interactive elements

- `var(--shadow)`
- `0 1px 3px rgba(15,23,42,.12)`
- `var(--shadow-lg)`

### Floating — dropdowns, popovers, modals

- `0 8px 18px rgba(236,72,153,.35)`
- `0 4px 14px rgba(236,72,153,.12)`
- `0 4px 12px rgba(236,72,153,.08)`

### Overlay — full-screen overlays, top-level dialogs

- `0 14px 36px rgba(225,29,72,.10)`
- `0 14px 36px rgba(217,119,6,.10)`
- `0 0 0 7px #EFF2FE,0 10px 24px rgba(99,102,241,0.14)`

### Z-Index Scale

`1, 2, 30, 60, 75, 80, 90, 150, 180, 200, 300`



---

## 7. Animation & Motion

This project uses **expressive motion**. Animations are an integral part of the experience.

### CSS Animations

- `@keyframes pop`
- `@keyframes pulseTimer`
- `@keyframes spinTimer`
- `@keyframes tabEnter`
- `@keyframes tabChildCascade`
- `@keyframes boot-spin`
- `@keyframes modalFadeIn`
- `@keyframes modalFadeOut`

### Motion Guidelines

- Duration: 150-300ms for micro-interactions, 300-500ms for page transitions
- Easing: `ease-out` for enters, `ease-in` for exits
- Always respect `prefers-reduced-motion`


---

## 8. Do's and Don'ts

### Do's

- Use `#ffffff` as the primary page background
- Use **sans-serif** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 0 4px 4px 0, 0 12px 12px 0, 0 99px 99px 0, 0 0 4px 4px, 2px

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use sans-serif consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

| Name | Value | Source |
|---|---|---|
| breakpoint-861px | 861px | css |

**Approach:** Use `@media (min-width: ...)` queries matching the breakpoints above.


---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #fffbeb
Border: 1px solid #6b5560
Radius: 12px 0 0 12px
Padding: 16px
Font: sans-serif
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg var(--accent), text white
Ghost: bg transparent, border #6b5560
Padding: 8px 16px
Radius: 12px 0 0 12px
Hover: opacity 0.9 or lighter shade
Focus: ring with var(--accent)
```

### Build a Page Layout

```
Background: #ffffff
Max-width: 100%, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #fffbeb
Label: #94a3b8 (muted, 12px, uppercase)
Value: #2a1220 (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #ffffff
Input border: 1px solid #6b5560
Focus: border-color var(--accent)
Label: #94a3b8 12px
Spacing: 16px between fields
Radius: 12px 0 0 12px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: sans-serif, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```

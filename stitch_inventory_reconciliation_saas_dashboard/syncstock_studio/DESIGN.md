---
name: SyncStock Studio
colors:
  surface: '#f8faf8'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f2'
  surface-container: '#eceeec'
  surface-container-high: '#e6e9e7'
  surface-container-highest: '#e1e3e1'
  on-surface: '#191c1b'
  on-surface-variant: '#424840'
  inverse-surface: '#2e3130'
  inverse-on-surface: '#eff1ef'
  outline: '#737970'
  outline-variant: '#c2c8be'
  surface-tint: '#446743'
  primary: '#446743'
  on-primary: '#ffffff'
  primary-container: '#b6deb1'
  on-primary-container: '#40633f'
  inverse-primary: '#a9d1a5'
  secondary: '#785561'
  on-secondary: '#ffffff'
  secondary-container: '#ffd1e0'
  on-secondary-container: '#7a5764'
  tertiary: '#70518e'
  on-tertiary: '#ffffff'
  tertiary-container: '#e6c8ff'
  on-tertiary-container: '#6d4d8a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5edbf'
  primary-fixed-dim: '#a9d1a5'
  on-primary-fixed: '#002105'
  on-primary-fixed-variant: '#2c4e2d'
  secondary-fixed: '#ffd9e5'
  secondary-fixed-dim: '#e7bbc9'
  on-secondary-fixed: '#2d131e'
  on-secondary-fixed-variant: '#5e3d4a'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb8fd'
  on-tertiary-fixed: '#290a45'
  on-tertiary-fixed-variant: '#573974'
  background: '#f8faf8'
  on-background: '#191c1b'
  surface-variant: '#e1e3e1'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  metric-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  metric-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.005em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-badge:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style

This design system is crafted for high-reliability, offline-first inventory and warehouse reconciliation platforms. Built for logistics managers, field operators, and inventory controllers, it eliminates the anxiety of network dropouts and data discrepancies with a serene, tactile, and precision-engineered interface.

The design movement blends **Calm Modern SaaS** with **Tactile Soft-Minimalism**:
- **Pristine, Pure Foundations:** Dominated by pure white `#FFFFFF` canvases framed by soft sage-tinted borders and gentle ambient depth.
- **Calibrated Pastel Accents:** Crisp mint greens blended seamlessly with pastel rose and lavender tints represent the balance of healthy reconciled states versus incoming or conflicting stock deltas.
- **Micro-tactile Pill Elements:** High visual distinction for sync lifecycle states (Synced, Offline Pending, Conflict, Reconciling) that feel reassuring, tangible, and physically grounded.
- **Subtle Glassmorphism:** Constrained strictly to top-level fixed navigation bars, floating search filters, and notification flyouts to maintain deep hierarchy without cluttering warehouse data density.

## Colors

The color palette shifts inventory management away from harsh utilitarian industrial tools into a calm, fatigue-reducing workspace. 

- **Primary (`#B6DEB1`):** A fresh, soft mint green grounding primary CTAs, active selections, and key metrics with welcoming contrast.
- **Secondary (`#FFD1E0`):** A delicate blush pink paired with mint for subtle gradient overlays, metric badges, and discrepancy alerts.
- **Tertiary (`#DFBAFF`):** A soft pastel lavender that adds secondary structural harmony and distinct contrast for special notification badges or feature tags.
- **Neutral (`#F8FAF8`):** An airy, tinted off-white backplane that cushions high-contrast white card containers.

### Application Rules
- **Gradient Accents:** Use the signature linear gradient (`135deg, #B6DEB1 0%, #FFD1E0 50%, #DFBAFF 100%`) sparingly—strictly on active metric highlights, sync completion banners, and elevated feature pills.
- **Sync State Hierarchy:** 
  - `Synced`: Sage mint token set (`state-synced-*`)
  - `Offline Pending`: Warm ochre token set (`state-pending-*`)
  - `Conflict`: Muted rose token set (`state-conflict-*`)
  - `Reconciling`: Soft lavender/indigo token set (`state-reconciling-*`)
- Data surfaces should remain `#FFFFFF` with `#E8EFEA` structural boundary strokes to preserve visual legibility during high-velocity stock scanning.

## Typography

The typographic system pairs the structural warmth of **Plus Jakarta Sans** for headlines and telemetry metrics with the neutral readability of **Inter** for dense data tables, logs, and interactive forms.

### Numeral & Data Alignment Guidelines
- **Tabular Figures:** All SKU quantities, unit costs, balance counts, and variance columns must strictly implement `font-variant-numeric: tabular-nums` to guarantee aligned decimal scanning across records.
- **Alignment System:**
  - **Left-aligned:** Entity descriptors, item names, SKUs, warehouse location codes, and audit notes.
  - **Right-aligned:** Stock counts, discrepancy quantities, delta margins, and currency columns.
  - **Center-aligned:** Status badges, operational pill indicators, sync state toggles, and row action groups.

## Layout & Spacing

The layout is built on an adaptive 12-column grid prioritizing data density without visual crowding.

- **Desktop (≥ 1280px):** 12-column grid with `2rem` outer page margins and `1.25rem` gutters. Persistent left-hand collapsible navigation drawer (width: 260px expanded, 72px collapsed).
- **Tablet (768px – 1279px):** 8-column layout with `1.5rem` margins and `1rem` gutters. Navigation contracts to a compact icon-rail or off-canvas drawer.
- **Mobile (< 768px):** 4-column fluid layout with `1rem` outer gutters. Reconciliation queues reflow into stacked cards with sticky offline/online status floating at the bottom.

### Rhythm Principles
- Metrics dashboards use consistent `1.25rem` (`unit-lg`) internal card padding.
- Dense reconciliation tables enforce a uniform `0.75rem` (`unit-sm`) vertical cell padding to optimize vertical screen efficiency during warehouse line audits.

## Elevation & Depth

This system avoids heavy shadows, utilizing translucent glass accents, crisp `#E8EFEA` structural outlines, and diffused multi-stage atmospheric drop-shadows.

### Hierarchy Layers
- **Ground Floor (`z-0`):** Soft, muted canvas background (`#F8FAF8`).
- **Surface Level 1 (`z-1` - Cards & Containers):** Pure white `#FFFFFF` cards, framed by a `1px` solid `#E8EFEA` boundary with an ambient shadow:
  `box-shadow: 0 1px 3px rgba(24, 34, 29, 0.03), 0 4px 12px rgba(24, 34, 29, 0.02)`.
- **Surface Level 2 (`z-10` - Hover States & Floating Toolbars):** Slight vertical lift with heightened softness:
  `box-shadow: 0 4px 16px rgba(24, 34, 29, 0.06), 0 1px 2px rgba(24, 34, 29, 0.04)`.
- **Glassmorphism Layer (`z-20` - Top Bar, Search Filters & Notification Flyouts):**
  - `background: rgba(255, 255, 255, 0.82)`
  - `backdrop-filter: blur(12px) saturate(160%)`
  - `border-bottom: 1px solid rgba(232, 239, 234, 0.8)`
  - Prevents foreground noise while maintaining situational context of underlying stock feeds.
- **Modal & Conflict Drawers (`z-50`):** Deep ambient spread:
  `box-shadow: 0 20px 48px -8px rgba(24, 34, 29, 0.12), 0 8px 16px -4px rgba(24, 34, 29, 0.04)`.

## Shapes

The design language uses generous, friendly curvature that feels approachable and human, counterbalancing dense financial and logistics figures.

- **Standard Cards & Data Modules:** Enforce a strict `16px` (`1rem`) border radius.
- **Sync Badges & Status Indicators:** Fully circular pill capsules (`9999px`) to create an immediate tactile distinction from rectilinear data cards.
- **Inputs & Dropdowns:** `10px` (`0.625rem`) for comfortable touch targets and ergonomic form entry.
- **Micro Chips & Filter Badges:** `8px` (`0.5rem`) radius with a clean `1px` border stroke.

## Components

### 1. Buttons
- **Primary Action:** Solid mint `#B6DEB1` surface, `#18221D` text, `10px` border radius, `0 1px 2px rgba(0,0,0,0.05)` elevation. On hover, background shifts with slight scale down on active press (`scale(0.98)`).
- **Secondary (Tertiary Accent):** Soft pastel lavender `#DFBAFF` with dark text. Ideal for secondary operational actions or highlights.
- **Outline / Neutral:** `#FFFFFF` background, `#E8EFEA` border stroke, `#18221D` text. Hover state initiates `#F8FAF8` surface tint.
- **Destructive:** Light rose background `#FEECEE` with `#A72638` text and `#FFD1E0` border.

### 2. Sync Status Pill Badges
Tactile indicator pills measuring `26px` in height with an internal `6px` status dot:
- **Synced:** Background `#EBF7EB`, border `#C4E8C2`, text `#266838`. Static emerald dot.
- **Offline Pending:** Background `#FFF9E6`, border `#FFE7A3`, text `#8D6208`. Static amber dot with queued badge counter.
- **Reconciling:** Background `#F5F0FE`, border `#E1D0FD`, text `#4D25B8`. Smooth animated pulse indicator dot (`scale(1 -> 1.3)` infinite).
- **Conflict:** Background `#FEECEE`, border `#FFD1E0`, text `#A72638`. Warning icon prefix.

### 3. Cards & Metric Tiles
- Pure `#FFFFFF` background with `16px` radius and `1px solid #E8EFEA` boundary.
- **Signature Highlight Metric:** Selected KPI tiles can utilize a soft inset gradient banner: `linear-gradient(135deg, rgba(182, 222, 177, 0.25) 0%, rgba(255, 209, 224, 0.25) 50%, rgba(223, 186, 255, 0.25) 100%)` along the card header to draw the eye to core throughput metrics.

### 4. Form Inputs & Search Fields
- Height: `40px` (desktop), `44px` (mobile touch compliance).
- Default: `#FFFFFF` fill with `1px solid #E8EFEA` border and `10px` radius. Placeholder text in `#8A998E`.
- Focus State: Border switches directly to `#B6DEB1` accompanied by a soft glow ring: `0 0 0 3px rgba(182, 222, 177, 0.35)`. Outline is disabled.

### 5. Reconciliation Data Tables
- Container framed in standard `16px` radius with `overflow: hidden`.
- Header row styled in `#F8FAF8` with `label-caps` typography (`#526056`).
- Row zebra striping is avoided; instead, use clean `1px solid #F0F4F1` dividers.
- Row hover triggers smooth `#F9FCF9` transition.
- Conflict rows highlight with a muted blush tint (`#FFF5F7`) and an interactive side-by-side discrepancy resolver slider.

### 6. Glass Top Bar & Notification Dropdowns
- Fixed floating header with `backdrop-filter: blur(12px) saturate(160%)` and `background: rgba(255, 255, 255, 0.85)`.
- Notification flyouts carry a distinct `16px` radius, `#FFFFFF` interior, and an ultra-fine border `1px solid #E8EFEA` with a prominent level 2 drop-shadow to separate from underlying dense grids.
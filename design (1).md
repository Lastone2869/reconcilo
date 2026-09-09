# Design System — Offline-First Inventory Reconciliation System (Reconcilo)

## 1. Purpose

This document defines the visual design language for the platform: color palette, typography, visual effects (glassmorphism, shadows, gradients), motion/animation guidelines, and the full page inventory.

**This version supersedes the previous design.md's color system.** The palette below is no longer a proposal — it is reverse-engineered from the actual Stitch-generated screens across all three delivered batches (25 screens, light + dark mode, desktop + mobile) and from the `DESIGN.md` token file Stitch itself produced for the project ("SyncStock Studio"). Every hex value here is already live in the shipped mockups. **Antigravity should treat this palette as the finalized reference — do not invent new brand hexes; pull from the tables below.**

Layout rhythm (sidebar + top bar + stat cards + activity feed) is inspired by the shared reference dashboard, but the color system, tone, and page set are custom to this project — this is an **inventory reconciliation platform**, not a generic project-management tool.

---

## 2. Design Philosophy

- **Fresh, cool, icy — never dull or earthy.** This is the single biggest correction from the previous draft. Neutrals are cool-cast near-whites and soft cool grays (a hint of green/blue undertone), not warm cream/beige. Text is a cool near-black, not a warm charcoal. Nothing in this system should read as "muted," "dusty," or "autumnal" — the target feeling is a crisp, clean, slightly refrigerated pastel, like frosted glass or mint over ice.
- **Calm, trustworthy, operational** — this is a tool people check under stress (conflicts, low stock, sync failures), so the palette stays soft and non-alarming even when surfacing problems.
- **Light and airy** — white and icy off-white as the dominant surfaces, with mint/pink (and a lavender third accent) used for CTAs, status, and gradients rather than large flat fills.
- **Legible over decorative** — glassmorphism and motion are used only where they don't compete with dense operational data (tables, transaction logs).

---

## 3. Color Palette

### 3.1 How this palette is structured

The shipped screens use a Material Design 3–style tonal system: every brand color (primary/green, secondary/pink, tertiary/lavender, error/red) has a matched family of roles — the color itself, a color to put text/icons on top of it, a soft "container" tint for backgrounds, and text-safe colors for that container. This is why the tokens below are named `primary`, `on-primary`, `primary-container`, `on-primary-container`, etc. — carry these exact role names into code so Antigravity's Tailwind config matches the mockups one-to-one.

**Do not substitute warmer or muddier versions of these colors.** The whole point of this system is that mint and blush sit on top of *cool* neutrals — that's what keeps it feeling icy instead of earthy.

### 3.2 Base / Neutral Surfaces (Light Mode) — cool, icy, not warm

| Token | Hex | Usage |
|---|---|---|
| `background` / `surface` | `#F8FAF8` | Page background — icy near-white with the faintest cool-green cast, never cream |
| `surface-bright` | `#F8FAF8` | Same as surface; used where Tailwind expects a distinct "bright" token |
| `surface-dim` | `#D8DAD9` | Recessed/dim regions, disabled surface backgrounds |
| `surface-container-lowest` | `#FFFFFF` | Cards, modals, primary content containers |
| `surface-container-low` | `#F2F4F2` | Table header rows, subtle section backgrounds |
| `surface-container` | `#ECEEEC` | Sidebar background, nested containers |
| `surface-container-high` | `#E6E9E7` | Dividers-adjacent surfaces, hover fills on neutral chips |
| `surface-container-highest` | `#E1E3E1` | Highest-contrast neutral surface, strong dividers |
| `surface-variant` | `#E1E3E1` | Input fills, tag backgrounds (neutral) |
| `on-surface` | `#191C1B` | Primary text — cool near-black (not warm `#231F1B`) |
| `on-surface-variant` | `#424840` | Secondary text, labels, timestamps |
| `outline` | `#737970` | Input borders, icon strokes at rest |
| `outline-variant` | `#C2C8BE` | Card borders, table row dividers |
| `inverse-surface` | `#2E3130` | Toasts, tooltips, dark chips on light UI |
| `inverse-on-surface` | `#EFF1EF` | Text on `inverse-surface` |

### 3.3 Base / Neutral Surfaces (Dark Mode)

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0C100E` | Page background, dark mode |
| `surface` | `#0F1412` | Base surface, dark mode |
| `surface-container-lowest` | `#0A0E0C` | Deepest recess (e.g. input wells) |
| `surface-container-low` | `#131C17` | Sidebar background |
| `surface-container` | `#18221C` | Cards, panels |
| `surface-container-high` | `#1D2821` | Hover states, elevated panels |
| `surface-container-highest` | `#223026` | Highest-contrast dark surface |
| `on-surface` | `#EDF2EC` | Primary text on dark |
| `on-surface-variant` | `#9BB0A0` | Secondary text on dark |
| `outline` | `#415548` | Borders, dividers on dark |
| `outline-variant` | `#27382E` | Subtle dividers on dark |

### 3.4 Primary — Mint Green (dominant brand accent)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` | `#446743` | `#B6DEB1` | Primary buttons, active nav, links, focus rings |
| `on-primary` | `#FFFFFF` | `#082410` | Text/icons on solid `primary` fill |
| `primary-container` | `#B6DEB1` | `#1D3824` | Soft mint card fills, badges, chart fills — **this is the signature mint** |
| `on-primary-container` | `#40633F` | `#0E2612` | Text/icons on `primary-container` |
| `primary-fixed` | `#C5EDBF` | `#C5EDBF` | Lightest mint tint — hero gradients, empty-state backdrops |
| `primary-fixed-dim` | `#A9D1A5` | `#A9D1A5` | Slightly deeper fixed mint |
| `on-primary-fixed` | `#002105` | `#002105` | Text on `primary-fixed` |
| `on-primary-fixed-variant` | `#2C4E2D` | `#7DBE76` | Secondary text on `primary-fixed` |
| `inverse-primary` | `#A9D1A5` | `#446743` | Primary color when placed on `inverse-surface` |

**Fresh mint accent (informal, high-energy variant seen in dark-mode UI):** `#7DBE76` (bright/vibrant mint), `#86EFAC` (glow mint for pulsing indicators). Use these sparingly for live-status pulses and glow effects — not as a base fill.

### 3.5 Secondary — Blush Pink (secondary brand accent)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `secondary` | `#785561` | `#FFD1E0` | Secondary buttons, active toggles |
| `on-secondary` | `#FFFFFF` | `#3E1624` | Text/icons on solid `secondary` fill |
| `secondary-container` | `#FFD1E0` | `#3D1A25` | Soft blush card fills, badges, secondary-highlight chips — **this is the signature pink** |
| `on-secondary-container` | `#7A5764` | `#FFD1E0` | Text/icons on `secondary-container` |
| `secondary-fixed` | `#FFD9E5` | `#FFD9E5` | Lightest blush tint |
| `secondary-fixed-dim` | `#E7BBC9` | `#E87A90` | Slightly deeper fixed blush |
| `on-secondary-fixed` | `#2D131E` | `#2D131E` | Text on `secondary-fixed` |
| `on-secondary-fixed-variant` | `#5E3D4A` | `#FFD1E0` | Secondary text on `secondary-fixed` |

### 3.6 Tertiary — Icy Lavender (supporting cool accent)

A third accent appears throughout the shipped screens for "reconciling," informational banners, and rule/heuristic badges — it keeps the palette from being purely a two-color system and adds a genuinely *icy* (not earthy) note. Carry it forward as an optional supporting accent.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `tertiary` | `#70518E` | `#DFBAFF` | "Reconciling" state, heuristic/rule banners, info icons |
| `on-tertiary` | `#FFFFFF` | `#351B47` | Text/icons on solid `tertiary` fill |
| `tertiary-container` | `#E6C8FF` | `#37264A` | Soft lavender card fills, feature/notification badges |
| `on-tertiary-container` | `#6D4D8A` | `#E6C8FF` | Text/icons on `tertiary-container` |
| `tertiary-fixed` | `#F0DBFF` | `#F0DBFF` | Lightest lavender tint |
| `tertiary-fixed-dim` | `#DDB8FD` | `#C99BF7` | Slightly deeper fixed lavender |
| `on-tertiary-fixed` | `#290A45` | `#290A45` | Text on `tertiary-fixed` |
| `on-tertiary-fixed-variant` | `#573974` | `#F0DBFF` | Secondary text on `tertiary-fixed` |

### 3.7 Error / Critical

| Token | Light | Dark | Usage |
|---|---|---|---|
| `error` | `#BA1A1A` | `#FF858D` | Destructive actions, critical error text/icons |
| `on-error` | `#FFFFFF` | `#600004` | Text/icons on solid `error` fill |
| `error-container` | `#FFDAD6` | `#491216` | Error/critical card backgrounds |
| `on-error-container` | `#93000A` | `#FFD8D6` | Text/icons on `error-container` |

### 3.8 Brand Gradient

Use across hero/login backgrounds, sync-progress rings, and elevated metric highlights — sparingly, never as a large flat fill:

```
linear-gradient(135deg, #B6DEB1 0%, #FFD1E0 50%, #DFBAFF 100%)
```

For subtler ambient use (card header washes, empty-state backdrops), drop opacity to 15–25%:
```
linear-gradient(135deg, rgba(182,222,177,0.25) 0%, rgba(255,209,224,0.25) 50%, rgba(223,186,255,0.25) 100%)
```

### 3.9 Semantic / Sync-State Colors

These are distinct from the brand tonal system above — they're the small, tactile status-pill palette used for sync lifecycle states across the dashboards. Kept in-family so alerts never feel jarring against the icy-pastel base:

| State | Background | Border | Text/Icon | Usage |
|---|---|---|---|---|
| Synced | `#EBF7EB` | `#C4E8C2` | `#266838` | Reconciled, in sync, resolved |
| Offline Pending | `#FFF9E6` | `#FFE7A3` | `#8D6208` | Local cache queued, awaiting sync |
| Reconciling | `#F5F0FE` | `#E1D0FD` | `#4D25B8` | Actively syncing/merging — pulses |
| Conflict | `#FEECEE` | `#FFD1E0` | `#A72638` | Discrepancy, needs resolution |
| Suspicious/Attention | `secondary-container` family (`#FFD1E0` bg / `#7A5764` text) | — | — | Deliberately pink-family, not red — a flag is not proof of fraud |

Do not rely on color alone for these — always pair with an icon and label (accessibility, see §9).

---

## 4. Typography

| Role | Font | Weight | Size / Line-height | Notes |
|---|---|---|---|---|
| Display / Hero | Plus Jakarta Sans | 700 | 40px / 48px (28px / 36px mobile) | Landing/auth hero only |
| Headline Large | Plus Jakarta Sans | 600 | 28px / 36px | Page titles |
| Headline Medium | Plus Jakarta Sans | 600 | 22px / 28px | Section headers |
| Headline Small | Plus Jakarta Sans | 600 | 18px / 24px | Card/module titles |
| Metric XL | Plus Jakarta Sans | 700, tabular-nums | 32px / 38px | Stat-card hero numbers |
| Metric MD | Plus Jakarta Sans | 700, tabular-nums | 20px / 26px | Secondary stat numbers |
| Body Large | Inter | 400 | 16px / 24px | Onboarding/marketing copy |
| Body Base | Inter | 400 | 14px / 20px | Default UI text |
| Body Small | Inter | 400 | 13px / 18px | Captions, helper text |
| Table Data | Inter | 500, tabular-nums | 13px / 18px | Dense transaction/inventory tables |
| Label Caps | Inter | 600 | 11px / 16px, +5% tracking | Uppercase section/column labels |
| Label Badge | Inter | 600 | 12px / 16px | Pills, tags, status badges |
| Monospace (IDs, batch/SKU/transaction IDs) | JetBrains Mono | 400 | matches body | IDs, hashes, technical values |

Plus Jakarta Sans for headings/metrics gives the friendly rounded feel of the reference dashboard; Inter keeps dense tables (transactions, inventory, conflicts) legible at small sizes. Use `font-variant-numeric: tabular-nums` on every quantity, delta, and currency column for aligned scanning.

**Alignment convention:** left-align entity descriptors (names, SKUs, location codes); right-align counts, deltas, currency; center-align status pills and action groups.

---

## 5. Visual Effects — Where to Use What

### 5.1 Glassmorphism (use sparingly, only on light-content surfaces)

`backdrop-filter: blur(12–20px) saturate(160%)`, `background: rgba(255,255,255,0.80–0.85)`, thin `1px` border in `outline-variant` at reduced opacity. Use on:

- **Login / Sign-up page** — a glass card floating over the brand gradient background with soft blurred mint/pink/lavender orbs behind it (see actual shipped auth screen: three large blurred circles at 15–30% opacity in primary-container, secondary-container, and tertiary-container).
- **Top navbar** — glass effect on scroll so content shows faintly through it.
- **Notification / alerts drawer** (slide-over panel) — glass panel over the dashboard behind it.
- **Lightweight modal dialogs** (quick actions, quick-add product) — glass, since content is short.

**Do not** use glassmorphism on:
- Data tables (transaction history, inventory list, conflict list) — solid white (`surface-container-lowest`) cards with soft shadow instead, for maximum contrast/legibility.
- The sidebar — keep solid (`surface-container` / `surface-container-low`) for consistent nav legibility.

### 5.2 Shadows & Elevation

- Cards at rest: `box-shadow: 0 1px 3px rgba(24,34,29,0.03), 0 4px 12px rgba(24,34,29,0.02)`
- Hover/raised: `box-shadow: 0 4px 16px rgba(24,34,29,0.06), 0 1px 2px rgba(24,34,29,0.04)` + `translateY(-2px)`
- Modals / conflict drawers: `box-shadow: 0 20px 48px -8px rgba(24,34,29,0.12), 0 8px 16px -4px rgba(24,34,29,0.04)`
- Toasts: `shadow-xl` equivalent, solid `inverse-surface` background

Shadow tint uses the cool near-black (`rgba(24,34,29,...)`) — not a warm black — to stay consistent with the icy palette.

### 5.3 Gradients

- Brand gradient (§3.8) for: progress rings/donuts ("Reconciliation Progress %"), chart bar fills, avatar focus rings, sync-progress bars, signature KPI tile headers.
- Ambient blurred orbs (`primary-container`/`secondary-container`/`tertiary-container` at 15–30% opacity, `blur(120–180px)`) for: login/onboarding backgrounds, empty-state backdrops.

### 5.4 Corners & Spacing

- Standard cards / data modules: `16px` (`1rem`) border radius.
- Inputs & dropdowns: `10px` (`0.625rem`).
- Micro chips / filter badges: `8px` (`0.5rem`) with a thin `1px` border.
- Pills / status badges: fully rounded (`9999px`).
- Radius scale: `sm: 4px`, `DEFAULT: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `full: 9999px`.
- Page padding: `2rem` desktop / `1.5rem` tablet / `1rem` mobile. Card gutter: `1.25rem` desktop, `1rem` mobile. Card internal padding: `1.25rem`. Table cell vertical padding: `0.75rem`.

---

## 6. Motion & Micro-Animations

| Element | Animation | Notes |
|---|---|---|
| Stat-card numbers | Count-up on load (~600ms ease-out) | Tabular-nums, `metric-xl`/`metric-md` styles |
| Reconciliation/Sync progress donut | Ring fills 0 → value on load, brand-gradient stroke | Mint → pink → lavender |
| Card hover | Lift + shadow increase, 150–200ms ease | All clickable cards |
| Buttons | Slight scale (1.0 → 1.02 hover, 0.98 active) + color shift, 120ms | Primary = mint, secondary = pink, tertiary = lavender |
| Sidebar active item | Filled pill / bordered highlight behind icon+label, 200ms ease | `primary-container` background + `on-primary-container` text |
| Live status dot | `animate-ping` halo + solid dot (mesh online, sync active) | Uses vibrant mint `#7DBE76`/`#86EFAC` |
| Toast/alert | Slide-in from top-right or bottom-right, auto-dismiss with progress bar | Low-stock, suspicious activity, sync-failure alerts |
| Conflict / suspicious row | Slow, subtle blush pulse on the row's left border (2s loop, low-opacity) | Draws attention without feeling alarming — never a hard blink/red flash |
| Reconciling status dot | Pulse `scale(1 → 1.3)` infinite | Lavender/indigo family |
| Skeleton loading | Shimmer sweep, `primary-container` → `secondary-container` gradient | Dashboard cards, table rows while loading |
| Empty-state illustrations | Gentle float (translateY ±4px, 4s ease-in-out loop) | Subtle, non-distracting |
| Offline banner appearing/disappearing | Height + fade transition, 250ms | POS/offline states |
| Chart line draw-in | `stroke-dashoffset` animation, 2–2.2s cubic-bezier ease-out | Staggered by ~150ms per series |

Keep interaction animations short (120–300ms); ambient/looping decorative motion (pulses, floats, shimmer) can run longer. Nothing should block the user from acting immediately.

---

## 7. Pages

The three delivered batches already cover the great majority of this list with real Stitch screens (light mode, several with dark-mode and mobile variants). Grouped by role:

### 7.1 Auth & Onboarding
1. **Login** — *(shipped: `reconcilo_authentication_terminal_sign_in`)*
2. **Sign Up / Invite Acceptance** — *(shipped: `reconcilo_sign_up_invite_acceptance_flow`)*
3. **Role/Store Node Onboarding** — *(shipped: `reconcilo_role_store_node_onboarding`)*

### 7.2 Store Staff (POS-facing, offline-capable, tablet/handheld-first)
4. **POS / Physical Count Audit** — *(shipped: `store_pos_terminal_physical_count_audit`)*
5. **Pending Transactions Queue / Local Cache** — *(shipped: `offline_pending_transactions_queue_local_cache`)*
6. **Mobile Handheld Scanner PWA** — *(shipped: `reconcilo_mobile_handheld_scanner_pwa`)*
7. **Mobile Store Reconciliation Companion** — *(shipped: `reconcilo_mobile_store_reconciliation_companion`)*
8. **Offline Mode Banner/State** (component spec, not a full page)

### 7.3 Store Manager
9. **Store Dashboard** — *(shipped: `reconcilo_minimalist_dashboard_light_mode` / `_dark_mode`)*
10. **Transaction History / Audit Ledger** — *(shipped: `reconcilo_store_transaction_history_audit_ledger`)*
11. **Conflict Resolution / Discrepancy Ledger** — *(shipped: `conflict_resolution_discrepancy_ledger`)*
12. **Suspicious Activity & Anomaly Review** — *(shipped: `suspicious_activity_anomaly_review`)*
13. **Store Reports / Shift Reconciliation** — *(shipped: `reconcilo_store_reports_shift_reconciliation`)*
14. **Product Detail / Batch Traceability Ledger** — *(shipped: `reconcilo_product_detail_batch_traceability_ledger`)*

### 7.4 HQ / Inventory Administrator
15. **HQ Multi-Store Connectivity Node Grid** — *(shipped: `hq_multi_store_connectivity_node_grid`)*
16. **Global Inventory Management / SKU Directory** — *(shipped: `global_inventory_management_sku_directory`)*
17. **Multi-Store Stock Transfer Dispatch Manifest** — *(shipped: `reconcilo_multi_store_stock_transfer_dispatch_manifest`)*
18. **Team / Workstation Access Governance** — *(shipped: `reconcilo_team_workstation_access_governance`)*
19. **System Settings & Rule Thresholds** — *(shipped: `reconcilo_system_settings_rule_thresholds` / `_dark_mode`)*
20. **HQ Reports & Compliance Center** — *(shipped: `hq_reports_compliance_center`)*
21. **DLQ / Failed Batch Investigation** — *(shipped: `dlq_failed_batch_investigation`)*

### 7.5 Supplier (limited)
22. **Supplier Restocking / ASN Portal** — *(shipped: `reconcilo_supplier_restocking_asn_portal`)*

### 7.6 Shared / System States
23. **Notifications Center — Alert Slide-Over Drawer** — *(shipped: `reconcilo_notifications_center_alert_slide_over_drawer`)*
24. **Settings / Operator Profile** — *(shipped: `reconcilo_settings_operator_profile`)*
25. **System Health & Empty States** — *(shipped: `reconcilo_system_health_empty_states`)*
26. **Loading states** (skeletons per page above)
27. **Error states** (403, 404, sync error, generic error)

---

## 8. Component Notes

| Component | Spec |
|---|---|
| Primary button | `primary-container` fill, `on-primary-container` text, `10px` radius, subtle shadow; hover brightens slightly, active `scale(0.98)` |
| Secondary button | `secondary-container` (pink) or `tertiary-container` (lavender) fill for secondary/alt actions |
| Outline / neutral button | `surface-container-lowest` fill, `outline-variant` border, `on-surface` text; hover tints to `surface-container-low` |
| Destructive button | `error-container` background, `on-error-container` text, subtle `secondary-fixed` border |
| Status pill | 26px height, 6px status dot, colors per §3.9 |
| KPI / metric card | `surface-container-lowest` bg, `16px` radius, `1px` `outline-variant` border; optional gradient-wash header per §5.3 |
| Search input | 40px desktop / 44px mobile height, `surface-container-lowest` fill, `outline-variant` border, `10px` radius; focus border → `primary`, glow ring `0 0 0 3px rgba(182,222,177,0.35)` |
| Data table | `16px` radius container, `surface-container-low` header row in Label Caps style, `1px` `outline-variant`(low-opacity) row dividers, no zebra striping; row hover tints toward `surface-container-lowest`→`surface-container-low`; conflict rows get a faint `secondary-container` tint with a discrepancy-resolver affordance |
| Glass top bar | `rgba(255,255,255,0.85)` + `blur(12px) saturate(160%)`, bottom border in `outline-variant` at reduced opacity |

---

## 9. Accessibility Notes

- Maintain minimum 4.5:1 contrast for body text on `surface`/`surface-container-lowest` — `on-surface` and `on-surface-variant` both pass against white and the light `-container` tints.
- Do not rely on color alone for status (synced vs. pending vs. reconciling vs. conflict vs. suspicious) — always pair with an icon and label; mint/pink/lavender/amber can sit close together for color-blind users.
- Glass panels must maintain sufficient contrast between text and blurred background — test over both plain and busy (gradient-orb) backgrounds.
- Dark-mode tokens (§3.3–3.7 "Dark" columns) must be used as a complete set — don't mix a light-mode container with a dark-mode "on-" text color or vice versa.

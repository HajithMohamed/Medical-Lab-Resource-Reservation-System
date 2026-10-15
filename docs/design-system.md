# Design system: BenchBook Pro (v4 "Clinical Precision")

BenchBook Pro is the laboratory operations and resource scheduling console.
The source of truth for design tokens, typography, radii, shadows, and responsive shell behavior is `docs/design/design-reference-v4.html` and the SVG specifications in `docs/design/`.

## 1. Principles

1. **Clinical Precision:** High-contrast, clean white surfaces on subtle mint/teal radial canvas washes. Pure light theme on every device (`color-scheme: light`).
2. **Tabular Numerics:** Monospaced and tabular numbers (`.tab`, `font-variant-numeric: tabular-nums`) for all timestamps, measurements, durations, and counts.
3. **Semantic Hierarchy:** Deep navy (`#16324f`) for headings, ink (`#1f3347`) for body text, teal (`#0f8276`) for primary actions and active selections, amber for attention/due notices, and red for maintenance/destructive operations. Never convey status by color alone: always include descriptive text.
4. **Adaptive Device Form Factors:** Full desktop experience (236px sticky rounded sidebar card, 2-column detail layouts, comprehensive data tables) transitioning seamlessly below 820px to an off-canvas drawer (`Sheet`), sticky bottom action bars (`StickyActionBar`), and touch-optimized card lists with 44px minimum targets.

---

## 2. Colour Tokens (v4 Light Theme)

Tokens defined in `src/app/globals.css` via `:root` variables and exposed to Tailwind CSS via `@theme inline`. Zero raw hex codes (`[#...]`) in component JSX outside `globals.css`.

| Token            | Value                       | Semantic Use                                              |
| ---------------- | --------------------------- | --------------------------------------------------------- |
| `--canvas`       | `#f5f8fa`                   | Base application canvas under radial washes               |
| `--wash-a`       | `rgba(15, 130, 118, 0.1)`   | Subtle teal radial wash at bottom (30% 110%)              |
| `--wash-b`       | `rgba(120, 200, 190, 0.16)` | Subtle mint radial wash at top right (100% 0%)            |
| `--card`         | `#ffffff`                   | Content cards, tables, forms, sidebar, dialogs            |
| `--card-edge`    | `#e7eef2`                   | Card outlines and control borders                         |
| `--line`         | `#edf2f5`                   | Dividers, calendar grid lines, table row borders          |
| `--navy`         | `#16324f`                   | Headings, primary labels, title text                      |
| `--ink`          | `#1f3347`                   | Main body text                                            |
| `--muted`        | `#64748b`                   | Secondary text, field descriptions, neutral icons         |
| `--faint`        | `#94a3b8`                   | Placeholder text, subtle captions                         |
| `--teal`         | `#0f8276`                   | Primary brand accent, primary buttons, active marks       |
| `--teal-deep`    | `#0b5f56`                   | Primary button gradient stop, active item text            |
| `--teal-soft`    | `#e3f4f0`                   | Active navigation pill, reserved slot background          |
| `--teal-line`    | `#bfe3da`                   | Active navigation border, reserved slot border            |
| `--mint`         | `#eef8f5`                   | Hover backgrounds, available slot background              |
| `--amber`        | `#c2700a`                   | Attention text, caution labels                            |
| `--amber-strong` | `#d97706`                   | Notification dot, attention progress bar, due indicators  |
| `--amber-soft`   | `#fff6e8`                   | Attention badge background, maintenance slot fill         |
| `--amber-line`   | `#f5ddb0`                   | Attention badge border, maintenance slot border           |
| `--blue`         | `#2f6fdb`                   | Information accents, secondary stat indicators            |
| `--blue-soft`    | `#eaf1fd`                   | Information pill background                               |
| `--green`        | `#12805c`                   | Available indicators, success pills, active status        |
| `--green-soft`   | `#e6f6ef`                   | Active status pill background                             |
| `--red`          | `#b42318`                   | Destructive buttons, out of service status, error summary |
| `--red-soft`     | `#fdecea`                   | Destructive pill fill, error summary card fill            |
| `--focus`        | `#2ba596`                   | High-visibility focus outline (2px solid, 2px offset)     |

---

## 3. Typography & Numerics

- **Font Family:** Self-hosted Plus Jakarta Sans via `@fontsource-variable/plus-jakarta-sans` as `--font-sans`. Zero requests to external Google Fonts CDNs.
- **Heading Scale:**
  - Page Title (h1): 28px desktop (`text-[28px] font-extrabold text-navy tracking-tight`), 24px phone.
  - Section Headings (h2): 21px desktop (`text-[21px] font-extrabold text-navy`), 17px phone.
  - Card Titles (h3/h4): 16–19px (`font-extrabold text-navy`).
  - Eyebrows: 10–11px (`text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-teal` or `text-muted`).
- **Tabular Numerics:** Any element displaying time, dates, currency, or counts must apply `.tab` (`font-variant-numeric: tabular-nums`).

---

## 4. Radii & Elevation

- **Radii:**
  - `--r-chip`: 8px (status tags, pills, mini badges)
  - `--r-ctl`: 12px (buttons, inputs, select menus)
  - `--r-card`: 20px (content panels, tables, form sections)
  - `--r-shell`: 24px (sidebar card, drawer corners, bottom sheets)
- **Shadows:**
  - Standard Card: `0 1px 2px rgba(22, 50, 79, 0.04), 0 10px 30px rgba(22, 50, 79, 0.05)`
  - Primary Teal Button: `0 10px 22px -10px var(--teal)`
  - Sticky Action Bar (bottom): `0 -4px 16px rgba(22, 50, 79, 0.08)`

---

## 5. Responsive Shell & Navigation (< 820px)

- **Desktop (≥ 820px):**
  - Left column: 236px sticky rounded card sidebar (`rounded-[24px]`).
  - Grouped navigation with role-specific eyebrows (Workspace, Manage Site, Network, Administration).
  - Attention badges on Equipment care displaying active due count.
  - Bottom user block with initials avatar, full name, role, and account dropdown.
  - Top header tools: live search input, notification bell with unread dot, user avatar.
- **Mobile / Tablet (< 820px):**
  - Top bar: 40px menu button (`Menu`), two-line eyebrow (`BENCHBOOK / <PAGE>` + site name), notification bell with dot, and avatar.
  - Off-canvas drawer: slides from left over `bg-navy/38` backdrop, trapping focus and closing on Esc or link navigation.
  - Sticky bottom action bar (`StickyActionBar`) on phones for forms and primary page actions.

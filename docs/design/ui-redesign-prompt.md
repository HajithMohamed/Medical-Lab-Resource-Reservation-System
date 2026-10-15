# BenchBook — complete UI redesign for desktop and mobile (v4 "Clinical Precision")

Goal: every page of the app follows the v4 design on desktop **and** phone. All forms follow the form
reference, all detail pages follow the details reference, all list pages follow the list reference, and
every action button carries its mapped icon.

---

## 0. Read first, and how to work

Read `AGENTS.md`, `docs/design-system.md`, `docs/decisions.md` (D5, D12, D18, D20) and
`docs/permissions.md` before changing anything. Then study the design references:

| File (put them in `docs/design/`) | What it defines                                                                                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-reference-v4.html`        | Source of truth for colours, type, radii, shadows, sidebar, top bar, stat cards, attention cards, calendar lanes and the resources table. Open it in a browser and switch roles (staff / manager / admin) and views. |
| `01-resource-details.svg`         | **Detail pattern**, desktop and phone                                                                                                                                                                                |
| `02-resource-form.svg`            | **Form pattern**, desktop and phone, including the error state                                                                                                                                                       |
| `03-resources-list.svg`           | **List pattern**: desktop table, phone cards, phone filter sheet                                                                                                                                                     |
| `04-actions-and-icons.svg`        | Button variants, row actions, More menu, destructive confirm, and the action → icon map                                                                                                                              |
| `05-mobile-reference.svg`         | Phone layouts (375 px) for: 1 menu drawer, 2 calendar agenda, 3 calendar grid, 4 booking peek sheet, 5 My bookings, 6 Maintenance & care Today, 7 short-form bottom sheet, 8 sign in                                 |

Each SVG shows the desktop layout (1440 px) and the phone layout (375 px) side by side where both exist.
Match the layout, spacing, hierarchy and components. The sample data in the SVGs is illustrative only:
use the real data, fields and rules from the app. **Where an SVG and the v4 HTML disagree on a colour
or a measurement, the v4 HTML wins. Where they disagree on layout, the SVG wins.**

**Breakpoints**

| Name          | Width        | Shell       | Lists                            | Detail and form pages                 |
| ------------- | ------------ | ----------- | -------------------------------- | ------------------------------------- |
| Small phone   | < 480 px     | Drawer menu | Cards                            | One column; calendar opens as agenda  |
| Phone         | 480–767 px   | Drawer menu | Cards                            | One column, `StickyActionBar`         |
| Tablet        | 768–819 px   | Drawer menu | Table, priority-2 columns hidden | One column; preview card on top       |
| Small desktop | 820–1023 px  | Sidebar     | Table, priority-2 columns hidden | One column; preview card on top       |
| Desktop       | 1024–1279 px | Sidebar     | Table, priority-3 columns hidden | Two columns (≈ 60/40), sticky preview |
| Wide          | ≥ 1280 px    | Sidebar     | Full table                       | Two columns, sticky preview           |

Rules for this task:

- This is a **visual and layout redesign only**. Do not change business rules, services, permissions,
  database, validation or URLs (except the additions listed here). Every page and Server Action
  keeps its own permission checks.
- Work on the current branch. Commit after each phase with Conventional Commits (closest scope:
  `resources`, `bookings`, `equipment`, `users`, `settings`, `calendar`, `usage`, `auth`, `docs`).
- After each phase: `npm run check` and `npm run build` must pass.
- Check every changed page at **375, 768, 1024 and 1440 px** wide.
- If anything here conflicts with `AGENTS.md`, stop and ask, except for the decisions already
  made in Phase 0.

---

## 1. Phase 0 — Foundation (theme, fonts, shell)

1. **Tokens.** Replace the dark theme in `src/app/globals.css` with the v4 light tokens:
   `canvas, card, card-edge, line, navy, ink, muted, faint, teal, teal-deep, teal-soft, teal-line,
mint, amber, amber-strong, amber-soft, amber-line, blue, blue-soft, green, green-soft, red,
red-soft, focus`, the shadow, and radii `chip 8 / control 12 / card 20 / shell 24`.
   Map them onto the shadcn variables (`background, card, primary, muted, border, input, ring,
destructive, sidebar-*`) and expose named utilities (`bg-mint`, `text-navy`, `bg-amber-soft`,
   `border-card-edge` …). Keep the two background washes from v4. **Light only**: remove the `dark`
   class and colour classes from `src/app/layout.tsx`.
2. **Fonts.** Remove every Google Fonts `@import` (AGENTS.md forbids font downloads). Self-host
   Plus Jakarta Sans with `@fontsource-variable/plus-jakarta-sans` as `--font-sans`; use
   `font-variant-numeric: tabular-nums` for times and numbers. Replace Material Symbols with
   `lucide-react`. Remove the Inter/JetBrains Mono/Atkinson references.
3. **No raw colours.** Replace every `bg-[#…]`, `text-[#…]`, `border-[#…]`, `ring-[#…]` and inline
   hex in `src/components` and `src/app` with token classes. At the end,
   `grep -rnE "\[#[0-9a-fA-F]{3,8}\]" src` returns nothing outside `globals.css`.
4. **Casing.** All text in sentence case ("Cancel booking", not "Cancel Reservation"). Eyebrows,
   table headers and status pills may _look_ uppercase only through CSS (`uppercase` + letter
   spacing), as v4 does.
5. **App shell (v4).**
   - Desktop: 236 px rounded sidebar card (brand mark, grouped nav with eyebrows, active item with
     teal-soft background and left bar, attention count badges, user block at the bottom), main
     column with eyebrow + h1 + subtitle, and tools on the right (search ≥ 820 px, bell, avatar).
   - **< 820 px:** sidebar becomes an off-canvas drawer (shadcn `Sheet`, focus trapped, Esc and
     backdrop close it, menu button with `aria-expanded`). Respect safe-area insets.
   - **Menus per role, exactly as v4**, mapped to existing routes:
     - Staff — Workspace: Calendar, Find a slot, Resources, My bookings.
     - Manager — Workspace (same) + "Manage <site name> site": Bookings, Maintenance
       (`/equipment?tab=blocked`), Equipment care (`/equipment?tab=today`, with the due count),
       Usage reports, Staff accounts.
     - Admin — Workspace: Calendar, Resources; Network: Bookings, Maintenance, Equipment care,
       Usage reports; Administration: Users & access, Sites & settings.
     - Maintenance and Equipment care are two menu items pointing at the one `/equipment` page
       (keeps decision D20).
     - Overview appears in the menu only after Phase 8 is built.
   - Bell: shown for managers and admins (v4). Show it for staff too once notifications exist.
6. Update `src/config/navigation.ts`, `docs/design-system.md` and `docs/decisions.md` (new decision:
   "v4 Clinical Precision light theme, Plus Jakarta Sans self-hosted, lucide icons").

---

## 2. Phase 1 — Shared building blocks

Create these in `src/components` (each file under ~200 lines, server components unless they need
state), and show each one on `/styleguide`.

**Layout**

- `PageHeader`: optional back link (ChevronLeft + text), eyebrow, h1 (28 px desktop / 24 px
  phone), optional status pill beside the title, meta line, subtitle, actions slot. Below 640 px
  the actions wrap under the title, and the page's single primary action moves into
  `StickyActionBar`.
- `StickyActionBar`: fixed bottom bar on < 768 px (white, top border, upward shadow, safe-area
  padding, buttons 48 px); renders inline on larger screens.
- `StatRow` / `StatCard`: v4 `.stat` (icon tile, label, big number, hint with good/warn colour).
  4 columns ≥ 1080 px, 2 columns ≥ 480 px, 1 below (2 × 2 on phones for detail pages, as in 01).
- `SectionCard`: white card (radius 20, v4 shadow) with title, optional number badge (forms),
  description, optional header action, body.
- `DefinitionGrid`: label / value pairs, 2 columns ≥ 640 px, 1 below; hides empty values; shows an
  `EmptyState` if all are empty.
- `AttentionCard`: v4 `.att` and `.att.warn` (icon tile, title, meta, progress bar, action buttons).
- `Tabs` in the URL (`?tab=`): v4 segmented toggle on desktop; on phones a horizontally
  scrolling row of pills with a fade on the right edge. Proper `tablist` / `tab` / `tabpanel`
  roles.

**Data display**

- `StatusPill` (Active, Maintenance, Out of service, Retired) and `DuePill` (v4 `.calpill`, ok and
  warning variants). Always text plus colour.
- `ResponsiveList<T>`: one set of column definitions, two renderings:
  - **≥ 768 px:** v4 table in a card (canvas header row with small uppercase headers, 12–16 px cell
    padding, name cell = icon tile + bold name + muted subtitle, right-aligned actions).
  - **< 768 px:** card list (icon + title + subtitle + pill on top, divider, 2–3 label/value facts,
    full-width action buttons; tapping the card opens the detail page).
  - Each column has `priority` (1 always, 2 hidden < 1024 px, 3 hidden < 1280 px) and
    `mobile: "title" | "subtitle" | "badge" | "fact" | "hidden"`.
  - Switching is pure CSS (no JS), so it works in server components.
  - `wide` variant for reports: horizontal scroll inside the card, sticky first column.
  - Footer: "Showing 8 of 24 …" + Previous / Next.
  - Built-in empty, loading (skeleton) and error states.
- `FilterToolbar`: v4 toolbar card (wide search + selects + chips) on ≥ 768 px. On phones: a
  full-width search, a "Filters (n)" button opening a bottom `Sheet` with the same fields and
  "Clear all" / "Show N results", plus removable chips for active filters. Filters live in the URL.

**Forms**

- `FormField`: label above (12.5 px, 700, navy, red `*` for required), 44 px control, radius 12,
  helper text below, error text with an icon, `aria-describedby`, `aria-invalid`. 16 px input font
  on phones (no iOS zoom). Native `date` / `time` inputs, `inputMode="numeric"` for numbers, unit
  suffix inside the input ("days", "years", "h").
- `ErrorSummary`: red card at the top listing each error as a link to its field; receives focus
  after a failed submit.
- `FormPage`: the layout from `02-resource-form.svg`.
  - **Desktop ≥ 1024 px:** form column (max ≈ 640 px) of numbered `SectionCard`s, plus a sticky
    right column with a `LivePreview` card and an optional `RequiredChecklist`.
  - **Below 1024 px:** one column, preview collapsed into a small card at the top, Save / Cancel in
    the `StickyActionBar`.
  - Warns before leaving with unsaved changes.
- `AdaptiveDialog`: shadcn `Dialog` on ≥ 640 px, bottom `Sheet` below; for forms with **four fields
  or fewer** only.
- `PeekSheet`: right `Sheet` (max 440 px) on ≥ 768 px, bottom sheet below; for quick previews with
  an "Open full page" action.

**Actions (see section 6)**

- `src/config/actions.ts`: one map from action key → `{ label, icon, variant }`.
- `ActionButton` (`action="cancelBooking"`, size `lg | md | sm`, optional label override),
  `RowActions` (max 2 visible + `MoreMenu`), `MoreMenu` (Ellipsis trigger, items with icons,
  destructive items last and red, after a separator).
- Update `ConfirmAction` so it shows the action's icon in a red tile, the title as a question, the
  object and time, and the confirm button with the same icon and label.

---

## 3. The three page patterns

### A. List pattern (`03-resources-list.svg`)

**Desktop**

1. `PageHeader`: eyebrow, title, subtitle, and one primary action on the right (for example "Add
   resource" with `Plus`).
2. Optional `StatRow` when counts help (Equipment care, Bookings oversight, Usage).
3. `FilterToolbar` as one white toolbar card: wide search, then selects.
4. `ResponsiveList` table in a card:
   - Row actions: up to 2 visible (the most common one as a small primary, usually Book or View)
     and the rest in `MoreMenu`.
   - Out-of-service rows offer "Notify" (`BellPlus`) instead of "Book" if that feature exists;
     otherwise "Book" is disabled with its reason in a tooltip.
5. Pagination footer: "Showing 7 of 24 …" + Previous / Next.
6. Empty state with an icon, one sentence and the main action.

**Phone**

- Title only in the header. The primary action moves into the `StickyActionBar`, or stays as a full-width
  button under the title for list pages without other sticky actions.
- Search field plus a "Filters (n)" button, removable chips for active filters, and "Clear all".
- Each row becomes a card:
  - top: icon tile, name, subtitle and status pill
  - divider, then two label/value facts
  - two full-width buttons with icons
  - tapping the card body opens the detail page
- Filters open in a bottom sheet: select fields and chip groups, then "Clear all" + "Show N <things>".

### B. Detail pattern (`01-resource-details.svg`)

**Desktop**

1. `PageHeader`:
   - back link (`ChevronLeft`), eyebrow (area / site), title + `StatusPill`, meta line
   - actions on the right: secondary (Edit), `MoreMenu`, and the primary (lg, with icon)
2. `StatRow` with the 3–4 facts people check first (icon tile, label, value, hint in green, amber
   or muted).
3. `Tabs` (in the URL, v4 segmented toggle) only when there is more than one area of content.
4. Two columns (≈ 60/40) of `SectionCard`s:
   - main column: `DefinitionGrid`s (2 columns) and history (`ResponsiveList`)
   - side column: the time-based list (next 7 days, grouped by day, with reserved / maintenance /
     free styles) and `AttentionCard`s
5. Never show rows of dashes: hide empty values, or show one `EmptyState` with the action that fills
   them.
6. **Never** a modal for a detail view.

**Phone**

- Back link, title (24 px) with the pill beside it, meta line wrapping to two lines.
- `StatRow` as 2 × 2 compact cards.
- Tabs as a sideways-scrolling row of pills with a fade at the right edge.
- One column: details first, then the time-based list, then history as cards.
- `StickyActionBar` with one secondary (Edit) and the primary (Book this resource). Everything else
  goes in the header `MoreMenu`.

### C. Form pattern (`02-resource-form.svg`)

**Desktop**

1. `PageHeader` with back link, eyebrow "<area> / New" or "<area> / Edit", title "Add …" or
   "Edit <name>", and one helper sentence.
2. Numbered `SectionCard`s (number badge, title, one-line description); 2-column field grid inside.
   Sections that don't apply are hidden (not disabled) and keep typed values if shown again.
3. Sticky right column:
   - `LivePreview` card: how the record will look, plus any calculated values (due dates, booking
     length vs limit, affected bookings)
   - `RequiredChecklist`, with "Go to field" on missing items, where useful
4. Footer: "Fields marked * are required." + Cancel (`X`, secondary) + Save (`Check`, primary, with a
   specific label: "Save resource", "Create booking", "Block time").
5. On error: `ErrorSummary` + inline errors, values kept, focus to the summary.

**Phone**

- Title, then `ErrorSummary` (when there are errors), then the preview collapsed into a one-line card
  that expands.
- Section cards with one field per row.
- `StickyActionBar` with Cancel + Save.

**Short forms (≤ 4 fields):** use `AdaptiveDialog` (desktop dialog, phone bottom sheet), as in
`05-mobile-reference.svg` screen 7:

- icon tile + title + context line
- the fields
- an optional amber note
- the sticky bottom buttons

---

## 4. Page inventory → pattern

| Route                                         | Pattern                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`, `/change-password`                  | Auth (05 · 8)                      | Centered white card (max 420 px) on the canvas washes, brand mark and wordmark above it, single column; password field with a show/hide toggle (`Eye`); full-width primary "Sign in" (`LogIn`) / "Change password" (`KeyRound`); helper line under the button. Same layout on all sizes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/calendar`                                   | Calendar (v4)                      | v4 toolbar (Day/Week toggle, date nav with "Today" (CalendarDays), site select, category chips, "Updated at" dot) + lanes card (sticky resource column, hour grid, booking / your booking / maintenance / out-of-service styles, red now line and time chip, legend). Clicking a block opens `PeekSheet`; a free slot opens booking. **Phone (05 · 2, 3, 4):** Agenda / Grid toggle next to the title (Agenda is the default below 480 px, Grid above); date nav row (Previous, Next, date + site, Today); category chips scroll sideways; "Updated at" line. Agenda = one card per resource with its blocks for the day, your booking in the gradient style with a "You" tag, free gaps as dashed tap-to-book rows (`CalendarPlus`), out-of-service as a red note. Grid = v4 lanes inside a card, resource column fixed, hours scroll sideways, red now line. Tapping a block opens the bottom `PeekSheet`. Keep D18 (own grid) and polling (D12). |
| `/book` (Find a slot)                         | List with a search form toolbar    | Search fields (date, start, duration, category, site) as the toolbar; results as `ResponsiveList` cards per resource with state (Free, Busy with nearest free starts as chips, Out of service), actions Book (CalendarPlus) / Notify me (BellPlus).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/bookings` (My bookings)                     | List (05 · 5)                      | Tabs Upcoming / Past / Cancelled with counts; an amber notice card first when one of my bookings was cancelled by someone else (with "Notify me when free" if built); booking cards: icon, resource, purpose, day pill, time line, View (`Eye`) + Cancel (`CalendarX`, danger, confirm with reason); cancelled items show the reason. Desktop uses the same cards in a 2-column grid, or the table form of `ResponsiveList`. Phone `StickyActionBar`: Find a slot (`CalendarSearch`).                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `/bookings/new`                               | Form                               | Sections: What (resource), When (date, start, end), Purpose (+ attendees for rooms). Preview: resource, time, length vs category limit, calibration due-day warning, clash status. Save: "Create booking".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `/bookings/manage`                            | List                               | `StatRow` (today, upcoming, cancelled), filters (site for admin, section, resource, status, dates); actions View, Cancel booking.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `/reservations/[id]`                          | Detail                             | Header: resource + time, status pill. Stats: date, time, duration, booked by. Cards: details, cancellation info. Actions by kind: Cancel booking / End now (CircleStop) / Cancel block (CalendarX). Replace the Title Case dialog titles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `/resources`                                  | List                               | As 03.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `/resources/new`, `/resources/[id]/edit`      | Form                               | As 02. Remove `resource-create-dialog.tsx` and `resource-edit-dialog.tsx`; split `equipment-fields.tsx` and `resource-form.tsx` into section components.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/resources/[id]`                             | Detail                             | As 01. Tabs: Overview, Schedule, Equipment care (hidden for rooms), Activity. Replace any resource preview dialog with a link here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/resources/[id]/status`                      | Form (single section)              | Radio cards for Active / Out of service / Retired with icons (Power, PowerOff, Archive), a reason, and a preview listing the bookings that will be cancelled. Retire = danger + confirm.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/maintenance/new`                            | Form                               | Sections: Resource, When, Reason. Preview: the overlapping bookings that will be cancelled (red list) and the confirm step. Save: "Block time" (CalendarClock). `/maintenance` keeps redirecting to `/equipment?tab=blocked`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `/equipment`                                  | List + attention cards (05 · 6, 7) | `StatRow` (due today, overdue or failed, due soon, reviews due; 2 × 2 on phones). Overdue/failed cards use the red variant, due-today cards the amber variant; buttons wrap onto a second line on phones. Tabs: Today (v4 `AttentionCard`s with Mark as done (CircleCheck), Not done (CircleSlash), Block time), Schedule (`ResponsiveList` with tracker pills), Blocked time (`ResponsiveList` with End now / Cancel block), Reports (wide list) if built. "Not done" is an `AdaptiveDialog`. Full result entry is a Form page (`/resources/[id]/records/new`) if built; otherwise restyle the existing dialog as `AdaptiveDialog` with sections.                                                                                                                                                                                                                                                                                                  |
| `/usage`                                      | Dashboard variant of List          | `PageHeader` with Download CSV (FileSpreadsheet); `StatRow`; peak-hours and section charts in `SectionCard`s (keep the own chart components, restyle with tokens); per-resource `ResponsiveList` with utilisation bars and busy/idle pills; period and site filters in `FilterToolbar`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `/users`                                      | List                               | Filters (site for admin, role, status, search); name cell with avatar initials, email subtitle; columns role, site, section, last sign-in, status; actions Edit (Pencil) + More (Reset password, Deactivate / Reactivate).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `/users/new`                                  | Form                               | Sections: Person (name, email), Role & place (role, site, section). Preview: role badge, site, what this role can do (from `docs/permissions.md`). After save, the temporary password panel restyled as a success card with Copy (Copy → Check when copied).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/users/[id]`                                 | Form + side card                   | Same form, prefilled. Right column: account card (status, last sign-in, locked until) with actions Reset password (KeyRound), Deactivate (UserX, danger) / Reactivate (UserCheck).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/settings`                                   | Hub                                | Three `SectionCard` links (Sites, Sections, Categories) with icon, count and a short description.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `/settings/sites`, `/sections`, `/categories` | List                               | Add (Plus) opens an `AdaptiveDialog` (≤ 4 fields). Row actions Edit + More (Delete, danger, refused with an explanation if in use).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/settings/*/[id]`                            | Form (single section)              | Restyle as the Form pattern with a small preview (for categories: icon + booking limit).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/no-access`, `not-found`, `error`            | System                             | Centered card with icon tile, title, one sentence, primary action back (Calendar / Back).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `/styleguide`                                 | Reference                          | Every building block, every button variant, the full action map, pills, form states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 5. Mobile (phones and tablets) — follow `05-mobile-reference.svg`

### 5.1 Phone shell (05 · 1)

- **Top bar**, 16 px side padding, safe-area aware:
  - menu button (`Menu`, 40 px)
  - two-line eyebrow ("BenchBook / <page>", then the site)
  - bell with an unread dot
  - avatar
- **Drawer:**
  - slides in from the left over a navy 38 % backdrop
  - same brand block, groups, active state and count badges as the desktop sidebar
  - user block at the bottom; Close button (`X`) beside it
  - closes on navigation, backdrop tap and Esc; focus trapped and returned to the menu button
- Page content starts with the h1 (24 px). Section titles are 16–17 px. Body is never below
  12.5 px; inputs are 16 px (no iOS zoom).

### 5.2 Phone building blocks

- **`StickyActionBar`:**
  - white bar fixed to the bottom with a top border and an upward shadow
  - 48 px buttons, safe-area padding
  - page content gets matching bottom padding so nothing hides behind it
  - holds at most one secondary and one primary
- **Bottom sheets** (`PeekSheet`, `AdaptiveDialog`, filters):
  - top radius 24, grab handle, Close button
  - max height 90 vh with inner scroll
  - actions in a sticky footer
  - backdrop navy 38 %
- **Cards:** radius 16 (20 on desktop), 14–16 px padding, 10–12 px gap between cards.
- **Tabs:** pill row that scrolls sideways; the active pill scrolls into view; fade on the right edge.
- **Chips:** 30–34 px tall, removable chips have an `X` with an aria-label ("Remove filter Colombo").
- **`StatRow`:** 2 × 2 compact cards (icon tile 28–34 px, value 17–19 px, hint 10.5–11 px).
- **Buttons:** at least 44 px tall (48 px in sticky bars). Card actions are full-width pairs. Action
  rows that don't fit wrap to the next line; never shrink the text.

### 5.3 Phone screens

| Screen                                     | Follow                  | Key points                                                                                                                                                                                                                                           |
| ------------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu                                       | 05 · 1                  | See 5.1.                                                                                                                                                                                                                                             |
| Calendar                                   | 05 · 2, 3               | See the `/calendar` row in section 4. Agenda is the default under 480 px; remember the user's last choice in localStorage (wrapped in try/catch).                                                                                                    |
| Booking or block details from the calendar | 05 · 4                  | Bottom `PeekSheet`: eyebrow (Booking / Maintenance), title, status pill, 3–4 label/value facts, then two buttons: "Open page" (`ArrowUpRight`) and the allowed action (Cancel `CalendarX`, End now `CircleStop`). Cancel only for people allowed to. |
| My bookings                                | 05 · 5                  | See the `/bookings` row in section 4.                                                                                                                                                                                                                |
| Maintenance & care                         | 05 · 6                  | See the `/equipment` row in section 4.                                                                                                                                                                                                               |
| Short forms                                | 05 · 7                  | "Not done", cancel with reason, add site / section / category, block-time confirm.                                                                                                                                                                   |
| Sign in                                    | 05 · 8                  | See the `/login` row in section 4.                                                                                                                                                                                                                   |
| Resource details                           | 01 (phone)              | See pattern B.                                                                                                                                                                                                                                       |
| Any form page                              | 02 (phone)              | See pattern C.                                                                                                                                                                                                                                       |
| Any list page                              | 03 (phone, two screens) | See pattern A.                                                                                                                                                                                                                                       |
| Usage                                      | 03 + 01                 | 2 × 2 `StatRow`, charts full width (scroll sideways inside their card if needed), per-resource list as cards with a utilisation bar.                                                                                                                 |
| Users, settings                            | 03                      | Cards with avatar initials (users) or icon tiles (settings); Edit + More.                                                                                                                                                                            |

### 5.4 Mobile rules (apply everywhere)

- No sideways page scroll at 375 px. Only `wide` tables, charts and calendar lanes scroll, inside
  their own card.
- Touch targets at least 44 × 44 px; at least 8 px between targets.
- One primary action per screen.
- Never put a long form or a detail view in a dialog.
- Hover-only UI (tooltips, the v4 "free slot on hover") gets a tap equivalent.
- Sheets and dialogs: focus trapped, Esc closes, focus returns to the trigger,
  `prefers-reduced-motion` turns off slide animations.
- Test on a real phone or an emulator: drawer, sticky bars, date and time inputs, filter sheet,
  calendar agenda and grid, peek sheet, iOS safe areas.

---

## 6. Actions and icons (must use everywhere)

Put this map in `src/config/actions.ts` and render every action button through `ActionButton`
or `MoreMenu`. Same action = same words + same icon on every page. Icons come from `lucide-react`
(installed `^1.55`). Check each name exists in that version; if one was renamed, use the current
name and update the map and `/styleguide`.

| Action key           | Label                         | Icon                           | Variant                             |
| -------------------- | ----------------------------- | ------------------------------ | ----------------------------------- |
| add                  | Add <thing>                   | `Plus`                         | primary                             |
| edit                 | Edit                          | `Pencil`                       | secondary                           |
| view                 | View                          | `Eye`                          | secondary                           |
| openFull             | Open full page                | `ArrowUpRight`                 | secondary                           |
| save                 | Save <thing> / Create <thing> | `Check`                        | primary                             |
| cancelForm           | Cancel                        | `X`                            | secondary                           |
| back                 | Back to <list>                | `ChevronLeft`                  | link                                |
| more                 | More (icon only)              | `Ellipsis`                     | icon                                |
| close                | Close (icon only)             | `X`                            | icon                                |
| book                 | Book / Book this resource     | `CalendarPlus`                 | primary                             |
| findSlot             | Find a slot                   | `CalendarSearch`               | secondary                           |
| today                | Today / Open in calendar      | `CalendarDays`                 | secondary                           |
| cancelBooking        | Cancel booking                | `CalendarX`                    | danger                              |
| notifyMe             | Notify me                     | `BellPlus`                     | soft                                |
| cancelAlert          | Cancel alert                  | `BellOff`                      | secondary                           |
| blockTime            | Block time                    | `CalendarClock`                | secondary (primary on its own form) |
| endNow               | End now                       | `CircleStop`                   | danger                              |
| cancelBlock          | Cancel block                  | `CalendarX`                    | danger                              |
| recordResult         | Record result                 | `ClipboardPen`                 | primary                             |
| markDone             | Mark as done                  | `CircleCheck`                  | primary (small)                     |
| notDone              | Not done                      | `CircleSlash`                  | secondary                           |
| takeOutOfService     | Take out of service           | `PowerOff`                     | danger                              |
| backInService        | Back in service               | `Power`                        | secondary                           |
| retire               | Retire                        | `Archive`                      | danger                              |
| addPhotos            | Add photos                    | `Camera`                       | secondary                           |
| downloadPdf          | Download PDF                  | `FileDown`                     | secondary                           |
| downloadCsv          | Download CSV                  | `FileSpreadsheet`              | secondary                           |
| recordPdf            | Service record PDF            | `FileText`                     | secondary                           |
| refresh              | Refresh                       | `RefreshCw`                    | secondary                           |
| search               | Search                        | `Search`                       | —                                   |
| filters              | Filters                       | `SlidersHorizontal`            | secondary                           |
| clearFilters         | Clear filters / Clear all     | `FunnelX`                      | link                                |
| prev / next          | Previous / Next               | `ChevronLeft` / `ChevronRight` | secondary                           |
| menu                 | Menu (icon only)              | `Menu`                         | icon                                |
| notifications        | Notifications                 | `Bell`                         | icon                                |
| markAllRead          | Mark all read                 | `CheckCheck`                   | secondary                           |
| notificationSettings | Notification settings         | `Settings2`                    | secondary                           |
| addUser              | Add user                      | `UserPlus`                     | primary                             |
| resetPassword        | Reset password                | `KeyRound`                     | secondary + confirm                 |
| deactivate           | Deactivate account            | `UserX`                        | danger                              |
| reactivate           | Reactivate account            | `UserCheck`                    | secondary                           |
| copyPassword         | Copy temporary password       | `Copy` (→ `Check` when copied) | secondary                           |
| changePassword       | Change password               | `KeyRound`                     | primary on its page                 |
| delete               | Delete                        | `Trash2`                       | danger (settings only)              |
| signIn               | Sign in                       | `LogIn`                        | primary                             |
| signOut              | Sign out                      | `LogOut`                       | menu item                           |

**Variants and sizes** (see `04-actions-and-icons.svg`):

- **Primary:** teal gradient, white text, teal shadow.
- **Secondary:** white with the card edge, navy text.
- **Soft:** mint, teal-deep text.
- **Danger:** red-soft with a red border, red text; always opens `ConfirmAction`.
- **Icon:** 42 px square, only for More, Close, Menu, Previous / Next and Notifications, with
  `aria-label` and a tooltip.
- **Sizes:** lg 46 px (page primary), md 40–42 px, sm 32 px (table rows), 48 px in phone sticky
  bars.

**Rules**

- Icon on the left, 16 px (18 px on lg), `aria-hidden`, 8–10 px gap.
- Labels: verb + noun in sentence case.
- At most one primary per view.
- Busy state: spinner replaces the icon, label stays, button disabled.
- Disabled actions say why (tooltip or helper text).
- Destructive actions are never icon-only.
- More menu: items have icons; destructive items last, red, after a separator.

---

## 7. Phases

Every phase is done for **desktop and phone together**. Never leave a page restyled for one size only.

| Phase | Work                                                                                                                                                                                                                                      | Check at the end                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0     | Foundation (section 1) and the phone shell (5.1).                                                                                                                                                                                         | Send screenshots of the shell at 375 px (drawer closed and open) and 1440 px with one restyled page. Wait for my OK. |
| 1     | Building blocks (section 2 + 5.2), `/styleguide`, `src/config/actions.ts`.                                                                                                                                                                | `/styleguide` at 375 and 1440 px.                                                                                    |
| 2     | Resources: list, detail, new/edit, status (01, 02, 03).                                                                                                                                                                                   | The three pages match their SVGs at both sizes.                                                                      |
| 3     | Bookings: Find a slot, My bookings (05 · 5), new booking, bookings oversight, reservation detail.                                                                                                                                         |                                                                                                                      |
| 4     | Calendar: v4 lanes, phone agenda and grid, `PeekSheet` (05 · 2–4).                                                                                                                                                                        |                                                                                                                      |
| 5     | Maintenance & care: `/equipment` tabs (05 · 6), short forms as sheets (05 · 7), maintenance form, result entry.                                                                                                                           |                                                                                                                      |
| 6     | Users, settings, usage.                                                                                                                                                                                                                   |                                                                                                                      |
| 7     | Auth and system pages (05 · 8). Final sweep: every button goes through `ActionButton` / `MoreMenu` (grep for `<Button` with text but no icon), Title Case labels fixed, no raw hex, no Google Fonts.                                      | Full screenshot set (section 8).                                                                                     |
| 8     | Optional, ask before starting: an Overview page as in v4 (greeting, `StatRow` per role, schedule overview card, Equipment attention or Your next bookings, Quick access cards), built only from existing services and added to the menus. |                                                                                                                      |

---

## 8. Done when

- Every list page uses `ResponsiveList` + `FilterToolbar`, every detail page follows pattern B,
  every form page follows pattern C (short ones `AdaptiveDialog`).
- No modal is used for a detail view or a long form.
- Every action button has its mapped icon and label; destructive actions confirm.
- Zero raw hex colour classes outside `globals.css`; no requests to Google Fonts.
- Desktop pages match 01–04; phone pages match the phone frames in 01–03 and screens 1–8 in 05.
- At 375 px: no sideways page scroll, 44 px targets, sticky bars don't hide content, drawer and
  sheets work with touch and keyboard.
- At 768 and 1024 px: the right columns appear and hide as in the breakpoint table, and nothing
  overlaps.
- Keyboard: visible focus everywhere; sheets and dialogs trap focus and return it; status is never
  shown by colour alone; WCAG 2.2 AA contrast.
- Existing unit and integration tests pass; add unit tests for `actions.ts` (every key has a
  label, an icon and a variant) and for `ResponsiveList` column-priority logic.
- `npm run check` and `npm run build` pass.
- Final reply as AGENTS.md section 11 asks, plus screenshots at 375 px and 1440 px of:
  - calendar (agenda and grid on the phone, plus the peek sheet)
  - resource list, details and form (including the filter sheet and the form's error state on
    the phone)
  - my bookings
  - Equipment care Today tab and the Not done sheet
  - users list
  - sign in
  - the open drawer

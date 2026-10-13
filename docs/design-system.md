# Design system: BenchBook

BenchBook is the working name of the Resource Reservation Management System
(change it in `src/config/brand.ts`). The target look is
`docs/design-reference.html`. Use Tailwind classes built from the tokens
below; never put raw hex colours in components.

## 1. Who it is for

- Lab technologists, scientists, sample-transport staff, site managers and
  an admin, across a main lab and branch labs.
- Used on bench PCs and tablets, in bright rooms, often between tasks and
  sometimes with gloves on.
- Main job: see what is free and book it in under a minute. Managers: block
  time for service and see how resources are used.

## 2. Principles

1. Legibility first. Large, clear text and a font designed to tell 1, l, I
   and 0, O apart.
2. Speak the lab's language. Equipment status looks like the hang tags labs
   put on machines; blocked time uses caution hatching.
3. One accent. Teal means "you can act here". Amber and red only ever mean
   "blocked" or "destructive". Never use colour alone: always add text.
4. Calm. Borders, not shadows. No splash screens, sliders or scroll effects.
   Motion only answers something the user did.

## 3. Colour tokens (light theme)

Set in `src/app/globals.css` as CSS variables (shadcn/ui names) and mapped to
Tailwind in `@theme inline`.

| Token (CSS variable)                     | Value   | Use                                 |
| ---------------------------------------- | ------- | ----------------------------------- |
| --background                             | #F4F7F8 | app background ("lab paper")        |
| --foreground                             | #10242E | main text ("bench ink")             |
| --card / --popover                       | #FFFFFF | panels, tables, forms, menus        |
| --card-foreground / --popover-foreground | #10242E | text on panels                      |
| --primary                                | #0E6A85 | primary buttons, links, focus       |
| --primary-foreground                     | #FFFFFF | text on primary                     |
| --primary-hover                          | #0B5870 | primary button hover (7.9:1 white)  |
| --secondary                              | #DCEEF4 | soft teal fills                     |
| --secondary-foreground                   | #0B4F64 | text on soft teal                   |
| --muted                                  | #EEF1F3 | quiet fills                         |
| --muted-foreground                       | #5B6B73 | secondary text (5.1:1 on paper)     |
| --accent                                 | #DCEEF4 | hover fill in menus                 |
| --accent-foreground                      | #0B4F64 | text on hover fill                  |
| --destructive                            | #B42318 | delete, cancel, out of service      |
| --destructive-ink                        | #7A1A12 | error text on --tag-red-bg          |
| --border                                 | #D9E1E5 | hairlines                           |
| --input                                  | #7F8F98 | input, checkbox and radio borders   |
| --ring                                   | #3A8FA8 | focus ring (3:1 or more, also navy) |
| --radius                                 | 0.5rem  | controls (buttons, inputs)          |
| --sidebar                                | #0B3D52 | sidebar background ("network navy") |
| --sidebar-foreground                     | #E6EEF1 | sidebar text                        |
| --sidebar-muted                          | #9DB5C0 | quiet sidebar text (group labels)   |
| --sidebar-primary                        | #12506A | active sidebar item                 |
| --sidebar-primary-foreground             | #FFFFFF | active item text                    |
| --sidebar-accent                         | #134960 | sidebar hover                       |
| --sidebar-accent-foreground              | #FFFFFF | sidebar hover text                  |
| --sidebar-border                         | #1D5670 | sidebar dividers                    |
| --sidebar-ring                           | #3A8FA8 | sidebar focus                       |

App tokens (add to `:root` and map in `@theme inline`, e.g.
`--color-booking: var(--booking);`):

| Token             | Value   | Use                                  |
| ----------------- | ------- | ------------------------------------ |
| --booking         | #DCEEF4 | someone's booking (fill)             |
| --booking-ink     | #0B4F64 | text on a booking                    |
| --booking-edge    | #0E6A85 | 3px left edge of a booking           |
| --mine            | #0E6A85 | your own booking (fill)              |
| --mine-foreground | #FFFFFF | text on your own booking             |
| --maint           | #FBEEE5 | maintenance hatch, light stripe      |
| --maint-2         | #F4DBC8 | maintenance hatch, dark stripe       |
| --maint-ink       | #8F3F10 | text on maintenance                  |
| --maint-edge      | #B4541A | 3px left edge of maintenance         |
| --oos             | #EEF1F3 | out-of-service hatch, light stripe   |
| --oos-2           | #E2E8EB | out-of-service hatch, dark stripe    |
| --tag-red         | #B42318 | "Out of service" tag text and border |
| --tag-red-bg      | #FDECEA | "Out of service" tag fill            |
| --pass            | #1F7A4D | "Active" dot and text, success       |
| --pass-bg         | #E6F4EC | success fill                         |
| --off-hours       | #F8FAFB | calendar rows outside standard hours |

All text colour pairs above meet WCAG 2.2 AA (4.5:1 or better). Control
borders (--input) and the focus ring (--ring) meet the 3:1 non-text
contrast rule. Hairlines (--border) are decoration only: never the only
edge that shows where a control is. Lighter shades for tag and alert
borders come from tokens with opacity (for example border-tag-red/40).

## 4. Typography

- One family: **Atkinson Hyperlegible Next** (variable, weights 200-800),
  self-hosted with `@fontsource-variable/atkinson-hyperlegible-next`, so
  builds work offline. It was designed by the Braille Institute for
  legibility and has tabular figures.
- Use `tabular-nums` for times, dates, counts and percentages.

| Role             | Size / weight    | Example                         |
| ---------------- | ---------------- | ------------------------------- |
| Page title       | 24px / 700       | Calendar                        |
| Section title    | 18px / 700       | Upcoming bookings               |
| Body             | 16px / 400       | Click a free slot to book it.   |
| Table, form text | 15px / 400       | Molecular lab, room 2.14        |
| Labels           | 15px / 600       | Purpose                         |
| Small, hints     | 14px / 400       | Can be booked for up to 4 hours |
| Calendar times   | 12-13px, tabular | 08:00 to 11:00                  |

- Sentence case everywhere. No all-capital labels, no tracked "eyebrow"
  labels above headings, no single coloured word in a heading.
- Paragraphs at most about 75 characters wide.

## 5. Space, shape, depth

- 4px spacing base. Page padding 24px (16px on phones). Gap between blocks
  16px.
- Radius follows hierarchy: tags 4px, calendar blocks 6px, controls 8px,
  panels and dialogs 12px. Pills 999px.
- Borders, not shadows. Only menus, popovers and dialogs get a shadow.
- Focus: 3px ring in --ring with 2px offset on every interactive element.
- Controls are 40px high (h-10); labels 15px.

## 6. Layout

```
+----------+--------------------------------------------------------+
| SIDEBAR  | TOP BAR: [=] Resources / HPLC system      (right slot) |
| navy     +--------------------------------------------------------+
| BenchBook| PAGE HEADER: Title                      [Primary action] |
| site name|              one-line description                       |
|          |                                                         |
| Calendar | CONTENT (panels on lab paper)                           |
| Resources|                                                         |
| My book. |                                                         |
| --Manage-|                                                         |
| Mainten. |                                                         |
| Usage    |                                                         |
| Users    |                                                         |
| --Admin--|                                                         |
| Settings |                                                         |
|  (user)  |                                                         |
+----------+--------------------------------------------------------+
```

- Sidebar 240px, collapses to icons; on phones it opens as a sheet.
- Nav items come from `src/config/navigation.ts`, filtered by role.
- Left-aligned content. Forms at most 640px wide; tables use full width
  and scroll sideways inside their panel on small screens.

## 7. Status language

- **Resource status**: Active = green dot + "Active". Out of service = red
  hang tag (rectangle with a punched hole). Retired = grey hang tag.
- **Calendar blocks**: booking = soft teal with a teal left edge; your own
  booking = solid teal with a white "You" chip; maintenance = amber caution
  hatching with an amber left edge; an out-of-service resource = its whole
  column hatched grey, with the red tag in the column header.
- **Account status** (users page) uses pills, not hang tags: Active,
  Must change password, Locked, Inactive.
- **Usage**: Busy = solid teal pill; Idle = grey outline pill.

## 8. Writing

- Name things the way lab staff do: resource, booking, maintenance, site,
  section. Never "entity", "slot object" or "record".
- One name per action through the whole flow: button "Book", toast
  "Booking confirmed"; "Cancel booking" -> "Booking cancelled"; "Block
  time" -> "Time blocked"; "Mark out of service" -> "Marked out of service".
- Buttons say what happens: "Book", "Save changes", "Reset password",
  never "Submit" or "OK".
- Errors say what happened and what to do: "This time clashes with Chamari
  Herath's booking, Tue 13 Oct, 11:00 to 13:00. Choose another time or see
  the calendar." No apologies, no exclamation marks.
- Empty screens invite the next step: "No upcoming bookings. Find a free
  slot in the calendar." plus one button.
- Times: "Tue 13 Oct, 10:00 to 12:00" in lists and messages
  (formatLabRange) and "08:00 to 11:00" inside calendar blocks
  (formatTimeRange). Screen readers read "to" correctly; a hyphen can be
  read as "minus".
- Cancelled bookings: "Cancelled by Nadeesha Perera. Reason: Maintenance:
  Annual calibration."

## 9. Accessibility and responsive rules

- Every input has a visible label; errors are linked with
  `aria-describedby`; the first error gets focus after a failed submit.
- Status always has text. Hatching and colour are extra signals only.
- Every free calendar slot and every block is a link with a full
  `aria-label` ("Book HPLC system at 10:00"; "HbA1c batch, Dilani
  Fernando, 08:30 to 12:30").
- Dialogs trap focus and return it; the Escape key closes them.
- Works at 375px wide; no sideways scrolling of the page itself.
- Respect `prefers-reduced-motion` (use Tailwind `motion-safe:`).
- Target: Lighthouse accessibility score 95+ on the main pages.

## 10. Motion

- No page loaders, no entrance animations, no parallax.
- Allowed: dialogs and sheets opening, toasts sliding in, a 150ms colour
  change on hover, the calendar's "now" line moving.

## 11. Category icons (lucide-react)

| icon_key      | Icon         | Typical category       |
| ------------- | ------------ | ---------------------- |
| molecular     | Dna          | Molecular instruments  |
| analytical    | FlaskConical | Analytical instruments |
| microscopy    | Microscope   | Microscopy             |
| biosafety     | ShieldCheck  | Biosafety cabinets     |
| sterilisation | Flame        | Sterilisation          |
| room          | DoorOpen     | Rooms                  |
| vehicle       | Truck        | Vehicles               |
| other         | Box          | anything else          |

The keys live in `src/config/category-icons.ts`; `categories.icon_key`
stores one of them.

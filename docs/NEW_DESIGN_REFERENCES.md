# Clinical Precision Design System: Table View, Buttons & Dialog References

> **Source Analysis**: Extracted and adapted from the Stitch Clinical Precision Dark Console (`stitch_automotive_service_landing_page (1)`), specifically analyzing `DESIGN.md` and `code.html`.
> **Scope**: High-Ergonomics Table View, Action Buttons (Edit, Delete, Submit/Save Changes), Modal Dialogs, and Real-Time Status Indicators for the BenchBook Medical Lab Resource Reservation System.

---

## 1. Visual Hierarchy & Design System Tokens

The new design reference transitions from basic flat tables to a **multi-layered, glare-reducing clinical console** tailored for laboratory monitors, diagnostic environments, and high-density data review.

### 1.1 Color Tokens & Surface Layering

| Surface Level       | Hex Token             | CSS Variable / Tailwind        | Description & Usage                                       |
| :------------------ | :-------------------- | :----------------------------- | :-------------------------------------------------------- |
| **Canvas Base**     | `#0b1322` / `#101827` | `--background` / `bg-surface`  | Root application background, glare-absorbing matte finish |
| **Recessed Track**  | `#060e1d` / `#0f172a` | `bg-surface-container-lowest`  | Table input fields, filter textboxes, inactive tracks     |
| **Surface Low**     | `#141c2b`             | `bg-surface-container-low`     | Table container cards, card base, metrics strip           |
| **Surface Default** | `#18202f`             | `bg-surface-container`         | Standard structural elements, sidebar, button base        |
| **Surface High**    | `#222a3a`             | `bg-surface-container-high`    | Row hover states, active tab backgrounds, toolbars        |
| **Surface Highest** | `#2d3545`             | `bg-surface-container-highest` | Sticky table headers, subtle card dividers                |

### 1.2 Operational Colors & Accent Palette

| State                 | Foreground            | Background Pill / Container | Border                     | Notes                                                  |
| :-------------------- | :-------------------- | :-------------------------- | :------------------------- | :----------------------------------------------------- |
| **Primary (Teal)**    | `#6cd8cb` (`#0f9488`) | `rgba(15, 148, 136, 0.15)`  | `rgba(15, 148, 136, 0.3)`  | Primary actions, submit buttons, active links          |
| **Success / Active**  | `#34d399` (`#10b981`) | `rgba(16, 185, 129, 0.1)`   | `rgba(16, 185, 129, 0.25)` | Online equipment, verified status with pulse dot       |
| **Maintenance**       | `#fbbf24` (`#d97706`) | `rgba(217, 119, 6, 0.15)`   | `rgba(217, 119, 6, 0.35)`  | 45° diagonal hatch stripe pattern applied              |
| **Destructive / OOS** | `#f87171` (`#ef4444`) | `rgba(239, 68, 68, 0.15)`   | `rgba(239, 68, 68, 0.35)`  | Delete buttons, decommissioned items, hardware lockout |
| **Hairline Border**   | `#334155` / `#3d4947` | —                           | `border-outline-variant`   | 1px precision separation lines                         |

### 1.3 Typography

- **UI Headings & Body**: `Inter` (Regular `400`, Medium `500`, Semi-bold `600`).
- **Telemetry, Timecodes, IDs & Numeric Counts**: `JetBrains Mono` with `tabular-nums` (`font-feature-settings: "tnum" 1`).

---

## 2. Table View Design Reference

The new table architecture is designed for dense data readability, eliminating visual jitter with sticky headers, icon badges, and contextual state row-tints.

### 2.1 Visual Specifications

1. **Container**:
   - `rounded-lg border border-outline-variant bg-surface-container-low overflow-hidden shadow-sm`
2. **Header Row (`<thead>`)**:
   - Background: `bg-surface-container-highest/60` (or `#222a3a`)
   - Border: `border-b border-outline-variant`
   - Typography: `text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold py-3 px-4`
3. **Data Rows (`<tbody>`)**:
   - Border: `divide-y divide-outline-variant/40`
   - Default background: `bg-transparent`
   - Hover state: `hover:bg-surface-container-high/40 transition-colors duration-150`
   - Out-of-Service row tint: `bg-rose-950/10`
   - Maintenance row texture: `.hatch-maintenance` (45-degree repeating diagonal stripe)
4. **Primary Column (Resource Details)**:
   - 36×36px (`w-9 h-9`) rounded container icon with category glyph.
   - Two-tier text: Bold headline `text-on-surface group-hover:text-primary transition-colors` + subtitle `Microscopy • Max slot: 3 h` with mono dot separator.
5. **Real-Time Status Badge**:
   - Pill badge with integrated status dot (with `animate-pulse` on active items).
6. **Table Footer / Pagination**:
   - Integrated footer bar showing total item count and pagination buttons.

### 2.2 Table View Code Reference (React / Tailwind Component)

```tsx
import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Wrench,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export interface ResourceRowItem {
  id: string;
  name: string;
  category: string;
  maxSlot: string;
  site: string;
  section: string;
  location: string | null;
  status: "ACTIVE" | "IN_USE" | "MAINTENANCE" | "OUT_OF_SERVICE";
  statusLabel?: string;
  icon: React.ReactNode;
}

export function ClinicalResourceTable({ resources }: { resources: ResourceRowItem[] }) {
  return (
    <div className="rounded-lg border border-[#334155] bg-[#141c2b] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-[#222a3a]/70 border-b border-[#334155] text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
              <th className="py-3 px-4 font-semibold">Resource Details</th>
              <th className="py-3 px-4 font-semibold">Site / Campus</th>
              <th className="py-3 px-4 font-semibold">Owning Section</th>
              <th className="py-3 px-4 font-semibold">Clinical Room</th>
              <th className="py-3 px-4 font-semibold">Real-Time Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-[#334155]/40 text-sm text-[#dbe2f8]">
            {resources.map((item) => {
              const isMaintenance = item.status === "MAINTENANCE";
              const isOOS = item.status === "OUT_OF_SERVICE";

              return (
                <tr
                  key={item.id}
                  className={`
                    group transition-colors duration-150 hover:bg-[#222a3a]/50
                    ${isOOS ? "bg-rose-950/15" : ""}
                    ${isMaintenance ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(217,119,6,0.1)_8px,rgba(217,119,6,0.1)_16px)]" : ""}
                  `}
                >
                  {/* Resource Details Cell */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border
                        ${
                          isOOS
                            ? "bg-[#18202f] border-rose-500/40 text-rose-400"
                            : isMaintenance
                              ? "bg-[#18202f] border-amber-500/40 text-amber-400"
                              : "bg-[#18202f] border-[#334155] text-[#6cd8cb]"
                        }
                      `}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/resources/${item.id}`}
                          className="font-semibold text-[#f1f5f9] group-hover:text-[#6cd8cb] transition-colors truncate block text-sm"
                        >
                          {item.name}
                        </Link>
                        <span className="text-xs text-[#94a3b8] font-mono block truncate">
                          {item.category} • Max slot: {item.maxSlot}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Site Cell */}
                  <td className="py-3.5 px-4 font-medium text-[#f1f5f9] text-sm">{item.site}</td>

                  {/* Section Cell */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-[#18202f] text-[#bcc9c6] border border-[#334155]/60">
                      {item.section}
                    </span>
                  </td>

                  {/* Location Cell */}
                  <td className="py-3.5 px-4 text-xs font-mono">
                    {item.location ? (
                      <span className="text-[#f1f5f9]">{item.location}</span>
                    ) : (
                      <span className="text-[#879390] italic">Not set</span>
                    )}
                  </td>

                  {/* Status Cell */}
                  <td className="py-3.5 px-4">
                    {item.status === "ACTIVE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    )}
                    {item.status === "IN_USE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                        In-Use
                      </span>
                    )}
                    {item.status === "MAINTENANCE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {item.statusLabel || "Maintenance"}
                      </span>
                    )}
                    {item.status === "OUT_OF_SERVICE" && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {item.statusLabel || "Out of service"}
                      </span>
                    )}
                  </td>

                  {/* Action Column */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {item.status === "ACTIVE" ? (
                        <button className="bg-[#6cd8cb]/15 hover:bg-[#6cd8cb] text-[#6cd8cb] hover:text-[#003732] text-xs font-mono font-semibold px-3 py-1 rounded border border-[#6cd8cb]/30 transition-all duration-150 active:scale-95">
                          Book Slot
                        </button>
                      ) : (
                        <button className="bg-[#18202f] hover:bg-[#222a3a] text-[#94a3b8] hover:text-[#f1f5f9] text-xs font-mono font-medium px-2.5 py-1 rounded border border-[#334155] transition-all">
                          View Log
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Pagination & Metrics Strip */}
      <div className="p-3 bg-[#18202f] border-t border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#94a3b8]">
        <div>
          Showing <span className="font-semibold text-[#f1f5f9] tabular-nums">1-5</span> of{" "}
          <span className="font-semibold text-[#f1f5f9] tabular-nums">14</span> assets
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#879390] disabled:opacity-40 disabled:cursor-not-allowed hover:text-[#f1f5f9] transition-colors"
          >
            Previous
          </button>
          <span className="px-2 text-[#6cd8cb] font-semibold tabular-nums">Page 1 of 3</span>
          <button className="px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#dbe2f8] hover:bg-[#222a3a] transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Button System Reference: Edit, Delete, Submit & Action Variants

The prototype introduces distinct ergonomic rules for primary, inline table, and destructive actions.

```
+----------------------------------------------------------------------------------------------------+
| CLINICAL BUTTON SPECIFICATIONS                                                                     |
+----------------------------------------------------------------------------------------------------+
| 1. Submit / Primary Action: Teal background (#6cd8cb / #0f9488), dark ink, 38-40px height          |
| 2. Edit Action:             Surface background (#18202f), hairline border (#334155), teal icon     |
| 3. Delete Action:           Soft red hover (hover:bg-rose-500/10 hover:text-rose-400), trash icon |
| 4. Cancel / Ghost:          Transparent/surface hover, muted text (#94a3b8 -> #f1f5f9)             |
+----------------------------------------------------------------------------------------------------+
```

### 3.1 Edit Button Reference

Used in table rows (such as Sites, Sections, Users, and Resource management):

```tsx
interface EditButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  onClick?: () => void;
}

export function ClinicalEditButton({
  label = "Edit",
  onClick,
  className = "",
  ...props
}: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded
        bg-[#18202f] hover:bg-[#222a3a] 
        text-xs font-mono font-medium text-[#dbe2f8] hover:text-[#f1f5f9]
        border border-[#334155] hover:border-[#6cd8cb]/50
        transition-all duration-150 active:scale-[0.98]
        focus:outline-none focus:ring-1 focus:ring-[#6cd8cb]
        ${className}
      `}
      {...props}
    >
      <svg
        className="w-3.5 h-3.5 text-[#6cd8cb]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
```

### 3.2 Delete Button Reference

Designed with safety cues: neutral resting state to avoid visual alarm, turning red only on intentional hover.

```tsx
interface DeleteButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  onClick?: () => void;
}

export function ClinicalDeleteButton({
  title = "Decommission",
  onClick,
  className = "",
  ...props
}: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        inline-flex items-center justify-center p-1.5 rounded
        text-[#94a3b8] hover:text-rose-400 
        hover:bg-rose-500/10 
        border border-transparent hover:border-rose-500/30
        transition-colors duration-150 active:scale-95
        focus:outline-none focus:ring-1 focus:ring-rose-400
        ${className}
      `}
      {...props}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
      <span className="sr-only">{title}</span>
    </button>
  );
}
```

### 3.3 Submit / Save Changes Button Reference

Used in modals, forms, and primary actions:

```tsx
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  label?: string;
  pendingLabel?: string;
}

export function ClinicalSubmitButton({
  isPending = false,
  label = "Save changes",
  pendingLabel = "Saving...",
  className = "",
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className={`
        inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg
        bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732]
        text-sm font-semibold tracking-tight
        shadow-sm transition-all duration-150
        active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        focus:outline-none focus:ring-2 focus:ring-[#6cd8cb] focus:ring-offset-2 focus:ring-offset-[#0b1322]
        ${className}
      `}
      {...props}
    >
      {isPending && (
        <svg className="w-4 h-4 animate-spin text-[#003732]" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      <span>{isPending ? pendingLabel : label}</span>
    </button>
  );
}
```

### 3.4 Cancel Button Reference

```tsx
export function ClinicalCancelButton({
  onClick,
  label = "Cancel",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium text-[#dbe2f8] hover:bg-[#222a3a] hover:text-[#f1f5f9] transition-colors duration-150"
    >
      {label}
    </button>
  );
}
```

---

## 4. Modal Dialog Design Reference (`EditSiteDialog`)

The modal incorporates layered depth, backdrop blur (`clinical-modal-backdrop`), and a **Telemetry Stats Callout** that summarizes linked database relations before mutations occur.

```tsx
import * as React from "react";
import { ClinicalSubmitButton } from "./buttons";
import { ClinicalCancelButton } from "./buttons";
import { Info, X } from "lucide-react";

interface EditSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: { name: string; address: string }) => Promise<void>;
  site: {
    id: string;
    name: string;
    address?: string | null;
    resourcesCount: number;
    usersCount: number;
  };
}

export function ClinicalEditSiteModal({ isOpen, onClose, onSubmit, site }: EditSiteModalProps) {
  const [name, setName] = React.useState(site.name);
  const [address, setAddress] = React.useState(site.address ?? "");
  const [isPending, setIsPending] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    await onSubmit({ name, address });
    setIsPending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-[4px] animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#141c2b] border border-[#334155] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]/60 bg-[#18202f]">
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-[#f1f5f9]">Edit site</h2>
            <span className="text-xs text-[#94a3b8]">
              Update name and physical address for this laboratory site.
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-[#222a3a] flex items-center justify-center text-[#879390] hover:text-[#f1f5f9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Site Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#bcc9c6]">
              Site Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#060e1d] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#879390] focus:border-[#6cd8cb] focus:ring-1 focus:ring-[#6cd8cb] focus:outline-none transition-all"
            />
          </div>

          {/* Address Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#bcc9c6]">
                Address
              </label>
              <span className="text-xs font-mono text-[#879390]">(optional)</span>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Colombo 08"
              className="w-full bg-[#060e1d] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#879390] focus:border-[#6cd8cb] focus:ring-1 focus:ring-[#6cd8cb] focus:outline-none transition-all"
            />
          </div>

          {/* Telemetry Stats Callout */}
          <div className="p-3 bg-[#18202f] border border-[#334155]/60 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-[#6cd8cb] shrink-0" />
              <span className="text-xs text-[#94a3b8] font-mono">
                Associated with{" "}
                <strong className="text-[#f1f5f9]">{site.resourcesCount} resources</strong> and{" "}
                <strong className="text-[#f1f5f9]">{site.usersCount} users</strong>.
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Operational
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]/40 mt-1">
            <ClinicalCancelButton onClick={onClose} />
            <ClinicalSubmitButton isPending={isPending} label="Save changes" />
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 5. Summary Table Comparison: Current vs New Design

| Element                | Previous UI (Light / Neutral)            | New Clinical Precision Design                                     |
| :--------------------- | :--------------------------------------- | :---------------------------------------------------------------- |
| **Theme / Background** | Light grey `#f4f7f8`, white cards        | Deep matte `#0b1322`, layered containers (`#141c2b` / `#18202f`)  |
| **Table Header**       | Soft grey `bg-muted/40`, mixed font      | Sticky `#222a3a/70`, `label-sm` uppercase mono, tracking-wider    |
| **Table Rows**         | Plain divider, basic hover               | High contrast `#dbe2f8`, subtle hover `#222a3a/50`, OOS rose wash |
| **Maintenance Rows**   | Plain text warning                       | 45° linear amber diagonal hatch pattern `.hatch-maintenance`      |
| **Edit Button**        | Secondary outline button (`h-8 text-xs`) | Compact 30px container button `#18202f` with teal icon & border   |
| **Delete Button**      | Standard ghost icon with light red hover | Subtle neutral icon with soft rose hover `hover:bg-rose-500/10`   |
| **Submit Button**      | Deep teal `#0e6a85` with white text      | Electric Clinical Teal `#6cd8cb` / `#29a195` with dark ink text   |
| **Modal Dialog**       | Plain white card with standard border    | Low-glare container, blur backdrop, telemetry metadata badge      |

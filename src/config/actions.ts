import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Pencil,
  Eye,
  ArrowUpRight,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  CalendarPlus,
  CalendarSearch,
  CalendarDays,
  CalendarX,
  BellPlus,
  BellOff,
  CalendarClock,
  CircleStop,
  ClipboardPen,
  CircleCheck,
  CircleSlash,
  PowerOff,
  Power,
  Archive,
  Camera,
  FileDown,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  FunnelX,
  Menu,
  Bell,
  CheckCheck,
  Settings2,
  UserPlus,
  KeyRound,
  UserX,
  UserCheck,
  Copy,
  Trash2,
  LogIn,
  LogOut,
} from "lucide-react";

export type ActionVariant =
  "primary" | "secondary" | "soft" | "danger" | "icon" | "link" | "menuItem";

export interface ActionDefinition {
  label: string;
  icon: LucideIcon;
  variant: ActionVariant;
}

export type ActionKey =
  | "add"
  | "edit"
  | "view"
  | "openFull"
  | "save"
  | "cancelForm"
  | "back"
  | "more"
  | "close"
  | "book"
  | "findSlot"
  | "today"
  | "cancelBooking"
  | "notifyMe"
  | "cancelAlert"
  | "blockTime"
  | "endNow"
  | "cancelBlock"
  | "recordResult"
  | "markDone"
  | "notDone"
  | "takeOutOfService"
  | "backInService"
  | "retire"
  | "addPhotos"
  | "downloadPdf"
  | "downloadCsv"
  | "recordPdf"
  | "refresh"
  | "search"
  | "filters"
  | "clearFilters"
  | "prev"
  | "next"
  | "menu"
  | "notifications"
  | "markAllRead"
  | "notificationSettings"
  | "addUser"
  | "resetPassword"
  | "deactivate"
  | "reactivate"
  | "copyPassword"
  | "changePassword"
  | "delete"
  | "signIn"
  | "signOut";

export const ACTION_DEFINITIONS: Record<ActionKey, ActionDefinition> = {
  add: { label: "Add", icon: Plus, variant: "primary" },
  edit: { label: "Edit", icon: Pencil, variant: "secondary" },
  view: { label: "View", icon: Eye, variant: "secondary" },
  openFull: { label: "Open full page", icon: ArrowUpRight, variant: "secondary" },
  save: { label: "Save", icon: Check, variant: "primary" },
  cancelForm: { label: "Cancel", icon: X, variant: "secondary" },
  back: { label: "Back", icon: ChevronLeft, variant: "link" },
  more: { label: "More", icon: Ellipsis, variant: "icon" },
  close: { label: "Close", icon: X, variant: "icon" },
  book: { label: "Book", icon: CalendarPlus, variant: "primary" },
  findSlot: { label: "Find a slot", icon: CalendarSearch, variant: "secondary" },
  today: { label: "Today", icon: CalendarDays, variant: "secondary" },
  cancelBooking: { label: "Cancel booking", icon: CalendarX, variant: "danger" },
  notifyMe: { label: "Notify me", icon: BellPlus, variant: "soft" },
  cancelAlert: { label: "Cancel alert", icon: BellOff, variant: "secondary" },
  blockTime: { label: "Block time", icon: CalendarClock, variant: "secondary" },
  endNow: { label: "End now", icon: CircleStop, variant: "danger" },
  cancelBlock: { label: "Cancel block", icon: CalendarX, variant: "danger" },
  recordResult: { label: "Record result", icon: ClipboardPen, variant: "primary" },
  markDone: { label: "Mark as done", icon: CircleCheck, variant: "primary" },
  notDone: { label: "Not done", icon: CircleSlash, variant: "secondary" },
  takeOutOfService: { label: "Take out of service", icon: PowerOff, variant: "danger" },
  backInService: { label: "Back in service", icon: Power, variant: "secondary" },
  retire: { label: "Retire", icon: Archive, variant: "danger" },
  addPhotos: { label: "Add photos", icon: Camera, variant: "secondary" },
  downloadPdf: { label: "Download PDF", icon: FileDown, variant: "secondary" },
  downloadCsv: { label: "Download CSV", icon: FileSpreadsheet, variant: "secondary" },
  recordPdf: { label: "Service record PDF", icon: FileText, variant: "secondary" },
  refresh: { label: "Refresh", icon: RefreshCw, variant: "secondary" },
  search: { label: "Search", icon: Search, variant: "secondary" },
  filters: { label: "Filters", icon: SlidersHorizontal, variant: "secondary" },
  clearFilters: { label: "Clear all", icon: FunnelX, variant: "link" },
  prev: { label: "Previous", icon: ChevronLeft, variant: "secondary" },
  next: { label: "Next", icon: ChevronRight, variant: "secondary" },
  menu: { label: "Menu", icon: Menu, variant: "icon" },
  notifications: { label: "Notifications", icon: Bell, variant: "icon" },
  markAllRead: { label: "Mark all read", icon: CheckCheck, variant: "secondary" },
  notificationSettings: {
    label: "Notification settings",
    icon: Settings2,
    variant: "secondary",
  },
  addUser: { label: "Add user", icon: UserPlus, variant: "primary" },
  resetPassword: { label: "Reset password", icon: KeyRound, variant: "secondary" },
  deactivate: { label: "Deactivate account", icon: UserX, variant: "danger" },
  reactivate: { label: "Reactivate account", icon: UserCheck, variant: "secondary" },
  copyPassword: { label: "Copy temporary password", icon: Copy, variant: "secondary" },
  changePassword: { label: "Change password", icon: KeyRound, variant: "primary" },
  delete: { label: "Delete", icon: Trash2, variant: "danger" },
  signIn: { label: "Sign in", icon: LogIn, variant: "primary" },
  signOut: { label: "Sign out", icon: LogOut, variant: "menuItem" },
};

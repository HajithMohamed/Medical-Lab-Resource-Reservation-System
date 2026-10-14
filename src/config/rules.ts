// Business rules: every number the app depends on, in one place.
// Change a value here and the whole app follows. Keep a comment on each.

// Booking
export const SLOT_MINUTES = 15; // bookings start and end on 15-minute marks
export const MIN_BOOKING_MINUTES = 15; // shortest booking
export const BOOKING_WINDOW_DAYS = 60; // how far ahead people can book
export const MAX_CATEGORY_LIMIT_MINUTES = 7 * 24 * 60; // highest per-category limit an admin can set (7 days)
export const RECENT_DAYS = 30; // "past" and "cancelled" lists show the last 30 days
export const FIND_SLOT_DEFAULT_DURATION_MINUTES = 60; // first value in the form
export const FIND_SLOT_DURATIONS_MINUTES = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 600, 720]; // choices in the form; the category limit still rules
export const FIND_SLOT_SUGGESTIONS = 3; // nearest free start times shown for a busy resource
export const BOOKINGS_PAGE_SIZE = 25; // rows per page on bookings oversight

// Sign-in and sessions
export const SESSION_COOKIE_NAME = "lab_session";
export const SESSION_HOURS = 8; // one working shift
export const MAX_FAILED_LOGINS = 5; // wrong passwords in a row before the account locks
export const LOCK_MINUTES = 15; // how long the account stays locked
export const PASSWORD_MIN_LENGTH = 15; // NIST SP 800-63B-4 minimum when the password is the only factor
export const PASSWORD_MAX_LENGTH = 64; // NIST: allow at least 64 characters
export const BCRYPT_MAX_BYTES = 72; // bcrypt ignores everything after 72 bytes
export const BCRYPT_COST = 12; // OWASP: bcrypt work factor of 10 or more
export const TEMP_PASSWORD_GROUPS = 4; // temporary password = 4 groups ...
export const TEMP_PASSWORD_GROUP_LENGTH = 4; // ... of 4 characters, e.g. k7mq-x4tr-9hwz-3pfd
export const TEMP_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o or 1/l/i: easy to read aloud

// Calendar
export const CALENDAR_ROW_MINUTES = 30; // one grid row = 30 minutes
export const CALENDAR_SCROLL_TO_HOUR = 7; // the grid opens at 07:00
export const CALENDAR_REFRESH_SECONDS = 60; // live view: reload the data every minute

// Usage dashboard
export const STANDARD_WEEKDAYS = [1, 2, 3, 4, 5]; // Monday-Friday (0 = Sunday, as in date-fns getDay)
export const STANDARD_DAY_START_HOUR = 8; // standard hours for utilisation: 08:00 ...
export const STANDARD_DAY_END_HOUR = 18; // ... to 18:00
export const USAGE_DEFAULT_DAYS = 28; // default report period: the last four weeks
export const USAGE_MAX_DAYS = 92; // longest report period (about three months)
export const BUSY_UTILISATION_PERCENT = 70; // at or above this, a resource is "busy"
export const IDLE_UTILISATION_PERCENT = 10; // below this, a resource is "idle"

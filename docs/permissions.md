# Access rules

The server enforces every rule; `src/lib/permissions.ts` is the code version of this page.

## 1. Roles

- **STAFF:** A lab worker at one site and section. Finds and books resources at any site for themselves; manages own bookings.
- **MANAGER:** The manager of ONE site. Everything staff do, plus that site's staff accounts, resources, equipment care, maintenance, bookings oversight, and usage.
- **ADMIN:** Runs the whole network; no site, no section; does not book. Manages sites, sections, categories, all users, and oversees every site's resources, bookings, equipment, and usage.

## 2. Account states

- **Not signed in:** Access only to `/login`, `/api/health`, and `/api/jobs/*` (with dedicated secret).
- **Must change password:** Access only to `/change-password` and sign out.
- **Inactive:** Signed out everywhere immediately; cannot sign in.
- **Locked (5 failed attempts):** Cannot sign in for 15 minutes; a password reset by an administrator or the site's manager also unlocks the account.

## 3. Menus per role

| Role        | Main Group                                    | Manage Group                                             | Admin Group | Top Bar Bell       |
| :---------- | :-------------------------------------------- | :------------------------------------------------------- | :---------- | :----------------- |
| **STAFF**   | Calendar, Find a slot, Resources, My bookings | _(none)_                                                 | _(none)_    | _(none)_           |
| **MANAGER** | Calendar, Find a slot, Resources, My bookings | Bookings, Maintenance, Equipment care (E1), Usage, Users | _(none)_    | Notifications (E2) |
| **ADMIN**   | Calendar, Resources                           | Bookings, Maintenance, Equipment care (E1), Usage, Users | Settings    | Notifications (E2) |

## 4. Pages and buttons

### Calendar (`/calendar`)

| Action / Element                                            | STAFF | MANAGER  | ADMIN              |
| :---------------------------------------------------------- | :---- | :------- | :----------------- |
| Day view per site & week view per resource                  | view  | view     | view               |
| Site switcher & category filter                             | yes   | yes      | yes                |
| Click a free slot -> booking form                           | yes   | yes      | no                 |
| Click a booking -> details modal                            | yes   | yes      | yes                |
| "You" chip on own bookings                                  | yes   | yes      | no _(cannot book)_ |
| Cancel own not-started booking                              | yes   | yes      | no _(cannot book)_ |
| Cancel someone else's not-started booking (reason required) | no    | own site | all sites          |
| Click a maintenance block -> details modal                  | yes   | yes      | yes                |
| Cancel a maintenance block                                  | no    | own site | all sites          |
| "Book a resource" button                                    | yes   | yes      | no                 |
| "Block time" button                                         | no    | own site | all sites          |
| "Find a slot" toolbar button                                | yes   | yes      | no                 |

### Find a slot (`/book`)

| Action / Element               | STAFF | MANAGER | ADMIN                                  |
| :----------------------------- | :---- | :------ | :------------------------------------- |
| Search form & results          | yes   | yes     | no _(redirects to `/bookings/manage`)_ |
| Book / next free times buttons | yes   | yes     | no                                     |

### Resources (`/resources`)

| Action / Element                  | STAFF | MANAGER                 | ADMIN    |
| :-------------------------------- | :---- | :---------------------- | :------- |
| Register with filters (all sites) | view  | view                    | view     |
| "Add resource" button             | no    | own site _(site fixed)_ | any site |

### Resource details (`/resources/[id]`)

| Action / Element                             | STAFF | MANAGER  | ADMIN     |
| :------------------------------------------- | :---- | :------- | :-------- |
| Details, 7-day schedule, maintenance history | view  | view     | view      |
| "Book" button (ACTIVE resources only)        | yes   | yes      | no        |
| "Edit" resource button                       | no    | own site | all sites |
| "Change status" button                       | no    | own site | all sites |
| "Block time" (maintenance) button            | no    | own site | all sites |
| Equipment "Record ..." buttons (E1)          | no    | own site | all sites |

### My bookings (`/bookings`)

| Action / Element                           | STAFF    | MANAGER  | ADMIN                                  |
| :----------------------------------------- | :------- | :------- | :------------------------------------- |
| Upcoming / Past (30 days) / Cancelled tabs | own only | own only | no _(redirects to `/bookings/manage`)_ |
| Cancel own not-started booking             | own only | own only | no                                     |
| Booking form (`/bookings/new`)             | yes      | yes      | no _(refused with error)_              |

### Bookings oversight (`/bookings/manage`)

| Action / Element                       | STAFF | MANAGER  | ADMIN     |
| :------------------------------------- | :---- | :------- | :-------- |
| Oversight list & filters               | no    | own site | all sites |
| Cancel not-started booking with reason | no    | own site | all sites |
| View who cancelled, when and why       | no    | yes      | yes       |

### Maintenance (`/maintenance`)

| Action / Element                                                | STAFF | MANAGER  | ADMIN     |
| :-------------------------------------------------------------- | :---- | :------- | :-------- |
| List upcoming & past blocks                                     | no    | own site | all sites |
| "Block time" (lists overlapping bookings & cancels with reason) | no    | own site | all sites |
| "Report breakdown" -> Change status (OUT_OF_SERVICE)            | no    | own site | all sites |
| "Cancel block" (future blocks)                                  | no    | own site | all sites |

### Equipment care (E1)

_Added by E1._

### Notifications (E2)

_Added by E2._

### Usage (`/usage`)

| Action / Element        | STAFF | MANAGER       | ADMIN                        |
| :---------------------- | :---- | :------------ | :--------------------------- |
| Usage overview & charts | no    | own site only | all sites + network overview |

### Users (`/users`)

| Action / Element                | STAFF | MANAGER           | ADMIN                             |
| :------------------------------ | :---- | :---------------- | :-------------------------------- |
| User list & filters             | no    | own site          | all sites                         |
| "Add user" + temporary password | no    | STAFF at own site | any role, any site                |
| Edit name, email, section       | no    | own-site STAFF    | anyone                            |
| Change role or site             | no    | no                | anyone but self                   |
| "Reset password" (also unlocks) | no    | own-site STAFF    | anyone but self                   |
| Deactivate / Reactivate         | no    | own-site STAFF    | anyone but self, never last admin |

### Settings (`/settings`)

| Action / Element                                                  | STAFF | MANAGER | ADMIN |
| :---------------------------------------------------------------- | :---- | :------ | :---- |
| Sites, sections, categories: add, edit, delete (only when unused) | no    | no      | yes   |
| Category booking limits (minutes)                                 | no    | no      | yes   |

### Account menu (top bar)

| Action / Element                        | STAFF | MANAGER | ADMIN |
| :-------------------------------------- | :---- | :------ | :---- |
| View own name, role, site               | yes   | yes     | yes   |
| "Change password"                       | yes   | yes     | yes   |
| Change own role, site, or active status | no    | no      | no    |

## 5. Booking rules for those who may book (STAFF, MANAGER)

- Only for yourself; any site; resource must be `ACTIVE`.
- 15-minute slot alignment marks, at least 15 minutes, at most the category limit.
- Not in the past; at most 60 days in advance.
- Room reservations require attendees between 1 and room capacity.
- Clash-free: rejection by database GiST exclusion constraint (`reservations_no_overlap`).
- No approval: confirmed immediately.
- **ADMIN cannot book:** Administrators oversee the network and do not book bench resources.

## 6. Constraints C1–C9

- **C1: The server decides.** Every page and Server Action checks the user and role itself and calls a `src/lib/permissions.ts` function. Hidden buttons are only for UX convenience.
- **C2: Never trust an ID from a form or URL.** Load the stored row and check its STORED site; when an operation moves an entity, check the destination site too.
- **C3: Site isolation for managers.** On manager-only pages, another site's row returns `notFound()`. Public pages (calendar, register, resource details) display all sites in read-only mode.
- **C4: Self-mutation and last admin guard.** Nobody modifies their own role, site, or active status. The last active administrator cannot be demoted or deactivated.
- **C5: Hierarchy boundary.** A MANAGER never creates, edits, resets, or deactivates a MANAGER or ADMIN.
- **C6: Non-destructive retention.** Nothing is hard-deleted: bookings are cancelled, accounts deactivated, and resources retired. `RETIRED` is final: its status cannot change again. Settings rows are removable only when unused (D8).
- **C7: Cancellation audit trail.** Every cancellation by someone else records who cancelled, when, and the required reason. The owner sees this in "My bookings".
- **C8: Personal data isolation.** "My bookings" and notifications are strictly filtered by the signed-in user's ID on the server.
- **C9: Uniform database enforcement.** The exact same rules apply across development, testing, and production databases.

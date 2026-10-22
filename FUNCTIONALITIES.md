# System Functionalities

## 1. System Overview

Appointeefy is a React/Vite appointment-management application focused on pet-sitting services. The codebase contains three primary user areas:

- Public users who browse the landing page and submit provider bookings.
- Providers/admins who configure a booking page and manage appointments, customers, services, payments, and subscriptions.
- Superadmins who manage provider accounts, plans, discounts, payments, analytics, and notifications.

Supabase is used for authentication, database access, storage, and selected realtime subscriptions. Some provider configuration and dashboard appointment data still use browser `localStorage`. Provider notification read markers are stored locally per account; notification content is loaded from Supabase. The support/notification RLS and payment expiry migration is in `supabase/support_and_notifications.sql`; other database and deployment configuration still needs verification.

## 2. User Roles and Permissions

| Role | Access evidence | Main permissions |
|---|---|---|
| Public user | Public routes and `/book/:slug` | View public pages and submit a booking for a provider |
| Provider/admin | `ProtectedRoute role="admin"` | Manage one provider account and its services, bookings, profile, booking page, and subscription |
| Superadmin | `ProtectedRoute role="superadmin"` | Manage provider accounts, subscriptions, plans, discounts, analytics, and notifications |
| Unauthenticated user | Auth routes and public routes | Sign in, register through OAuth, reset password, or view public content |

`AuthContext` builds the current user from Supabase Auth metadata. The metadata includes `role` and, for providers, `account_id`. Database policies must independently enforce these permissions; frontend route guards alone are not sufficient.

## 3. Public User Functionalities

### PUB-001 — Landing Page

- **Description:** Public marketing page with product information, feature sections, pricing content, and links to sign in or start registration.
- **Role/access:** Public users; route `/`.
- **Purpose:** Introduce the platform and direct users to authentication or booking flows.
- **Workflow:** User opens `/`, views page sections, then follows navigation links.
- **Related files:** `src/pages/client/ClientHome.jsx`, `src/components/client/ClientLayout.jsx`, `src/components/client/ClientNavbar.jsx`, `src/components/client/ClientFooter.jsx`.
- **Backend/tables:** None directly verified.
- **Inputs/outputs:** Browser navigation; no persisted output verified.
- **Validation/permissions:** Public route.
- **Dependencies:** React Router and shared client layout.
- **Status:** Implemented. Marketing content and external destinations should be reviewed separately.

### PUB-002 — Provider Public Booking Page

- **Description:** Provider-specific page at `/book/:slug` that loads the provider account, services, pet types, and active bookings.
- **Role/access:** Public users; route `/book/:slug`.
- **Purpose:** Allow customers to request an appointment without provider login.
- **Workflow:** Resolve `slug` in `accounts`, load `services`, `provider_pet_types`, and active `appointments`, then display the booking form.
- **Related files:** `src/pages/public/BookingPage.jsx`.
- **Supabase/backend:** `accounts`, `services`, `provider_pet_types`, `appointments`; `supabase.from(...).select()`.
- **Inputs:** Provider slug, dates, times, customer name, contact, email, Facebook, notes, selected services, pet types, and counts.
- **Outputs:** New `appointments` row with transaction code, customer data, schedule, price, notes, and `pending` status.
- **Validation:** Required customer name/contact; optional fields follow booking settings; at least one pet/service selection; date/time and overlap checks.
- **Permissions:** Public insert access depends on Supabase policies; **Needs Verification**.
- **Dependencies:** Provider account, services, booking-page settings, availability settings, and Supabase insert permission.
- **Status:** Implemented, with limitations. Public settings are read from browser storage and may not match the provider/device.

### PUB-003 — Booking Price Calculation

- **Description:** Calculates estimated booking price for per-hour and per-day services.
- **Role/access:** Public booking users and provider preview.
- **Purpose:** Show a calculated total before submission.
- **Related files:** `src/pages/public/BookingPage.jsx`, `src/pages/admin/AdminBookingPage.jsx`.
- **Inputs/outputs:** Selected services, counts, dates, times, duration, and service pricing fields produce `base_price` and `final_price`.
- **Validation:** Minimum one hour/block or one day is applied in calculation code.
- **Dependencies:** Service pricing type, duration, and price.
- **Status:** Implemented in the frontend. Server-side recalculation or tamper protection is **Needs Verification**.

### PUB-004 — Booking Confirmation and Receipt

- **Description:** Shows a generated transaction code after a successful appointment insert and supports copying, JPG receipt download, and Messenger link construction.
- **Role/access:** Public booking user.
- **Related files:** `src/pages/public/BookingPage.jsx`.
- **Backend/tables:** `appointments` insert.
- **Outputs:** Transaction code and client-side receipt/link actions.
- **Validation:** Confirmation is shown only when the insert returns without an error.
- **Status:** Implemented, subject to storage and external Messenger configuration.

### PUB-005 — Public Client Placeholder Pages

- **Description:** `/book` and `/track` routes render minimal placeholder components.
- **Role/access:** Public users; routes `/book` and `/track`.
- **Related files:** `src/pages/client/ClientBook.jsx`, `src/pages/client/ClientTrack.jsx`.
- **Status:** Not Implemented. These files do not provide a complete client booking or tracking workflow.

## 4. Provider Functionalities

### PROV-000 — Recent Provider UI and Payment Workflow Enhancements

- **Subscription checkout:** Providers choose a plan, adjust subscription quantity/duration, review an order summary, and proceed to payment from the summary instead of seeing payment fields immediately.
- **Manual GCash payment:** Payment opens in a modal with a GCash QR code, save-image action, GCash reference input, receipt/proof upload, payment instructions, and a red close action. The modal is responsive for mobile and keeps the QR prominent.
- **Transaction history:** A transaction record is created when the provider proceeds to payment, before proof submission. Awaiting-payment records can be reopened to continue payment; a cancelled transaction is marked failed and a new transaction can be created when a paid attempt needs replacement verification.
- **Expiry and status messaging:** Awaiting-payment transactions show their transaction ID, creation time, and one-hour expiry notice. Expired or cancelled attempts are represented with a failed status. The history table supports pagination and explains how to submit a new receipt/reference when the payment was made but the transaction failed.
- **Appointment receipt:** Provider appointment details include an acknowledgement receipt action. The receipt is rendered as a page-level modal so it remains visible on mobile even when the dashboard shell clips overflow; it includes print/save-PDF behavior and a close control.
- **Mobile appointment UI:** Appointment details and status confirmation dialogs are layered above the page, background scrolling is locked while a dialog is open, and action buttons remain reachable within the dialog.
- **Status filtering:** Appointment status filters use a styled dropdown menu with active-state highlighting on mobile and desktop.
- **Status:** Implemented in the current frontend; Supabase RLS, payment verification, and production storage policies still require deployment-level verification.

### PROV-001 — Provider Authentication and Onboarding

- **Description:** Provider Google OAuth entry, Supabase session handling, onboarding form, account creation, initial service creation, and auth metadata update.
- **Role/access:** Unauthenticated provider and authenticated provider; `/login`, `/register`, `/onboarding`.
- **Related files:** `src/pages/auth/AdminLogin.jsx`, `src/pages/auth/AdminRegister.jsx`, `src/pages/auth/Onboarding.jsx`, `src/context/AuthContext.jsx`.
- **Supabase:** Auth, `accounts`, `users`, `services`.
- **Inputs:** Business name, PH phone number, service pricing, duration, pricing type, capacity, and description.
- **Validation:** Required business name/phone; PH number format `09#########`; positive price and duration.
- **Outputs:** Account with `waitlisted` status, provider user row, initial Pet Sitting service, and auth metadata containing `role` and `account_id`.
- **Permissions:** Provider routes require `role="admin"`; onboarding is required when account metadata is missing.
- **Status:** Implemented, with database policy and duplicate-account behavior needing verification.

### PROV-002 — Provider Dashboard

- **Description:** Dashboard cards, date filters, calendar views, daily appointment details, and upcoming appointments.
- **Role/access:** Provider; `/dashboard`.
- **Related files:** `src/pages/admin/AdminDashboard.jsx`, `src/components/common/DateFilter.jsx`, `src/context/AppointmentContext.jsx`.
- **Data:** Uses `AppointmentContext`, which currently loads seeded/sample appointments and persists changes to `localStorage` under `appointments_v3`.
- **Status:** Partially Implemented. It is functional with local sample data but is not consistently connected to Supabase appointment records.

### PROV-003 — Booking Page Editor and Preview

- **UI update (2026-10-20):** Preview link beside Copy Link opens the same public URL in a new tab. Mobile editor preview separates the hero image from its headline and places check-in/out below a full-width calendar. Public page and editor preview share `BookingFooter`, with contact links, decorative paw icons, provider branding, and an Appointeefy copyright line. Preview layout follows its container width. Existing browser-local settings and slug limitations still apply.

- **Description:** Provider editor for business details, hero content, booking form settings, testimonials, footer, theme, pet sitter profile, availability, blocked dates, and live preview.
- **Role/access:** Provider; `/booking-page`.
- **Related files:** `src/pages/admin/AdminBookingPage.jsx`.
- **Inputs/outputs:** Text, colors, images, services, pet types, hours, overlap setting, and blocked-date data.
- **Storage:** Most settings are written to browser `localStorage` keys such as `bp_general`, `bp_hero`, `bp_booking`, `bp_theme`, `bp_hours`, and `bp_allow_overlap`. Images use Supabase Storage bucket `appointeefy-assets`.
- **Permissions:** Provider route protected by admin role; storage/database policies need verification.
- **Dependencies:** `ServiceContext`, Supabase Storage, public booking page key names.
- **Status:** Partially Implemented. Settings are browser-specific rather than clearly persisted per provider in Supabase.

### PROV-004 — Service Management

- **Description:** Create, update, delete, and list provider services, including price, duration, description, pricing type, maximum pets, and mixed pet types.
- **Role/access:** Provider; `/services` and booking-page editor service controls.
- **Related files:** `src/pages/admin/AdminServices.jsx`, `src/context/ServiceContext.jsx`.
- **Supabase:** `services` and `provider_pet_types`.
- **Inputs/outputs:** Service form values produce service rows; pet-type changes insert/delete provider pet-type rows.
- **Validation:** Form validation is implemented in the service page; exact database constraints need verification.
- **Status:** Implemented, subject to Supabase permissions and schema verification.

### PROV-005 — Appointment Management

- **Description:** Lists provider bookings, filters by status/search, edits price and notes, changes status, records downpayments/full payments/additional charges, supports undo history, and generates invoice HTML.
- **Role/access:** Provider; `/appointments`.
- **Related files:** `src/pages/admin/AdminAppointments.jsx`, `src/context/BookingContext.jsx`.
- **Supabase:** `appointments` select/update.
- **Inputs/outputs:** Updated status, price, notes, payments, additional amount, and logs are written to the appointment row.
- **Validation:** Numeric payment and price checks; overpayment confirmation flow; status actions depend on current status.
- **Dependencies:** Booking records from `BookingContext`, provider account ID, invoice data.
- **Status:** Implemented for Supabase-backed bookings. Status naming consistency with public overlap logic needs verification.

### PROV-006 — Customers

- **Description:** Derives unique customers from provider bookings and displays contact data, pets, appointment history, and completed spending.
- **Role/access:** Provider; `/customers`.
- **Related files:** `src/pages/admin/AdminCustomers.jsx`.
- **Backend:** Indirectly uses `BookingContext` appointment records.
- **Status:** Implemented when booking data is available; accuracy depends on booking source consistency.

### PROV-007 — Calendar

- **Description:** Monthly calendar view with appointments grouped by date and a selected-day detail view.
- **Role/access:** Provider; `/calendar`.
- **Related files:** `src/pages/admin/AdminCalendar.jsx`, `src/context/AppointmentContext.jsx`.
- **Status:** Partially Implemented. It uses the local/sample `AppointmentContext` rather than the Supabase-backed `BookingContext`.

### PROV-008 — Analytics

- **Description:** Date-filtered revenue, average booking value, completed bookings, customers, monthly charts, status breakdown, and top services.
- **Role/access:** Provider; `/analytics`.
- **Related files:** `src/pages/admin/AdminAnalytics.jsx`, `src/components/common/DateFilter.jsx`.
- **Data:** Uses `BookingContext` bookings.
- **Status:** Partially Implemented because results depend on the current booking data source and local sample data issue.

### PROV-009 — Transaction Logs

- **Description:** Flattens appointment logs into searchable and status-filtered transaction history.
- **Role/access:** Provider; `/logs`.
- **Related files:** `src/pages/admin/AdminLogs.jsx`, `src/context/BookingContext.jsx`.
- **Status:** Implemented for logs present on loaded bookings; log field formats are not fully uniform across features.

### PROV-010 — Provider Profile

- **Description:** Loads and updates provider account name, phone, address, bio, and logo.
- **Role/access:** Provider; `/profile`.
- **Related files:** `src/pages/admin/AdminProfile.jsx`.
- **Supabase:** `accounts` select/update.
- **Status:** Implemented. Image persistence and database policies need verification.

### PROV-011 — Subscription and Payment Submission

- **Description:** Displays account status, plans, active discounts, payment methods, proof upload, and payment submission.
- **Role/access:** Provider; `/subscription`.
- **Related files:** `src/pages/admin/AdminSubscription.jsx`, `src/hooks/usePlans.js`.
- **Supabase:** `accounts`, `payments`, `discounts`, `plans`.
- **Inputs/outputs:** Selected plan, discount code, payment method, proof image, and payment row with `pending` status.
- **Validation:** Required proof; discount active/expiry/usage/applicability checks in frontend.
- **Status:** Implemented in the current frontend. Discount field naming needs alignment, and production payment consistency needs an atomic database workflow.

## 5. Superadmin Functionalities

### ADMIN-001 — Superadmin Authentication and Protected Layout

- **Description:** Superadmin login route and protected nested layout.
- **Role/access:** Superadmin; `/superadmin/login` and `/superadmin/*`.
- **Related files:** `src/pages/auth/SuperAdminLogin.jsx`, `src/components/superadmin/SuperAdminLayout.jsx`, `src/routes/ProtectedRoute.jsx`, `src/context/AuthContext.jsx`.
- **Status:** Implemented at the frontend route level; role metadata and database authorization need verification.

### ADMIN-002 — Account Management

- **Description:** Lists provider accounts, filters/searches by status, approves waitlisted accounts, activates plans, extends subscriptions, suspends/reactivates accounts, resets account subscription state, and deletes accounts.
- **Role/access:** Superadmin; `/superadmin/accounts`.
- **Related files:** `src/pages/superadmin/SuperAccounts.jsx`.
- **Supabase:** `accounts`, `payments`.
- **Status:** Implemented in UI and Supabase calls. Side effects, cascading deletes, and authorization policies need verification.

### ADMIN-003 — Subscription Management

- **Description:** Lists accounts by subscription status, edits Monthly/Annual plan prices, activates or extends subscriptions, and records manual payments.
- **Role/access:** Superadmin; `/superadmin/subscriptions`.
- **Related files:** `src/pages/superadmin/SuperSubscriptions.jsx`, `src/hooks/usePlans.js`.
- **Supabase:** `plans`, `accounts`, `payments`.
- **Status:** Implemented, subject to schema/policy verification.

### ADMIN-004 — Payment Verification

- **Description:** Lists provider payment transactions by awaiting payment, pending review, verified, rejected, and failed status. Joins payment rows to the current provider account by `account_id`, shows receipt proof and GCash reference, and allows review of submitted proofs. Verification activates the matching account for the purchased plan and quantity.
- **Role/access:** Superadmin; `/superadmin/payments`.
- **Related files:** `src/pages/superadmin/SuperPayments.jsx`.
- **Supabase:** `payments`, `accounts`.
- **Status:** Implemented in the frontend. Cross-table payment/account updates are not atomic and need a database transaction/RPC for production-grade consistency.

### ADMIN-005 — Superadmin Analytics

- **Description:** Loads account, appointment, and payment data and presents subscription, verified revenue, appointment, and user charts. Payment status counts use the same `payments.status` values shown on the Payments page.
- **Role/access:** Superadmin; `/superadmin/analytics`.
- **Related files:** `src/pages/superadmin/SuperAnalytics.jsx`.
- **Supabase:** `accounts`, `appointments`, `payments`.
- **Status:** Implemented, subject to source data completeness and database permissions.

### ADMIN-006 — Discount Management

- **Description:** Create, list, activate/deactivate, copy, and delete discount codes.
- **Role/access:** Superadmin; `/superadmin/discounts`.
- **Related files:** `src/pages/superadmin/SuperDiscounts.jsx`.
- **Supabase:** `discounts`.
- **Inputs/validation:** Code uniqueness, positive value, percentage maximum of 100, positive usage limit, required expiry.
- **Status:** Implemented in the superadmin screen. Provider discount consumption uses different field names and needs alignment verification.

### ADMIN-007 — Provider Notifications

- **Description:** Compose announcements or direct messages, select recipients, optionally attach an image, list sent notifications, and delete notifications.
- **Role/access:** Superadmin; `/superadmin/notifications`.
- **Related files:** `src/pages/superadmin/SuperNotifications.jsx`, `src/context/NotificationContext.jsx`.
- **Supabase:** `notifications`, `accounts`.
- **Status:** Provider and Super Admin use the same Supabase `notifications` table. Provider reads are scoped to its account and all-provider announcements by live RLS policies. Read markers remain per-browser; delivery to a provider session still needs end-to-end verification.

### ADMIN-008 — Support Tickets

- **Description:** Providers see FAQs, create tickets, review ticket history, and add updates. Super Admin can review, reply, and change ticket status; replies also create a provider notification. New ticket requests have database-side volume limits.
- **Role/access:** Provider `/support`; Superadmin `/superadmin/support`.
- **Related files:** `src/pages/admin/AdminSupport.jsx`, `src/pages/superadmin/SuperSupport.jsx`, `src/lib/support.js`.
- **Supabase:** `support_tickets`, `support_messages`; migration in `supabase/support_and_notifications.sql` applied October 22, 2026.
- **Status:** Tables, policies, and Super Admin empty state verified live. Provider ticket creation and reply flow still need end-to-end verification in a provider session.

## 6. Shared Functionalities

### SHARED-001 — Routing and Role Protection

- **Related files:** `src/routes/AppRouter.jsx`, `src/routes/ProtectedRoute.jsx`.
- **Description:** Defines public, auth, provider, superadmin, unauthorized, and fallback routes. Redirects users based on session, role, and onboarding state.
- **Status:** Implemented. There is a duplicate `/login` and `/register` route declaration in `AppRouter.jsx`; route resolution should be verified.

### SHARED-002 — Supabase Client Integration

- **Related files:** `src/lib/supabase.js`, `src/lib/supabaseAdmin.js`.
- **Description:** Initializes the browser Supabase client and an optional service-key client.
- **Status:** Partially Implemented / Needs Verification. A service key must never be exposed in a browser build; current usage and environment configuration require security review.

### SHARED-003 — Date Filtering and Status Badges

- **Related files:** `src/components/common/DateFilter.jsx`, `src/components/common/Badge.jsx`, `src/components/common/PageHeader.jsx`, `src/components/common/StatCard.jsx`.
- **Description:** Shared date-range filtering, status styling, page headers, and statistic cards.
- **Status:** Implemented.

### SHARED-004 — Browser Storage State

- **Description:** Several contexts and pages persist state in `localStorage` for appointments, booking-page content, notifications, and seeded superadmin data.
- **Related files:** `src/context/AppointmentContext.jsx`, `src/context/NotificationContext.jsx`, `src/context/SuperAdminContext.jsx`, `src/pages/admin/AdminBookingPage.jsx`, `src/pages/public/BookingPage.jsx`.
- **Status:** Implemented as a client-side mechanism, but account isolation and cross-device persistence are limitations.

## 7. Authentication and Authorization

- Supabase session loading uses `supabase.auth.getSession()`.
- Auth changes are tracked with `onAuthStateChange`.
- Password login is implemented through `signInWithPassword` in `AuthContext` and the superadmin login screen.
- Google OAuth is initiated from provider login/register screens.
- Password reset uses email OTP, `verifyOtp`, and `updateUser`.
- `ProtectedRoute` redirects unauthenticated users to the correct login route, sends incomplete provider accounts to onboarding, and rejects role mismatches.
- Provider access is associated with `account_id` from auth metadata.
- Database-level RLS and privileged-operation enforcement are **Needs Verification**.

## 8. Database-Related Functionalities

| Table/storage | Verified usage |
|---|---|
| `accounts` | Provider profile, slug lookup, status, subscription dates, superadmin account management |
| `users` | Provider profile row created during onboarding |
| `services` | Provider service CRUD and public service listing |
| `provider_pet_types` | Provider pet-type CRUD and public listing |
| `appointments` | Public booking inserts, provider booking reads/updates, analytics, superadmin analytics |
| `payments` | Provider payment submissions, manual subscription records, payment analytics |
| `plans` | Plan price loading, realtime updates, superadmin price edits |
| `discounts` | Superadmin CRUD and provider discount lookup |
| `notifications` | Superadmin notification CRUD and provider account-scoped consumption |
| `support_tickets`, `support_messages` | Provider support requests and Super Admin replies |
| `appointeefy-assets` storage bucket | Booking-page image upload, public URL generation, and removal |

Exact columns, foreign keys, indexes, RLS policies, and storage policies are **Needs Verification**.

## 9. Feature Dependencies

1. Provider dashboard features depend on Supabase Auth metadata containing `role` and `account_id`.
2. Service and booking features depend on a valid provider account and `account_id`.
3. Public booking depends on an account `slug`, public read access to provider data, and public appointment insert access.
4. Provider appointments, customers, analytics, and logs depend on booking data loaded by their contexts.
5. Subscription status affects provider navigation locks and access to several provider routes.
6. Booking-page editor and public booking page depend on matching browser-storage keys and service records.
7. Superadmin analytics depends on account, appointment, and payment rows being available and queryable.
8. Notifications require a successful Super Admin insert and a provider-side session allowed by account-scoped RLS.

## 10. Incomplete Functionalities

- Client booking page at `/book` is a placeholder.
- Client tracking page at `/track` is a placeholder.
- Provider support ticket creation and reply flow have not yet been exercised end-to-end in a provider session.
- Provider notification delivery is not end-to-end verified.
- Provider booking-page settings are not clearly persisted per account in the database.
- Dashboard/calendar local appointment data is not unified with Supabase bookings.

## 11. Known Issues and Limitations

- Appointment status names are inconsistent across public availability checks and provider management (`confirmed` versus `approved`, among others).
- `AppointmentContext` uses seeded local data and `localStorage`, while `BookingContext` uses Supabase.
- Generic `localStorage` keys can cause settings to be device-specific and potentially shared between accounts on the same origin.
- Discount field names differ between provider and superadmin code paths.
- Some Supabase write operations do not expose a complete user-facing error flow.
- Frontend route guards do not replace Supabase RLS.
- The optional `supabaseAdmin` client references a service-key environment variable; exposing such a key in frontend code would be unsafe. Actual usage is not verified.
- Duplicate `/login` and `/register` declarations appear in the router and should be reviewed.
- No schema migration files or database policy definitions are present in the reviewed project.
- Subscription status labels differ between some contexts and screens (`active`, `monthly`, and `annual`).

## 12. Future Feature Recommendations

These are recommendations, not currently implemented features:

- Unify appointment reads and writes around Supabase-backed booking data.
- Persist booking-page configuration per provider account in Supabase.
- Standardize appointment and subscription status values.
- Align discount field names and validation between provider and superadmin screens.
- Verify provider notification delivery and ticket replies end-to-end with a provider session.
- Make payment verification/account activation atomic in a database function, and complete support workflows.
- Add database migrations, explicit RLS policies, and documented storage policies.
- Add server-side validation and price recalculation for public bookings.
- Add meaningful error states and retry behavior for Supabase operations.
- Add automated tests for route protection, booking validation, pricing, status transitions, and account isolation.

## 13. Feature Status Summary

| Feature ID | Feature Name | User Role | Status | Related Files | Dependencies |
|---|---|---|---|---|---|
| PUB-001 | Landing Page | Public | Implemented | `src/pages/client/ClientHome.jsx`, client layout/components | React Router |
| PUB-002 | Provider Public Booking | Public | Implemented | `src/pages/public/BookingPage.jsx` | `accounts`, `services`, `provider_pet_types`, `appointments` |
| PUB-003 | Booking Price Calculation | Public/Provider | Implemented | `BookingPage.jsx`, `AdminBookingPage.jsx` | Service pricing fields |
| PUB-004 | Booking Confirmation/Receipt | Public | Implemented | `BookingPage.jsx` | Appointment insert, browser APIs |
| PUB-005 | Client Book/Track Pages | Public | Not Implemented | `ClientBook.jsx`, `ClientTrack.jsx` | None verified |
| PROV-001 | Provider Auth/Onboarding | Provider | Implemented | Auth pages, `Onboarding.jsx`, `AuthContext.jsx` | Supabase Auth and account tables |
| PROV-002 | Provider Dashboard | Provider | Partially Implemented | `AdminDashboard.jsx`, `AppointmentContext.jsx` | Local appointment state |
| PROV-003 | Booking Page Editor | Provider | Partially Implemented | `AdminBookingPage.jsx` | localStorage, Supabase Storage, services |
| PROV-004 | Service Management | Provider | Implemented | `AdminServices.jsx`, `ServiceContext.jsx` | `services`, `provider_pet_types` |
| PROV-005 | Appointment Management | Provider | Implemented | `AdminAppointments.jsx`, `BookingContext.jsx` | `appointments` |
| PROV-006 | Customers | Provider | Implemented | `AdminCustomers.jsx` | Booking data |
| PROV-007 | Calendar | Provider | Partially Implemented | `AdminCalendar.jsx`, `AppointmentContext.jsx` | Local appointment state |
| PROV-008 | Provider Analytics | Provider | Partially Implemented | `AdminAnalytics.jsx` | Booking data and date filters |
| PROV-009 | Transaction Logs | Provider | Implemented | `AdminLogs.jsx`, `BookingContext.jsx` | Appointment logs |
| PROV-010 | Provider Profile | Provider | Implemented | `AdminProfile.jsx` | `accounts` |
| PROV-011 | Subscription Payment Submission | Provider | Partially Implemented | `AdminSubscription.jsx`, `usePlans.js` | `accounts`, `payments`, `discounts`, `plans` |
| ADMIN-001 | Superadmin Auth/Layout | Superadmin | Implemented | `SuperAdminLogin.jsx`, `SuperAdminLayout.jsx` | Supabase Auth, role metadata |
| ADMIN-002 | Account Management | Superadmin | Implemented | `SuperAccounts.jsx` | `accounts`, `payments` |
| ADMIN-003 | Subscription Management | Superadmin | Implemented | `SuperSubscriptions.jsx`, `usePlans.js` | `plans`, `accounts`, `payments` |
| ADMIN-004 | Payment Verification | Superadmin | Implemented in frontend; atomic update needed | `SuperPayments.jsx` | `payments`, `accounts` |
| ADMIN-005 | Superadmin Analytics | Superadmin | Implemented | `SuperAnalytics.jsx` | `accounts`, `appointments`, `payments` |
| ADMIN-006 | Discount Management | Superadmin | Implemented | `SuperDiscounts.jsx` | `discounts` |
| ADMIN-007 | Notifications | Provider/Superadmin | Live RLS applied; provider delivery test pending | `SuperNotifications.jsx`, `NotificationContext.jsx` | `notifications`, `accounts` |
| ADMIN-008 | Support | Provider/Superadmin | Live tables/RLS applied; provider workflow test pending | `AdminSupport.jsx`, `SuperSupport.jsx` | `support_tickets`, `support_messages` |
| SHARED-001 | Routing/Role Protection | All | Implemented | `AppRouter.jsx`, `ProtectedRoute.jsx` | Auth state and role metadata |
| SHARED-002 | Supabase Client | All | Partially Implemented | `src/lib/supabase.js`, `supabaseAdmin.js` | Environment configuration, policies |
| SHARED-003 | Shared UI Utilities | Provider/Superadmin | Implemented | Common components | React and Tailwind |
| SHARED-004 | Browser Storage State | Provider/Superadmin | Implemented | Contexts and booking editor/pages | Browser localStorage |

## Future Maintenance

Whenever a feature is added, modified, or removed:

1. Keep its existing feature ID when the feature remains conceptually the same.
2. Add a new stable ID for a genuinely new functionality.
3. Update its detailed section and the feature inventory table.
4. Record status changes and important limitations.
5. Do not remove historical feature information without explicit permission.

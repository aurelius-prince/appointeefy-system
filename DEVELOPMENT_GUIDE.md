# Development Guide

## 1. Detailed System Architecture

The project is a single-page React application built with Vite. `src/main.jsx` mounts `App`, which renders `AppRouter`. `AppRouter` wraps the application in authentication, notification, superadmin, service, booking, and appointment providers where required.

The route tree has four broad areas:

- Public client routes under `/`
- Public provider booking under `/book/:slug`
- Authentication routes such as `/login`, `/register`, `/onboarding`, and `/superadmin/login`
- Protected provider and superadmin routes

`ProtectedRoute` checks session state, onboarding state, and role metadata. Supabase database policies are still required for real authorization.

## 2. Major Modules

### Authentication

`AuthContext` loads the Supabase session, listens for auth changes, signs users in, signs users out, refreshes user metadata, and derives `role`, `account_id`, and onboarding state.

### Provider services

`ServiceContext` loads services and pet types for the authenticated provider account. It provides CRUD operations and maps database column names to the shapes used by provider components.

### Supabase bookings

`BookingContext` loads appointments for the provider account, subscribes to appointment inserts through Supabase Realtime, maps database rows to component fields, and updates status, prices, notes, payments, and logs.

### Local appointment state

`AppointmentContext` contains seeded appointment data and persists changes in `localStorage` under `appointments_v3`. Dashboard and calendar screens use this context, so it is currently separate from `BookingContext`.

### Booking-page editor

`AdminBookingPage` manages provider-facing page content, theme, images, availability, blocked dates, and preview behavior. Most settings use `localStorage` keys such as `bp_general`, `bp_hero`, `bp_booking`, `bp_footer`, `bp_theme`, and `bp_hours`. Uploaded images use Supabase Storage.

### Superadmin state and screens

Superadmin screens query Supabase directly for accounts, subscriptions, plans, payments, discounts, analytics, and notifications. `SuperAdminContext` also contains seeded/local state and helper behavior used by parts of the superadmin experience.

## 3. Component Relationships

```text
main.jsx
  -> App.jsx
    -> AppRouter
      -> AuthProvider / NotificationProvider / SuperAdminProvider
      -> ProtectedRoute
        -> AdminLayout -> provider pages
        -> SuperAdminLayout -> superadmin pages
      -> ClientLayout -> public client pages
      -> BookingPage -> public provider booking
```

Provider pages consume `AuthContext` for identity, `ServiceContext` for services, and either `BookingContext` or `AppointmentContext` for appointments. This split is a major integration boundary to consider before changing appointment behavior.

## 4. Database Relationships

The code consistently uses `account_id` to associate provider-owned records:

- One `accounts` record represents a provider business.
- `users.account_id` links a provider profile to an account.
- `services.account_id` and `provider_pet_types.account_id` belong to a provider.
- `appointments.account_id` belongs to a provider and is created by public booking.
- `payments.account_id` belongs to a provider subscription/payment record.
- Notifications may target all accounts or a selected account.

Exact foreign keys, cascade behavior, RLS policies, and indexes are **Needs Verification**.

## 5. Development Conventions

- Use React function components and hooks.
- Keep page-specific UI in `src/pages` and reusable UI in `src/components`.
- Use contexts for shared cross-page state.
- Use Supabase queries through the existing client rather than introducing a second data layer without a documented reason.
- Preserve existing database-to-component mapping functions.
- Use existing status labels and check all consumers before introducing a new status.
- Use `account_id` for provider scoping in every provider-owned query.
- Check Supabase errors before reporting a successful write.
- Do not place secrets in source files or client-exposed environment variables.

## 6. Safely Adding a Feature

1. Identify the user role, route, affected context, and data source.
2. Read the relevant page, context, shared components, and route protection before editing.
3. Confirm whether the feature belongs in Supabase, localStorage, or both.
4. Reuse existing status names and field mappings.
5. Add the smallest focused change.
6. Add or update validation and error states.
7. Check account scoping and authorization assumptions.
8. Update `FUNCTIONALITIES.md` with the appropriate stable feature ID.
9. Document significant architecture changes here.
10. Run the narrowest relevant verification command and report limitations.

## 7. Debugging Existing Features

Start by identifying the route and user role. Then trace the data path:

1. Route declaration in `AppRouter.jsx`.
2. Layout and `ProtectedRoute` behavior.
3. Page component state and event handlers.
4. Context or direct Supabase query.
5. Database table, field mapping, and returned error.
6. Browser storage keys or storage bucket when relevant.

For public booking, verify the provider slug, account lookup, services, pet types, active appointments, overlap logic, and appointment insert. For provider management, verify the account ID, `BookingContext` data, update payload, and Supabase response. For superadmin features, verify both the account/payment update and any related manual payment record.

## 8. Common Mistakes to Avoid

- Treating local sample appointments as the source of truth for Supabase bookings.
- Changing a status in one screen without updating every status consumer.
- Reusing generic localStorage keys for multiple provider accounts.
- Assuming a UI exists means the backend workflow is complete.
- Trusting frontend role checks without verifying RLS.
- Exposing or importing a service-role key into browser code.
- Ignoring Supabase errors and showing success unconditionally.
- Changing database field names without updating all mapping and validation code.
- Adding a new dependency for a problem already solved by existing utilities.
- Removing documentation history when a feature is replaced.

## 9. Recommendations for Future Development

- Establish a single Supabase-backed appointment source for dashboard, calendar, analytics, logs, and appointment management.
- Move provider booking-page settings into account-scoped database records.
- Define and document database migrations, RLS policies, storage policies, and foreign keys.
- Standardize appointment, subscription, discount, and notification schemas.
- Make payment verification and subscription activation atomic; complete support, client booking, and client tracking workflows.
- Add server-side booking validation and price recalculation.
- Add tests for route protection, account isolation, price calculation, overlap detection, and status transitions.
- Add consistent loading, empty, error, and retry states for database operations.

## 10. Verification Gaps

The repository does not document the exact Supabase schema, RLS policies, backend deployment, production environment configuration, or migration process. Treat these areas as **Needs Verification** before making security-sensitive or data-model changes.

## 11. Local Test Environment

Use `http://localhost:5173/` as the canonical Appointeefy provider app and `http://localhost:5173/book/petsi` as the public Pet Sitting booking page. Avoid `127.0.0.1:5174`, which can point to an older or separate local instance. A complete booking test should verify the receipt first, then confirm the same booking in the `localhost:5173` provider Appointments or Dashboard view, including Address, dates, pricing type, duration, amount, and status.

## 12. Subscription and Appointment UI Verification

For subscription testing, select a plan, confirm the order summary and quantity/duration calculation, then use **Proceed to payment**. Verify that a transaction appears in history immediately with an awaiting-payment status, that the payment modal opens with the GCash QR and proof/reference fields, and that closing and reopening the transaction preserves the flow. Test cancellation, failed status messaging, and the one-hour expiry notice without submitting real payment data.

For appointment testing, open a booking card, open **Appointment Details**, and test status actions, receipt, cancel, and close. The receipt should open as a centered page-level modal on mobile and desktop without being clipped by the admin shell or scrolling the background. Close the receipt, then confirm the appointment details modal remains available.

## 13. Super Admin Test Account

- **Email:** `superadmin2@appointeefy.com`
- **Purpose:** Supabase Auth test account for local Super Admin verification.
- **Password:** Managed as a local secret and intentionally excluded from this repository and its documentation.
- **Role metadata:** Includes `role: "superadmin"` so it can access `/superadmin`.

## 14. Super Admin Payments and Analytics

The Super Admin shell uses the Appointeefy logo and a neutral administration layout. `/superadmin/payments` loads all provider payment rows and resolves the current provider identity from `accounts` using `account_id`. Tabs show `awaiting_payment`, `pending`, `verified`, `rejected`, and `failed` separately; only submitted `pending` requests with proof and a matching provider account can be verified. Verification extends the subscription by the purchased `quantity` and updates the matching account status. `/superadmin/analytics` counts the same payment statuses and excludes admin-created Manual records from received payment totals.

**Needs Verification:** The payment status update and account activation are two Supabase writes. A database transaction or RPC should make them atomic before relying on them for production billing. The frontend attempts to restore the payment to `pending` if account activation fails, but it cannot guarantee atomicity if that restore also fails.

## 15. Notifications, Support Tickets, and Payment Expiry

`supabase/support_and_notifications.sql` was applied to the Appointeefy production Supabase project on October 22, 2026. It creates account-scoped `support_tickets` and `support_messages` with RLS, protects notifications so providers only read announcements and their own direct messages, and schedules `awaiting_payment` transactions to become `failed` after one hour. The scheduled job runs every minute, so a transaction may display as awaiting for up to about one additional minute. The initial migration marked three overdue payment attempts as failed. Verification showed both support tables, nine relevant RLS policies, one active expiry job, and zero overdue awaiting payments.

The provider notification bell reads the live `notifications` table, refreshes every 30 seconds, and stores read markers per account in that browser's local storage. The provider Help & Support page shows FAQs, ticket history, a new-ticket form, and ticket updates. The Super Admin Support page reviews tickets, changes status, and replies inside each ticket; a reply also sends a direct notification to the provider account. A database trigger limits providers to three active tickets and a ten-minute gap between new tickets.

## 16. Staging Database and Load Testing

A separate Supabase project, **Appointeefy Staging** (`gjdkmfojygbsmmkjegfa`, free plan, nano compute), was created on 2026-11-06 so load tests never touch production. It was built from `supabase/base_schema.sql` followed by the other SQL files in `supabase/` (order is in the header of `base_schema.sql`), and holds one test provider with the slug `loadtest`. It contains no production data.

`tests/load/loadtest.mjs` simulates visitors opening `/book/loadtest` (five reads, as the booking page does) and 15% of them submitting a booking. It refuses to run unless `STAGING_URL` points at the staging project. Copy `tests/load/staging.env.example` to `tests/load/staging.env`, fill in the staging values, and run `node tests/load/loadtest.mjs 10,50,100 10` (visitor levels, seconds per level). Do not run load tests against production: a burst against production earlier slowed the live database for several minutes and triggered Vercel's bot protection for the tester's IP.

Results on 2026-11-06 (staging, nano compute, one machine): no errors up to 100 simultaneous visitors (p95 under 1 second, about 600 requests per second at the top); 200 visitors gave p95 of 3.6 seconds with no errors; 300 visitors gave p95 of 8 seconds and 2.8% failed requests. All 737 test bookings each produced exactly one provider notification. Production runs on its own project and compute size, so these numbers are a guide, not a guarantee. The static pages served by Vercel were not load tested.

## 17. Follow-up Fixes (2026-11-06)

- **New sign-ups** (`Onboarding.jsx`): every step now checks for what an earlier half-finished attempt created, so pressing the button again never makes a duplicate account, and a failed service insert now shows an error instead of being ignored. The sign-up also creates the provider's `booking_page_settings` row with the business name, so the public `/book/:slug` link shows the business name from day one. A new provider with no pet types still sees Dog and Cat on the booking page. This was tested end to end on the staging project with a test login (account, user, service, settings, public page, discounted payment, superadmin verification).
- **Discount codes** (`AdminSubscription.jsx`): the page used old column names (`active`, `expiry`, `used`, `limit`), so codes never loaded. It now uses `is_active`, `expiry_date`, `used_count`, and `usage_limit`. `supabase/followup_fixes.sql` counts a code as used when its payment is verified; before that the counter never moved.
- **Plan prices**: `supabase/followup_fixes.sql` lets a superadmin update `plans`. The screen now shows an error when saving fails and updates the price right away.
- **Booking spam**: `supabase/followup_fixes.sql` limits anonymous visitors to 10 booking requests per hour per network address and caps text lengths. On the staging project this limit also stops the load test after 10 bookings per hour; run `alter table public.appointments disable trigger app_limit_public_bookings;` on staging first when load testing.
- **Admin UI**: removed the "Reset Test Appointments" button (it deleted every appointment of the account), and the notifications panel now closes with the Escape key.
- **Staging test logins**: staging has two email test logins (`newprovider@example.com`, `superadmin-test@example.com`) for testing sign-up and superadmin flows. To run the app against staging without touching `.env`, start it with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set to the staging values in the command.

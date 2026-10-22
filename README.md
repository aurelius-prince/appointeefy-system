# Appointeefy Appointment System

## Project Overview

Appointeefy is a React/Vite appointment-management application focused on pet-sitting services. It provides a public booking experience, a provider dashboard, and superadmin management tools.

Supabase is used for authentication, database access, storage, and selected realtime subscriptions. Some configuration and seeded state still use browser `localStorage`.

## Technology Stack

- React 19, Vite, React Router
- Tailwind CSS with the Vite plugin
- Supabase JavaScript client and Axios
- Lucide React, Recharts, React Easy Crop, React Image Crop
- `dom-to-image-more`, `html2canvas`, and Oxlint

## Project Structure

```text
src/
  api/          Axios configuration
  assets/       Images and static assets
  components/   Shared layouts and UI components
  context/      Shared authentication and application state
  hooks/        Reusable data hooks
  lib/          Supabase clients
  pages/        Public, auth, provider, and superadmin screens
  routes/       Browser routes and protected-route logic
public/         Public static assets
supabase/       Supabase function directory
```

## Features and Functionalities

- Public landing page and provider booking pages
- Provider onboarding, booking-page editor, services, appointments, customers, calendar, analytics, logs, profile, and subscriptions
- Subscription checkout with plan selection, quantity/duration controls, order summary, GCash QR payment modal, payment reference and proof upload, transaction history, continuation of awaiting-payment transactions, cancellation/failure states, and payment expiry messaging
- Mobile responsive navigation, page layouts, appointment details, acknowledgement receipt modal, and appointment status controls
- Superadmin account, subscription, discount, analytics, and notification management
- Role-based routing and protected pages

See [FUNCTIONALITIES.md](FUNCTIONALITIES.md) for the verified feature inventory and stable feature IDs.

## Vercel bandwidth and visitor planning

The production deployment is `appointeefy-system.vercel.app`. Vercel's **Last 30 days** usage is a rolling window, not a lifetime total. Fast Data Transfer includes the HTML, JavaScript, CSS, images, QR assets, receipt images, and API responses downloaded by visitors. A client-side **Save Image** action downloads to the visitor's device and does not create another Vercel storage object.

For planning, 100 clients with 20–50 landing-page visitors each represents about 2,000–5,000 visits per month. At approximately 500 KB, 1 MB, or 2 MB per first load, that is roughly 1–2.5 GB, 2–5 GB, or 4–10 GB of monthly transfer. Browser and CDN caching can reduce repeat-load traffic. Deployment Storage is separate and does not reset monthly; request and transfer counters roll out of the 30-day window over time.

## System Architecture

The frontend is a single React application bootstrapped by `src/main.jsx`. `AppRouter` defines public, authentication, provider, superadmin, and fallback routes. Context providers supply authentication, services, bookings, notifications, and superadmin state.

Supabase is accessed through `src/lib/supabase.js`. Some provider page settings and local sample state are persisted in `localStorage`.

## Database Overview

The code references `accounts`, `users`, `services`, `provider_pet_types`, `appointments`, `payments`, `plans`, `discounts`, and `notifications`, plus the `appointeefy-assets` storage bucket. Exact columns, keys, RLS policies, migrations, and triggers are **Needs Verification** because they are not defined in this repository.

## Installation and Setup

Install dependencies using the repository package manager. Supabase environment variables are required by the client setup; do not commit credentials or service keys. The exact production database and deployment setup is **Not yet documented**.

## How to Run the Project

Available scripts:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

The Vite configuration includes an `/api` proxy targeting `http://localhost:8000`; the corresponding backend implementation is **Not yet documented**.

## Local Testing Reference

For Appointeefy browser testing, use the same Vite instance throughout the flow:

- Provider app: `http://localhost:5173/`
- Public booking page: `http://localhost:5173/book/petsi`
- Do not use `127.0.0.1:5174`; it may be a stale or separate local instance with different data.

After a public booking test, verify the acknowledgement receipt and then open the provider `localhost:5173` Appointments or Dashboard route. Confirm the customer, address, check-in/check-out dates, pricing type, duration, total amount, and initial `Pending Review` status.

## Known Issues

- Dashboard/calendar use local sample appointment state while appointment management uses Supabase bookings.
- Booking-page settings are mostly browser-specific `localStorage` data.
- Appointment status values are inconsistent across screens.
- Provider and superadmin discount field names are not fully aligned.
- Provider notification reads are not clearly connected to superadmin Supabase writes.
- Client booking/tracking, payment verification, and support screens contain placeholders.
- Database schema and RLS policies are not included.
- A frontend service-key client exists and requires security review.

## Future Improvements

Unify appointment data, persist provider settings per account, standardize schemas, complete payment/support/client workflows, add migrations and RLS documentation, strengthen server-side validation, and add automated tests.

## Additional Documentation

- [FUNCTIONALITIES.md](FUNCTIONALITIES.md)
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- [AGENTS.md](AGENTS.md)

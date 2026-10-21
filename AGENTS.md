# Guidance for Future AI Coding Sessions

## Scope and Safety

1. Understand the existing code before modifying it.
2. Preserve existing functionality and the current architecture.
3. Keep changes minimal and targeted to the requested task.
4. Do not delete, rename, or move files without explicit permission.
5. Do not modify unrelated features.
6. Ask permission before accessing files outside the relevant task scope.
7. Explain the proposed changes and their impact before editing.
8. Wait for approval before making changes when the user requests an approval step.
9. Do not access `.env` files, credentials, passwords, API keys, or other sensitive data.
10. Do not execute destructive commands.
11. Do not install dependencies without permission.
12. Do not push code to a remote repository without explicit instruction.

## Architecture Rules

1. Follow the existing React/Vite structure and route organization.
2. Reuse existing contexts, components, hooks, and Supabase access patterns where appropriate.
3. Preserve role-based routing and provider account scoping through `account_id`.
4. Keep public, provider, and superadmin responsibilities separate.
5. Verify database schema and RLS behavior before changing data access.
6. Do not expose a Supabase service key in frontend code.
7. Document significant architectural changes in `DEVELOPMENT_GUIDE.md` and update `FUNCTIONALITIES.md` when feature behavior changes.

## Communication and Verification

1. Explain changes using simple Tagalog mixed with English when communicating with the project owner.
2. State what changed, why it changed, and its potential impact.
3. Run only checks appropriate to the change and report their results.
4. Clearly mark behavior that is not verifiable as `Needs Verification` or `Not yet documented`.
5. Update stable feature IDs in `FUNCTIONALITIES.md`; do not remove historical feature information without permission.
6. Prioritize maintainability, account isolation, validation, error handling, and security.

## Local Testing Rules

1. Use the canonical public booking URL `http://localhost:5173/book/petsi` for Appointeefy booking tests.
2. Use the canonical provider app URL `http://localhost:5173/` and its routes for dashboard and appointment checks.
3. Do not use stale browser tabs pointing to `127.0.0.1:5174`; that is a different/older local app instance and can show unrelated data or configuration.
4. When testing a booking, verify the result in the same `localhost:5173` provider session and confirm the receipt, address, pricing type, duration, total, and status.
5. Use clearly labeled dummy customer names and addresses for test bookings.
6. Record important test scenarios and observed limitations in the relevant documentation without deleting historical results.

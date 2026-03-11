# Server Agent Notes

- Stack: Express + TypeScript + MySQL (`mysql2`) with raw SQL.
- Keep schema changes in `src/db/migrations`.
- Add new routes under `src/routes` and register them in `src/app.ts`.
- Auth is JWT bearer token; enforce with `requireAuth`.
- Permissions should be attached with `requirePermissions` even if permissive in v1.

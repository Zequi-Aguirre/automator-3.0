# Frontend Auth + Session Baseline

## Storage
- Token: localStorage key "token"
- App session/user/role/filters: localStorage key "appData" via DataContext

## Context
DataContext stores:
- session, loggedInUser (includes `permissions: Permission[]`), role
- leadFilters, countyFilters
- persisted with a version number (CURRENT_VERSION)

## Route gating
- VerifyUser: requires session; redirects to /login if missing
- VerifyAdmin: requires session and role in ("admin" | "superadmin")
    - if role fails: clears session/user/role and redirects

## Permission-based UI gating (TICKET-054)
Use the `usePermissions()` hook to conditionally render actions:
```ts
const { can } = usePermissions();
// ...
{can(Permission.LEADS_TRASH) && <TrashButton />}
```
`usePermissions()` reads `loggedInUser.permissions` from DataContext. The permissions array is returned by both `/api/authenticate` and `/api/users/info` and stored in the user object in localStorage.

Available permissions are defined in the `Permission` enum in `client/src/types/userTypes.ts`.

## Note
Backend enforces all permissions via `requirePermission()` middleware; frontend gating is UX only.
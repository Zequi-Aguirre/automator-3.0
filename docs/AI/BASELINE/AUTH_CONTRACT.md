# Auth Contract (JWT + req.user)

## Mechanism
- Authenticator verifies Bearer token via JWT secret
- Loads user from DB (including permissions via `user_permissions` join) and sets `req.user`
- If token expires within 4 hours, sets `New-Token` header with refreshed token

## Request typing
- Express Request is augmented to include `user` with shape: `{ id, email, name, role, permissions: string[] }`

## Status codes
- 401 for missing/invalid token
- 403 for forbidden permission
- Token expired should not use 405 (405 is Method Not Allowed). Use 401.

## Permission system (TICKET-054)
Authorization is **permission-based, not role-based**. Roles only determine default permissions seeded at account creation.

- Permissions are stored in the `user_permissions` table and loaded into `req.user.permissions` on every request.
- Use `requirePermission(permission)` middleware to gate any route. Example:
  ```ts
  this.router.post('/import', requirePermission(LeadPermission.IMPORT), handler)
  ```
- **Do not** check `req.user.role` for authorization. Always check permissions.
- `requirePermission` returns 403 if the user lacks the permission.

### Permission enum reference
| Permission | Default: user | Default: admin | Default: superadmin |
|---|---|---|---|
| `leads.verify` | ✅ | ✅ | ✅ |
| `leads.queue` | ✅ | ✅ | ✅ |
| `activity.view` | ✅ | ✅ | ✅ |
| `leads.import` | ❌ | ✅ | ✅ |
| `leads.export` | ❌ | ✅ | ✅ |
| `leads.send` | ❌ | ✅ | ✅ |
| `leads.trash` | ❌ | ✅ | ✅ |
| `sources.manage` | ❌ | ✅ | ✅ |
| `managers.manage` | ❌ | ✅ | ✅ |
| `buyers.manage` | ❌ | ❌ | ✅ |
| `worker.toggle` | ❌ | ❌ | ✅ |
| `settings.manage` | ❌ | ❌ | ✅ |
| `users.manage` | ❌ | ❌ | ✅ |

Permissions are per-user overridable — a user can be granted any permission regardless of role.

## Admin routing policy
Avoid `req.path.includes("admin")`. The old blunt `/admin` path check in the authenticator has been removed.
Use `requirePermission()` per-route for all authorization.
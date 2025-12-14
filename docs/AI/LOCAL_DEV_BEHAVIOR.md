# AskZack Local Development Behavior (v1)

## Purpose
Prevent accidental data transmission to external vendors or APIs during development and testing.

## Rule
In any non-production environment (`NODE_ENV !== 'production'):
- Outbound vendor dispatches **must not** call real HTTP endpoints.
- Instead, payloads are logged to the `vendor_receives` table via `VendorReceiveDAO`.

## Implementation
At the service layer (e.g., `LeadService` or `VendorService`):

```ts
if (process.env.NODE_ENV === 'production') {
  await vendorService.postToVendor(payload);
} else {
  await vendorReceiveDAO.create(payload);
}
```

## Verification
- Integration tests must assert that `VendorService` is **never called** when `NODE_ENV !== 'production'`.
- Logs in `vendor_receives` can be replayed manually for testing.

## Notes
- This behavior is mandatory for all AskZack-connected environments.
- The rule should be enforced at the **service layer**, not within DAOs.
- This logic protects against vendor spam and supports safe local development.

## Future Enhancements
- Add environment variable `DISABLE_VENDOR_SEND=true` for temporary overrides.
- Add CLI command to replay saved payloads from `vendor_receives` for testing.
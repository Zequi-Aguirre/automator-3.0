-- The dispatch code adds a space between auth_header_prefix and the token:
--   `${prefix} ${token}`
-- Previously, the code did NOT add a space, so users stored the prefix with
-- a trailing space (e.g. "Bearer ") as a workaround. Now that the code adds
-- the space, those stored values produce a double-space ("Bearer  <token>").
-- Strip leading/trailing whitespace from all non-null auth_header_prefix values.
UPDATE buyers
SET auth_header_prefix = TRIM(auth_header_prefix),
    modified = NOW()
WHERE auth_header_prefix IS NOT NULL
  AND auth_header_prefix != TRIM(auth_header_prefix);

-- Migration: Drop Broward and Miami-Dade counties
-- Ticket: TICKET-047
-- Date: 2026-03-02
-- Description: Remove Broward and Miami-Dade counties so they can be
--              imported fresh from CSV with ZIP codes instead of being
--              hardcoded as blacklisted

-- Delete Broward County, Florida
DELETE FROM counties
WHERE name = 'Broward'
  AND state = 'FL';

-- Delete Miami-Dade County, Florida
DELETE FROM counties
WHERE name = 'Miami-Dade'
  AND state = 'FL';

-- Note: These counties will be re-imported from allCounties.csv
-- with their full ZIP code data when the CSV is imported via UI

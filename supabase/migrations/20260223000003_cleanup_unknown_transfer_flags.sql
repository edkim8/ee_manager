-- Cleanup: resolve stale unit_transfer_active flags with property_code = 'UNKNOWN'
-- These were created during a debug session where the parser could not resolve the property code.
-- They have no valid unit/property association and should be resolved.

UPDATE unit_flags
SET
    resolved_at = NOW(),
    resolved_by = NULL
WHERE
    flag_type = 'unit_transfer_active'
    AND property_code = 'UNKNOWN'
    AND resolved_at IS NULL;

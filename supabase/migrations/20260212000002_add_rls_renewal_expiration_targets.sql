-- Add RLS policies for renewal_expiration_targets table
-- Users need to be able to read and write targets for their properties

-- Enable RLS
ALTER TABLE renewal_expiration_targets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to view targets for all properties (read-only for viewing)
CREATE POLICY "Users can view all renewal targets"
ON renewal_expiration_targets
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow users to insert targets for any property
CREATE POLICY "Users can insert renewal targets"
ON renewal_expiration_targets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow users to update targets for any property
CREATE POLICY "Users can update renewal targets"
ON renewal_expiration_targets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete targets for any property
CREATE POLICY "Users can delete renewal targets"
ON renewal_expiration_targets
FOR DELETE
TO authenticated
USING (true);

COMMENT ON POLICY "Users can view all renewal targets" ON renewal_expiration_targets IS 'Allow authenticated users to view renewal targets for dashboard display';
COMMENT ON POLICY "Users can insert renewal targets" ON renewal_expiration_targets IS 'Allow authenticated users to set renewal targets';
COMMENT ON POLICY "Users can update renewal targets" ON renewal_expiration_targets IS 'Allow authenticated users to update renewal targets';
COMMENT ON POLICY "Users can delete renewal targets" ON renewal_expiration_targets IS 'Allow authenticated users to delete renewal targets when resetting';

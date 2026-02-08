-- Create a mock completed solver run for testing email notifications
INSERT INTO public.solver_runs (
    batch_id,
    upload_date,
    started_at,
    completed_at,
    status,
    properties_processed,
    summary
) VALUES (
    'TEST-BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
    NOW(),
    NOW() - INTERVAL '10 minutes',
    NOW(),
    'completed',
    ARRAY['SB', 'RS', 'OB'],
    '{
        "SB": {
            "tenanciesNew": 5,
            "residentsNew": 8,
            "leasesRenewed": 3,
            "noticesProcessed": 2,
            "applicationsSaved": 12
        },
        "RS": {
            "tenanciesNew": 2,
            "residentsNew": 4,
            "leasesRenewed": 10,
            "noticesProcessed": 5,
            "applicationsSaved": 8
        },
        "OB": {
            "tenanciesNew": 0,
            "residentsNew": 0,
            "leasesRenewed": 15,
            "noticesProcessed": 1,
            "applicationsSaved": 2
        }
    }'::jsonb
);

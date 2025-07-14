-- Cleanup script for UAT full ticket extraction
-- Run this after JIRA upgrade testing is complete

-- First, check what UAT tickets we have
SELECT 
    COUNT(*) as total_uat_tickets,
    COUNT(CASE WHEN metadata->>'extraction_type' = 'COMPLETE_TICKET' THEN 1 END) as full_tickets,
    COUNT(CASE WHEN metadata->>'purpose' = 'JIRA_UPGRADE_TESTING_FULL' THEN 1 END) as upgrade_test_tickets
FROM jira_tickets 
WHERE metadata->>'environment' = 'UAT';

-- Show sample UAT tickets before deletion
SELECT 
    external_id,
    title,
    metadata->>'project' as project,
    metadata->>'extraction_type' as type,
    created_at
FROM jira_tickets 
WHERE metadata->>'environment' = 'UAT'
ORDER BY created_at DESC
LIMIT 10;

-- Delete all UAT upgrade testing tickets
-- UNCOMMENT THE NEXT LINE TO ACTUALLY DELETE
-- DELETE FROM jira_tickets WHERE metadata->>'environment' = 'UAT' AND metadata->>'purpose' = 'JIRA_UPGRADE_TESTING_FULL';

-- Delete all UAT tickets (including basic ones)
-- UNCOMMENT THE NEXT LINE TO DELETE ALL UAT DATA
-- DELETE FROM jira_tickets WHERE metadata->>'environment' = 'UAT';

-- Verify cleanup (should return 0 if all deleted)
-- SELECT COUNT(*) as remaining_uat_tickets FROM jira_tickets WHERE metadata->>'environment' = 'UAT';

-- 🗄️ Supabase Schema for Human-Readable Test Scripts
-- This schema supports storing manual test equivalents for every automated test

-- Table for storing manual test scripts
CREATE TABLE manual_test_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    test_category VARCHAR(100) NOT NULL, -- e.g., 'ticket-creation', 'navigation', 'search'
    automated_test_file VARCHAR(500), -- path to corresponding Playwright test
    objective TEXT NOT NULL,
    importance_level VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
    pre_test_checklist JSONB, -- array of checklist items
    test_steps JSONB NOT NULL, -- array of step objects with description, expected, failure_action
    success_criteria JSONB, -- array of criteria that must be met
    escalation_criteria TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Table for tracking manual test executions
CREATE TABLE manual_test_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_script_id UUID REFERENCES manual_test_scripts(id),
    tester_name VARCHAR(255) NOT NULL,
    tester_email VARCHAR(255),
    execution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    browser_used VARCHAR(100),
    jira_version VARCHAR(50),
    test_result VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'blocked', 'incomplete'
    failure_reason TEXT,
    error_details TEXT,
    screenshots JSONB, -- array of screenshot URLs/paths
    additional_notes TEXT,
    escalated BOOLEAN DEFAULT false,
    escalation_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for linking automated and manual test results
CREATE TABLE test_result_correlation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manual_test_id UUID REFERENCES manual_test_scripts(id),
    automated_test_file VARCHAR(500) NOT NULL,
    manual_execution_id UUID REFERENCES manual_test_executions(id),
    automated_execution_date TIMESTAMP WITH TIME ZONE,
    automated_result VARCHAR(20), -- 'pass', 'fail', 'error', 'timeout'
    manual_result VARCHAR(20), -- 'pass', 'fail', 'blocked', 'incomplete'
    results_match BOOLEAN,
    discrepancy_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_manual_test_scripts_category ON manual_test_scripts(test_category);
CREATE INDEX idx_manual_test_scripts_importance ON manual_test_scripts(importance_level);
CREATE INDEX idx_manual_test_executions_date ON manual_test_executions(execution_date);
CREATE INDEX idx_manual_test_executions_result ON manual_test_executions(test_result);
CREATE INDEX idx_test_correlation_date ON test_result_correlation(automated_execution_date);

-- Row Level Security (RLS) policies
ALTER TABLE manual_test_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_result_correlation ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all test scripts
CREATE POLICY "Users can read test scripts" ON manual_test_scripts
    FOR SELECT USING (true);

-- Policy: Authenticated users can create test executions
CREATE POLICY "Users can create test executions" ON manual_test_executions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can read their own test executions
CREATE POLICY "Users can read test executions" ON manual_test_executions
    FOR SELECT USING (true);

-- Sample data for ticket creation test
INSERT INTO manual_test_scripts (
    test_name,
    test_category,
    automated_test_file,
    objective,
    importance_level,
    pre_test_checklist,
    test_steps,
    success_criteria,
    escalation_criteria
) VALUES (
    'JIRA Ticket Creation - Manual Test',
    'ticket-creation',
    'jira-upgrade-testing/tests/ticket-creation-test.spec.ts',
    'Verify that users can create tickets in JIRA after the upgrade - THIS IS CRITICAL FUNCTIONALITY',
    'critical',
    '["You have access to JIRA (can log in)", "You have permission to create tickets", "You know which project you should test", "Browser is ready"]',
    '[
        {
            "step": 1,
            "title": "Access JIRA Dashboard",
            "description": "Open browser, go to JIRA URL, log in",
            "expected": "You should see the JIRA dashboard",
            "failure_action": "Contact IT immediately - authentication issue"
        },
        {
            "step": 2,
            "title": "Find the Create Button",
            "description": "Look for Create button in top navigation",
            "expected": "You can see a Create button",
            "failure_action": "This is a CRITICAL issue - report immediately"
        },
        {
            "step": 3,
            "title": "Click Create Button",
            "description": "Click the Create button and wait for form",
            "expected": "A form opens for creating a new ticket",
            "failure_action": "Note any error messages and report immediately"
        },
        {
            "step": 4,
            "title": "Fill Out Basic Information",
            "description": "Fill Project, Issue Type, Summary, Description",
            "expected": "You can fill in all required fields without errors",
            "failure_action": "Note which fields cause problems"
        },
        {
            "step": 5,
            "title": "Check Required Fields",
            "description": "Verify all required fields (marked with *) are completed",
            "expected": "All required fields can be completed",
            "failure_action": "Note which required fields are problematic"
        },
        {
            "step": 6,
            "title": "Create the Ticket",
            "description": "Click Create/Submit button",
            "expected": "Ticket is created successfully with confirmation",
            "failure_action": "This is CRITICAL - note the exact error message"
        }
    ]',
    '["User can access JIRA dashboard", "User can find and click Create button", "User can fill out ticket form", "User can successfully submit ticket", "Ticket appears in JIRA with correct information"]',
    'IMMEDIATELY ESCALATE IF: Cannot find or click Create button, Get 404 or Not Found errors, Cannot submit ticket after filling form, Any error that prevents ticket creation'
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_manual_test_scripts_updated_at 
    BEFORE UPDATE ON manual_test_scripts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

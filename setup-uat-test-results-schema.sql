-- =================================================================
-- SUPABASE UAT TEST RESULTS SCHEMA
-- =================================================================
-- Stores comprehensive test results from 319-test JIRA UAT suite
-- Designed for enterprise-grade test analytics and reporting

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS uat_test_execution_details CASCADE;
DROP TABLE IF EXISTS uat_test_results CASCADE;
DROP TABLE IF EXISTS uat_test_suites CASCADE;
DROP TABLE IF EXISTS uat_test_sessions CASCADE;

-- =================================================================
-- UAT TEST SESSIONS
-- =================================================================
-- Tracks overall test execution sessions (nightly runs, etc.)
CREATE TABLE uat_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    environment VARCHAR(50) NOT NULL DEFAULT 'UAT',
    jira_version VARCHAR(50) NOT NULL DEFAULT '10.3.6',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed, cancelled
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    warning_tests INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    total_duration_ms BIGINT,
    session_metadata JSONB DEFAULT '{}',
    framework_version VARCHAR(100) DEFAULT 'Enhanced Session Manager v1.0',
    
    -- Indexing for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- UAT TEST SUITES  
-- =================================================================
-- Categorizes tests into logical groups (Dashboard, Search, etc.)
CREATE TABLE uat_test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES uat_test_sessions(id) ON DELETE CASCADE,
    suite_name VARCHAR(255) NOT NULL,
    suite_type VARCHAR(100) NOT NULL, -- dashboard, project, search, performance, etc.
    description TEXT,
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    warning_tests INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT,
    suite_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- UAT TEST RESULTS
-- =================================================================
-- Individual test results with comprehensive details
CREATE TABLE uat_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES uat_test_sessions(id) ON DELETE CASCADE,
    suite_id UUID NOT NULL REFERENCES uat_test_suites(id) ON DELETE CASCADE,
    
    -- Test identification
    test_id VARCHAR(100) NOT NULL, -- DASH-001, DPSA-001, etc.
    test_name VARCHAR(500) NOT NULL,
    test_type VARCHAR(100) NOT NULL, -- functional, performance, search, etc.
    test_category VARCHAR(100) NOT NULL, -- dashboard, project, search, etc.
    
    -- Execution details
    status VARCHAR(50) NOT NULL, -- passed, failed, warning, skipped
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms BIGINT,
    
    -- Test context
    browser VARCHAR(50) DEFAULT 'chromium',
    viewport_width INTEGER,
    viewport_height INTEGER,
    device_type VARCHAR(50), -- desktop, mobile, tablet
    
    -- Results and errors
    error_message TEXT,
    error_details JSONB,
    
    -- Performance metrics
    load_time_ms BIGINT,
    network_requests INTEGER,
    page_size_bytes BIGINT,
    
    -- Web Vitals (when applicable)
    lcp_ms DECIMAL(10,2), -- Largest Contentful Paint
    cls_score DECIMAL(10,4), -- Cumulative Layout Shift  
    fid_ms DECIMAL(10,2), -- First Input Delay
    ttfb_ms DECIMAL(10,2), -- Time to First Byte
    
    -- Test-specific data
    test_data JSONB DEFAULT '{}',
    test_metadata JSONB DEFAULT '{}',
    
    -- URLs and context
    test_url VARCHAR(1000),
    final_url VARCHAR(1000),
    page_title VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- UAT TEST EXECUTION DETAILS
-- =================================================================
-- Stores detailed step-by-step execution logs for debugging
CREATE TABLE uat_test_execution_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_result_id UUID NOT NULL REFERENCES uat_test_results(id) ON DELETE CASCADE,
    
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- navigation, interaction, validation, etc.
    step_status VARCHAR(50) NOT NULL, -- passed, failed, skipped
    step_duration_ms BIGINT,
    
    -- Step details
    action_performed VARCHAR(500),
    expected_result VARCHAR(500),
    actual_result VARCHAR(500),
    
    -- Screenshots and artifacts
    screenshot_path VARCHAR(1000),
    artifact_data JSONB DEFAULT '{}',
    
    -- Error details for failed steps
    error_message TEXT,
    stack_trace TEXT,
    
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- INDEXES FOR PERFORMANCE
-- =================================================================

-- Session indexes
CREATE INDEX idx_uat_sessions_status ON uat_test_sessions(status);
CREATE INDEX idx_uat_sessions_environment ON uat_test_sessions(environment);
CREATE INDEX idx_uat_sessions_started_at ON uat_test_sessions(started_at);

-- Suite indexes  
CREATE INDEX idx_uat_suites_session_id ON uat_test_suites(session_id);
CREATE INDEX idx_uat_suites_type ON uat_test_suites(suite_type);
CREATE INDEX idx_uat_suites_success_rate ON uat_test_suites(success_rate);

-- Test result indexes
CREATE INDEX idx_uat_results_session_id ON uat_test_results(session_id);
CREATE INDEX idx_uat_results_suite_id ON uat_test_results(suite_id);
CREATE INDEX idx_uat_results_test_id ON uat_test_results(test_id);
CREATE INDEX idx_uat_results_status ON uat_test_results(status);
CREATE INDEX idx_uat_results_test_type ON uat_test_results(test_type);
CREATE INDEX idx_uat_results_test_category ON uat_test_results(test_category);
CREATE INDEX idx_uat_results_started_at ON uat_test_results(started_at);
CREATE INDEX idx_uat_results_load_time ON uat_test_results(load_time_ms);

-- Execution detail indexes
CREATE INDEX idx_uat_execution_test_result_id ON uat_test_execution_details(test_result_id);
CREATE INDEX idx_uat_execution_step_status ON uat_test_execution_details(step_status);

-- =================================================================
-- VIEWS FOR REPORTING
-- =================================================================

-- Comprehensive session summary view
CREATE OR REPLACE VIEW v_uat_session_summary AS
SELECT 
    s.id,
    s.session_name,
    s.environment,
    s.jira_version,
    s.started_at,
    s.completed_at,
    s.status,
    s.total_tests,
    s.passed_tests,
    s.failed_tests,
    s.warning_tests,
    s.success_rate,
    s.total_duration_ms,
    s.framework_version,
    
    -- Calculate derived metrics
    ROUND(s.total_duration_ms::DECIMAL / 1000 / 60, 2) as duration_minutes,
    CASE 
        WHEN s.total_tests > 0 THEN ROUND(s.total_duration_ms::DECIMAL / s.total_tests, 2)
        ELSE 0 
    END as avg_test_duration_ms,
    
    -- Suite breakdown
    COUNT(st.id) as total_suites,
    AVG(st.success_rate) as avg_suite_success_rate
    
FROM uat_test_sessions s
LEFT JOIN uat_test_suites st ON s.id = st.session_id
GROUP BY s.id, s.session_name, s.environment, s.jira_version, s.started_at, s.completed_at, 
         s.status, s.total_tests, s.passed_tests, s.failed_tests, s.warning_tests, 
         s.success_rate, s.total_duration_ms, s.framework_version;

-- Test performance analytics view
CREATE OR REPLACE VIEW v_uat_performance_analytics AS
SELECT 
    tr.test_category,
    tr.test_type,
    COUNT(*) as total_tests,
    
    -- Performance metrics
    AVG(tr.load_time_ms) as avg_load_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tr.load_time_ms) as median_load_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tr.load_time_ms) as p95_load_time_ms,
    
    -- Web Vitals averages
    AVG(tr.lcp_ms) as avg_lcp_ms,
    AVG(tr.cls_score) as avg_cls_score,
    AVG(tr.fid_ms) as avg_fid_ms,
    AVG(tr.ttfb_ms) as avg_ttfb_ms,
    
    -- Success rates
    COUNT(*) FILTER (WHERE tr.status = 'passed') as passed_count,
    COUNT(*) FILTER (WHERE tr.status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE tr.status = 'warning') as warning_count,
    ROUND(
        (COUNT(*) FILTER (WHERE tr.status = 'passed')::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate
    
FROM uat_test_results tr
GROUP BY tr.test_category, tr.test_type
ORDER BY tr.test_category, tr.test_type;

-- =================================================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant scenarios)
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE uat_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uat_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE uat_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE uat_test_execution_details ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- SAMPLE DATA INSERT FUNCTION
-- =================================================================

-- Function to create a new test session
CREATE OR REPLACE FUNCTION create_uat_test_session(
    p_session_name VARCHAR DEFAULT 'Comprehensive UAT Suite',
    p_environment VARCHAR DEFAULT 'UAT',
    p_jira_version VARCHAR DEFAULT '10.3.6'
) RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO uat_test_sessions (session_name, environment, jira_version)
    VALUES (p_session_name, p_environment, p_jira_version)
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a test session with final stats
CREATE OR REPLACE FUNCTION complete_uat_test_session(
    p_session_id UUID,
    p_total_duration_ms BIGINT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    session_stats RECORD;
BEGIN
    -- Calculate final statistics
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'warning') as warnings,
        COALESCE(SUM(duration_ms), 0) as total_duration
    INTO session_stats
    FROM uat_test_results 
    WHERE session_id = p_session_id;
    
    -- Update session with final stats
    UPDATE uat_test_sessions SET
        completed_at = NOW(),
        status = 'completed',
        total_tests = session_stats.total,
        passed_tests = session_stats.passed,
        failed_tests = session_stats.failed,
        warning_tests = session_stats.warnings,
        success_rate = CASE 
            WHEN session_stats.total > 0 THEN 
                ROUND((session_stats.passed::DECIMAL / session_stats.total) * 100, 2)
            ELSE 0 
        END,
        total_duration_ms = COALESCE(p_total_duration_ms, session_stats.total_duration),
        updated_at = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- COMMENTS FOR DOCUMENTATION
-- =================================================================

COMMENT ON TABLE uat_test_sessions IS 'Tracks overall UAT test execution sessions with summary statistics';
COMMENT ON TABLE uat_test_suites IS 'Categorizes tests into logical groups (Dashboard Tests, Search Tests, etc.)';
COMMENT ON TABLE uat_test_results IS 'Individual test results with performance metrics and Web Vitals';
COMMENT ON TABLE uat_test_execution_details IS 'Detailed step-by-step execution logs for debugging and analysis';

COMMENT ON VIEW v_uat_session_summary IS 'Comprehensive session overview with calculated metrics';
COMMENT ON VIEW v_uat_performance_analytics IS 'Performance analytics grouped by test category and type';

-- =================================================================
-- SCHEMA SETUP COMPLETE
-- =================================================================

SELECT 'UAT Test Results Schema Setup Complete! 🎯' as status; 
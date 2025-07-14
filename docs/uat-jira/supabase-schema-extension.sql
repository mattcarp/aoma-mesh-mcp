-- JIRA UAT Testing Schema Extensions
-- Adds comprehensive testing data storage to existing Supabase setup

-- Test Run Management
CREATE TABLE IF NOT EXISTS test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name text NOT NULL,
  jira_version text NOT NULL DEFAULT '10.3.6',
  test_suite text NOT NULL, -- 'upgrade', 'regression', 'performance', 'visual'
  environment text NOT NULL DEFAULT 'UAT',
  status text DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  
  -- Execution Details
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  total_tests integer DEFAULT 0,
  passed_tests integer DEFAULT 0,
  failed_tests integer DEFAULT 0,
  skipped_tests integer DEFAULT 0,
  
  -- Browser & Environment Info
  browser_info jsonb, -- { "name": "chromium", "version": "118.0", "viewport": "1920x1080" }
  test_config jsonb, -- Test configuration and parameters
  
  -- AI Analysis Results
  ai_summary text,
  risk_score decimal CHECK (risk_score >= 0 AND risk_score <= 100),
  overall_score decimal CHECK (overall_score >= 0 AND overall_score <= 100),
  recommendations text[],
  
  -- Metadata
  created_by text DEFAULT 'automated-testing',
  metadata jsonb,
  
  -- Indexes
  INDEX idx_test_runs_environment (environment),
  INDEX idx_test_runs_status (status),
  INDEX idx_test_runs_created (started_at DESC)
);

-- JIRA Application Performance Metrics
CREATE TABLE IF NOT EXISTS jira_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  
  -- Page & Test Context
  page_url text NOT NULL,
  page_title text,
  test_type text NOT NULL, -- 'functional', 'performance', 'visual', 'accessibility'
  component_name text, -- 'itsm-queue', 'portal-form', 'dashboard', 'ticket-view'
  
  -- Core Web Vitals (Google's key metrics)
  lcp_score decimal, -- Largest Contentful Paint (ms)
  fid_score decimal, -- First Input Delay (ms)
  cls_score decimal, -- Cumulative Layout Shift (score)
  fcp_score decimal, -- First Contentful Paint (ms)
  ttfb_score decimal, -- Time to First Byte (ms)
  
  -- Additional Performance Metrics
  page_load_time decimal, -- Total page load time (ms)
  dom_content_loaded decimal, -- DOM ready time (ms)
  network_requests_count integer,
  total_page_size_kb decimal,
  js_bundle_size_kb decimal,
  css_size_kb decimal,
  image_size_kb decimal,
  
  -- Error & Console Data
  js_errors text[], -- JavaScript errors encountered
  console_warnings text[], -- Console warnings
  console_errors text[], -- Console errors
  network_failures text[], -- Failed network requests
  
  -- Visual & UI Data
  screenshot_s3_url text, -- Main screenshot
  ui_theme text CHECK (ui_theme IN ('light', 'dark')), 
  visual_regression_score decimal, -- 0-100, higher = more differences
  accessibility_score decimal, -- 0-100, Lighthouse accessibility score
  
  -- Browser & Device Context
  browser_info jsonb, -- { "name": "chromium", "version": "118.0" }
  viewport_size jsonb, -- { "width": 1920, "height": 1080 }
  user_agent text,
  
  -- Timing
  timestamp timestamp with time zone DEFAULT now(),
  test_duration_ms decimal, -- How long this specific test took
  
  -- Indexes for performance
  INDEX idx_perf_metrics_test_run (test_run_id),
  INDEX idx_perf_metrics_page_url (page_url),
  INDEX idx_perf_metrics_timestamp (timestamp DESC),
  INDEX idx_perf_metrics_component (component_name)
);

-- JIRA UI Component Tests (Specific functional tests)
CREATE TABLE IF NOT EXISTS jira_component_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  
  -- Test Definition
  component_name text NOT NULL, -- 'itsm-queue', 'portal-form', 'dashboard', 'ticket-view'
  test_scenario text NOT NULL, -- 'view_ticket', 'create_ticket', 'update_status', 'search_tickets'
  test_description text,
  
  -- Related Data
  ticket_key text, -- Reference to UAT ticket used in test
  ticket_project text, -- ITSM, DPSA, DPSO
  
  -- Test Results
  status text NOT NULL CHECK (status IN ('pass', 'fail', 'warning', 'skip')),
  execution_time_ms decimal,
  error_message text,
  error_stack text,
  assertion_results jsonb, -- Detailed assertion results
  
  -- Visual Evidence
  before_screenshot_s3_url text, -- Before action
  after_screenshot_s3_url text, -- After action
  diff_screenshot_s3_url text, -- Visual diff
  video_s3_url text, -- Screen recording if available
  
  -- Performance Data for Component
  component_load_time_ms decimal,
  interaction_latency_ms decimal, -- Time from click to response
  animation_duration_ms decimal,
  
  -- User Journey Context
  step_number integer, -- If part of multi-step test
  previous_step_id uuid REFERENCES jira_component_tests(id),
  
  -- Metadata
  timestamp timestamp with time zone DEFAULT now(),
  retries_attempted integer DEFAULT 0,
  test_data_used jsonb, -- Input data for the test
  
  -- Indexes
  INDEX idx_component_tests_run (test_run_id),
  INDEX idx_component_tests_component (component_name),
  INDEX idx_component_tests_status (status),
  INDEX idx_component_tests_ticket (ticket_key)
);

-- AI Test Analysis & Insights
CREATE TABLE IF NOT EXISTS ai_test_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  
  -- Insight Classification
  insight_type text NOT NULL CHECK (insight_type IN ('risk', 'recommendation', 'anomaly', 'pattern', 'optimization')),
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  category text, -- 'performance', 'ui', 'functionality', 'accessibility', 'security'
  
  -- Content
  title text NOT NULL,
  description text NOT NULL,
  detailed_analysis text,
  impact_assessment text,
  
  -- Evidence & Supporting Data
  evidence_urls text[], -- S3 screenshots, logs, recordings
  supporting_metrics jsonb, -- Relevant performance numbers, scores
  affected_components text[], -- Which components are affected
  
  -- Recommendations
  suggested_actions text[],
  priority_score decimal CHECK (priority_score >= 0 AND priority_score <= 100),
  estimated_effort text, -- 'low', 'medium', 'high'
  
  -- AI Analysis Metadata
  confidence_score decimal CHECK (confidence_score >= 0 AND confidence_score <= 100),
  ai_model_used text DEFAULT 'gpt-4',
  analysis_method text, -- 'pattern_recognition', 'anomaly_detection', 'threshold_comparison'
  
  -- AOMA Knowledge Integration
  related_aoma_docs text[], -- AOMA document IDs or references
  related_tickets text[], -- Related Jira ticket keys
  historical_patterns text[], -- Links to similar past issues
  
  -- Lifecycle
  timestamp timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  resolution_notes text,
  
  -- Indexes
  INDEX idx_ai_insights_run (test_run_id),
  INDEX idx_ai_insights_severity (severity),
  INDEX idx_ai_insights_type (insight_type),
  INDEX idx_ai_insights_timestamp (timestamp DESC)
);

-- Test Screenshots & Visual Assets
CREATE TABLE IF NOT EXISTS test_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  component_test_id uuid REFERENCES jira_component_tests(id) ON DELETE CASCADE,
  
  -- Asset Details
  asset_type text NOT NULL CHECK (asset_type IN ('screenshot', 'video', 'log', 'har', 'trace')),
  s3_url text NOT NULL,
  s3_bucket text NOT NULL,
  s3_key text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  
  -- Context
  capture_context text, -- 'before_test', 'after_test', 'error_state', 'comparison_baseline'
  page_url text,
  component_name text,
  ui_theme text,
  viewport_info jsonb,
  
  -- Visual Analysis
  image_hash text, -- For duplicate detection
  visual_complexity_score decimal, -- AI-analyzed visual complexity
  text_content text, -- OCR extracted text if applicable
  
  -- Metadata
  timestamp timestamp with time zone DEFAULT now(),
  created_by text DEFAULT 'automated-testing',
  tags text[],
  
  -- Indexes
  INDEX idx_visual_assets_test_run (test_run_id),
  INDEX idx_visual_assets_type (asset_type),
  INDEX idx_visual_assets_s3_key (s3_key)
);

-- Performance Baseline & Comparisons
CREATE TABLE IF NOT EXISTS performance_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Baseline Definition
  baseline_name text NOT NULL,
  jira_version text NOT NULL,
  environment text NOT NULL,
  component_name text,
  page_url text,
  
  -- Performance Targets
  target_lcp_ms decimal,
  target_fid_ms decimal,
  target_cls_score decimal,
  target_load_time_ms decimal,
  
  -- Baseline Metrics (from good runs)
  baseline_lcp_ms decimal,
  baseline_fid_ms decimal,
  baseline_cls_score decimal,
  baseline_load_time_ms decimal,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by text,
  is_active boolean DEFAULT true,
  
  -- Ensure uniqueness
  UNIQUE(baseline_name, jira_version, environment, component_name)
);

-- Test Data Dependencies (for test data management)
CREATE TABLE IF NOT EXISTS test_data_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Test Data Definition
  data_set_name text NOT NULL,
  data_type text NOT NULL, -- 'uat_tickets', 'test_users', 'sample_forms'
  description text,
  
  -- Data Content
  data_content jsonb NOT NULL, -- The actual test data
  data_schema jsonb, -- Schema definition
  
  -- Usage Tracking
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  
  -- Lifecycle
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  
  -- Indexes
  INDEX idx_test_data_name (data_set_name),
  INDEX idx_test_data_type (data_type)
);

-- Views for easier querying

-- Latest test results summary
CREATE VIEW latest_test_summary AS
SELECT 
  tr.id,
  tr.run_name,
  tr.jira_version,
  tr.environment,
  tr.status,
  tr.started_at,
  tr.completed_at,
  tr.total_tests,
  tr.passed_tests,
  tr.failed_tests,
  tr.overall_score,
  tr.risk_score,
  COUNT(pm.id) as performance_metrics_count,
  COUNT(ct.id) as component_tests_count,
  COUNT(ai.id) as ai_insights_count
FROM test_runs tr
LEFT JOIN jira_performance_metrics pm ON tr.id = pm.test_run_id
LEFT JOIN jira_component_tests ct ON tr.id = ct.test_run_id  
LEFT JOIN ai_test_insights ai ON tr.id = ai.test_run_id
GROUP BY tr.id
ORDER BY tr.started_at DESC;

-- Performance trends view
CREATE VIEW performance_trends AS
SELECT 
  pm.component_name,
  pm.page_url,
  pm.ui_theme,
  DATE(pm.timestamp) as test_date,
  AVG(pm.lcp_score) as avg_lcp,
  AVG(pm.fid_score) as avg_fid,
  AVG(pm.cls_score) as avg_cls,
  AVG(pm.page_load_time) as avg_load_time,
  COUNT(*) as test_count
FROM jira_performance_metrics pm
JOIN test_runs tr ON pm.test_run_id = tr.id
WHERE tr.status = 'completed'
GROUP BY pm.component_name, pm.page_url, pm.ui_theme, DATE(pm.timestamp)
ORDER BY test_date DESC;

-- Critical insights view
CREATE VIEW critical_insights AS
SELECT 
  ai.*,
  tr.run_name,
  tr.jira_version,
  tr.environment
FROM ai_test_insights ai
JOIN test_runs tr ON ai.test_run_id = tr.id
WHERE ai.severity IN ('critical', 'high')
  AND ai.status = 'active'
ORDER BY ai.priority_score DESC, ai.timestamp DESC;

-- Functions for data analysis

-- Function to calculate test run score
CREATE OR REPLACE FUNCTION calculate_test_run_score(test_run_uuid uuid)
RETURNS decimal AS $$
DECLARE
  total_score decimal := 0;
  weight_functional decimal := 0.4;
  weight_performance decimal := 0.3;
  weight_visual decimal := 0.2;
  weight_accessibility decimal := 0.1;
BEGIN
  -- Calculate weighted score based on different test aspects
  -- This is a simplified version - can be made more sophisticated
  
  SELECT 
    (
      COALESCE(
        weight_functional * (passed_tests::decimal / NULLIF(total_tests, 0) * 100), 0
      ) +
      COALESCE(
        weight_performance * AVG(pm.overall_performance_score), 0
      ) +
      COALESCE(
        weight_visual * AVG(100 - pm.visual_regression_score), 0  
      ) +
      COALESCE(
        weight_accessibility * AVG(pm.accessibility_score), 0
      )
    )
  INTO total_score
  FROM test_runs tr
  LEFT JOIN jira_performance_metrics pm ON tr.id = pm.test_run_id
  WHERE tr.id = test_run_uuid
  GROUP BY tr.id, tr.passed_tests, tr.total_tests;
  
  RETURN COALESCE(total_score, 0);
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE test_runs IS 'Main test execution runs with overall results and AI analysis';
COMMENT ON TABLE jira_performance_metrics IS 'Detailed performance metrics per page/component test';
COMMENT ON TABLE jira_component_tests IS 'Individual functional test results with visual evidence';
COMMENT ON TABLE ai_test_insights IS 'AI-generated insights, risks, and recommendations';
COMMENT ON TABLE test_visual_assets IS 'Screenshots, videos, and other visual evidence stored in S3';
COMMENT ON TABLE performance_baselines IS 'Performance baselines for comparison and regression detection';

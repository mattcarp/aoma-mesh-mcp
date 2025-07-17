/**
 * Request DTOs for AOMA Mesh Tools
 *
 * Type definitions for all tool request parameters.
 */
export interface AOMAQueryRequest {
    query: string;
    strategy?: 'comprehensive' | 'focused' | 'rapid';
    maxResults?: number;
    threshold?: number;
    context?: string;
}
export interface JiraSearchRequest {
    query: string;
    projectKey?: string;
    status?: string[];
    priority?: string[];
    maxResults?: number;
    threshold?: number;
}
export interface JiraCountRequest {
    projectKey?: string;
    status?: string[];
    priority?: string[];
}
export interface GitSearchRequest {
    query: string;
    repository?: string[];
    author?: string[];
    dateFrom?: string;
    dateTo?: string;
    filePattern?: string;
    maxResults?: number;
    threshold?: number;
}
export interface CodeSearchRequest {
    query: string;
    repository?: string[];
    language?: string[];
    fileExtension?: string[];
    maxResults?: number;
    threshold?: number;
}
export interface OutlookEmailSearchRequest {
    query: string;
    dateFrom?: string;
    dateTo?: string;
    fromEmail?: string[];
    toEmail?: string[];
    subject?: string;
    hasAttachments?: boolean;
    priority?: string[];
    maxResults?: number;
    threshold?: number;
}
export interface DevelopmentContextRequest {
    currentTask: string;
    codeContext?: string;
    systemArea?: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'integration' | 'testing';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
}
export interface SystemHealthRequest {
    includeMetrics?: boolean;
    includeDiagnostics?: boolean;
}
export interface ServerCapabilitiesRequest {
    includeExamples?: boolean;
}
export interface SwarmAnalysisRequest {
    query: string;
    primaryAgent?: 'code_specialist' | 'jira_analyst' | 'aoma_researcher' | 'synthesis_coordinator';
    contextStrategy?: 'isolated' | 'shared' | 'selective_handoff';
    maxAgentHops?: number;
    enableMemoryPersistence?: boolean;
}
export interface SwarmHandoffRequest {
    targetAgent: 'code_specialist' | 'jira_analyst' | 'aoma_researcher' | 'synthesis_coordinator';
    handoffContext: string;
    preserveHistory?: boolean;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}
export interface SwarmContextEngineeringRequest {
    originalQuery: string;
    agentSpecializations?: string[];
    contextCompressionLevel?: 'none' | 'light' | 'aggressive' | 'semantic';
    crossVectorCorrelations?: boolean;
}
export interface FailureHeatmapRequest {
    timeRange?: number;
    includeGeographic?: boolean;
    includeTemporal?: boolean;
    generateVisualizationData?: boolean;
    minFailureThreshold?: number;
}
export interface PerformanceAnalysisRequest {
    analysisType: 'failure_patterns' | 'performance_trends' | 'capacity_planning' | 'predictive_model';
    timeWindow?: number;
    generatePredictions?: boolean;
    includeRecommendations?: boolean;
    confidenceLevel?: number;
}
export interface PredictiveModelRequest {
    targetVariable: string;
    predictorVariables?: string[];
    modelType?: 'auto' | 'logistic_regression' | 'random_forest' | 'gradient_boosting' | 'time_series';
    trainingPeriod?: number;
    predictionHorizon?: number;
    includeFeatureImportance?: boolean;
    generateActionablePredictions?: boolean;
}

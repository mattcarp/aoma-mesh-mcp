export interface PlanStep {
  /** Tool name to execute */
  tool: string;
  
  /** Arguments to pass to the tool */
  args: Record<string, any>;
  
  /** Key to store the output under for reference by later steps */
  outputKey?: string;
  
  /** Description of what this step accomplishes */
  description: string;
  
  /** Whether this step can be skipped if previous steps fail */
  optional?: boolean;
}

export interface ExecutionResult {
  /** The step that was executed */
  step: PlanStep;
  
  /** Whether the step succeeded */
  success: boolean;
  
  /** The raw result from the tool call */
  result?: any;
  
  /** Error message if step failed */
  error?: string;
  
  /** Execution time in milliseconds */
  duration: number;
}

export interface PlanExecutionContext {
  /** Results from previous steps, keyed by outputKey */
  stepResults: Record<string, any>;
  
  /** Original user request */
  userRequest: string;
  
  /** Available tools from server capabilities */
  availableTools: Array<{ name: string; description: string }>;
  
  /** Session context for continuity */
  sessionContext?: string;
}

export interface ExecutionPlan {
  /** List of steps to execute */
  steps: PlanStep[];
  
  /** Estimated execution time in seconds */
  estimatedDuration: number;
  
  /** Human-readable description of the plan */
  description: string;
  
  /** Success criteria for the plan */
  successCriteria: string;
}
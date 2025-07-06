# MC-TK Agent MCP Server Usage Examples

This document provides comprehensive examples of how to use the MC-TK Agent MCP Server with various MCP clients, particularly Claude Desktop.

## New Enhanced Development Tools

### Code Quality Analysis

Analyze code quality metrics and identify potential issues:

```
Please analyze the code quality of the file `src/components/UserProfile.tsx` focusing on complexity and maintainability metrics.
```

**Expected Response:** Detailed analysis including cyclomatic complexity, maintainability index, potential security issues, and performance recommendations.

### Architecture Analysis

Analyze project architecture and generate visualization:

```
Please analyze the architecture of the project at `/Users/username/my-project` with full analysis including dependencies, structure, patterns, and generate architecture diagrams.
```

**Expected Response:** Comprehensive architecture analysis with dependency graphs, design patterns identified, and mermaid diagrams.

### Refactoring Suggestions

Get AI-powered refactoring recommendations:

```
Please analyze the file `src/utils/dataProcessor.js` and suggest all types of refactoring improvements with specific code examples.
```

**Expected Response:** Detailed refactoring suggestions including extract method, optimize performance, modernize syntax, with before/after code examples.

### Intelligent Codebase Search

Search across your codebase semantically:

```
Please search the codebase for "user authentication and authorization patterns" using semantic search, focusing on TypeScript and JavaScript files, with a maximum of 15 results.
```

**Expected Response:** Relevant code files, functions, and patterns related to authentication, ranked by semantic relevance.

### Documentation Generation

Generate comprehensive documentation:

```
Please generate API documentation for the component at `src/components/Dashboard.tsx` in markdown format with code examples.
```

**Expected Response:** Complete API documentation including props, methods, usage examples, and integration guidelines.

### Dependency Analysis

Analyze project dependencies for issues:

```
Please analyze all dependencies for the project at `/Users/username/my-project` including security vulnerabilities, available updates, unused packages, and conflicts, including development dependencies.
```

**Expected Response:** Security audit, update recommendations, unused dependency detection, and conflict resolution suggestions.

## IDE-Specific Integration Tools

### Workspace Analysis

Analyze workspace for IDE optimization:

```
Please analyze the workspace at `/Users/username/my-project` for Claude Code IDE optimization, including configuration analysis.
```

**Expected Response:** IDE-specific optimization suggestions, configuration improvements, and workspace setup recommendations.

### IDE Improvement Suggestions

Get context-aware IDE suggestions:

```
Please suggest Claude Code IDE improvements for the file `src/hooks/useUserData.ts` in the context of "optimizing React hooks for better performance and reusability".
```

**Expected Response:** IDE-specific shortcuts, configuration tweaks, extensions recommendations, and workflow optimizations.

### IDE Snippet Generation

Generate IDE-specific code snippets:

```
Please generate Claude Code IDE snippets for TypeScript using React framework, focusing on component type snippets.
```

**Expected Response:** Ready-to-use IDE snippets with proper syntax highlighting and placeholder variables.

### Development Context Analysis

Analyze current development context:

```
Please analyze my current development context with these open files: ["src/components/Header.tsx", "src/styles/globals.css"], recent changes: ["Updated navigation styling", "Added responsive design"], current task: "Implementing mobile-first responsive design", for immediate timeframe suggestions.
```

**Expected Response:** Context-aware next steps, priority recommendations, and workflow suggestions.

### Workflow Optimization

Optimize development workflows:

```
Please optimize the coding workflow for workspace at `/Users/username/my-project` using tools: ["git", "npm", "eslint", "prettier", "jest"].
```

**Expected Response:** Workflow automation suggestions, tool integration recommendations, and productivity improvements.

### Development Plan Creation

Create structured development plans:

```
Please create a development plan for "Implementing real-time chat functionality with WebSocket support" with estimated time of "1 week", moderate complexity, including tests and documentation.
```

**Expected Response:** Detailed project plan with milestones, tasks, timeline, testing strategy, and documentation requirements.

## Setup and Installation

### 1. Install the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Environment Variables

Create a `.env` file in the mcp-server directory:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
OPENAI_MODEL_NAME=gpt-4o
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

### 3. Test the Installation

```bash
npm run test:server
```

## Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "servers": {
    "mc-tk-agents": {
      "command": "node",
      "args": ["/path/to/mc-tk/mcp-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-openai-key",
        "OPENAI_MODEL_NAME": "gpt-4o"
      }
    }
  }
}
```

## Usage Examples

### 1. Create and Manage Coordinator Agents

#### Basic Coordinator Agent Creation

```
I need help analyzing our authentication system. Please create a coordinator agent that will:
1. Analyze the current codebase for auth-related files
2. Search for related Jira tickets about authentication issues
3. Generate a comprehensive test plan for the login workflow

Task description: "Analyze authentication system and create comprehensive test coverage"
```

This will use the `create_coordinator_agent` tool automatically.

#### Check Agent Status

```
What's the current status of my coordinator agent?
```

#### View Agent Execution History

```
Show me the detailed execution history and events for the coordinator agent.
```

#### Provide Feedback to Running Agent

```
Please tell the coordinator agent to focus specifically on two-factor authentication flows and include edge cases for failed authentication attempts.
```

### 2. Jira Integration Examples

#### Search for Authentication Issues

```
Search our Jira tickets for any issues related to:
- Login failures
- Authentication bugs
- Two-factor authentication problems
- Session management issues
```

#### Find Tickets by Sprint or Project

```
Query Jira tickets for project "AUTH" related to the current sprint focusing on user experience improvements.
```

#### Analyze Ticket Patterns

```
Search for Jira tickets that mention "timeout" or "session expired" to understand authentication stability issues.
```

### 3. Repository Analysis Examples

#### Analyze Authentication Code

```
Analyze our repository to find all files related to authentication, including:
- Login components
- Auth middleware
- Session management
- Token handling
- Security configurations
```

#### Find Specific Code Patterns

```
Search the repository for implementations of JWT token validation and highlight any potential security vulnerabilities.
```

#### Analyze Recent Changes

```
Examine recent changes to authentication-related files in the last 30 days and identify any potential issues or improvements needed.
```

### 4. Test Generation Examples

#### Generate E2E Tests

```
Generate a comprehensive Playwright test suite for our user authentication flow that includes:
- Valid login scenarios
- Invalid credential handling
- Two-factor authentication
- Password reset workflow
- Session timeout handling
```

#### Generate Unit Tests

```
Create Jest unit tests for the authentication middleware, focusing on:
- Token validation
- Permission checking
- Error handling
- Edge cases
```

#### Generate API Tests

```
Generate API tests for our authentication endpoints using Playwright that cover:
- Login endpoint
- Refresh token endpoint
- Logout endpoint
- User profile endpoint
```

### 5. Diagram Generation Examples

#### Create Authentication Flow Diagram

```
Create a flowchart diagram showing our complete authentication workflow from initial login through session management and logout.
```

#### Generate Architecture Diagram

```
Create a sequence diagram showing the interaction between frontend, backend, and database during the authentication process.
```

#### Visualize Test Strategy

```
Generate a diagram showing our testing strategy for the authentication system, including unit tests, integration tests, and E2E tests.
```

### 6. Complex Multi-Agent Workflows

#### Comprehensive Analysis and Testing

```
I need to prepare for a security audit of our authentication system. Please:

1. Create a coordinator agent to orchestrate this analysis
2. Search Jira for any security-related tickets in the last 6 months
3. Analyze our codebase for authentication and authorization patterns
4. Generate comprehensive test plans covering security scenarios
5. Create documentation diagrams showing our auth architecture
6. Provide recommendations for security improvements

Focus on:
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Session security
- Password security
- Two-factor authentication
```

#### Bug Investigation and Resolution

```
We have reports of users getting logged out randomly. Please help investigate by:

1. Searching Jira for related tickets about session issues
2. Analyzing our session management code
3. Examining authentication middleware for potential bugs
4. Creating tests to reproduce the issue
5. Generating a fix implementation plan

Include both frontend and backend analysis.
```

### 7. Advanced Features

#### Real-time Agent Monitoring

```
Show me all currently active agents and their status. I want to monitor the progress of the authentication analysis.
```

#### Agent Resource Inspection

```
What resources are available through the agent system? Show me the agent types and their capabilities.
```

#### Custom Feedback Loop

```
I'm reviewing the test plan generated by the agent. Please tell it to add more edge cases for mobile authentication and include tests for biometric authentication.
```

## Best Practices

### 1. Effective Prompting

- **Be Specific**: Provide clear, detailed task descriptions
- **Include Context**: Mention relevant technologies, frameworks, and constraints
- **Set Priorities**: Indicate what aspects are most important
- **Define Scope**: Specify what should be included or excluded

### 2. Agent Management

- **Monitor Progress**: Regularly check agent status during long-running tasks
- **Provide Feedback**: Guide agents with specific feedback when needed
- **Resource Awareness**: Understand that agents have access to your codebase and Jira

### 3. Security Considerations

- **Sensitive Data**: Be cautious when asking agents to analyze sensitive authentication code
- **API Keys**: Ensure your OpenAI API key is properly secured
- **Access Control**: Agents operate with the permissions of the server environment

## Troubleshooting

### Common Issues and Solutions

1. **"Agent not found" errors**
   - Check that you're using the correct agent ID
   - Verify the agent was successfully created

2. **"Tool execution failed" errors**
   - Check your environment variables
   - Verify Supabase connection if using Jira search
   - Ensure repository access permissions

3. **Slow responses**
   - Large repositories may take time to analyze
   - Complex queries require more processing time
   - Consider breaking large tasks into smaller parts

4. **Missing results**
   - Verify your Jira connection and data
   - Check that the repository path is correct
   - Ensure the query terms are specific enough

## Integration with Development Workflow

### Code Review Process

```
Before merging this authentication feature PR, please:
1. Analyze the changed files for security issues
2. Generate additional test cases for the new functionality
3. Check if any existing Jira tickets are addressed
4. Create documentation for the new authentication flow
```

### Sprint Planning

```
Help me plan our next sprint focused on authentication improvements:
1. Search for open authentication-related Jira tickets
2. Analyze technical debt in our auth codebase
3. Generate test coverage reports
4. Suggest priorities based on security impact
```

### Documentation Generation

```
We need to update our authentication documentation. Please:
1. Analyze our current auth implementation
2. Generate flow diagrams for each authentication method
3. Create a comprehensive test strategy document
4. Identify any undocumented security features
```
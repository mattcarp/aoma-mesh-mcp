# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the AOMA Mesh MCP Server - a Model Context Protocol (MCP) server that provides AI-powered development assistance with Sony Music business intelligence integration. The server exposes tools for querying JIRA tickets, AOMA knowledge base, Git repositories, and development context analysis.

## Development Commands

### Core Development
- `npm run dev` - Start development server with TypeScript watching
- `npm run build` - Clean build with TypeScript compilation
- `npm run start` - Run production server from built files
- `npm run typecheck` - Type checking without compilation
- `npm run lint` - ESLint checking on TypeScript files
- `npm run validate` - Run both typecheck and lint

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage reports

### Deployment
- `npm run build:lambda` - Build and package for AWS Lambda deployment
- `npm run deploy:lambda` - Deploy to AWS Lambda via CDK
- `npm run health-check` - Check server health status

## Architecture

### Core Structure
- **Main Server**: `src/aoma-mesh-server.ts` - Primary MCP server implementation with both stdio and HTTP transports
- **Entry Points**: 
  - `src/index.ts` - Standard MCP export
  - `src/lambda-handler.ts` - AWS Lambda wrapper
  - `src/http-bridge.ts` - HTTP-only server for web apps

### Key Components
- **Tools**: MCP tools for AOMA knowledge queries, JIRA search, Git analysis, development context analysis
- **Resources**: Health status, metrics, documentation, configuration
- **Streaming**: Support for streaming responses via `src/streaming/`
- **Environment**: Comprehensive environment validation with Zod schemas

### Technology Stack
- **TypeScript 5.3** with strict ESM configuration
- **Model Context Protocol SDK** for MCP compliance
- **OpenAI API** for AI assistant integration
- **Supabase** for vector search and data storage
- **Express** for HTTP endpoints
- **Jest** for testing with ESM support

### Environment Variables Required
```bash
OPENAI_API_KEY=sk-your-openai-key
AOMA_ASSISTANT_ID=asst_your-assistant-id
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Build Configuration
- **Target**: ES2022 with Node16 modules
- **Output**: `dist/` directory with source maps and declarations
- **Exclusions**: Test files and development-only scripts are excluded from builds
- **ESM**: Full ES module support with proper import/export handling

### Testing Strategy
- **Jest**: Configured for TypeScript with ESM support
- **Test Location**: `src/**/*.test.ts` and `src/**/__tests__/`
- **Coverage**: Excludes test files and type definitions
- **Setup**: `src/__tests__/setup.ts` for test environment configuration

### Deployment Options
1. **Claude Desktop**: Direct stdio transport via MCP configuration
2. **AWS Lambda**: Serverless deployment with CDK infrastructure
3. **HTTP Server**: Standalone HTTP server for web application integration
4. **Development**: Local development with file watching

## Important Implementation Notes

### MCP Server Features
- Dual transport support (stdio + HTTP) for maximum compatibility
- Health monitoring with service diagnostics and caching
- Comprehensive error handling with proper MCP error codes
- Performance metrics tracking and logging
- Graceful shutdown handling

### Security Considerations
- Environment variable validation with detailed error messages
- Input sanitization for sensitive data in logs
- Proper API key management and rotation support
- Resource cleanup (OpenAI threads) to prevent quota issues

### Sony Music Integration
- AOMA knowledge base queries via OpenAI Assistant API
- Semantic search through 6000+ JIRA tickets
- Git repository analysis with vector embeddings
- Development context analysis for troubleshooting
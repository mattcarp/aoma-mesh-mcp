# AGENT.md - Development Guide for SIAM

## Build/Lint/Test Commands

**Desktop App (siam-desktop):**
- `cd siam-desktop && pnpm dev` - Development server
- `cd siam-desktop && pnpm build` - Production build
- `cd siam-desktop && pnpm test` - Run all tests (Jest + Playwright)
- `cd siam-desktop && pnpm test:unit` - Jest unit tests only
- `cd siam-desktop && pnpm test:e2e` - Playwright E2E tests only
- `cd siam-desktop && pnpm test:e2e:ui` - Playwright with UI
- `cd siam-desktop && pnpm lint` - TypeScript type checking
- `cd siam-desktop && pnpm storybook` - Run Storybook (port 6006)

**Electron App (siam-electron):**
- `cd siam-electron && npm run dev` - Development mode
- `cd siam-electron && npm run build` - Production build
- `cd siam-electron && npm run test:e2e` - Playwright tests
- `cd siam-electron && npm run test:e2e:ui` - Playwright with UI
- `cd siam-electron && npm run lint` - TypeScript checking

## Architecture & Codebase Structure

**Main Projects:**
- `siam-desktop/` - React + Vite desktop app with Electron packaging
- `siam-electron/` - Electron-based app with Python bridge integration
- `.taskmaster/` - Task Master AI workflow management system

**Key Technologies:**
- React 18 + TypeScript + Vite
- Electron for desktop packaging
- Playwright for E2E testing, Jest for unit tests
- Tailwind CSS + Radix UI components
- ElevenLabs API integration for AI audio
- MCP (Model Context Protocol) for AI service integration

**Important APIs & Services:**
- MCP integration for AI workflows (`src/services/MCPClient.ts`)
- ElevenLabs audio service (`src/services/elevenlabs*`)
- AOMA knowledge aggregation (`src/services/aoma*`)
- Real-time audio processing (`src/services/realTimeAudioProcessor.ts`)

## Code Style & Conventions

**TypeScript:**
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Interface-first design patterns
- Explicit return types for exported functions
- Use `const` assertions and proper type narrowing

**React Patterns:**
- Functional components with hooks
- Custom hooks for complex state (`useSettings`, `useMCPClient`, `usePerformance`)
- Error boundaries for resilient UX
- Tailwind + clsx for styling

**Import Style:**
- `import type` for TypeScript-only imports
- Relative imports for local modules
- Barrel exports from service directories

**Error Handling:**
- Structured error logging service (`src/services/errorLogger.ts`)
- Promise-based APIs with proper catch blocks
- Graceful degradation for missing services

**UI/UX Guidelines:**
- **NO EMOJIS** in UI components - use Lucide React icons instead
- Clean, professional interface design
- Use icon libraries (Lucide React, Radix UI icons) for all visual elements

**Git Workflow:**
- Use `git acm "message"` alias (equivalent to `git add . && git commit -m "message"`)
- Task-driven commits referencing task IDs
- Branch naming: `feature/task-description` or `fix/issue-description`

**Agent Rules Integration:**
- Follow Task Master workflow patterns from `.windsurfrules`
- Leverage existing Cline rules in `.clinerules/`
- Reference CLAUDE.md for comprehensive workflow guidance

**CRITICAL RULE - NO MOCK DATA:**
- NEVER USE FAKE/MOCK DATA in any interface
- No fake metrics like "Active Listening 92%" or made-up percentages
- All data must be real or show proper empty states
- When no real data is available, show "No data available" or loading states
- Mock data violates user requirements and creates false expectations

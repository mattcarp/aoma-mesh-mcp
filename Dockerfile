# Railway-optimized Dockerfile for AOMA Mesh MCP Server
# Simplified for Railway's container environment

FROM node:20-alpine

# Build argument to force rebuild - Performance fix deployment
ARG CACHEBUST=20251029_fast_path
ARG BUILD_DATE=2025-10-29-performance-fix
ENV BUILD_DATE=$BUILD_DATE
ENV CACHEBUST=$CACHEBUST

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    dumb-init

# Update npm to latest version first
RUN npm install -g npm@latest

# Copy package files for dependency installation
COPY package.json ./

# Clear npm cache and install fresh dependencies with latest npm
RUN npm cache clean --force && \
    npm install --no-audit --legacy-peer-deps

# Copy source code
COPY . .

# Skip build step - we'll use tsx to run directly
# RUN npm run clean && npx tsc --project tsconfig.railway.json

# Keep all dependencies for tsx to work
# RUN npm prune --production && \
#     npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001 && \
    chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Environment variables for Railway
ENV NODE_ENV=production
ENV HOST=0.0.0.0
# MCP_SERVER_VERSION will be set dynamically by the application
# Railway will set PORT dynamically, but default to 3333 for local testing
ENV PORT=3333

# Performance optimizations
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Expose port
EXPOSE 3333

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server with tsx for direct TypeScript execution
CMD ["npx", "tsx", "src/aoma-mesh-server.ts"]
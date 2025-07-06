# Multi-stage Dockerfile for AWS Fargate deployment
# SOTA Performance, Security, and Size Optimization
# Updated for MCP Server 2.0.0_SOTA with NO FALLBACK policy

# ⚠️ CRITICAL: Force x86_64 architecture for AWS Fargate compatibility
# This prevents "Exec format error" on ARM64 build machines

# Stage 1: Build stage
FROM --platform=linux/x86_64 node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev deps for building)
RUN npm ci --prefer-offline --no-audit

# Copy source code and pre-built files
COPY . .
COPY dist ./dist

# Remove dev dependencies and clean up
RUN npm ci --only=production --prefer-offline --no-audit && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Stage 2: Production stage  
FROM --platform=linux/x86_64 node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S mcpuser -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Copy built application from builder stage
COPY --from=builder --chown=mcpuser:mcpuser /app/dist ./dist
COPY --from=builder --chown=mcpuser:mcpuser /app/node_modules ./node_modules
COPY --from=builder --chown=mcpuser:mcpuser /app/package.json ./package.json
COPY --from=builder --chown=mcpuser:mcpuser /app/simple-server.js ./simple-server.js

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# SOTA Environment Configuration for MCP Server
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
ENV MCP_SERVER_VERSION=2.0.0_SOTA

# Performance Optimizations
ENV NODE_OPTIONS="--max-old-space-size=1536 --optimize-for-size"
ENV UV_THREADPOOL_SIZE=16

# SOTA Health Check (fast, 500ms timeout)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3333/health || exit 1

# Expose MCP server port
EXPOSE 3333

# Use dumb-init to handle signals properly in containers
ENTRYPOINT ["dumb-init", "--"]

# Start the AOMA Mesh MCP Server (not simple-server.js)
CMD ["node", "dist/aoma-mesh-server.js"]
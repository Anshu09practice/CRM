# Multi-stage build for JJ CRM
# Stage 1: Build the client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY client/ .
RUN npm run build

# Stage 2: Build the server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server/ .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies for server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built server
COPY --from=server-build /app/server/dist ./dist

# Copy built client to serve as static files
COPY --from=client-build /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p data

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Environment
ENV NODE_ENV=production
ENV HTTP_MODE=true
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/auth/status || exit 1

CMD ["node", "dist/index.js"]

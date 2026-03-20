# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
# client package.json needed for workspace resolution but not installed
COPY packages/client/package.json packages/client/
RUN npm ci --workspace=packages/server --workspace=packages/shared --include-workspace-root
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
RUN npm -w packages/server run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# Copy built server
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
# Copy node_modules (external deps: ws, geoip-lite, etc.)
COPY --from=builder /app/node_modules ./node_modules
# Copy shared package (workspace symlinks don't work in production)
COPY --from=builder /app/packages/shared ./node_modules/@hivechat/shared
EXPOSE 3456
CMD ["node", "dist/index.mjs"]

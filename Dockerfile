# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
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
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3456
CMD ["node", "dist/index.js"]

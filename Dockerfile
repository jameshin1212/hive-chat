# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci --workspace=packages/server --workspace=packages/shared --include-workspace-root
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
# Build server with @hivechat/shared inlined (--no-external)
RUN npm -w packages/server run build

# Stage 2: Production
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3456
CMD ["node", "dist/index.mjs"]

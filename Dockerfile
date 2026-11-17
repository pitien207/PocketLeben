# syntax=docker/dockerfile:1
# Pocket Leben: the built game (dist/) + the Node server (accounts, cloud saves, multiplayer) in one image.
# Deployed to Azure Container Apps by .github/workflows/deploy.yml (see docs/DEPLOY.md).

# ---- 1. Build the game (typecheck + Vite) ----
FROM node:24-alpine AS game-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- 2. Server production dependencies only (ws, mongodb) ----
FROM node:24-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# ---- 3. Runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/tmp/pocket-leben-data
WORKDIR /app
# Without MONGO_URI the server falls back to files in DATA_DIR (temporary: lost on restart).
# Files stay owned by root (read-only for the app); the process runs as "node".
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/package.json server/*.mjs ./server/
COPY --from=game-build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]

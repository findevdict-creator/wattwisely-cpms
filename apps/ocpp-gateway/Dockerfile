# Builds the OCPP gateway image. Run from the repository root:
#   docker build -f apps/ocpp-gateway/Dockerfile -t wattwisely/ocpp-gateway .

# 1. Build the app with the whole workspace.
FROM node:22-alpine AS build
WORKDIR /workspace
RUN npm install --global npm@11
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx nx run ocpp-gateway:prune

# 2. Run it with only the packages the gateway needs.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN npm install --global npm@11
COPY --from=build /workspace/dist/apps/ocpp-gateway ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:3100/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "main.js"]

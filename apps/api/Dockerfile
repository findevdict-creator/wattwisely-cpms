# Builds the API image. Run from the repository root:
#   docker build -f apps/api/Dockerfile -t wattwisely/api .

# 1. Build the app with the whole workspace.
FROM node:22-alpine AS build
WORKDIR /workspace
RUN npm install --global npm@11
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx nx run api:prune

# 2. Run it with only the packages the API needs.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN npm install --global npm@11
COPY --from=build /workspace/dist/apps/api ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "main.js"]

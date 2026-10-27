# Builds the tenant portal image. Run from the repository root:
#   docker build -f apps/portal/Dockerfile -t wattwisely/portal .

# 1. Build the Angular app.
FROM node:22-alpine AS build
WORKDIR /workspace
RUN npm install --global npm@11
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx nx build portal --configuration=production

# 2. Serve the static files with nginx. config.json is written at start-up from environment variables.
FROM nginx:1.31-alpine AS runtime
COPY apps/portal/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/portal/docker/40-write-runtime-config.sh /docker-entrypoint.d/40-write-runtime-config.sh
COPY --from=build /workspace/dist/apps/portal/browser /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-write-runtime-config.sh
EXPOSE 8080
# 127.0.0.1, not localhost: busybox wget tries ::1 first and nginx listens on IPv4 only.
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

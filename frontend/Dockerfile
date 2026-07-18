# Multi-stage build for the React/Vite SPA.
FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Empty by default: Caddy on the host serves both the API and the SPA from the
# same origin (ekowayhardware.com), so relative "/api/..." fetches resolve
# without a build-time override.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

FROM nginx:alpine

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /usr/share/nginx/html /var/cache/nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

USER appuser

CMD ["nginx", "-g", "daemon off;"]

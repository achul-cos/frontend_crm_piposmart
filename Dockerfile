# syntax=docker/dockerfile:1

# ---- deps: install dependencies with a locked, reproducible install ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must be passed as build args (set them under Railway's "Build" variables,
# not just runtime variables) rather than only as runtime ENV.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal production image using Next's standalone output ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
RUN if [ ! -f server.js ]; then \
      nested_server="$(find . -mindepth 2 -maxdepth 2 -name server.js -print -quit)"; \
      if [ -n "$nested_server" ]; then \
        nested_dir="$(dirname "$nested_server")"; \
        cp -a "$nested_dir"/. ./ && rm -rf "$nested_dir"; \
      fi; \
    fi; \
    [ -f server.js ] || (echo "Next standalone server.js not found" >&2; exit 1)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway injects PORT at runtime; the standalone server.js honors it directly.
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]

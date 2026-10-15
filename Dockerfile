FROM node:22-bookworm-slim AS build
WORKDIR /app

# Only the four npm workspaces used by PAC are needed to build.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts/pac-tecnocare/package.json artifacts/pac-tecnocare/package.json
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
RUN npm ci --no-audit --no-fund

COPY artifacts/pac-tecnocare artifacts/pac-tecnocare
COPY artifacts/api-server artifacts/api-server
COPY lib/api-client-react lib/api-client-react
COPY lib/api-zod lib/api-zod

# These are public browser configuration, not private credentials.
# Never pass GEMINI_API_KEY as a build argument.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
    || (echo "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build arguments" >&2; exit 1)
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=build --chown=node:node /app/artifacts/pac-tecnocare/dist/public ./artifacts/pac-tecnocare/dist/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]

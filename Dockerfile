FROM node:24-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ARG APP
ENV APP=${APP}
ENV NODE_ENV=production

RUN if [ "$APP" = "api" ]; then \
      DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" pnpm --filter api prisma:generate; \
    fi
# Build-time configuration only; real credentials are supplied at container startup.
RUN if [ "$APP" = "api" ]; then \
      DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" \
      BETTER_AUTH_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')" \
      pnpm --filter api build; \
    else \
      API_INTERNAL_URL="http://api:3001" pnpm --filter "$APP" build; \
    fi

EXPOSE 3000 3001

CMD ["sh", "-c", "if [ \"$APP\" = \"api\" ]; then pnpm --filter api db:deploy || exit 1; fi; exec pnpm --filter \"$APP\" start"]

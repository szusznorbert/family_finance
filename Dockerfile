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
RUN pnpm --filter "$APP" build

EXPOSE 3000 3001

CMD ["sh", "-c", "pnpm --filter \"$APP\" start"]

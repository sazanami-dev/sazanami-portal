# syntax=docker/dockerfile:1

# ベースイメージはマイナーまで固定する。floating な node:24-alpine は
# マイナー更新で中身が変わり、ビルドの再現性がなくなる。
ARG NODE_IMAGE=node:24.21-alpine

# ---------- deps: 依存インストール（build 用に devDeps 含む） ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- lint: ESLint 実行（CI のゲート用。ランナーに Node 不要） ----------
FROM ${NODE_IMAGE} AS lint
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run lint

# ---------- builder: Next.js ビルド（standalone 出力） ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* はビルド時にクライアントバンドルへインライン化されるため build-arg で受け取る
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

# build-arg が空でもビルドは成功してしまい、値が undefined のままクライアント
# バンドルに焼き込まれる（ブラウザで初めて壊れる）。CI が緑のまま壊れたイメージを
# 配らないよう、ビルド前にここで検査する。
# Supabase の2つは未設定だとサインインが成立しないため必須。
# NEXT_PUBLIC_SITE_URL は未設定でもリンクを出さないだけなので（lib/announcements/discord.ts）
# 警告に留める。
RUN set -e; \
    for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do \
      eval "val=\$$v"; \
      [ -n "$val" ] || { echo "ERROR: build-arg $v が空です" >&2; exit 1; }; \
    done; \
    [ -n "$NEXT_PUBLIC_SITE_URL" ] \
      || echo "WARNING: build-arg NEXT_PUBLIC_SITE_URL が空です。お知らせの Discord 通知にポータルへのリンクが出ません。" >&2

RUN npm run build

# ---------- migrator: drizzle マイグレーション実行用 ----------
# drizzle-kit は devDependency のため app 本体には含めず、専用ターゲットで用意する。
# runner を最終ステージに残したいので、このステージは runner より前に置く。
FROM ${NODE_IMAGE} AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY db ./db
# 本番 DB に触るステージなので非 root で動かす（node ユーザーはベースイメージ同梱）
USER node
# DATABASE_URL は実行時に -e で注入する
CMD ["npm", "run", "db:migrate"]

# ---------- runner: 本番アプリ本体 ----------
# 最終ステージは `docker build`（--target なし）の既定ターゲットになる。
# アプリ以外が既定にならないよう、runner を必ず末尾に置く。
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root ユーザーで実行する。-G を省くと nextjs の所属が nogroup になり、
# 下の --chown=nextjs:nodejs と実際の所属が食い違うため明示する。
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nextjs

# standalone サーバーと静的アセットのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# /robots.txt は認証不要の静的ルートなのでプローブに使える（curl は alpine に無い）
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && \
    npm cache clean --force

# The builder already generated the Prisma client and compiled/copied it into
# dist/generated, so the production image does not need the Prisma CLI nor a
# @prisma/client postinstall generate.
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY --from=builder --chown=node:node /app/dist ./dist

RUN mkdir -p /app/uploads /app/logs && chown -R node:node /app/uploads /app/logs

ENV UPLOAD_DIR=/app/uploads \
    LOG_DIR=/app/logs/front

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "dist/index.js"]

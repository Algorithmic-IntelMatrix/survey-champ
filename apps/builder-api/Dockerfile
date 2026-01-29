FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.2

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package files for workspace resolution
COPY packages/db/package.json ./packages/db/
COPY packages/redis/package.json ./packages/redis/
COPY packages/backend-core/package.json ./packages/backend-core/
COPY apps/builder-api/package.json ./apps/builder-api/

# Copy source files
COPY packages/ ./packages/
COPY apps/builder-api/ ./apps/builder-api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/packages/db
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm run db:generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.2

# Copy from builder
COPY --from=builder /app ./

WORKDIR /app/apps/builder-api

EXPOSE 4000

CMD ["node", "src/index.js"]

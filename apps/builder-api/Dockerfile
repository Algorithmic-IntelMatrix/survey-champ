FROM oven/bun:1.2-slim AS builder

WORKDIR /app

# Copy all package files for workspace resolution
COPY package.json bun.lock ./
COPY packages/db/package.json ./packages/db/
COPY packages/redis/package.json ./packages/redis/
COPY packages/backend-core/package.json ./packages/backend-core/
COPY apps/builder-api/package.json ./apps/builder-api/

# Install dependencies (uncached, for Prisma generation)
COPY packages/ ./packages/
COPY apps/builder-api/ ./apps/builder-api/

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN bun install

# Generate Prisma Client
WORKDIR /app/packages/db
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN bun run db:generate

# Production stage
FROM oven/bun:1.2-slim

WORKDIR /app

# Install only runtime dependencies (OpenSSL for Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app ./

WORKDIR /app/apps/builder-api

EXPOSE 4000

CMD ["bun", "run", "start"]

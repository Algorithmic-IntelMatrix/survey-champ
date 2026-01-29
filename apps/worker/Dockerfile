FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.2

# Copy only dependency files first (better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/redis/package.json ./packages/redis/
COPY packages/common/package.json ./packages/common/
COPY packages/backend-core/package.json ./packages/backend-core/
COPY packages/queue/package.json ./packages/queue/
COPY apps/worker/package.json ./apps/worker/

# Install ALL dependencies (cached layer if files don't change)
RUN pnpm install --frozen-lockfile

# Builder stage - copy source and generate Prisma
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.2

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy source files
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Generate Prisma Client
WORKDIR /app/packages/db
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm run db:generate

# Production stage - minimal image
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.28.2

# Copy everything from builder
COPY --from=builder /app ./

WORKDIR /app/apps/worker

# Run the application using pnpm start (which uses tsx)
CMD ["pnpm", "start"]

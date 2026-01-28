FROM oven/bun:1.2-slim

WORKDIR /app

# Copy the monorepo files
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/builder-api/ ./apps/builder-api/

# Install dependencies
RUN bun install

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Generate Prisma Client
WORKDIR /app/packages/db
# Provide a placeholder DATABASE_URL for build-time generation
# The actual DATABASE_URL will be used at runtime
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN bun run db:generate

# Set working directory to the app
WORKDIR /app/apps/builder-api

EXPOSE 4000

# Run the app
CMD ["bun", "run", "start"]

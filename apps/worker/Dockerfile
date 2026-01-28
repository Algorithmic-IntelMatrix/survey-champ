FROM oven/bun:1.2-slim

WORKDIR /app

# Copy the monorepo files
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies
RUN bun install

# Generate Prisma Client
WORKDIR /app/packages/db
RUN bun run db:generate

# Set working directory to the worker app
WORKDIR /app/apps/worker

# Run the worker
CMD ["bun", "run", "start"]

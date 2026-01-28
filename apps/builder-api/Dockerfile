FROM oven/bun:1.2-slim

WORKDIR /app

# Copy the monorepo files
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/builder-api/ ./apps/builder-api/

# Install dependencies
RUN bun install

# Generate Prisma Client
WORKDIR /app/packages/db
RUN bun run db:generate

# Set working directory to the app
WORKDIR /app/apps/builder-api

EXPOSE 4000

# Run the app
CMD ["bun", "run", "start"]

FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3 (native C++ module)
RUN apk add --no-cache python3 make g++ python3-dev linux-headers

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source
COPY . .

# Build the SvelteKit app
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built app
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3480
ENV HOST=0.0.0.0

EXPOSE 3480

VOLUME ["/app/data"]

CMD ["node", "build"]

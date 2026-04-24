ARG BUILD_FROM=node:20-alpine

FROM ${BUILD_FROM}

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only (better-sqlite3 needs native compile)
RUN npm ci --omit=dev

# Copy pre-built app (built on host before docker build)
COPY build/ ./build/
COPY package.json ./

# Clean build tools
RUN apk del python3 make g++

# Data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3480
ENV DATA_DIR=/data

EXPOSE 3480

COPY addon/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]

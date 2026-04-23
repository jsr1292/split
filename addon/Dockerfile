ARG BUILD_FROM=node:20-alpine

FROM ${BUILD_FROM}

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files first for caching
COPY package*.json ./
COPY .npmrc ./

# Install dependencies (skip optional platform-specific bindings)
RUN npm ci

# Copy source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Prune dev deps
RUN rm -rf node_modules && npm ci --omit=dev

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

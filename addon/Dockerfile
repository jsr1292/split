ARG BUILD_FROM=node:20-alpine

FROM ${BUILD_FROM}

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the SvelteKit app
RUN npm run build

# Clean build tools
RUN apk del python3 make g++

# Data directory for SQLite database
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3480
ENV DATA_DIR=/data

EXPOSE 3480

# Entrypoint
COPY addon/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]

# Multi-stage Dockerfile for Cloud Run Deployment

# Stage 1: Build or Prepare React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

# Accept build arguments for frontend Vite environment variables
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_FIREBASE_EMULATOR=false

# Expose as environment variables to the Vite build process
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_FIREBASE_EMULATOR=$VITE_USE_FIREBASE_EMULATOR

# Copy package manifests
COPY web/package*.json ./

# Copy all web files (including web/.env and pre-existing web/dist if present)
COPY web/ ./

# If a valid pre-compiled dist folder already exists and no build-args override it,
# preserve the pre-built bundle. Otherwise, install dependencies and compile from source.
RUN if [ -f dist/index.html ] && [ -z "$VITE_FIREBASE_API_KEY" ]; then \
      echo "[frontend-builder] Pre-built web/dist found. Skipping container compile."; \
    else \
      echo "[frontend-builder] Compiling web/dist from source..."; \
      npm ci && npm run build; \
    fi

# Stage 2: Production Backend Container
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY --from=frontend-builder /app/web/dist ./web/dist

EXPOSE 8080

CMD ["node", "src/index.js"]

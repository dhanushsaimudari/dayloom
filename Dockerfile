# Multi-stage Dockerfile for Cloud Run Deployment
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

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

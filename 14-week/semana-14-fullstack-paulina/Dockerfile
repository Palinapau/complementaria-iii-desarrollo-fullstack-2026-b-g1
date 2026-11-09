# ---------- Etapa 1: compilar el frontend ----------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Etapa 2: backend de producción + frontend compilado ----------
FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 STATIC_DIR=/app/public
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist ./public
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]

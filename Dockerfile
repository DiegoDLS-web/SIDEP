# Build multi-etapa: Angular + API en un solo contenedor
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run prisma:generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/SRC ./backend/SRC
COPY --from=backend-build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend-build /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY backend/index.ts backend/app.ts ./backend/
COPY --from=frontend-build /app/frontend/dist/frontend ./frontend/dist/frontend

WORKDIR /app/backend
EXPOSE 3000
CMD ["sh", "-c", "node -r dotenv/config node_modules/prisma/build/index.js migrate deploy && node -r dotenv/config dist/index.js"]

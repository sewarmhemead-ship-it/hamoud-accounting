# ───────────────── المرحلة 1: بناء واجهة React ─────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ───────────────── المرحلة 2: خادم Node (يقدّم API + الواجهة) ─────────────────
FROM node:20-bookworm-slim AS backend
ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/app/backend/.cache/puppeteer

WORKDIR /app/backend

# أدوات بناء better-sqlite3 (native) + مكتبات تشغيل Chromium لـ puppeteer (تقارير PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    ca-certificates fonts-liberation wget xdg-utils \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcairo2 \
    libcups2 libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# تثبيت اعتماديات الإنتاج فقط (يشمل تنزيل Chromium الخاص بـ puppeteer)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# شيفرة الخادم + الواجهة المبنية (تُقدَّم من backend/public)
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./public

EXPOSE 3001
CMD ["node", "server.js"]

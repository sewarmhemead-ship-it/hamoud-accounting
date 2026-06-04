# ───────────────── المرحلة 1: بناء واجهة React ─────────────────
FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ───────────────── المرحلة 2: خادم Node (يقدّم API + الواجهة) ─────────────────
FROM node:22-bookworm-slim AS backend
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app/backend

# أدوات بناء better-sqlite3 (native) + Chromium الخاص بالنظام لتقارير PDF
# (حزمة chromium تجلب كل مكتبات التشغيل تلقائياً) + خطوط عربية احتياطية.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    chromium \
    fonts-liberation fonts-noto-core \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# تثبيت اعتماديات الإنتاج (بلا تنزيل Chromium لأن PUPPETEER_SKIP_DOWNLOAD=true)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# شيفرة الخادم + الواجهة المبنية (تُقدَّم من backend/public)
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./public

EXPOSE 3001
CMD ["node", "server.js"]

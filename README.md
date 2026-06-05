# hamoud-accounting

نظام محاسبة لشركة تخليص جمركي — **التخزين محلي** (SQLite على القرص).

## أين تُحفظ البيانات؟

| الملف | المسار |
|--------|--------|
| قاعدة البيانات | `backend/data/hamoud.db` |
| نسخ احتياطية يدوية | `backups/hamoud_YYYYMMDD_HHMMSS.db` |

لا تُرفع قاعدة التشغيل `backend/data/hamoud.db` إلى Git. للزبون الجديد تُضمَّن `backend/seed-data/customer-ready.db` (معابر، عملات، أنواع بضائع، **15 مركز** تجار/مخلصين، admin — **بدون** سيارات أو حركات). عند أول تشغيل بدون قاعدة يُنسخ هذا الملف إلى `data/hamoud.db` دون الكتابة فوق قاعدة فيها مراكز.

إعادة بناء قاعدة الزبون من المصدر:

```bat
cd backend
npm run build:customer-db
npm run smoke:customer
```

### حزمة Windows للزبون (بدون بيانات تجريبية)

```powershell
.\build-package.ps1
```

ينتج `dist\HamoudAccounting-Customer\` و`dist\HamoudAccounting-Customer.zip` — يضمّن `customer-ready.db` فقط، **لا** `backend\data\hamoud.db`. دليل الزبون: `docs\دليل-الزبون.md`.

---

## تشغيل سريع (Windows)

### تطوير — واجهة + API منفصلان
```bat
start.bat
```
- الواجهة: http://localhost:5173  
- الـ API: http://localhost:3001 (proxy تلقائي)

### إنتاج محلي — خدمة واحدة
```bat
start-prod.bat
```
- يبني React ويضعه في `backend/public`
- يفتح http://localhost:3001 (واجهة + `/api` معاً)
- `NODE_ENV=production` — عيّن `JWT_SECRET` في `backend/.env`

### نسخة احتياطية للقاعدة
```bat
backup-db.bat
```

---

## إعداد يدوي

### Backend
```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm run dev
```

### Frontend (تطوير فقط)
```bash
cd frontend
npm install
npm run dev
```

**تسجيل الدخول الافتراضي:** `admin` / `admin123` (أو `ADMIN_PASSWORD` من `.env`)

### بناء الواجهة للتشغيل المحلي الموحّد
```bash
cd backend
npm run build:ui
NODE_ENV=production node server.js
```

---

## API (ملخص)

- `GET /api/health` — فحص الخدمة
- `POST /api/auth/login` — تسجيل الدخول
- مراكز، سيارات (دورة حياة)، حركات، تقارير، حاسبة — انظر المسارات في `backend/src/routes/`

---

## نشر سحابي (اختياري)

ملفات `Dockerfile` و`railway.json` ما زالت موجودة إن احتجت Railway لاحقاً (`DB_PATH=/data/hamoud.db` + Volume). **الوضع المعتمد حالياً هو التشغيل المحلي.**

---

## المنطق المحاسبي

```
balance = Σ(out) − Σ(in)  WHERE is_delivered=1
grand_total = balance + posted_undelivered
```

## Scripts

| الأمر | الوصف |
|--------|--------|
| `npm run dev` | باك‑إند مع nodemon |
| `npm run build:ui` | بناء الواجهة → `backend/public` |
| `npm run migrate` | migrations |
| `npm run seed` | بيانات أولية |
| `npm test` | Vitest — محرك الحسابات |

محرك الحسابات: `backend/src/engine/` — مرجع Excel: `docs/business-logic-from-excel.md`

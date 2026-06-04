# hamoud-accounting

نظام محاسبة لشركة تخليص جمركي.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

يفتح على http://localhost:5173 — يتصل بالـ API عبر proxy.

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**تسجيل الدخول الافتراضي:** `admin` / `admin123`

## API

- `GET /api/health` — فحص الخدمة
- `POST /api/auth/login` — تسجيل الدخول
- `GET /api/reports/lookups` — عملات، معابر، أنواع بضائع

### المراكز
- `GET/POST /api/centers`
- `GET /api/centers/:id/balance`
- `GET /api/centers/:id/statement`

### السيارات (دورة الحياة)
1. `POST /api/shipments` — تسجيل معلقة
2. `PATCH /api/shipments/:id/fields` — تحديث الأقلام
3. `POST /api/shipments/:id/post` — ترحيل لليوميات
4. `PATCH /api/shipments/:id/deliver` — تسليم للتاجر

### حركات
- `POST /api/transactions/payment` — دفعة (قيد-و)
- `POST /api/transactions/offset` — مقاصة

### حاسبة (معاينة قبل الحفظ)
- `POST /api/calculations/shipment-total` — مجموع تخليص سيارة
- `POST /api/calculations/broker-margin` — هامش مخلص/تاجر
- `POST /api/calculations/flour-line` — سطر بيع طحين
- `POST /api/calculations/juice` — مربح طازج
- `POST /api/calculations/daily-profit` — مربح يومي
- `POST /api/calculations/currency` — تحويل لـ USD

## النشر على Railway

يُنشر التطبيق كـ**خدمة واحدة**: الباك‑إند يقدّم واجهة React المبنية + الـAPI من نفس
الأصل (`/api` نسبي، بلا CORS). البناء عبر `Dockerfile` في جذر المستودع.

### الخطوات
1. ارفع المشروع على GitHub.
2. في Railway: **New Project → Deploy from GitHub repo** واختر المستودع.
   يكتشف Railway ملف `Dockerfile` تلقائياً.
3. **أضف Volume** (Variables/Settings → Volumes) واربطه بالمسار `/data`
   — ضروري كي لا تُمحى قاعدة SQLite مع كل نشر.
4. **اضبط متغيّرات البيئة** (Variables):
   - `NODE_ENV=production`
   - `DB_PATH=/data/hamoud.db`  ← داخل الـVolume
   - `JWT_SECRET=<مفتاح عشوائي طويل>`  ← **إلزامي**، وإلا يتوقف الإقلاع
   - `ADMIN_PASSWORD=<كلمة مرور المدير الأولى>`  ← اختياري (الافتراضي `admin123`)
   - لا تضبط `PORT` — يحقنه Railway تلقائياً.
5. انشر. الفحص الصحي على `/api/health`. عند أول إقلاع تُنشأ القاعدة وتُزرع
   البيانات الأساسية وحساب المدير تلقائياً.

> ملاحظة: تقارير PDF تعتمد Chromium (puppeteer)، وصورة Docker تتضمّن مكتباته
> ويُشغَّل بـ `--no-sandbox`. لذلك الصورة أكبر قليلاً وبناؤها الأول أبطأ.

## المنطق المحاسبي

```
balance = Σ(out) − Σ(in)  WHERE is_delivered=1
grand_total = balance + posted_undelivered
```

## Scripts

- `npm run migrate` — تشغيل migrations
- `npm run seed` — بيانات أولية
- `npm run dev` — تشغيل مع nodemon
- `npm test` — اختبارات محرك الحسابات (Vitest)

## محرك الحسابات

المنطق المالي في `backend/src/engine/` مع اختبارات في `backend/tests/`:

- تخليص سيارات (ترسيم + ضريبة 2% + أقلام)
- هامش مخلص/تاجر
- طازج، طحين، مربح يومي
- تحويل عملات ورصيد الذمم

مرجع Excel: `docs/business-logic-from-excel.md`

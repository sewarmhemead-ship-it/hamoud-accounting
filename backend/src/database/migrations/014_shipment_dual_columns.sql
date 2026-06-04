-- الكشف المزدوج: ما ندفعه للمخلص (cost_*) مقابل ما نأخذه من التاجر (price_*)
-- الأعمدة القديمة (tarseem, workers...) تبقى للتوافق مع الكود الموجود.

-- ما ندفعه للمخلص
ALTER TABLE shipments ADD COLUMN cost_tarseem        REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_turkish_driver REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_clearance_fee  REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_workers        REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_service_fee    REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_door_receipt   REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN cost_other          REAL DEFAULT 0;

-- ما نأخذه من التاجر
ALTER TABLE shipments ADD COLUMN price_tarseem       REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_syrian_driver REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_clearance_fee REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_workers       REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_service_fee   REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_door_receipt  REAL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN price_other         REAL DEFAULT 0;

-- ربط القيدين الناتجين عن الترحيل
ALTER TABLE shipments ADD COLUMN trader_transaction_id    INTEGER REFERENCES transactions(id);
ALTER TABLE shipments ADD COLUMN clearance_transaction_id INTEGER REFERENCES transactions(id);

/**
 * نسخ احتياطي تلقائي — ملف Excel ثابت + اختياري نسخ قاعدة SQLite.
 *
 * تجريبي (trial): ملف واحد يُستبدل محلياً في hamoud-accounting/backups/ — مناسب للتجربة.
 * إنتاج (production): انسخ hamoud_accounting_backup.xlsx و hamoud_accounting_backup.db
 *   إلى تخزين خارج الجهاز (S3، NAS، OneDrive) بعد كل نسخة ناجحة؛ لا تعتمد على القرص المحلي فقط.
 */
const fs = require('fs')
const path = require('path')
const { getDatabase } = require('../config/database')
const { DB_PATH } = require('../config/env')
const SettingsModel = require('../models/SettingsModel')
const SettingsService = require('./SettingsService')
const AccountingService = require('./AccountingService')
const CenterModel = require('../models/CenterModel')
const { fullBackupWorkbook } = require('./reports/fullBackupWorkbook')
const logger = require('../utils/logger')

const XLSX_NAME = 'hamoud_accounting_backup.xlsx'
const DB_BACKUP_NAME = 'hamoud_accounting_backup.db'
const SECRET_SETTING_PREFIXES = ['secret', 'password', 'token', 'jwt']

/** مجلد backups بجانب backend (من DB_PATH: backend/data → hamoud-accounting/backups) */
function resolveBackupsDir() {
  const dbResolved = path.resolve(DB_PATH)
  const backendDir = path.dirname(path.dirname(dbResolved))
  const projectRoot =
    path.basename(backendDir) === 'backend' ? path.dirname(backendDir) : backendDir
  const dir = path.join(projectRoot, 'backups')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function resolveDbPath() {
  return path.resolve(DB_PATH)
}

function isSecretSettingKey(key) {
  const lower = String(key).toLowerCase()
  return SECRET_SETTING_PREFIXES.some((p) => lower.includes(p))
}

class BackupService {
  getPaths() {
    const dir = resolveBackupsDir()
    return {
      dir,
      xlsx: path.join(dir, XLSX_NAME),
      db: path.join(dir, DB_BACKUP_NAME),
    }
  }

  collectBackupData() {
    const db = getDatabase()
    const settings = SettingsService.get()
    const company = settings.company_name_ar || 'حمود'

    const { rows: centerRows } = CenterModel.findAll({
      orderBy: 'code ASC',
      limit: 1_000_000,
      offset: 0,
    })
    const centers = centerRows.map((c) => ({
      ...c,
      statement: AccountingService.getCenterFullStatement(c.id),
    }))

    const transactions = db
      .prepare(
        `SELECT t.*, c.name AS center_name
         FROM transactions t
         LEFT JOIN centers c ON c.id = t.center_id
         WHERE t.is_deleted = 0
         ORDER BY t.date DESC, t.id DESC`
      )
      .all()

    const shipments = db
      .prepare(
        `SELECT s.*,
                tc.name AS trader_name,
                bc.name AS broker_name
         FROM shipments s
         LEFT JOIN centers tc ON tc.id = s.center_id
         LEFT JOIN centers bc ON bc.id = s.clearance_center_id
         WHERE s.is_deleted = 0
         ORDER BY s.entry_date DESC, s.id DESC`
      )
      .all()

    const daily_profit = db
      .prepare(
        `SELECT * FROM daily_profit WHERE is_deleted = 0 ORDER BY date DESC`
      )
      .all()

    const inventory_snapshots = db
      .prepare(
        `SELECT i.*, c.code AS center_code, c.name AS center_name
         FROM inventory_snapshots i
         LEFT JOIN centers c ON c.id = i.center_id
         WHERE i.is_deleted = 0
         ORDER BY i.snapshot_date DESC, i.id DESC`
      )
      .all()

    const juice_shipments = db
      .prepare(
        `SELECT j.*, c.name AS center_name
         FROM juice_shipments j
         LEFT JOIN centers c ON c.id = j.center_id
         WHERE j.is_deleted = 0
         ORDER BY j.date DESC, j.id DESC`
      )
      .all()

    const users = db
      .prepare(
        `SELECT id, username, name, role, permissions, is_deleted, created_at, updated_at
         FROM users`
      )
      .all()
      .map((u) => ({
        ...u,
        permissions: (() => {
          try {
            return JSON.parse(u.permissions || '[]')
          } catch {
            return []
          }
        })(),
      }))

    const stored = SettingsModel.getAll()
    const settingsPairs = Object.entries(stored).filter(([k]) => !isSecretSettingKey(k))

    return {
      company,
      generated_at: new Date().toISOString(),
      counts: {
        centers: centers.length,
        transactions: transactions.length,
        shipments: shipments.length,
        daily_profit: daily_profit.length,
        inventory_snapshots: inventory_snapshots.length,
        juice_shipments: juice_shipments.length,
        users: users.length,
        settings: settingsPairs.length,
      },
      centers,
      transactions,
      shipments,
      daily_profit,
      inventory_snapshots,
      juice_shipments,
      users,
      settings: settingsPairs,
    }
  }

  getStatus() {
    const settings = SettingsService.get()
    const meta = SettingsModel.getAll()
    const paths = this.getPaths()
    let xlsx_size = null
    let db_size = null
    if (fs.existsSync(paths.xlsx)) {
      xlsx_size = fs.statSync(paths.xlsx).size
    }
    if (fs.existsSync(paths.db)) {
      db_size = fs.statSync(paths.db).size
    }
    return {
      enabled: !!settings.backup_auto_enabled,
      interval_hours: settings.backup_interval_hours,
      include_db: !!settings.backup_include_db,
      last_at: meta.backup_last_at || null,
      last_error: meta.backup_last_error || null,
      last_xlsx_bytes: meta.backup_last_xlsx_bytes ?? null,
      paths: {
        dir: paths.dir,
        xlsx: paths.xlsx,
        db: paths.db,
      },
      xlsx_exists: fs.existsSync(paths.xlsx),
      xlsx_size,
      db_exists: fs.existsSync(paths.db),
      db_size,
    }
  }

  _persistMeta(pairs, userId) {
    SettingsModel.setMany(pairs, userId)
    SettingsService.invalidate()
  }

  _writeAudit(userId, reason, payload) {
    try {
      const db = getDatabase()
      db.prepare(
        `INSERT INTO audit_log (user_id, action, entity, entity_id, payload, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(userId ?? null, 'backup', 'system', null, JSON.stringify({ reason, ...payload }), null)
    } catch {
      // لا نوقف النسخ عند فشل السجل
    }
  }

  async runBackup({ userId = null, reason = 'manual' } = {}) {
    const paths = this.getPaths()
    const settings = SettingsService.get()
    const tmpXlsx = path.join(paths.dir, `.${XLSX_NAME}.tmp`)

    try {
      const data = this.collectBackupData()
      const wb = fullBackupWorkbook(data)
      await wb.xlsx.writeFile(tmpXlsx)
      fs.renameSync(tmpXlsx, paths.xlsx)
      const xlsxBytes = fs.statSync(paths.xlsx).size

      if (settings.backup_include_db) {
        const db = getDatabase()
        db.pragma('wal_checkpoint(TRUNCATE)')
        fs.copyFileSync(resolveDbPath(), paths.db)
      }

      const at = new Date().toISOString()
      this._persistMeta(
        {
          backup_last_at: at,
          backup_last_error: null,
          backup_last_xlsx_bytes: xlsxBytes,
        },
        userId
      )

      logger.info('Backup completed', { reason, xlsxBytes, userId })
      this._writeAudit(userId, reason, { xlsx_bytes: xlsxBytes, at })

      return { ok: true, at, xlsx_bytes: xlsxBytes }
    } catch (err) {
      if (fs.existsSync(tmpXlsx)) {
        try {
          fs.unlinkSync(tmpXlsx)
        } catch {
          /* ignore */
        }
      }
      const message = err?.message || String(err)
      this._persistMeta({ backup_last_error: message }, userId)
      logger.error('Backup failed', { reason, error: message, userId })
      throw err
    }
  }
}

module.exports = new BackupService()

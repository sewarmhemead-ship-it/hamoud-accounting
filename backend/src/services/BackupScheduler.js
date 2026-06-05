const SettingsService = require('./SettingsService')
const SettingsModel = require('../models/SettingsModel')
const logger = require('../utils/logger')

const POLL_MS = 60_000
let intervalId = null
let running = false

async function tick() {
  if (running) return
  running = true
  try {
    const settings = SettingsService.get()
    if (!settings.backup_auto_enabled) return

    const meta = SettingsModel.getAll()
    const lastAt = meta.backup_last_at ? new Date(meta.backup_last_at).getTime() : 0
    const intervalMs = (settings.backup_interval_hours || 0.5) * 3_600_000

    if (Date.now() - lastAt < intervalMs) return

    const BackupService = require('./BackupService')
    await BackupService.runBackup({ userId: null, reason: 'auto' })
  } catch (err) {
    logger.error('BackupScheduler tick failed', { error: err?.message || String(err) })
  } finally {
    running = false
  }
}

function start() {
  if (intervalId) return
  tick()
  intervalId = setInterval(tick, POLL_MS)
  logger.info('BackupScheduler started', { poll_ms: POLL_MS })
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function reschedule() {
  tick()
}

module.exports = { start, stop, reschedule, tick, POLL_MS }

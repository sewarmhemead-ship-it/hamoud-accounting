const BaseModel = require('./BaseModel')

class CenterModel extends BaseModel {
  constructor() {
    super('centers', {
      type: 'type',
      currency: 'currency',
      code: 'code',
    })
  }

  findByCode(code) {
    return this.db
      .prepare('SELECT * FROM centers WHERE code = ? AND is_deleted = 0')
      .get(code)
  }

  findByType(type) {
    return this.db
      .prepare(
        'SELECT * FROM centers WHERE type = ? AND is_deleted = 0 ORDER BY code ASC'
      )
      .all(type)
  }

  topTraderBalances(limit = 5) {
    return this.db
      .prepare(
        `SELECT
           c.id, c.name, c.code,
           COALESCE(SUM(CASE WHEN t.type='out' THEN t.amount_usd ELSE 0 END),0) AS total_out,
           COALESCE(SUM(CASE WHEN t.type='in'  THEN t.amount_usd ELSE 0 END),0) AS total_in,
           COALESCE(SUM(CASE WHEN t.type='out' THEN t.amount_usd ELSE 0 END),0) -
           COALESCE(SUM(CASE WHEN t.type='in'  THEN t.amount_usd ELSE 0 END),0) AS balance
         FROM centers c
         LEFT JOIN transactions t
           ON t.center_id = c.id AND t.is_deleted = 0 AND t.is_delivered = 1
         WHERE c.is_deleted = 0 AND c.type = 'trader'
         GROUP BY c.id
         HAVING balance > 0
         ORDER BY balance DESC
         LIMIT ?`
      )
      .all(limit)
  }

  getNextCode() {
    const row = this.db
      .prepare(
        `SELECT MAX(CAST(code AS INTEGER)) as max_code FROM centers WHERE code GLOB '[0-9]*'`
      )
      .get()
    const next = (row?.max_code || 100) + 1
    return String(next)
  }
}

module.exports = new CenterModel()

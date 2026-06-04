const BaseModel = require('./BaseModel')

class DailyProfitModel extends BaseModel {
  constructor() {
    super('daily_profit')
  }

  findByDate(date) {
    return this.db
      .prepare('SELECT * FROM daily_profit WHERE date = ? AND is_deleted = 0')
      .get(date)
  }

  listDays(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return this.db
      .prepare(
        `SELECT date, num_trucks, gross_profit, office_expenses, home_expenses, net_profit
         FROM daily_profit
         WHERE date LIKE ? AND is_deleted = 0
         ORDER BY date ASC`
      )
      .all(`${prefix}%`)
  }

  sumMonthly(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return this.db
      .prepare(
        `
      SELECT
        COUNT(*) AS days_count,
        COALESCE(SUM(gross_profit), 0) AS gross_profit,
        COALESCE(SUM(office_expenses), 0) AS office_expenses,
        COALESCE(SUM(home_expenses), 0) AS home_expenses,
        COALESCE(SUM(net_profit), 0) AS net_profit,
        COALESCE(SUM(num_trucks), 0) AS num_trucks
      FROM daily_profit
      WHERE date LIKE ? AND is_deleted = 0
    `
      )
      .get(`${prefix}%`)
  }
}

module.exports = new DailyProfitModel()

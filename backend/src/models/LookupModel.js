const { getDatabase } = require('../config/database')

class LookupModel {
  get db() {
    return getDatabase()
  }

  getCurrencies() {
    return this.db
      .prepare('SELECT * FROM currencies WHERE is_active = 1 ORDER BY code')
      .all()
  }

  getBorders() {
    return this.db
      .prepare('SELECT * FROM borders WHERE is_active = 1 ORDER BY name')
      .all()
  }

  getGoodsTypes() {
    return this.db
      .prepare('SELECT * FROM goods_types WHERE is_active = 1 ORDER BY name')
      .all()
  }

  getSources() {
    return this.db
      .prepare('SELECT * FROM sources WHERE is_active = 1 ORDER BY name')
      .all()
  }

  getDestinations() {
    return this.db
      .prepare('SELECT * FROM destinations WHERE is_active = 1 ORDER BY name')
      .all()
  }
}

module.exports = new LookupModel()

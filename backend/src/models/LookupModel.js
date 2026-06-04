const { getDatabase } = require('../config/database')

class LookupModel {
  constructor() {
    this.db = getDatabase()
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
}

module.exports = new LookupModel()

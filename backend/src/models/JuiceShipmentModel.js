const BaseModel = require('./BaseModel')

class JuiceShipmentModel extends BaseModel {
  constructor() {
    super('juice_shipments', {
      center_id: 'center_id',
    })
  }

  findByCenter(centerId, { limit = 50, offset = 0 } = {}) {
    return this.findAll({
      filters: { center_id: centerId },
      orderBy: 'date DESC',
      limit,
      offset,
    })
  }
}

module.exports = new JuiceShipmentModel()

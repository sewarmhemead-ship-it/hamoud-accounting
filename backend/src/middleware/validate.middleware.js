const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body)
    next()
  } catch (err) {
    next(err)
  }
}

const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query)
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { validate, validateQuery }

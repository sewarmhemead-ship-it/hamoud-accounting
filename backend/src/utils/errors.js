class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message)
    this.status = status
    this.code = code
    this.isOperational = true
  }
}

class NotFoundError extends AppError {
  constructor(msg = 'السجل غير موجود') {
    super(msg, 404, 'NOT_FOUND')
  }
}

class ValidationError extends AppError {
  constructor(msg) {
    super(msg, 422, 'VALIDATION_ERROR')
  }
}

class BusinessRuleError extends AppError {
  constructor(msg) {
    super(msg, 409, 'BUSINESS_RULE')
  }
}

class UnauthorizedError extends AppError {
  constructor(msg = 'غير مصرح') {
    super(msg, 401, 'UNAUTHORIZED')
  }
}

class ForbiddenError extends AppError {
  constructor(msg = 'ممنوع') {
    super(msg, 403, 'FORBIDDEN')
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  BusinessRuleError,
  UnauthorizedError,
  ForbiddenError,
}

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const UserModel = require('../models/UserModel')
const { UnauthorizedError } = require('../utils/errors')
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env')
const { buildWelcomeSession } = require('../utils/welcomeSession')

class AuthService {
  async login(username, password) {
    const user = UserModel.findByUsername(username)
    if (!user) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }

    let valid = false
    try {
      valid = await bcrypt.compare(password, user.password_hash || '')
    } catch {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
    if (!valid) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }

    const { ALL_PERMS } = require('../config/permissions')
    const permissions = user.role === 'admin'
      ? ALL_PERMS
      : JSON.parse(user.permissions || '[]')

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    const userPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions,
    }

    return {
      token,
      user: userPayload,
      welcome: buildWelcomeSession(userPayload),
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch {
      throw new UnauthorizedError('توكن غير صالح أو منتهي')
    }
  }
}

module.exports = new AuthService()

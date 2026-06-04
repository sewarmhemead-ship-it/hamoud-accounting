const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const UserModel = require('../models/UserModel')
const { UnauthorizedError } = require('../utils/errors')
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env')

class AuthService {
  async login(username, password) {
    const user = UserModel.findByUsername(username)
    if (!user) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      throw new UnauthorizedError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
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

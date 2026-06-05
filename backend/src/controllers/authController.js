const AuthService = require('../services/AuthService')
const { buildWelcomeSession } = require('../utils/welcomeSession')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const authController = {
  login: asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body.username, req.body.password)
    res.json(apiResponse.success(result, 'تم تسجيل الدخول'))
  }),

  me: asyncHandler(async (req, res) => {
    res.json(
      apiResponse.success({
        ...req.user,
        welcome: buildWelcomeSession(req.user),
      })
    )
  }),
}

module.exports = authController

const AssistantService = require('../services/AssistantService')
const apiResponse = require('../utils/apiResponse')
const asyncHandler = require('../utils/asyncHandler')

const assistantController = {
  ask: asyncHandler(async (req, res) => {
    const { question } = req.body || {}
    const data = AssistantService.ask(req.user, question)
    res.json(apiResponse.success(data))
  }),

  hints: asyncHandler(async (req, res) => {
    res.json(
      apiResponse.success({
        examples: [
          'شو المربح اليوم؟',
          'شو صار بتاريخ 2026-06-05؟',
          'مربح شهر 2026-06',
          'ذمة تاجر 101',
        ],
      })
    )
  }),
}

module.exports = assistantController

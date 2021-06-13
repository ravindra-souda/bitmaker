'use strict'

const mongoose = require('mongoose')
const connect = require('./connect')

module.exports = async (req, res, model, mandatoryName) => {
  let messages = []
  if (!req.body._id && !req.body.code) {
    messages.push('Submitted JSON must contain an _id or a code key')
  }

  if (req.body._id && req.body.code) {
    messages.push(
      'Submitted JSON must contain an _id or a code key, but not both of them'
    )
  }

  if (req.body._id && req.body._id !== req.params.key) {
    messages.push(
      `_id provided in the submitted JSON (${req.body._id}) and _id found in URL (${req.params.key}) must match`
    )
  }

  if (req.body.code && req.body.code !== req.params.key) {
    messages.push(
      `code provided in the submitted JSON (${req.body.code}) and code found in URL (${req.params.key}) must match`
    )
  }

  if (req.body._id && !mongoose.isValidObjectId(req.params.key)) {
    messages.push(`Provided _id is invalid: ${req.params.key}`)
  }

  if (mandatoryName && !req.body.name) {
    messages.push('Submitted JSON must contain a name key')
  }

  if (messages.length > 0) {
    res.status(400).json({
      error: 'Submitted JSON validation failed',
      messages,
    })
    return null
  }

  if (!(await connect(res))) {
    return null
  }

  const keyName = req.body._id ? '_id' : 'code'
  const checkFilter = Object.fromEntries([[keyName, req.params.key]])

  const checkedModel = await model.findOne(checkFilter).exec()
  if (!checkedModel) {
    res.status(404).json({
      error: `No band recorded with the provided ${keyName}: ${req.params.key}`,
    })
    return null
  }

  if (mandatoryName && checkedModel.name !== req.body.name) {
    res.status(400).json({
      error: `Band recorded with the provided ${keyName} has not been recorded with this name`,
      band: checkedModel,
    })
    return null
  }
  return checkedModel
}

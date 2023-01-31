'use strict'

const mongoose = require('mongoose')
const connect = require('./connect')
const t = require('./translate')

module.exports = async (req, res, model, mandatoryKey) => {
  let messages = []
  if (!req.body._id && !req.body.code) {
    messages.push(res.translations.json.errors.validation.keyNotFound)
  }

  if (req.body._id && req.body.code) {
    messages.push(res.translations.json.errors.validation.bothKeys)
  }

  if (req.body._id && req.body._id !== req.params.key) {
    messages.push(
      t(res.translations, 'json.errors.validation.idMismatch', {
        jsonId: req.body._id,
        urlKey: req.params.key,
      })
    )
  }

  if (req.body.code && req.body.code !== req.params.key) {
    messages.push(
      t(res.translations, 'json.errors.validation.codeMismatch', {
        jsonCode: req.body.code,
        urlKey: req.params.key,
      })
    )
  }

  if (req.body._id && !mongoose.isValidObjectId(req.params.key)) {
    messages.push(
      t(res.translations, 'json.errors.validation.invalidId', {
        invalidId: req.params.key,
      })
    )
  }

  if (mandatoryKey && !req.body[mandatoryKey]) {
    messages.push(
      t(res.translations, 'json.errors.validation.mandatoryKey', {
        mandatoryKey,
      })
    )
  }

  if (messages.length > 0) {
    res.status(400).json({
      error: res.translations.json.errors.validation.failed,
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
      error: t(res.translations, 'json.errors.validation.modelNotFound', {
        modelName: model.modelName.toLowerCase(),
        keyName,
        keyValue: req.params.key,
      }),
    })
    return null
  }

  if (mandatoryKey && checkedModel[mandatoryKey] !== req.body[mandatoryKey]) {
    res.status(400).json({
      error: t(
        res.translations,
        'json.errors.validation.mandatoryKeyMismatch',
        {
          modelName: model.modelName,
          keyName,
          keyValue: req.params.key,
          mandatoryKey,
        }
      ),
      [model.modelName.toLowerCase()]: checkedModel,
    })
    return null
  }
  return checkedModel
}

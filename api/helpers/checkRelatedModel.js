'use strict'

const mongoose = require('mongoose')

module.exports = async (key, res, relatedModel, relatedModelId) => {
  const checkedRelatedModel = await relatedModel.findById(relatedModelId)

  if (key) {
    let filter = mongoose.isValidObjectId(key) ? { _id: key } : { code: key }
    const providedModel = await relatedModel.findOne(filter).exec()
    if (!providedModel) {
      res.status(404).json({
        error: `No ${relatedModel.modelName.toLowerCase()} recorded with the provided _id or code: ${key}`,
      })
      return null
    }

    if (!checkedRelatedModel._id.equals(providedModel._id)) {
      res.status(404).json({
        error: `${
          relatedModel.modelName
        } found with the provided key ${key} and related ${relatedModel.modelName.toLowerCase()} are mismatching`,
        ['related' + relatedModel.modelName]: checkedRelatedModel,
        ['provided' + relatedModel.modelName]: providedModel,
      })
      return null
    }
  }

  return checkedRelatedModel
}

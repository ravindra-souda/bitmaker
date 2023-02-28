import mongoose from 'mongoose'
import t from './translate.mjs'

export default async (key, res, relatedModel, relatedModelId) => {
  const checkedRelatedModel = await relatedModel.findById(relatedModelId)

  if (key) {
    let filter = mongoose.isValidObjectId(key) ? { _id: key } : { code: key }
    const providedModel = await relatedModel.findOne(filter).exec()
    if (!providedModel) {
      res.status(404).json({
        error: t(
          res.translations,
          'json.errors.validation.relatedModelNotFound',
          {
            relatedModelName: relatedModel.modelName.toLowerCase(),
            key,
          }
        ),
      })
      return null
    }

    if (!checkedRelatedModel._id.equals(providedModel._id)) {
      res.status(404).json({
        error: t(
          res.translations,
          'json.errors.validation.relatedModelMismatch',
          {
            relatedModelName: relatedModel.modelName,
            key,
            relatedModelNameLowerCase: relatedModel.modelName.toLowerCase(),
          }
        ),
        ['related' + relatedModel.modelName]: checkedRelatedModel,
        ['provided' + relatedModel.modelName]: providedModel,
      })
      return null
    }
  }

  return checkedRelatedModel
}

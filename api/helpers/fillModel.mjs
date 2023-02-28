export default (req, res, model, modelToFill) => {
  // exclude _id and code from the fields to update
  const submittedFields = Object.keys(req.body).filter(
    (field) => !['_id', 'code'].includes(field)
  )

  const invalidFields = submittedFields.filter(
    (field) => !model.getFields().includes(field)
  )

  if (invalidFields.length) {
    res.status(400).json({
      error: res.translations.json.errors.invalidFields,
      invalidFields: invalidFields,
      expectedFields: model.getFields(),
    })
    return null
  }

  // set the values to the model
  submittedFields.forEach((field) => (modelToFill[field] = req.body[field]))

  return modelToFill
}

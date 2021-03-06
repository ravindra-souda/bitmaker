const mongoose = require('mongoose')
const SchemaArray = require('mongoose').SchemaTypes.Array
const SchemaNumber = require('mongoose').SchemaTypes.Number
const SchemaString = require('mongoose').SchemaTypes.String
const buildFiltersOptions = require('./buildFiltersOptions')
const escapeStringRegexp = require('escape-string-regexp')

module.exports = async (req, res, model, relatedModelOptions = {}) => {
  const reservedParameters = ['limit', 'skip', 'sort']
  const invalidFilters = Object.keys(req.query).filter(
    (field) => !model.getFilters().concat(reservedParameters).includes(field)
  )

  if (invalidFilters.length) {
    res.status(400).json({
      error: 'Invalid filters found on URL',
      invalidFilters: invalidFilters,
      expectedFilters: model.getFilters(),
    })
    return { filters: null }
  }

  // default parameters, (default sort field is the first one defined in the model)
  let {
    limit = process.env.MONGODB_LIMIT_RESULTS,
    skip = 0,
    sort = model.getSortables()[0],
    ...filters
  } = req.query

  // invalid values for number fields
  const numericRegex = /^-?\d+(?:\.\d+)?$/
  const invalidNumericFilters = Object.entries(filters).filter(
    ([field, value]) =>
      model.schema.path(field) instanceof SchemaNumber &&
      !model.getRangeFilters().includes(field) &&
      !numericRegex.test(value)
  )
  if (invalidNumericFilters.length) {
    res.status(400).json({
      error: 'Invalid numeric values',
      invalidNumericFilters: Object.fromEntries(invalidNumericFilters),
    })
    return { filters: null }
  }

  // invalid values for range fields
  const rangeRegex = /^(\d+(?:\.{1}\d+)?)-(\d+(?:\.{1}\d+)?)$/
  const isInvalidRangeFilter = ([field, value]) => {
    if (!model.getRangeFilters().includes(field)) {
      return false
    }
    // passthrough for single values
    if (numericRegex.test(value)) {
      return false
    }
    let matches = rangeRegex.exec(value)
    if (matches === null || parseInt(matches[1]) > parseInt(matches[2])) {
      return true
    }
    return false
  }
  const invalidRangeFilters = Object.entries(filters).filter(
    isInvalidRangeFilter
  )
  if (invalidRangeFilters.length) {
    res.status(400).json({
      error: 'Invalid range values',
      invalidRangeFilters: Object.fromEntries(invalidRangeFilters),
    })
    return { filters: null }
  }

  // case insensitive search on string fields (eg. /api/bands?name=aSi will get you Oasis)
  model
    .getFilters()
    .filter((filter) => Object.keys(filters).includes(filter)) // only apply this rule if the user provided string filters
    .filter((filter) => model.schema.path(filter) instanceof SchemaString)
    .forEach((stringTypeProp) => {
      filters[stringTypeProp] = new RegExp(
        escapeStringRegexp(filters[stringTypeProp]),
        'i'
      )
    })

  // $in filter for comma separated values on array fields (eg. /api/bands?tags=rock,electro will get you Blur and Daft Punk)
  model
    .getFilters()
    .filter((filter) => model.schema.path(filter) instanceof SchemaArray)
    .filter((arrayTypeProp) => typeof filters[arrayTypeProp] !== 'undefined')
    .forEach((arrayTypeProp) => {
      let values = filters[arrayTypeProp].split(',')
      filters[arrayTypeProp] = { $in: values }
    })

  // $gte, $lte filter for range fields
  model
    .getRangeFilters()
    .filter((filter) => Object.keys(filters).includes(filter))
    .forEach((rangeTypeProp) => {
      let value = filters[rangeTypeProp]
      // single value range (eg. /api/songs?rating=8)
      if (value.indexOf('-') < 1) {
        filters[rangeTypeProp] = { $gte: value, $lt: parseInt(value) + 1 }
        return
      }
      let [min, max] = value.split('-')
      filters[rangeTypeProp] = { $gte: min, $lte: max }
    })

  // filtering by relatedModel
  const { relatedModel, relatedModelKey } = relatedModelOptions
  if (relatedModelKey) {
    let relatedModelFilter = mongoose.isValidObjectId(relatedModelKey)
      ? { _id: relatedModelKey }
      : { code: relatedModelKey }
    const foundRelatedModel = await relatedModel
      .findOne(relatedModelFilter)
      .exec()
    if (!foundRelatedModel) {
      res.status(404).json({
        error: `No ${relatedModel.modelName} recorded with the provided _id or code: ${relatedModelKey}`,
      })
      return { filters: null }
    }

    filters[relatedModel.modelName.toLowerCase()] = foundRelatedModel
  }

  // GET request with a key (_id or code)
  if (req.params.key) {
    let keyFilters = [{ code: req.params.key }]
    if (mongoose.isValidObjectId(req.params.key)) {
      keyFilters.push({ _id: req.params.key })
    }
    return {
      filters: { $or: keyFilters, $and: [filters] },
      options: { limit: 1 },
    }
  }

  return {
    filters: filters,
    options: buildFiltersOptions(limit, skip, sort, res, model),
  }
}

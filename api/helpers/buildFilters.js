'use strict'

const mongoose = require('mongoose')
const SchemaArray = require('mongoose').SchemaTypes.Array
const SchemaDate = require('mongoose').SchemaTypes.Date
const SchemaNumber = require('mongoose').SchemaTypes.Number
const SchemaString = require('mongoose').SchemaTypes.String
const buildFiltersOptions = require('./buildFiltersOptions')
const escapeStringRegexp = require('escape-string-regexp')
const t = require('./translate')

module.exports = async (req, res, model, relatedModelOptions = {}) => {
  const reservedParameters = ['limit', 'skip', 'sort']
  const invalidFilters = Object.keys(req.query).filter(
    (field) => !model.getFilters().concat(reservedParameters).includes(field)
  )

  if (invalidFilters.length) {
    res.status(400).json({
      error: res.translations.json.errors.filters.invalidFilters,
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
      error: res.translations.json.errors.filters.invalidNumericValues,
      invalidNumericFilters: Object.fromEntries(invalidNumericFilters),
    })
    return { filters: null }
  }

  // invalid values for date fields (with leap years validation)
  const invalidDateFilters = Object.entries(filters).filter(
    ([field, value]) =>
      model.schema.path(field) instanceof SchemaDate &&
      (new Date(value).toString() === 'Invalid Date' ||
        new Date(value).toISOString().slice(0, 10) !== value)
  )
  if (invalidDateFilters.length) {
    res.status(400).json({
      error: res.translations.json.errors.filters.invalidDateValues,
      invalidDateFilters: Object.fromEntries(invalidDateFilters),
    })
    return { filters: null }
  }

  // invalid values for enum fields
  const invalidEnumFilters = Object.entries(filters)
    .filter(
      ([field, value]) =>
        Object.keys(model.getEnumFilters()).includes(field) &&
        !model.getEnumFilters()[field].includes(value)
    )
    .flatMap(([field, value]) => [
      {
        field,
        providedEnumValue: value,
        expectedEnumValues: model.getEnumFilters()[field],
      },
    ])
  if (invalidEnumFilters.length) {
    res.status(400).json({
      error: res.translations.json.errors.filters.invalidEnumValues,
      invalidEnumFilters: invalidEnumFilters,
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
      error: res.translations.json.errors.filters.invalidRangeValues,
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
        error: t(
          res.translations,
          'json.errors.validation.relatedModelNotFound',
          {
            relatedModelName: relatedModel.modelName.toLowerCase(),
            key: relatedModelKey,
          }
        ),
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

'use strict'

const mongoose = require('mongoose')
const SchemaArray = require('mongoose').SchemaTypes.Array
const SchemaNumber = require('mongoose').SchemaTypes.Number
const SchemaString = require('mongoose').SchemaTypes.String
const buildFiltersOptions = require('./buildFiltersOptions')
const escapeStringRegexp = require('escape-string-regexp')

module.exports = (req, res, model) => {
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
  const invalidNumericFilters = Object.entries(filters).filter(
    ([field, value]) =>
      model.schema.path(field) instanceof SchemaNumber &&
      !/^-?\d+(?:\.\d+)?$/.test(value)
  )
  if (invalidNumericFilters.length) {
    res.status(400).json({
      error: 'Invalid numeric values',
      invalidNumericFilters: Object.fromEntries(invalidNumericFilters),
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

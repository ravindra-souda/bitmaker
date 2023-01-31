'use strict'

const t = require('./translate')

module.exports = (limit, skip, sort, res, model) => {
  let messages = []
  const regex = /^[0-9]+$/
  if (!regex.test(limit) || limit > process.env.MONGODB_LIMIT_RESULTS) {
    messages.push(
      t(res.translations, 'json.errors.filters.pagination.limit', {
        apiLimit: process.env.MONGODB_LIMIT_RESULTS,
        limit,
      })
    )
  }
  if (!regex.test(skip)) {
    messages.push(
      t(res.translations, 'json.errors.filters.pagination.skip', { skip })
    )
  }

  if (messages.length) {
    res.status(400).json({
      error: res.translations.json.errors.filters.pagination.invalidValues,
      messages: messages,
    })
    return null
  }

  // eg. /api/bands?sort=-formationYear,name will sort bands by formationYear desc then by name
  // and the options passed to mongoose will be { sort: { formationYear: -1, name: 1 } }
  const sortFields = new Map()
  sort.split(',').forEach((field) => {
    if (field.charAt(0) === '-') {
      return sortFields.set(field.slice(1), -1)
    }
    return sortFields.set(field, 1)
  })

  const invalidSortables = Array.from(sortFields.keys()).filter(
    (field) => !model.getSortables().includes(field)
  )

  if (invalidSortables.length) {
    res.status(400).json({
      error: res.translations.json.errors.filters.sort,
      invalidSortables: invalidSortables,
      expectedSortables: model.getSortables(),
    })
    return null
  }

  return { limit: parseInt(limit), skip: parseInt(skip), sort: sortFields }
}

'use strict'

const Band = require('./models/Band')
const jsonQuery = require('json-query')
const connect = require('./helpers/connect')

exports.post = async (req, res) => {
  if (!(await connect(res))) {
    return
  }

  const invalidFields = Object.keys(req.body).filter(
    (field) => !Band.getFields().includes(field)
  )

  if (invalidFields.length) {
    res.status(400).json({
      error: 'Invalid fields found in JSON',
      invalidFields: invalidFields,
      expectedFields: Band.getFields(),
    })
    return
  }

  const userBand = new Band({
    name: req.body.name,
    formationYear: req.body.formationYear,
    bio: req.body.bio,
    tags: req.body.tags,
  })

  const existingBand = await Band.findOne({ name: req.body.name }).exec()
  if (existingBand !== null) {
    res.status(400).json({
      error: 'A band with the same name had already been recorded',
      band: existingBand,
    })
    return
  }

  userBand.save((err, doc) => {
    if (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(400).json({
        error: 'Submitted band validation failed',
        messages: errMessages.value,
      })
      return
    }
    res.status(201).json(doc)
  })
}

'use strict'

const Band = require('./models/Band')
const jsonQuery = require('json-query')
const connect = require('./helpers/connect')
const mongoose = require('mongoose')

module.exports = {
  post: async (req, res) => {
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
  },

  delete: async (req, res) => {
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

    if (!req.body.name) {
      messages.push('Submitted JSON must contain a name key')
    }

    if (messages.length > 0) {
      res.status(400).json({
        error: 'Submitted JSON validation failed',
        messages: messages,
      })
      return
    }

    if (!(await connect(res))) {
      return
    }

    const { name: bandName, ...deleteFilter } = req.body
    const keyName = Object.keys(deleteFilter)[0]

    const existingBand = await Band.findOne(deleteFilter).exec()
    if (!existingBand) {
      res.status(404).json({
        error: `No band recorded with the provided ${keyName}: ${req.params.key}`,
      })
      return
    }

    if (existingBand.name !== bandName) {
      res.status(400).json({
        error: `Band recorded with the provided ${keyName} has not been recorded with this name`,
        band: existingBand,
      })
      return
    }

    await Band.deleteOne(deleteFilter, (err, query) => {
      if (err || query.deletedCount === 0) {
        res.status(500).json({
          error: 'Band deletion failed',
        })
        return
      }
      res.status(200).json({
        success: `Band deleted properly`,
        deleted: existingBand,
      })
    })
  },
}

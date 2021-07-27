'use strict'

const Band = require('./models/Band')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
const connect = require('./helpers/connect')
const checkModel = require('./helpers/checkModel')
const fillModel = require('./helpers/fillModel')

module.exports = {
  get: async (req, res) => {
    if (!(await connect(res))) {
      return
    }
    const { filters, options } = buildFilters(req, res, Band)

    if (!filters || !options) {
      return
    }

    Band.find(filters, null, options, (err, docs) => {
      if (err) {
        res.status(500).json({
          error: 'Internal mongoDB error',
        })
        return
      }
      if (docs.length === 0) {
        res.status(404).json({
          error: 'No band found with the given filters',
          filters: filters,
        })
        return
      }
      res.status(200).json(docs)
    })
  },

  post: async (req, res) => {
    if (!(await connect(res))) {
      return
    }

    // create a new Band with the values from the submitted JSON
    const userBand = fillModel(req, res, Band, new Band())

    if (!userBand) {
      return
    }

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

  patch: async (req, res) => {
    let bandToUpdate = await checkModel(req, res, Band)

    if (!bandToUpdate) {
      return
    }

    const originalBand = JSON.parse(JSON.stringify(bandToUpdate))

    // update the Band with the values from the submitted JSON
    bandToUpdate = fillModel(req, res, Band, bandToUpdate)

    if (!bandToUpdate) {
      return
    }

    await bandToUpdate.save((err, doc) => {
      if (err) {
        let errMessages = jsonQuery('errors[**].message', { data: err })
        res.status(400).json({
          error: 'Submitted band validation failed',
          messages: errMessages.value,
        })
        return
      }
      res.status(200).json({
        updatedBand: doc,
        originalBand: originalBand,
      })
    })
  },

  delete: async (req, res) => {
    const bandToDelete = await checkModel(req, res, Band, 'name')

    if (!bandToDelete) {
      return
    }

    await bandToDelete.remove((err, doc) => {
      if (err) {
        res.status(500).json({
          error: 'Band deletion failed',
        })
        return
      }
      res.status(200).json({
        success: `Band deleted properly`,
        deleted: doc,
      })
    })
  },
}

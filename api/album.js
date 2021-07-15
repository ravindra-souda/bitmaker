'use strict'

const { Album } = require('./models/Album')
const Band = require('./models/Band')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
const connect = require('./helpers/connect')
const fillModel = require('./helpers/fillModel')

module.exports = {
  post: async (req, res) => {
    if (!(await connect(res))) {
      return
    }

    const { filters, options } = buildFilters(req, res, Band)

    if (!filters || !options) {
      return
    }

    const relatedBand = await Band.findOne(filters).exec()
    if (relatedBand === null) {
      res.status(404).json({
        error: 'No band found with the given filters',
        filters: filters,
      })
      return
    }

    // create a new Album with the values from the submitted JSON
    const userAlbum = fillModel(req, res, Album, new Album())

    if (!userAlbum) {
      return
    }

    // save the new Album in the collection
    userAlbum.set({ band: relatedBand._id })

    let savedAlbum
    try {
      savedAlbum = await userAlbum.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(400).json({
        error: 'Submitted album validation failed',
        messages: errMessages.value,
      })
      return
    }

    // update the related Band with the newly created Album
    relatedBand.albums.push(userAlbum._id)
    await relatedBand.save((err) => {
      if (err) {
        let errMessages = jsonQuery('errors[**].message', { data: err })
        res.status(500).json({
          error: 'Could not update the related band',
          messages: errMessages.value,
        })
        savedAlbum.remove()
        return
      }
      // populate the related band (translate the band's object id to the actual document)
      savedAlbum.populate('band', (err, doc) => {
        res.status(201).json(doc)
      })
    })
  },
}

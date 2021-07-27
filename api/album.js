'use strict'

const { Album } = require('./models/Album')
const Band = require('./models/Band')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
const connect = require('./helpers/connect')
const checkModel = require('./helpers/checkModel')
const fillModel = require('./helpers/fillModel')
const mongoose = require('mongoose')

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

  delete: async (req, res) => {
    const albumToDelete = await checkModel(req, res, Album, 'title')

    if (!albumToDelete) {
      return
    }

    const relatedBand = await Band.findById(albumToDelete.band)

    // additionnal checks if a band is provided
    if (req.params.bandKey) {
      let filter = mongoose.isValidObjectId(req.params.bandKey)
        ? { _id: req.params.bandKey }
        : { code: req.params.bandKey }
      const providedBand = await Band.findOne(filter).exec()
      if (!providedBand) {
        res.status(404).json({
          error: `No band recorded with the provided _id or code: ${req.params.bandKey}`,
        })
        return
      }

      if (!relatedBand._id.equals(providedBand._id)) {
        res.status(404).json({
          error: `Band found with the provided key ${req.params.bandKey} and the album's related band are mismatching`,
          relatedBand: relatedBand,
          providedBand: providedBand,
        })
        return
      }
    }

    await albumToDelete.remove((err, doc) => {
      if (err) {
        res.status(500).json({
          error: 'Album deletion failed',
        })
        return
      }

      // removes the deleted album reference from the band
      relatedBand.albums.pull(doc._id)
      relatedBand.save()

      // populate the related band (translate the band's object id to the actual document)
      doc.populate('band', (err, doc) => {
        res.status(200).json({
          success: `Album deleted properly`,
          deleted: doc,
        })
      })
    })
  },
}

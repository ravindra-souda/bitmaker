'use strict'

const { Album } = require('./models/Album')
const Band = require('./models/Band')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
const connect = require('./helpers/connect')
const checkModel = require('./helpers/checkModel')
const checkRelatedModel = require('./helpers/checkRelatedModel')
const fillModel = require('./helpers/fillModel')

module.exports = {
  get: async (req, res) => {
    if (!(await connect(res))) {
      return
    }
    const { filters, options } = await buildFilters(req, res, Album, {
      relatedModel: Band,
      relatedModelKey: req.params.bandKey,
    })

    if (!filters || !options) {
      return
    }

    // convert releaseYear filter to releaseDate
    if (filters.releaseYear) {
      let minReleaseYear = new Date(Date.UTC(1900))
      let releaseYear = new Date(Date.UTC(filters.releaseYear))
      if (isNaN(releaseYear.getTime()) || minReleaseYear > releaseYear) {
        res.status(400).json({
          error: 'releaseYear must be an integer greater than 1900',
        })
        return
      }
      filters.releaseDate = {
        $gte: releaseYear,
        $lt: new Date(Date.UTC(releaseYear.getFullYear() + 1)),
      }
      delete filters.releaseYear
    }

    Album.find(filters, null, options, (err, docs) => {
      if (err) {
        res.status(500).json({
          error: 'Internal mongoDB error',
        })
        return
      }
      if (docs.length === 0) {
        res.status(404).json({
          error: 'No album found with the given filters',
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

    const { filters, options } = await buildFilters(req, res, Band)

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

  patch: async (req, res) => {
    let albumToUpdate = await checkModel(req, res, Album)

    if (!albumToUpdate) {
      return
    }

    // additionnal checks if a band is provided
    const relatedBand = await checkRelatedModel(
      req.params.bandKey,
      res,
      Band,
      albumToUpdate.band
    )

    if (!relatedBand) {
      return
    }

    const originalAlbum = JSON.parse(JSON.stringify(albumToUpdate))

    // update the Album with the values from the submitted JSON
    albumToUpdate = fillModel(req, res, Album, albumToUpdate)

    if (!albumToUpdate) {
      return
    }

    await albumToUpdate.save((err, updatedAlbum) => {
      if (err) {
        let errMessages = jsonQuery('errors[**].message', { data: err })
        res.status(400).json({
          error: 'Submitted album validation failed',
          messages: errMessages.value,
        })
        return
      }
      // populate the related band (translate the band's object id to the actual document)
      updatedAlbum.populate('band', (err, doc) => {
        res.status(200).json({
          updatedAlbum: doc,
          originalAlbum: originalAlbum,
        })
      })
    })
  },

  delete: async (req, res) => {
    const albumToDelete = await checkModel(req, res, Album, 'title')

    if (!albumToDelete) {
      return
    }

    // additionnal checks if a band is provided
    const relatedBand = await checkRelatedModel(
      req.params.bandKey,
      res,
      Band,
      albumToDelete.band
    )

    if (!relatedBand) {
      return
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

import { Album } from './models/Album.mjs'
import Band from './models/Band.mjs'
import jsonQuery from 'json-query'
import buildFilters from './helpers/buildFilters.mjs'
import connect from './helpers/connect.mjs'
import checkModel from './helpers/checkModel.mjs'
import checkRelatedModel from './helpers/checkRelatedModel.mjs'
import fillModel from './helpers/fillModel.mjs'
import t from './helpers/translate.mjs'

export default {
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
          error: res.translations.album.errors.props.releaseYear,
        })
        return
      }
      filters.releaseDate = {
        $gte: releaseYear,
        $lt: new Date(Date.UTC(releaseYear.getFullYear() + 1)),
      }
      delete filters.releaseYear
    }

    let foundAlbums
    try {
      foundAlbums = await Album.find(filters, null, options)
    } catch (err) {
      res.status(500).json({
        error: res.translations.app.errors.mongoDb,
      })
      return
    }

    if (foundAlbums.length === 0) {
      res.status(404).json({
        error: res.translations.album.errors.notFound,
        filters,
      })
      return
    }
    res.status(200).json(foundAlbums)
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
        error: res.translations.band.errors.notFound,
        filters,
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
        error: res.translations.album.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }

    // update the related Band with the newly created Album
    relatedBand.albums.push(userAlbum._id)
    try {
      await relatedBand.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(500).json({
        error: res.translations.album.errors.updateBand,
        messages: errMessages.value,
      })
      savedAlbum.remove()
      return
    }

    // populate the related band (translate the band's object id to the actual document)
    const returnedAlbum = await savedAlbum.populate('band')
    res.status(201).json(returnedAlbum)
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

    let updatedAlbum
    try {
      updatedAlbum = await albumToUpdate.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(400).json({
        error: res.translations.album.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }

    // populate the related band (translate the band's object id to the actual document)
    const returnedAlbum = await updatedAlbum.populate('band')
    res.status(200).json({
      updatedAlbum: returnedAlbum,
      originalAlbum,
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

    let deletedAlbum
    try {
      deletedAlbum = await albumToDelete.deleteOne()
    } catch (err) {
      res.status(500).json({
        error: res.translations.album.errors.delete,
      })
      return
    }

    // removes the deleted album reference from the band
    relatedBand.albums.pull(deletedAlbum._id)
    relatedBand.save()

    // populate the related band (translate the band's object id to the actual document)
    const returnedAlbum = await deletedAlbum.populate('band')
    res.status(200).json({
      success: res.translations.album.success.delete,
      deleted: returnedAlbum,
    })
  },
}

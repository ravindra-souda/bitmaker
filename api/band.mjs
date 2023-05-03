import Band from './models/Band.mjs'
import jsonQuery from 'json-query'
import buildFilters from './helpers/buildFilters.mjs'
import connect from './helpers/connect.mjs'
import checkModel from './helpers/checkModel.mjs'
import fillModel from './helpers/fillModel.mjs'
import t from './helpers/translate.mjs'

export default {
  get: async (req, res) => {
    if (!(await connect(res))) {
      return
    }
    const { filters, options } = await buildFilters(req, res, Band)

    if (!filters || !options) {
      return
    }

    let foundBands
    try {
      foundBands = await Band.find(filters, null, options)
    } catch (err) {
      res.status(500).json({
        error: res.translations.app.errors.mongoDb,
      })
      return
    }

    if (foundBands.length === 0) {
      res.status(404).json({
        error: res.translations.band.errors.notFound,
        filters,
      })
      return
    }
    res.status(200).json(foundBands)
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
        error: res.translations.band.errors.creationSameName,
        band: existingBand,
      })
      return
    }

    let savedBand
    try {
      savedBand = await userBand.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(400).json({
        error: res.translations.band.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }
    res.status(201).json(savedBand)
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

    let updatedBand
    try {
      updatedBand = await bandToUpdate.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(400).json({
        error: res.translations.band.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }
    res.status(200).json({
      updatedBand,
      originalBand,
    })
  },

  delete: async (req, res) => {
    const bandToDelete = await checkModel(req, res, Band, 'name')

    if (!bandToDelete) {
      return
    }

    if (!req.body.cascadeDeleteAlbums && bandToDelete.albums.length) {
      res.status(409).json({
        error: res.translations.band.errors.cascadeDelete,
        message: res.translations.band.errors.cascadeDeleteHint,
        linkedAlbums: bandToDelete.albums,
      })
      return
    }

    let deletedBand
    try {
      deletedBand = await bandToDelete.deleteOne()
    } catch (err) {
      res.status(500).json({
        error: res.translations.band.errors.delete,
      })
      return
    }
    res.status(200).json({
      success: res.translations.band.success.delete,
      deleted: deletedBand,
    })
  },
}

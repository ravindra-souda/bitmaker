import { Album } from './models/Album.mjs'
import Band from './models/Band.mjs'
import Song from './models/Song.mjs'
import jsonQuery from 'json-query'
import buildFilters from './helpers/buildFilters.mjs'
import checkModel from './helpers/checkModel.mjs'
import checkRelatedModel from './helpers/checkRelatedModel.mjs'
import connect from './helpers/connect.mjs'
import fillModel from './helpers/fillModel.mjs'
import t from './helpers/translate.mjs'

export default {
  get: async (req, res) => {
    if (!(await connect(res))) {
      return
    }
    const { filters, options } = await buildFilters(req, res, Song, {
      relatedModel: Album,
      relatedModelKey: req.params.albumKey,
    })

    if (!filters || !options) {
      return
    }

    if (filters.duration) {
      if (!/^\d$/.test(filters.duration)) {
        res.status(400).json({
          error: res.translations.song.errors.duration,
        })
        return
      }
      let durationInSec = parseInt(filters.duration) * 60
      filters.duration = {
        $gte: durationInSec,
        $lt: durationInSec + 60,
      }
    }

    if (filters.rating) {
      let [min, max] = Object.values(filters.rating)
      if (min < 0 || max > 10) {
        res.status(400).json({
          error: res.translations.song.errors.rating,
        })
        return
      }
    }

    // additional checks if a band is provided
    let relatedAlbum = filters.$and?.at(0).album
    if (
      relatedAlbum?.band &&
      !(await checkRelatedModel(
        req.params.bandKey,
        res,
        Band,
        relatedAlbum.band
      ))
    ) {
      return
    }

    let foundSongs
    try {
      foundSongs = await Song.find(filters, null, options)
    } catch (err) {
      res.status(500).json({
        error: res.translations.app.errors.mongoDb,
      })
      return
    }

    if (foundSongs.length === 0) {
      res.status(404).json({
        error: res.translations.song.errors.notFound,
        filters,
      })
      return
    }
    res.status(200).json(foundSongs)
  },

  post: async (req, res) => {
    if (!(await connect(res))) {
      return
    }

    const { filters, options } = await buildFilters(req, res, Album)

    if (!filters || !options) {
      return
    }

    const relatedAlbum = await Album.findOne(filters).exec()

    if (relatedAlbum === null) {
      res.status(404).json({
        error: res.translations.album.errors.notFound,
        filters: filters,
      })
      return
    }

    // create a new Song with the values from the submitted JSON
    const userSong = fillModel(req, res, Song, new Song())

    if (!userSong) {
      return
    }

    // save the new Song in the collection
    userSong.set({ album: relatedAlbum._id })

    let savedSong
    try {
      savedSong = await userSong.save()
    } catch (err) {
      if (err.duplicateSongPosition) {
        err.error = t(res.translations, err.error)
        res.status(400).json(err)
        return
      }
      // errors for duration and position fields stored in the reason key
      let errMessages = jsonQuery('errors[**].reason', { data: err })
      if (typeof errMessages[0] !== 'string') {
        errMessages = jsonQuery('errors[**].message', { data: err })
      }
      res.status(400).json({
        error: res.translations.song.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }

    // update the related Album with the newly created Song
    relatedAlbum.songs.push(userSong._id)
    try {
      await relatedAlbum.save()
    } catch (err) {
      let errMessages = jsonQuery('errors[**].message', { data: err })
      res.status(500).json({
        error: res.translations.song.errors.updateAlbum,
        messages: errMessages.value,
      })
      savedSong.deleteOne()
      return
    }

    // populate the related album (translate the album's object id to the actual document)
    const returnedSong = await savedSong.populate('album')
    res.status(201).json(returnedSong)
  },

  patch: async (req, res) => {
    let songToUpdate = await checkModel(req, res, Song)

    if (!songToUpdate) {
      return
    }

    // additionnal checks if an album is provided
    const relatedAlbum = await checkRelatedModel(
      req.params.albumKey,
      res,
      Album,
      songToUpdate.album
    )

    if (!relatedAlbum) {
      return
    }

    // more checks if a band is provided
    if (
      req.params.bandKey &&
      !(await checkRelatedModel(
        req.params.bandKey,
        res,
        Band,
        songToUpdate.album.band
      ))
    ) {
      return
    }

    const originalSong = JSON.parse(JSON.stringify(songToUpdate))

    // update the Song with the values from the submitted JSON
    songToUpdate = fillModel(req, res, Song, songToUpdate)

    if (!songToUpdate) {
      return
    }

    let updatedSong
    try {
      updatedSong = await songToUpdate.save()
    } catch (err) {
      if (err.duplicateSongPosition) {
        res.status(400).json({
          error: res.translations.song.errors.props.position.taken,
          duplicateSongPosition: err.duplicateSongPosition,
        })
        return
      }
      // errors for duration and position fields stored in the reason key
      let errMessages = jsonQuery('errors[**].reason', { data: err })
      if (typeof errMessages[0] !== 'string') {
        errMessages = jsonQuery('errors[**].message', { data: err })
      }
      res.status(400).json({
        error: res.translations.song.errors.validation,
        messages: t(res.translations, errMessages),
      })
      return
    }

    // populate the related album (translate the album's object id to the actual document)
    const returnedSong = await updatedSong.populate('album')
    res.status(200).json({
      updatedSong: returnedSong,
      originalSong,
    })
  },

  delete: async (req, res) => {
    const songToDelete = await checkModel(req, res, Song, 'title')

    if (!songToDelete) {
      return
    }

    // additionnal checks if an album is provided
    const relatedAlbum = await checkRelatedModel(
      req.params.albumKey,
      res,
      Album,
      songToDelete.album
    )

    if (!relatedAlbum) {
      return
    }

    // more checks if a band is provided
    if (
      req.params.bandKey &&
      !(await checkRelatedModel(
        req.params.bandKey,
        res,
        Band,
        songToDelete.album.band
      ))
    ) {
      return
    }

    let deletedSong
    try {
      deletedSong = await songToDelete.deleteOne()
    } catch (err) {
      res.status(500).json({
        error: res.translations.song.errors.delete,
      })
      return
    }

    // removes the deleted song reference from the album
    relatedAlbum.songs.pull(deletedSong._id)
    relatedAlbum.save()

    // populate the related album (translate the album's object id to the actual document)
    const returnedSong = await deletedSong.populate('album')
    res.status(200).json({
      success: res.translations.song.success.delete,
      deleted: returnedSong,
    })
  },
}

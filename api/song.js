'use strict'

const { Album } = require('./models/Album')
const Band = require('./models/Band')
const Song = require('./models/Song')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
const checkModel = require('./helpers/checkModel')
const checkRelatedModel = require('./helpers/checkRelatedModel')
const connect = require('./helpers/connect')
const fillModel = require('./helpers/fillModel')

module.exports = {
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
        error: 'No album found with the given filters',
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
        res.status(400).json(err)
        return
      }
      // errors for duration and position fields stored in the reason key
      let errMessages = jsonQuery('errors[**].reason', { data: err }).value
      if (typeof errMessages[0] !== 'string') {
        errMessages = jsonQuery('errors[**].message', { data: err }).value
      }
      res.status(400).json({
        error: 'Submitted song validation failed',
        messages: errMessages,
      })
      return
    }

    // update the related Album with the newly created Song
    relatedAlbum.songs.push(userSong._id)
    await relatedAlbum.save((err) => {
      if (err) {
        let errMessages = jsonQuery('errors[**].message', { data: err })
        res.status(500).json({
          error: 'Could not update the related album',
          messages: errMessages.value,
        })
        savedSong.remove()
        return
      }
      // populate the related album (translate the album's object id to the actual document)
      savedSong.populate('album', (err, doc) => {
        res.status(201).json(doc)
      })
    })
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
        res.status(400).json(err)
        return
      }
      // errors for duration and position fields stored in the reason key
      let errMessages = jsonQuery('errors[**].reason', { data: err }).value
      if (typeof errMessages[0] !== 'string') {
        errMessages = jsonQuery('errors[**].message', { data: err }).value
      }
      res.status(400).json({
        error: 'Submitted song validation failed',
        messages: errMessages,
      })
      return
    }

    // populate the related album (translate the album's object id to the actual document)
    updatedSong.populate('album', (err, doc) => {
      res.status(200).json({
        updatedSong: doc,
        originalSong,
      })
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

    await songToDelete.remove((err, doc) => {
      if (err) {
        res.status(500).json({
          error: 'Song deletion failed',
        })
        return
      }

      // removes the deleted song reference from the album
      relatedAlbum.songs.pull(doc._id)
      relatedAlbum.save()

      // populate the related album (translate the album's object id to the actual document)
      doc.populate('album', (err, doc) => {
        res.status(200).json({
          success: `Song deleted properly`,
          deleted: doc,
        })
      })
    })
  },
}

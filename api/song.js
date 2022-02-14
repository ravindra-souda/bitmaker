'use strict'

const { Album } = require('./models/Album')
const Song = require('./models/Song')
const jsonQuery = require('json-query')
const buildFilters = require('./helpers/buildFilters')
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
}

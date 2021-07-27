'use strict'

const express = require('express')
const router = express.Router()
const albumController = require('../api/album')
const bandController = require('../api/band')

router.get('/bands/:key', (req, res) => {
  bandController.get(req, res)
})
router.get('/bands', (req, res) => {
  bandController.get(req, res)
})
router.post('/bands', (req, res) => {
  bandController.post(req, res)
})
router.patch('/bands/:key', (req, res) => {
  bandController.patch(req, res)
})
router.delete('/bands/:key', (req, res) => {
  bandController.delete(req, res)
})

router.post('/bands/:key/albums', (req, res) => {
  albumController.post(req, res)
})
router.delete('/albums/:key', (req, res) => {
  albumController.delete(req, res)
})
router.delete('/bands/:bandKey/albums/:key', (req, res) => {
  albumController.delete(req, res)
})

module.exports = router

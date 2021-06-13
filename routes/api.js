'use strict'

const express = require('express')
const router = express.Router()
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

module.exports = router

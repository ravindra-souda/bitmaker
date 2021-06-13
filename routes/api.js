'use strict'

const express = require('express')
const router = express.Router()
const bandController = require('../api/band')

router.post('/bands', (req, res) => {
  bandController.post(req, res)
})
router.delete('/bands/:key', (req, res) => {
  bandController.delete(req, res)
})

module.exports = router

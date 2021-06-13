'use strict'

const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')

const router = require('./routes/api')
const {
  checkHeaders,
  checkJson,
  trimJson,
} = require('./api/middleware/checkRequest')

const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
dotenv.config({ path: envFile })

const app = express()

app.disable('x-powered-by')

app.use(logger('dev'))
app.use(checkHeaders)
app.use(express.json({ verify: checkJson }))
app.use(trimJson)
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/api', router)

module.exports = app

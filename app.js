const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')

const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
dotenv.config({ path: envFile })

const indexRouter = require('./routes/index')
const apiRouter = require('./routes/api')
const {
  checkHeaders,
  checkJson,
  trimJson,
} = require('./api/middleware/checkRequest')
const { t } = require('./api/middleware/getTranslations')

const app = express()

app.disable('x-powered-by')

app.use(logger('dev'))
app.use(checkHeaders)
app.use(express.json({ verify: checkJson }))
app.use(trimJson)
app.use(t)
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/api', apiRouter)

module.exports = app

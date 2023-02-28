import express from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import dotenv from 'dotenv'

import router from './routes/api.mjs'
import {
  checkHeaders,
  checkJson,
  trimJson,
} from './api/middleware/checkRequest.mjs'
import initTranslations from './api/middleware/initTranslations.mjs'

const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'
dotenv.config({ path: envFile })

const app = express()

app.disable('x-powered-by')

app.use(logger('dev'))
app.use(checkHeaders)
app.use(express.json({ verify: checkJson }))
app.use(trimJson)
app.use(initTranslations)
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/api', router)

export default app

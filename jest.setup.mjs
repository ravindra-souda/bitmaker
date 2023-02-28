import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

import { Album } from './api/models/Album.mjs'
import Band from './api/models/Band.mjs'
import Song from './api/models/Song.mjs'
import connect from './api/helpers/connect.mjs'

export default async () => {
  if (!(await connect())) {
    return
  }
  await Band.deleteMany({}, (err) => {
    if (err) console.log(err)
  })
  await Album.deleteMany({}, (err) => {
    if (err) console.log(err)
  })
  await Song.deleteMany({}, (err) => {
    if (err) console.log(err)
  })
}

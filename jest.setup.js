const dotenv = require('dotenv')

dotenv.config({ path: '.env.test' })

const { Album } = require('./api/models/Album')
const Band = require('./api/models/Band')
const Song = require('./api/models/Song')
const connect = require('./api/helpers/connect')

module.exports = async () => {
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

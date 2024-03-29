import mongoose from 'mongoose'
import autopopulate from 'mongoose-autopopulate'
import slugify from '../helpers/slugify.mjs'

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'song.errors.props.title'],
      trim: true,
    },
    code: {
      type: String,
    },
    position: {
      type: Number,
      required: [true, 'song.errors.props.position.required'],
      // setter as a validator (called before type Number cast)
      set: (val) => {
        if (!Number.isInteger(val) || val < 1) {
          throw `Position must be a positive integer, ${val} is not valid`
        }
        return val
      },
    },
    duration: {
      type: Number,
      set: (val) => {
        if (!/^\d+:[0-5]\d$/.test(val)) {
          // proper way to invalidate in a setter
          throw `Duration must be in mm:ss format, ${val} is not valid`
        }
        let [min, sec] = val.split(':')
        return parseInt(min) * 60 + parseInt(sec)
      },
      get: (val) =>
        val === undefined
          ? null
          : Math.floor(val / 60)
              .toString()
              .padStart(2, '0') +
            ':' +
            (val % 60).toString().padStart(2, '0'),
    },
    singers: {
      type: String,
      trim: true,
    },
    lyrics: {
      type: String,
      trim: true,
      set: (val) => val.replace(/[ \t]{2,}/g, ''),
    },
    ratingSum: {
      type: Number,
      default: 0,
    },
    voters: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      get: (val) => val?.toFixed(2) ?? null,
    },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      autopopulate: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created',
      updatedAt: 'updated',
    },
    versionKey: 'version',
  }
)

songSchema.virtual('myRating').set(function (val) {
  if (![...Array(11).keys()].includes(val)) {
    this.invalidate('myRating', 'song.errors.props.myRating', val)
    return
  }
  this.ratingSum += val
  this.voters++
  this.rating = (this.ratingSum / this.voters).toFixed(2)
})

songSchema.statics.getFields = function () {
  return ['title', 'position', 'duration', 'singers', 'lyrics', 'myRating']
}
songSchema.statics.getFilters = function () {
  return ['title', 'duration', 'singers', 'rating']
}
songSchema.statics.getEnumFilters = function () {
  return {}
}
songSchema.statics.getRangeFilters = function () {
  return ['rating']
}
songSchema.statics.getSortables = function () {
  return ['title', 'position', 'duration', 'rating']
}

songSchema.post('validate', async function () {
  const duplicateSongPosition = await mongoose
    .model('Song')
    .findOne({ position: this.position, album: this.album })
  if (duplicateSongPosition && !duplicateSongPosition.equals(this)) {
    throw {
      error: 'song.errors.props.position.taken',
      duplicateSongPosition,
    }
  }
})
songSchema.pre('save', async function (next) {
  if (!this.code) {
    this.code = `${
      (await mongoose.model('Song').estimatedDocumentCount()) + 1
    }-${slugify(this.title)}`
  }
  next()
})

const removePrivateProps = (savedSong, song) => {
  delete song.ratingSum
  delete song.voters
  return song
}

// always shows getters and use a transform function to remove any private props in the returned documents
mongoose.set('toJSON', { getters: true, transform: removePrivateProps })

// needed for the recursion-free populate
songSchema.options.selectPopulatedPaths = false

songSchema.plugin(autopopulate)

export default mongoose.model('Song', songSchema)

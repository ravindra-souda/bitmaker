import mongoose from 'mongoose'
import autopopulate from 'mongoose-autopopulate'
import slugify from '../helpers/slugify.mjs'

const typeEnums = ['Compilation', 'EP', 'Live', 'Single', 'Studio']
const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'album.errors.props.title'],
      trim: true,
    },
    code: {
      type: String,
    },
    releaseDate: {
      type: Date,
      validate: {
        validator: (date) => !isNaN(Date.parse(date)),
        message: (date) =>
          `album.errors.props.releaseDate.invalid,,{"date":${date.value}}`,
      },
      min: [new Date('January 01, 1900'), 'album.errors.props.releaseDate.min'],
    },
    type: {
      type: String,
      enum: typeEnums,
    },
    tags: {
      type: [String],
      set: (tags) => [...new Set(tags.map((tag) => slugify(tag)))],
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
        // avoid recursion (Album document containing a songs array showing again our Album)
        autopopulate: {
          select: [
            'title',
            'code',
            'position',
            'duration',
            'singers',
            'lyrics',
            'ratingSum',
            'voters',
            'rating',
          ],
        },
      },
    ],
    band: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Band',
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

albumSchema.statics.getFields = function () {
  return ['title', 'releaseDate', 'type', 'tags']
}
albumSchema.statics.getFilters = function () {
  return ['title', 'releaseDate', 'releaseYear', 'type', 'tags']
}
albumSchema.statics.getEnumFilters = function () {
  return { type: typeEnums }
}
albumSchema.statics.getRangeFilters = function () {
  return []
}
albumSchema.statics.getSortables = function () {
  return ['title', 'releaseDate']
}

albumSchema.pre('save', async function (next) {
  if (!this.code) {
    this.code = `${
      (await mongoose.model('Album').estimatedDocumentCount()) + 1
    }-${slugify(this.title)}`
  }
  next()
})

// needed for the recursion-free populate
albumSchema.options.selectPopulatedPaths = false

albumSchema.plugin(autopopulate)

const Album = mongoose.model('Album', albumSchema)

export { Album, albumSchema }

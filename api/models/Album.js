'use strict'

const mongoose = require('mongoose')
const slugify = require('../helpers/slugify')

const typeEnums = ['Compilation', 'EP', 'Live', 'Single', 'Studio']
const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An album must have a title'],
      trim: true,
    },
    code: {
      type: String,
    },
    releaseDate: {
      type: Date,
      validate: {
        validator: (date) => !isNaN(Date.parse(date)),
        message: (date) => `${date.value} is not a valid date!`,
      },
      min: [
        new Date('January 01, 1900'),
        'releaseDate is before January 01, 1900',
      ],
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

albumSchema.plugin(require('mongoose-autopopulate'))

module.exports = {
  Album: mongoose.model('Album', albumSchema),
  albumSchema: albumSchema,
}

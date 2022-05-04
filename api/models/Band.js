'use strict'

const mongoose = require('mongoose')
const slugify = require('../helpers/slugify')
const { Album } = require('./Album')
const yearNow = new Date().getFullYear()

const bandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A band must have a name'],
      trim: true,
    },
    code: {
      type: String,
    },
    formationYear: {
      type: Number,
      validate: {
        validator: (year) => Number.isInteger(year),
        message: (year) => `${year.value} must be an integer!`,
      },
      min: [1900, 'Formation year must be after 1900'],
      max: [yearNow, 'Formation year must be before ' + yearNow],
    },
    bio: String,
    tags: {
      type: [String],
      set: (tags) => [...new Set(tags.map((tag) => slugify(tag)))],
    },
    albums: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album',
        // avoid recursion (Band document containing an album array showing again our Band)
        autopopulate: {
          select: ['title', 'code', 'releaseDate', 'type', 'tags', 'songs'],
        },
      },
    ],
  },
  {
    timestamps: {
      createdAt: 'created',
      updatedAt: 'updated',
    },
    versionKey: 'version',
  }
)

bandSchema.statics.getFields = function () {
  return ['name', 'formationYear', 'bio', 'tags']
}
bandSchema.statics.getFilters = function () {
  return ['name', 'formationYear', 'tags']
}
bandSchema.statics.getEnumFilters = function () {
  return {}
}
bandSchema.statics.getRangeFilters = function () {
  return []
}
bandSchema.statics.getSortables = function () {
  return ['name', 'formationYear']
}

bandSchema.pre('save', function (next) {
  this.code = slugify(this.name)
  next()
})
bandSchema.pre('remove', async function (next) {
  await Album.deleteMany({ band: this._id })
  next()
})

// needed for the recursion-free populate
bandSchema.options.selectPopulatedPaths = false

bandSchema.plugin(require('mongoose-autopopulate'))

module.exports = mongoose.model('Band', bandSchema)

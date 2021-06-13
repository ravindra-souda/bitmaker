'use strict'

const mongoose = require('mongoose')
const slugify = require('../helpers/slugify')
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

bandSchema.pre('save', function (next) {
  this.code = slugify(this.name)
  next()
})

module.exports = mongoose.model('Band', bandSchema)

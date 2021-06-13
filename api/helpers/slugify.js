'use strict'

const slugify = require('slugify')

module.exports = (str = '') => {
  return slugify(str, { lower: true })
}

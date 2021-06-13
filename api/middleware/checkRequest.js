'use strict'

module.exports = {
  checkHeaders: (req, res, next) => {
    if (req.is('application/json') === false) {
      res.status(400).json({
        error:
          "bitmaker API only accepts requests with 'Content-Type: application/json' headers",
      })
      return
    }
    next()
  },

  checkJson: (req, res, buf) => {
    if (req.method === 'GET' && buf.length === 0) {
      return
    }
    try {
      JSON.parse(buf)
    } catch {
      res.status(400).json({
        error: 'Invalid JSON submitted',
      })
      throw new SyntaxError('Invalid JSON submitted')
    }
  },

  trimJson: (req, res, next) => {
    let trimmedEntries = Object.entries(req.body).map((element) => {
      let [key, value] = element
      if (typeof value === 'string') {
        return [key, value.trim()]
      }
      if (value instanceof Array) {
        return [key, value.map((v) => v.trim())]
      }
      return [key, value]
    })
    req.body = Object.fromEntries(trimmedEntries)
    next()
  },
}

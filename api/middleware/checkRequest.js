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
    try {
      JSON.parse(buf)
    } catch {
      res.status(400).json({
        error: 'Invalid JSON submitted',
      })
      throw new SyntaxError('Invalid JSON submitted')
    }
  },
}

const { readFile } = require('fs')

module.exports = {
  t: (req, res, next) => {
    readFile('./api/lang/en.json', 'utf-8', (err, data) => {
      if (err) {
        res.status(500).json({
          error: 'Cannot load localization file',
        })
        return
      }
      req.app.locals.t = JSON.parse(data)
      //global.t = JSON.parse(data)
      next()
    })
  },
}

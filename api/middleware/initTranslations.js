const { readdir, readFile } = require('fs/promises')

module.exports = async (req, res, next) => {
  let availableLangs
  try {
    availableLangs = (await readdir('./api/lang')).map(file => file.replace('.json', ''))
  } catch (err) {
    res.status(500).json({
      error: 'Cannot read lang directory',
    })
    return
  }

  const lang = req.body.lang ?? req.query.lang ?? 'en'
  delete req.body.lang
  delete req.query.lang

  if (!availableLangs.includes(lang)) {
    res.status(400).json({
      error: 'lang not supported',
      availableLangs
    })
    return
  }

  // lang already loaded
  if (lang === req.app.locals.lang) {
    //console.log('lang already loaded')
    return next()
  }

  let translations
  try {
    translations = await readFile(`./api/lang/${lang}.json`, 'utf-8')
    req.app.locals.translations = JSON.parse(translations)
  } catch {
    res.status(500).json({
      error: 'Cannot load lang file',
    })
    return
  }
  req.app.locals.lang = lang
  next()
}

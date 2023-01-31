'use strict'

const { readdir, readFile } = require('fs/promises')

const initAvailableLangs = async (req, res) => {
  if (req.app.locals.availableLangs?.constructor === Array) {
    return true
  }
  try {
    req.app.locals.availableLangs = (await readdir('./api/lang')).map((file) =>
      file.replace('.json', '')
    )
  } catch (err) {
    res.status(500).json({
      error: 'Cannot read lang directory',
    })
    return false
  }
  return true
}

const initSelectedLang = async (req, res, lang) => {
  if (!req.app.locals.translations) {
    req.app.locals.translations = []
  }
  try {
    let translations = await readFile(`./api/lang/${lang}.json`, 'utf-8')
    req.app.locals.translations[lang] = JSON.parse(translations)
  } catch {
    res.status(500).json({
      error: 'Cannot load lang file',
    })
    return
  }
  res.translations = req.app.locals.translations[lang]
}

module.exports = async (req, res, next) => {
  if (!(await initAvailableLangs(req, res))) {
    return
  }

  const lang = req.body.lang ?? req.query.lang ?? 'en'
  delete req.body.lang
  delete req.query.lang

  if (!req.app.locals.availableLangs.includes(lang)) {
    res.status(400).json({
      error: 'lang not supported',
      availableLangs: req.app.locals.availableLangs,
    })
    return
  }

  // lang already loaded
  if (req.app.locals.translations?.[lang]?.constructor === Object) {
    res.translations = req.app.locals.translations[lang]
    return next()
  }

  await initSelectedLang(req, res, lang)
  next()
}

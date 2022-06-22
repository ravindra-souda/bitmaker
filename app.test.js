const mongoose = require('mongoose')
const request = require('supertest')
const { readFile } = require('fs/promises')
const app = require('./app')

describe('Main app', () => {
  test('throw error 400 on empty submitted body', async () => {
    const res = await request(app)
      .post('/api/bands')
      .set('Content-Type', 'application/json')
      .send(null)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid submitted JSON', async () => {
    const res = await request(app)
      .post('/api/bands')
      .set('Content-Type', 'application/json')
      .send('dummy')
    expect(res.statusCode).toEqual(400)
  })
  // TODO: implement test 'throw error 400 on missing Content-Type header'
  test.todo('throw error 400 on missing Content-Type header')
})

const langPayloads = {
  defaultLang: {
    name: '',
  },
  selectedLang: {
    name: '',
    lang: 'fr',
  },
  invalidNonSupportedLang: {
    name: 'Phoenix',
    lang: 'dummy',
  },
}

describe('Translations', () => {
  test('show correct translation on default lang', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(langPayloads.defaultLang)
    expect(res.statusCode).toEqual(400)
    expect(app.locals.lang).toEqual('en')
    let translationsFromFile = JSON.parse(await readFile(`./api/lang/en.json`, 'utf-8'))
    console.log(res.body, [app.locals.translations.band.errors.props.name, translationsFromFile.band.errors.props.name])
    expect(res.body.error).toEqual(app.locals.translations.band.errors.validation)
    expect(res.body.error).toEqual(translationsFromFile.band.errors.validation)
    expect(res.body.messages).toMatchObject([app.locals.translations.band.errors.props.name])
    expect(res.body.messages).toMatchObject([translationsFromFile.band.errors.props.name])
  })
  test('show correct translation on selected lang', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(langPayloads.selectedLang)
    expect(res.statusCode).toEqual(400)
    expect(app.locals.lang).toEqual('fr')
    let translationsFromFile = JSON.parse(await readFile(`./api/lang/fr.json`, 'utf-8'))
    console.log(res.body, [app.locals.translations.band.errors.props.name, translationsFromFile.band.errors.props.name])
    expect(res.body.error).toEqual(app.locals.translations.band.errors.validation)
    expect(res.body.error).toEqual(translationsFromFile.band.errors.validation)
    expect(res.body.messages).toMatchObject([app.locals.translations.band.errors.props.name])
    expect(res.body.messages).toMatchObject([translationsFromFile.band.errors.props.name])
  })
  test('throw error 500 on non supported lang', async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(langPayloads.invalidNonSupportedLang)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual('lang not supported')
    expect(res.body).toHaveProperty('availableLangs')
    res = await request(app)
      .get('/api/bands?name=phoenix&lang=dummy')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual('lang not supported')
    expect(res.body).toHaveProperty('availableLangs')
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

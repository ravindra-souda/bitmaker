'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const { readFile } = require('fs/promises')
const app = require('./app')
const t = require('./api/helpers/translate')

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
  interpolation: {
    name: 'e',
    formationYear: 1998.3,
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
    let translationsFromFile = JSON.parse(
      await readFile(`./api/lang/en.json`, 'utf-8')
    )
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.error).toEqual(translationsFromFile.band.errors.validation)
    expect(res.body.messages).toMatchObject([
      app.locals.translations.en.band.errors.props.name,
    ])
    expect(res.body.messages).toMatchObject([
      translationsFromFile.band.errors.props.name,
    ])
  })
  test('show correct translation on selected lang', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(langPayloads.selectedLang)
    expect(res.statusCode).toEqual(400)
    let translationsFromFile = JSON.parse(
      await readFile(`./api/lang/fr.json`, 'utf-8')
    )
    expect(res.body.error).toEqual(
      app.locals.translations.fr.band.errors.validation
    )
    expect(res.body.error).toEqual(translationsFromFile.band.errors.validation)
    expect(res.body.messages).toMatchObject([
      app.locals.translations.fr.band.errors.props.name,
    ])
    expect(res.body.messages).toMatchObject([
      translationsFromFile.band.errors.props.name,
    ])
  })
  test('translations with string interpolation', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(langPayloads.interpolation)
    expect(res.statusCode).toEqual(400)
    let translationsFromFile = JSON.parse(
      await readFile(`./api/lang/fr.json`, 'utf-8')
    )
    expect(
      t(app.locals.translations.fr, 'band.errors.props.formationYear.invalid', {
        value: langPayloads.interpolation.formationYear,
      })
    ).toEqual(
      translationsFromFile.band.errors.props.formationYear.invalid.replace(
        '${value}',
        langPayloads.interpolation.formationYear
      )
    )
    expect(
      t(
        app.locals.translations.fr,
        'json.errors.validation.mandatoryKeyMismatch',
        {
          modelName: 'dummyModel',
          keyName: 'dummyKey',
          keyValue: 'dummyValue',
          mandatoryKey: 'dummyMandatory',
        }
      )
    ).toEqual(
      translationsFromFile.json.errors.validation.mandatoryKeyMismatch
        .replace('${modelName}', 'dummyModel')
        .replace('${keyName}', 'dummyKey')
        .replace('${keyValue}', 'dummyValue')
        .replace('${mandatoryKey}', 'dummyMandatory')
    )
  })
  test('throw error 400 on non supported lang', async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(langPayloads.invalidNonSupportedLang)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual('lang not supported')
    expect(res.body).toHaveProperty('availableLangs')
    res = await request(app).get('/api/bands?name=phoenix&lang=dummy')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual('lang not supported')
    expect(res.body).toHaveProperty('availableLangs')
  })
  test('translation library returns key on unknown key', async () => {
    await request(app).post('/api/bands').send(langPayloads.selectedLang)
    const unknownKey = 'band.errors.props.namez'
    expect(t(app.locals.translations.fr, unknownKey)).toEqual(unknownKey)
  })
  test.each([1, 'string', null, ['array']])(
    'translation library returns key on invalid values',
    async (value) => {
      expect(
        t(
          app.locals.translations.fr,
          'json.errors.filters.pagination.skip',
          value
        )
      ).toEqual('json.errors.filters.pagination.skip')
    }
  )
})

afterAll(async () => {
  await mongoose.connection.close()
})

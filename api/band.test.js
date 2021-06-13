'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const slugify = require('./helpers/slugify')
const app = require('../app')
const Band = require('./models/Band')
const connect = require('./helpers/connect')

const validCompleteBand = {
  name: ' Daft Punk ',
  formationYear: 1993,
  bio:
    'Daft Punk est un groupe de musique électronique français composé de Thomas Bangalter et Guy-Manuel de Homem-Christo.',
  tags: ['electro ', ' French Touch '],
}

const expectedCompleteBand = {
  ...validCompleteBand,
  name: 'Daft Punk',
  code: slugify(validCompleteBand.name),
  tags: ['electro', 'french-touch'],
}

const validMinimalBand = {
  name: 'Phoenix',
}

const expectedMinimalBand = {
  ...validMinimalBand,
  code: slugify(validMinimalBand.name),
}

const validDuplicateTagsBand = {
  name: 'Justice',
  tags: ['electro', 'french touch', 'Electro', ' french touch '],
}

const expectedDedupTagsBand = {
  name: 'Justice',
  tags: ['electro', 'french-touch'],
}

const invalidNameless = {
  formationYear: 1993,
  bio: 'Lorem ipsum',
}

const invalidEmptyName = {
  name: undefined,
  formationYear: 1993,
  bio: 'Lorem ipsum',
}

const invalidFormationYear = {
  name: 'The Prodigy',
  formationYear: 1990.9,
  bio: 'Lorem ipsum',
}

const invalidMinFormationYear = {
  name: 'Wolfgang Amadeus Mozart',
  formationYear: 1762,
  bio: 'Lorem ipsum',
}

const invalidMaxFormationYear = {
  name: 'Some terrific band from the future',
  formationYear: new Date().getFullYear() + 1,
  bio: 'Lorem ipsum',
}

const invalidUnknownField = {
  name: 'Fatboy Slim',
  formationYear: 1979,
  bio: 'Brighton Port Authority',
  tags: ['big beat', 'acid house'],
  dummy: false,
}

beforeAll(async () => {
  if (!(await connect())) {
    return
  }
  Band.deleteMany({}, (err) => {
    if (err) console.log(err)
  })
})

describe('POST /bands', () => {
  test('create a band with minimal information', async () => {
    const res = await request(app).post('/api/bands').send(validMinimalBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(expectedMinimalBand)
  })
  test('create a band with full information', async () => {
    const res = await request(app).post('/api/bands').send(validCompleteBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(expectedCompleteBand)
  })
  test('dedup tags on band creation', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(validDuplicateTagsBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(expectedDedupTagsBand)
  })
  test('throw error 400 on missing band name key', async () => {
    const res = await request(app).post('/api/bands').send(invalidNameless)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on empty band name', async () => {
    const res = await request(app).post('/api/bands').send(invalidEmptyName)
    expect(res.statusCode).toEqual(400)
  })
  // TODO: run this test right after 'create a band with minimal information'
  test('throw error 400 on duplicate band name', async () => {
    const res = await request(app).post('/api/bands').send(validMinimalBand)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid formationYear', async () => {
    const res = await request(app).post('/api/bands').send(invalidFormationYear)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on formationYear before 1900', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(invalidMinFormationYear)
    expect(res.statusCode).toEqual(400)
  })
  test(
    'throw error 400 on formationYear after ' + new Date().getFullYear(),
    async () => {
      const res = await request(app)
        .post('/api/bands')
        .send(invalidMaxFormationYear)
      expect(res.statusCode).toEqual(400)
    }
  )
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app).post('/api/bands').send(invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

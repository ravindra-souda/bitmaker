'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const slugify = require('./helpers/slugify')
const app = require('../app')
const Band = require('./models/Band')
const connect = require('./helpers/connect')

let postedBandId, postedBandCode
const postPayloads = {
  validCompleteBand: {
    name: ' Daft Punk ',
    formationYear: 1993,
    bio:
      'Daft Punk est un groupe de musique électronique français composé de Thomas Bangalter et Guy-Manuel de Homem-Christo.',
    tags: ['electro ', ' French Touch '],
  },
  validMinimalBand: {
    name: 'Phoenix',
  },
  validDuplicateTagsBand: {
    name: 'Justice',
    tags: ['electro', 'french touch', 'Electro', ' french touch '],
  },
  expectedDedupTagsBand: {
    name: 'Justice',
    tags: ['electro', 'french-touch'],
  },
  invalidNameless: {
    formationYear: 1993,
    bio: 'Lorem ipsum',
  },
  invalidEmptyName: {
    name: undefined,
    formationYear: 1993,
    bio: 'Lorem ipsum',
  },
  invalidFormationYear: {
    name: 'The Prodigy',
    formationYear: 1990.9,
    bio: 'Lorem ipsum',
  },
  invalidMinFormationYear: {
    name: 'Wolfgang Amadeus Mozart',
    formationYear: 1762,
    bio: 'Lorem ipsum',
  },
  invalidMaxFormationYear: {
    name: 'Some terrific band from the future',
    formationYear: new Date().getFullYear() + 1,
    bio: 'Lorem ipsum',
  },
  invalidUnknownField: {
    name: 'Fatboy Slim',
    formationYear: 1979,
    bio: 'Brighton Port Authority',
    tags: ['big beat', 'acid house'],
    dummy: false,
  },
  expectedCompleteBand: {},
  expectedMinimalBand: {},
}

postPayloads.expectedCompleteBand = {
  ...postPayloads.validCompleteBand,
  name: 'Daft Punk',
  code: slugify(postPayloads.validCompleteBand.name),
  tags: ['electro', 'french-touch'],
}

postPayloads.expectedMinimalBand = {
  ...postPayloads.validMinimalBand,
  code: slugify(postPayloads.validMinimalBand.name),
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
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validMinimalBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedMinimalBand)
  })
  test('create a band with full information', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validCompleteBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedCompleteBand)
  })
  test('dedup tags on band creation', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validDuplicateTagsBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedDedupTagsBand)
  })
  test('throw error 400 on missing band name key', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidNameless)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on empty band name', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidEmptyName)
    expect(res.statusCode).toEqual(400)
  })
  // TODO: run this test right after 'create a band with minimal information'
  test('throw error 400 on duplicate band name', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validMinimalBand)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid formationYear', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidFormationYear)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on formationYear before 1900', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidMinFormationYear)
    expect(res.statusCode).toEqual(400)
  })
  test(
    'throw error 400 on formationYear after ' + new Date().getFullYear(),
    async () => {
      const res = await request(app)
        .post('/api/bands')
        .send(postPayloads.invalidMaxFormationYear)
      expect(res.statusCode).toEqual(400)
    }
  )
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
  })
})

const deletePayloads = {
  validCompleteBand: {
    name: 'The Chemical Brothers',
    formationYear: 1992,
    bio:
      'Initialement appelé The Dust Brothers, le groupe Chemical Brothers est fondé par Tom Rowlands et Ed Simons.',
    tags: ['electro'],
  },
  validBandToDeleteWithId: {
    _id: null,
    name: 'The Chemical Brothers',
  },
  validBandToDeleteWithCode: {
    code: null,
    name: 'The Chemical Brothers',
  },
  invalidMissingId: {
    _id: undefined,
    name: 'The Chemical Brothers',
  },
  invalidMissingCode: {
    code: undefined,
    name: 'The Chemical Brothers',
  },
  invalidMissingName: {
    _id: null,
    name: null,
  },
  invalidBothIdAndCode: {
    id: null,
    code: null,
    name: 'The Chemical Brothers',
  },
  invalidMismatchingId: {
    _id: 'dummy',
    name: 'The Chemical Brothers',
  },
  invalidMismatchingCode: {
    code: 'dummy',
    name: 'The Chemical Brothers',
  },
  invalidMismatchingName: {
    _id: null,
    name: 'The Prodigy',
  },
  invalidBadId: {
    _id: null,
    name: 'The Chemical Brothers',
  },
  invalidUnknownId: {
    _id: null,
    name: 'The Chemical Brothers',
  },
  invalidUnknownCode: {
    code: null,
    name: 'The Chemical Brothers',
  },
}

describe('DELETE /bands', () => {
  beforeEach(async () => {
    await Band.deleteMany({}, (err) => {
      if (err) console.log(err)
    })
    const res = await request(app)
      .post('/api/bands')
      .send(deletePayloads.validCompleteBand)
    postedBandId = res.body._id
    postedBandCode = res.body.code
  })

  test('delete a band with id', async () => {
    deletePayloads.validBandToDeleteWithId._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.validBandToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a band with code', async () => {
    deletePayloads.validBandToDeleteWithCode.code = postedBandCode
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.validBandToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    deletePayloads.invalidBothIdAndCode._id = postedBandId
    deletePayloads.invalidBothIdAndCode.code = postedBandCode
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing name', async () => {
    deletePayloads.invalidMissingName._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMissingName)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching name', async () => {
    deletePayloads.invalidMismatchingName._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMismatchingName)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid id', async () => {
    deletePayloads.invalidBadId._id = postedBandId.slice(1)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidBadId._id)
      .send(deletePayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 404 on unknown id', async () => {
    deletePayloads.invalidUnknownId._id =
      postedBandId.slice(1) + postedBandId.charAt(0)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidUnknownId._id)
      .send(deletePayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown code', async () => {
    deletePayloads.invalidUnknownCode.code =
      postedBandCode.slice(1) + postedBandCode.charAt(0)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidUnknownCode.code)
      .send(deletePayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

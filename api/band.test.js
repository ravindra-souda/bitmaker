'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const slugify = require('./helpers/slugify')
const app = require('../app')
const Band = require('./models/Band')
const t = require('./helpers/translate')

let postedBandId,
  postedBandCode,
  bandIdsToClear = []
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

describe('POST /bands', () => {
  test('create a band with minimal information', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validMinimalBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedMinimalBand)
    bandIdsToClear.push(res.body._id)
  })
  test('create a band with full information', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validCompleteBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedCompleteBand)
    bandIdsToClear.push(res.body._id)
  })
  test('dedup tags on band creation', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validDuplicateTagsBand)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedDedupTagsBand)
    bandIdsToClear.push(res.body._id)
  })
  test('throw error 400 on missing band name key', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidNameless)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.band.errors.props.name,
    ])
  })
  test('throw error 400 on empty band name', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidEmptyName)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.band.errors.props.name,
    ])
  })
  // TODO: run this test right after 'create a band with minimal information'
  test('throw error 400 on duplicate band name', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validMinimalBand)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.creationSameName
    )
    expect(res.body.band).toMatchObject(postPayloads.validMinimalBand)
  })
  test('throw error 400 on invalid formationYear', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidFormationYear)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'band.errors.props.formationYear.invalid', {
        value: postPayloads.invalidFormationYear.formationYear,
      }),
    ])
  })
  test('throw error 400 on formationYear before 1900', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidMinFormationYear)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'band.errors.props.formationYear.min'),
    ])
  })
  test(
    'throw error 400 on formationYear after ' + new Date().getFullYear(),
    async () => {
      const res = await request(app)
        .post('/api/bands')
        .send(postPayloads.invalidMaxFormationYear)
      expect(res.statusCode).toEqual(400)
      expect(res.body.error).toEqual(
        app.locals.translations.en.band.errors.validation
      )
      expect(res.body.messages).toEqual([
        t(app.locals.translations.en, 'band.errors.props.formationYear.max', {
          value: new Date().getFullYear(),
        }),
      ])
    }
  )
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(postPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.invalidFields
    )
    expect(res.body.invalidFields).toEqual(['dummy'])
  })

  afterAll(async () => {
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
  })
})

const getPayloads = {
  validCompleteBand: {
    name: 'Oasis',
    formationYear: 1991,
    bio:
      'Oasis est un groupe de rock alternatif britannique, originaire de Manchester. Initialement nommé The Rain, le groupe est au départ composé de Liam Gallagher (chant), Paul « Bonehead » Arthurs (guitare), Paul « Guigsy » McGuigan (basse) et Tony McCarroll (batterie), rapidement rejoint par Noel (guitare principale et chant), le frère aîné de Liam.',
    tags: ['britpop'],
  },
  validAnotherBand: {
    name: 'Blur',
    formationYear: 1989,
    bio:
      'Blur est un groupe de rock britannique, originaire de Londres, en Angleterre. Il est composé du chanteur Damon Albarn, du guitariste Graham Coxon, du bassiste Alex James et du batteur Dave Rowntree.',
    tags: ['britpop'],
  },
  validBandCollection: new Map([
    [
      1,
      {
        name: 'Air',
        formationYear: 1996,
        tags: ['french-touch'],
      },
    ],
    [
      4,
      {
        name: 'Justice',
        formationYear: 2003,
        tags: ['french-touch', 'electro'],
      },
    ],
    [
      2,
      {
        name: 'Cassius',
        formationYear: 1996,
        tags: ['french-touch'],
      },
    ],
    [
      3,
      {
        name: 'Etienne de Crécy',
        formationYear: 1992,
        tags: ['french-touch'],
      },
    ],
    [
      5,
      {
        name: 'Kavinsky',
        formationYear: 2006,
        tags: ['french-touch'],
      },
    ],
  ]),
}

describe('GET /bands', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/bands')
      .send(getPayloads.validCompleteBand)
    postedBandId = res.body._id
    postedBandCode = res.body.code
    bandIdsToClear.push(res.body._id)
    await request(app).post('/api/bands').send(getPayloads.validAnotherBand)
    getPayloads.validBandCollection.forEach(async (band) => {
      let res = await request(app).post('/api/bands').send(band)
      bandIdsToClear.push(res.body._id)
    })
  })

  test('search an existing band with id', async () => {
    const res = await request(app).get('/api/bands/' + postedBandId)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validCompleteBand])
  })
  test('search an existing band with code', async () => {
    const res = await request(app).get('/api/bands/' + postedBandCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validCompleteBand])
  })
  test('search an existing band with name', async () => {
    let res = await request(app).get(
      '/api/bands?name=' + getPayloads.validCompleteBand.name.slice(1, 4)
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validCompleteBand])
    res = await request(app).get(
      '/api/bands?name=' +
        getPayloads.validCompleteBand.name.slice(1, 4).toUpperCase()
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validCompleteBand])
  })
  test('search existing bands with formationYear', async () => {
    const res = await request(app).get('/api/bands?formationYear=1996')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validBandCollection.get(1),
      getPayloads.validBandCollection.get(2),
    ])
  })
  test('search two existing bands with same tag', async () => {
    const res = await request(app).get(
      '/api/bands?tags=' + getPayloads.validCompleteBand.tags
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAnotherBand,
      getPayloads.validCompleteBand,
    ])
  })
  test('search existing bands among several tags', async () => {
    const res = await request(app).get(`/api/bands?tags=electro,britpop`)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAnotherBand,
      getPayloads.validBandCollection.get(4),
      getPayloads.validCompleteBand,
    ])
  })
  test('use parameter limit to get 3 bands out of 5', async () => {
    const res = await request(app).get('/api/bands?tags=french-touch&limit=3')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validBandCollection.get(1),
      getPayloads.validBandCollection.get(2),
      getPayloads.validBandCollection.get(3),
    ])
  })
  test('use parameter skip to get the last 2 bands', async () => {
    const res = await request(app).get('/api/bands?tags=french-touch&skip=3')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validBandCollection.get(4),
      getPayloads.validBandCollection.get(5),
    ])
  })
  test('sort results in reverse order based on formationYear, then on name', async () => {
    const res = await request(app).get(
      '/api/bands?tags=french-touch&sort=-formationYear,name'
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validBandCollection.get(5),
      getPayloads.validBandCollection.get(4),
      getPayloads.validBandCollection.get(1),
      getPayloads.validBandCollection.get(2),
      getPayloads.validBandCollection.get(3),
    ])
  })
  test('combine limit, skip and sort parameters', async () => {
    const res = await request(app).get(
      '/api/bands?tags=french-touch&limit=3&skip=1&sort=formationYear,-name'
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validBandCollection.get(2),
      getPayloads.validBandCollection.get(1),
      getPayloads.validBandCollection.get(4),
    ])
  })
  test('throw error 404 on band not found', async () => {
    let res = await request(app).get(
      '/api/bands/' + postedBandId.slice(1) + postedBandId.charAt(0)
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.notFound
    )
    res = await request(app).get('/api/bands/dummy')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.notFound
    )
    res = await request(app).get('/api/bands?name=dummy')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.notFound
    )
  })
  test.each(['dummy', '', ' '])(
    'throw error 400 on invalid formationYear',
    async (value) => {
      let res = await request(app).get('/api/bands?formationYear=' + value)
      expect(res.statusCode).toEqual(400)
      expect(res.body.error).toEqual(
        app.locals.translations.en.json.errors.filters.invalidNumericValues
      )
      expect(res.body).toHaveProperty('invalidNumericFilters', {
        formationYear: value.trim(),
      })
    }
  )
  test('throw error 400 on invalid filters', async () => {
    const res = await request(app).get('/api/bands?dummy=value')
    expect(res.statusCode).toEqual(400)
    expect(res.body).toHaveProperty('invalidFilters', ['dummy'])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.invalidFilters
    )
  })
  test('throw error 400 on invalid limit and skip parameters', async () => {
    let res = await request(app).get('/api/bands?tags=french-touch&limit=-1')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.pagination.invalidValues
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.filters.pagination.limit', {
        apiLimit: process.env.MONGODB_LIMIT_RESULTS,
        limit: -1,
      }),
    ])
    res = await request(app).get('/api/bands?tags=french-touch&skip=1.5')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.pagination.invalidValues
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.filters.pagination.skip', {
        skip: 1.5,
      }),
    ])
    res = await request(app).get('/api/bands?tags=french-touch&limit=a&skip=b')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.pagination.invalidValues
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.filters.pagination.limit', {
        apiLimit: process.env.MONGODB_LIMIT_RESULTS,
        limit: 'a',
      }),
      t(app.locals.translations.en, 'json.errors.filters.pagination.skip', {
        skip: 'b',
      }),
    ])
  })
  test('throw error 400 on limit parameter too high', async () => {
    const res = await request(app).get(
      '/api/bands?tags=french-touch&limit=' +
        (parseInt(process.env.MONGODB_LIMIT_RESULTS) + 1)
    )
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.pagination.invalidValues
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.filters.pagination.limit', {
        apiLimit: process.env.MONGODB_LIMIT_RESULTS,
        limit: parseInt(process.env.MONGODB_LIMIT_RESULTS) + 1,
      }),
    ])
  })
  test('throw error 400 on invalid sort parameters', async () => {
    const res = await request(app).get(
      '/api/bands?tags=french-touch&sort=dummy'
    )
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.sort
    )
    expect(res.body).toHaveProperty('invalidSortables', ['dummy'])
  })

  afterAll(async () => {
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
  })
})

const patchPayloads = {
  validCompleteBand: {
    name: 'Gorillaz',
    formationYear: 1998,
    bio: '2D, Murdoc, Russel, Noodle',
    tags: ['electro'],
  },
  validBandToUpdate: {
    _id: null,
    name: '   Gorillaz without Murdoc ',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro  ', 'trip HOP'],
  },
  validMinimalUpdateWithId: {
    _id: null,
    bio: 'Damon Albarn & Jamie Hewlett',
  },
  validMinimalUpdateWithCode: {
    code: null,
    bio: 'Damon Albarn & Jamie Hewlett',
  },
  expectedMinimalUpdate: {
    name: 'Gorillaz',
    formationYear: 1998,
    bio: 'Damon Albarn & Jamie Hewlett',
    tags: ['electro'],
  },
  validDuplicateTagsUpdate: {
    _id: null,
    tags: ['trip hop', 'TRIP HOP', ' trip hop   '],
  },
  expectedDedupTagsUpdate: {
    tags: ['trip-hop'],
  },
  invalidMissingId: {
    _id: undefined,
    name: 'Gorillaz missing Murdoc',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidMissingCode: {
    code: undefined,
    name: 'Gorillaz missing Murdoc',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidBothIdAndCode: {
    _id: null,
    code: null,
    name: 'Gorillaz missing Murdoc',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidMismatchingId: {
    _id: 'dummy',
    name: 'Gorillaz mismatching Ace',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidMismatchingCode: {
    code: 'dummy',
    name: 'Gorillaz mismatching Ace',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidEmptyName: {
    _id: null,
    name: '',
    formationYear: 2018,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidFormationYear: {
    _id: null,
    name: 'Decimal Gorillaz',
    formationYear: 1998.8,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidMinFormationYear: {
    _id: null,
    name: 'Gorillaz from the Past',
    formationYear: 1898,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidMaxFormationYear: {
    _id: null,
    name: 'Gorillaz tomorrow',
    formationYear: new Date().getFullYear() + 1,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidUnknownField: {
    _id: null,
    name: 'Gorillaz tomorrow',
    formationYear: new Date().getFullYear() + 1,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
    dummy: false,
  },
  invalidBadId: {
    _id: null,
    name: 'Borillaz',
    formationYear: 1898,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidUnknownId: {
    _id: null,
    name: 'Gorillaz ?',
    formationYear: 1898,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  invalidUnknownCode: {
    code: null,
    name: 'Gorillaz ?',
    formationYear: 1898,
    bio: '2D, Ace, Russel, Noodle',
    tags: ['electro'],
  },
  expectedUpdatedBand: {},
}

patchPayloads.expectedUpdatedBand = {
  ...patchPayloads.validBandToUpdate,
  name: 'Gorillaz without Murdoc',
  tags: ['electro', 'trip-hop'],
}

describe('PATCH /bands', () => {
  beforeEach(async () => {
    await Band.deleteMany({ code: postedBandCode }, (err) => {
      if (err) console.log(err)
    })
    const res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validCompleteBand)
    postedBandId = res.body._id
    postedBandCode = res.body.code
    bandIdsToClear.push(postedBandId)
  })

  test('update a band', async () => {
    patchPayloads.validBandToUpdate._id = postedBandId
    patchPayloads.expectedUpdatedBand._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.validBandToUpdate)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedBand).toMatchObject(
      patchPayloads.expectedUpdatedBand
    )
  })
  test('update a band with id and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedBand).toMatchObject(
      patchPayloads.expectedMinimalUpdate
    )
  })
  test('update a band with code and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedBandCode
    const res = await request(app)
      .patch('/api/bands/' + postedBandCode)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedBand).toMatchObject(
      patchPayloads.expectedMinimalUpdate
    )
  })
  test('dedup tags on band update', async () => {
    patchPayloads.validDuplicateTagsUpdate._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.validDuplicateTagsUpdate)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedBand).toMatchObject(
      patchPayloads.expectedDedupTagsUpdate
    )
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.keyNotFound,
    ])
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .patch('/api/bands/' + postedBandCode)
      .send(patchPayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.keyNotFound,
    ])
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    patchPayloads.invalidBothIdAndCode._id = postedBandId
    patchPayloads.invalidBothIdAndCode.code = postedBandCode
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.bothKeys,
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: patchPayloads.invalidBothIdAndCode.code,
        urlKey: postedBandId,
      }),
    ])
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.idMismatch', {
        jsonId: patchPayloads.invalidMismatchingId._id,
        urlKey: postedBandId,
      }),
    ])
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .patch('/api/bands/' + postedBandCode)
      .send(patchPayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: patchPayloads.invalidMismatchingCode.code,
        urlKey: postedBandCode,
      }),
    ])
  })
  test('throw error 400 on empty name', async () => {
    patchPayloads.invalidEmptyName._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidEmptyName)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.band.errors.props.name,
    ])
  })
  test('throw error 400 on invalid formationYear', async () => {
    patchPayloads.invalidFormationYear._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidFormationYear)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'band.errors.props.formationYear.invalid', {
        value: patchPayloads.invalidFormationYear.formationYear,
      }),
    ])
  })
  test('throw error 400 on formationYear before 1900', async () => {
    patchPayloads.invalidMinFormationYear._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidMinFormationYear)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.band.errors.props.formationYear.min,
    ])
  })
  test(
    'throw error 400 on formationYear after ' + new Date().getFullYear(),
    async () => {
      patchPayloads.invalidMaxFormationYear._id = postedBandId
      const res = await request(app)
        .patch('/api/bands/' + postedBandId)
        .send(patchPayloads.invalidMaxFormationYear)
      expect(res.statusCode).toEqual(400)
      expect(res.body.error).toEqual(
        app.locals.translations.en.band.errors.validation
      )
      expect(res.body.messages).toEqual([
        t(app.locals.translations.en, 'band.errors.props.formationYear.max', {
          value: new Date().getFullYear(),
        }),
      ])
    }
  )
  test('throw error 400 on unknown posted fields', async () => {
    patchPayloads.invalidUnknownField._id = postedBandId
    const res = await request(app)
      .patch('/api/bands/' + postedBandId)
      .send(patchPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.invalidFields
    )
    expect(res.body.invalidFields).toEqual(['dummy'])
  })
  test('throw error 400 on invalid id', async () => {
    patchPayloads.invalidBadId._id = postedBandId.slice(1)
    const res = await request(app)
      .patch('/api/bands/' + patchPayloads.invalidBadId._id)
      .send(patchPayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.invalidId', {
        invalidId: patchPayloads.invalidBadId._id,
      }),
    ])
  })
  test('throw error 404 on unknown id', async () => {
    patchPayloads.invalidUnknownId._id =
      postedBandId.slice(1) + postedBandId.charAt(0)
    const res = await request(app)
      .patch('/api/bands/' + patchPayloads.invalidUnknownId._id)
      .send(patchPayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'band',
        keyName: '_id',
        keyValue: patchPayloads.invalidUnknownId._id,
      })
    )
  })
  test('throw error 404 on unknown code', async () => {
    patchPayloads.invalidUnknownCode.code =
      postedBandCode.slice(1) + postedBandCode.charAt(0)
    const res = await request(app)
      .patch('/api/bands/' + patchPayloads.invalidUnknownCode.code)
      .send(patchPayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'band',
        keyName: 'code',
        keyValue: patchPayloads.invalidUnknownCode.code,
      })
    )
  })

  afterAll(async () => {
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
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
  validBandToForceDelete: {
    _id: null,
    name: 'The Chemical Brothers',
    cascadeDeleteAlbums: true,
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
  linkedAlbum: {
    title: 'Surrender',
    releaseDate: new Date('1999-06-21').toJSON(),
    type: 'Studio',
    tags: ['electronica'],
  },
}

describe('DELETE /bands', () => {
  beforeEach(async () => {
    await Band.deleteMany({ code: postedBandCode }, (err) => {
      if (err) console.log(err)
    })
    const res = await request(app)
      .post('/api/bands')
      .send(deletePayloads.validCompleteBand)
    postedBandId = res.body._id
    postedBandCode = res.body.code
    bandIdsToClear.push(postedBandId)
  })

  test('delete a band with id', async () => {
    deletePayloads.validBandToDeleteWithId._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.validBandToDeleteWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.band.success.delete
    )
  })
  test('delete a band with code', async () => {
    deletePayloads.validBandToDeleteWithCode.code = postedBandCode
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.validBandToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.band.success.delete
    )
  })
  test('force delete a band linked to an album', async () => {
    let res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(deletePayloads.linkedAlbum)
    expect(res.statusCode).toEqual(201)
    deletePayloads.validBandToForceDelete._id = postedBandId
    res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.validBandToForceDelete)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.band.success.delete
    )
    res = await request(app).get(`/api/albums?title=surrender`)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.keyNotFound,
    ])
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.keyNotFound,
    ])
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    deletePayloads.invalidBothIdAndCode._id = postedBandId
    deletePayloads.invalidBothIdAndCode.code = postedBandCode
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.bothKeys,
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: deletePayloads.invalidBothIdAndCode.code,
        urlKey: postedBandId,
      }),
    ])
  })
  test('throw error 400 on missing name', async () => {
    deletePayloads.invalidMissingName._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMissingName)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.mandatoryKey', {
        mandatoryKey: 'name',
      }),
    ])
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.idMismatch', {
        jsonId: deletePayloads.invalidMismatchingId._id,
        urlKey: postedBandId,
      }),
    ])
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .delete('/api/bands/' + postedBandCode)
      .send(deletePayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: deletePayloads.invalidMismatchingCode.code,
        urlKey: postedBandCode,
      }),
    ])
  })
  test('throw error 400 on mismatching name', async () => {
    deletePayloads.invalidMismatchingName._id = postedBandId
    const res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.invalidMismatchingName)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.mandatoryKeyMismatch',
        {
          modelName: 'Band',
          keyName: '_id',
          keyValue: deletePayloads.invalidMismatchingName._id,
          mandatoryKey: 'name',
        }
      )
    )
  })
  test('throw error 400 on invalid id', async () => {
    deletePayloads.invalidBadId._id = postedBandId.slice(1)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidBadId._id)
      .send(deletePayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.invalidId', {
        invalidId: deletePayloads.invalidBadId._id,
      }),
    ])
  })
  test('throw error 404 on unknown id', async () => {
    deletePayloads.invalidUnknownId._id =
      postedBandId.slice(1) + postedBandId.charAt(0)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidUnknownId._id)
      .send(deletePayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'band',
        keyName: '_id',
        keyValue: deletePayloads.invalidUnknownId._id,
      })
    )
  })
  test('throw error 404 on unknown code', async () => {
    deletePayloads.invalidUnknownCode.code =
      postedBandCode.slice(1) + postedBandCode.charAt(0)
    const res = await request(app)
      .delete('/api/bands/' + deletePayloads.invalidUnknownCode.code)
      .send(deletePayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'band',
        keyName: 'code',
        keyValue: deletePayloads.invalidUnknownCode.code,
      })
    )
  })
  test('throw error 409 when deleting a band linked to an album', async () => {
    let res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(deletePayloads.linkedAlbum)
    expect(res.statusCode).toEqual(201)
    deletePayloads.validBandToDeleteWithId._id = postedBandId
    res = await request(app)
      .delete('/api/bands/' + postedBandId)
      .send(deletePayloads.validBandToDeleteWithId)
    expect(res.statusCode).toEqual(409)
    expect(res.body.linkedAlbums).toMatchObject([deletePayloads.linkedAlbum])
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.cascadeDelete
    )
    expect(res.body.message).toEqual(
      app.locals.translations.en.band.errors.cascadeDeleteHint
    )
  })
})

afterAll(async () => {
  await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
    if (err) console.log(err)
  })
  await mongoose.connection.close()
})

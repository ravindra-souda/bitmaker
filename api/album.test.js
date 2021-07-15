'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../app')
const Band = require('./models/Band')

let postedBandId,
  postedBandCode,
  bandIdWithDuplicateAlbumTitles,
  bandIdsToClear = []
const postPayloads = {
  validBandWithCode: {
    name: 'twenty øne piløts',
    formationYear: 2009,
    bio: `Twenty One Pilots (stylisé twenty øne piløts), est un groupe américain de musique indie rock, originaire de Columbus dans l'Ohio, composé autour de deux multi-instrumentistes accomplis, Tyler Joseph et Josh Dun.`,
    tags: ['indie-pop', 'rap-rock'],
  },
  validBandWithId: {
    name: 'Foo Fighters',
  },
  validBandWithDuplicateAlbumTitles: {
    name: 'Weezer',
  },
  validCompleteAlbum: {
    title: '   Trench ',
    releaseDate: new Date('2018-10-05').toJSON(),
    type: 'Studio',
    tags: ['Alternative Rock', '  electropop '],
  },
  validMinimalAlbumWithId: {
    title: 'The Colour and the Shape',
  },
  validMinimalAlbumWithCode: {
    title: 'Blurryface',
  },
  validMinimalAlbumShowingNoRecursion: {
    title: 'Vessel',
  },
  validDuplicateTagsAlbum: {
    title: 'One by One',
    tags: ['  alternative rock', 'post grunge   ', 'rock', 'Alternative Rock'],
  },
  expectedDedupTagsAlbum: {
    title: 'One by One',
    tags: ['alternative-rock', 'post-grunge', 'rock'],
  },
  validSameAlbumTitles: new Map([
    [
      1,
      {
        title: 'Weezer',
        releaseDate: new Date('1994-05-10').toJSON(),
        tags: ['pop-rock'],
      },
    ],
    [
      2,
      {
        title: 'Weezer',
        releaseDate: new Date('2001-05-15').toJSON(),
        tags: ['power-pop'],
      },
    ],
  ]),
  invalidNoTitle: {
    releaseDate: new Date('2005-06-14'),
  },
  invalidEmptyTitle: {
    title: undefined,
    releaseDate: new Date('2005-06-14'),
  },
  invalidMinReleaseDate: {
    title: 'Echoes, Silence, Patience & Grace',
    releaseDate: new Date('1807-09-25'),
  },
  invalidReleaseDate: {
    title: 'Echoes, Silence, Patience & Grace',
    releaseDate: new Date('2007-25-42'),
  },
  invalidType: {
    title: 'Five Songs and a Cover',
    type: 'dummy',
  },
  invalidUnknownBandId: {
    title: 'Sonic Highways',
    releaseDate: new Date('2014-11-10'),
  },
  invalidUnknownBandCode: {
    title: 'Alive 1997',
    releaseDate: new Date('1997-10-02'),
  },
  invalidBandName: {
    title: 'Homework',
    releaseDate: new Date('1997-01-20'),
  },
  invalidUnknownField: {
    title: 'Wasting Light',
    releaseDate: new Date('2011-04-12'),
    type: 'Studio',
    tags: ['post grunge'],
    dummy: false,
  },
  expectedCompleteAlbum: {},
}

postPayloads.expectedCompleteAlbum = {
  ...postPayloads.validCompleteAlbum,
  title: 'Trench',
  tags: ['alternative-rock', 'electropop'],
}

beforeAll(async () => {
  let res = await request(app)
    .post('/api/bands')
    .send(postPayloads.validBandWithCode)
  postedBandCode = res.body.code
  bandIdsToClear.push(res.body._id)
  res = await request(app).post('/api/bands').send(postPayloads.validBandWithId)
  postedBandId = res.body._id
  bandIdsToClear.push(postedBandId)
})

describe('POST /albums', () => {
  test('create an album with minimal information using band id', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.validMinimalAlbumWithId)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toHaveProperty(
      'title',
      postPayloads.validMinimalAlbumWithId.title
    )
    expect(res.body.band).toMatchObject(postPayloads.validBandWithId)
  })
  test('create an album with minimal information using band code', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(postPayloads.validMinimalAlbumWithCode)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toHaveProperty(
      'title',
      postPayloads.validMinimalAlbumWithCode.title
    )
    expect(res.body.band).toMatchObject(postPayloads.validBandWithCode)
  })
  test('create an album with full information', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(postPayloads.validCompleteAlbum)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedCompleteAlbum)
    expect(res.body.band).toMatchObject(postPayloads.validBandWithCode)
  })
  test('create an album and returned json should not show band-albums recursion', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(postPayloads.validMinimalAlbumShowingNoRecursion)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.validMinimalAlbumShowingNoRecursion
    )
    expect(res.body.band).toMatchObject(postPayloads.validBandWithCode)
    expect(res.body.band).toHaveProperty('albums')
    expect(res.body.band.albums).not.toHaveProperty('band')
  })
  test('create albums with the same title and get unique codes', async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(postPayloads.validBandWithDuplicateAlbumTitles)
    bandIdWithDuplicateAlbumTitles = res.body._id
    res = await request(app)
      .post(`/api/bands/${bandIdWithDuplicateAlbumTitles}/albums`)
      .send(postPayloads.validSameAlbumTitles.get(1))
    expect(res.statusCode).toEqual(201)
    let firstAlbumCode = res.body.code
    res = await request(app)
      .post(`/api/bands/${bandIdWithDuplicateAlbumTitles}/albums`)
      .send(postPayloads.validSameAlbumTitles.get(2))
    expect(res.statusCode).toEqual(201)
    expect(res.body.code).not.toEqual(firstAlbumCode)
  })
  test('show created albums in related band', async () => {
    let res = await request(app).get(
      '/api/bands/' + bandIdWithDuplicateAlbumTitles
    )
    expect(res.body[0].albums).toMatchObject([
      postPayloads.validSameAlbumTitles.get(1),
      postPayloads.validSameAlbumTitles.get(2),
    ])
  })
  test('dedup tags on album creation', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.validDuplicateTagsAlbum)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedDedupTagsAlbum)
  })
  test('throw error 400 on missing album title key', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidNoTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on empty album title', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidEmptyTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on releaseDate before 1900', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidMinReleaseDate)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid releaseDate', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidReleaseDate)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid type', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidType)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 404 on unknown band id', async () => {
    const res = await request(app)
      .post(
        `/api/bands/${postedBandId.slice(1) + postedBandId.charAt(0)}/albums`
      )
      .send(postPayloads.invalidUnknownBandId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown band code', async () => {
    const res = await request(app)
      .post(
        `/api/bands/${
          postedBandCode.slice(1) + postedBandCode.charAt(0)
        }/albums`
      )
      .send(postPayloads.invalidUnknownBandCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
  })

  afterAll(async () => {
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

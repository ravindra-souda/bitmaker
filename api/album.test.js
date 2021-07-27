'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../app')
const { Album } = require('./models/Album')
const Band = require('./models/Band')

let postedBandId,
  postedBandCode,
  postedUnrelatedBandId,
  postedUnrelatedBandCode,
  postedAlbumId,
  postedAlbumCode,
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

const deletePayloads = {
  validCompleteBand: {
    name: 'The Verve',
    formationYear: 1990,
    bio:
      'Longtemps considéré comme un des groupes les plus innovants et captivants de la scène pop contemporaine britannique, The Verve fit finalement surface en 1997 avec le tube Bitter Sweet Symphony.',
    tags: ['alternative-rock'],
  },
  validUnrelatedBand: {
    name: 'Kasabian',
  },
  validCompleteAlbum: {
    title: 'Urban Hymns',
    releaseDate: new Date('1997-09-29').toJSON(),
    type: 'Studio',
    tags: ['britpop', 'alternative rock'],
  },
  validOtherAlbums: new Map([
    [
      1,
      {
        title: 'A Storm in Heaven',
        releaseDate: new Date('1993-06-21').toJSON(),
        tags: ['psychedelic-rock'],
      },
    ],
    [
      2,
      {
        title: 'A Northern Soul',
        releaseDate: new Date('1995-06-20').toJSON(),
        tags: ['psychedelic-rock'],
      },
    ],
  ]),
  validAlbumToDeleteWithId: {
    _id: null,
    title: 'Urban Hymns',
  },
  validAlbumToDeleteWithCode: {
    code: null,
    title: 'Urban Hymns',
  },
  invalidMissingId: {
    _id: undefined,
    title: 'Urban Hymns',
  },
  invalidMissingCode: {
    code: undefined,
    title: 'Urban Hymns',
  },
  invalidMissingTitle: {
    _id: null,
    title: null,
  },
  invalidBothIdAndCode: {
    id: null,
    code: null,
    title: 'Urban Hymns',
  },
  invalidMismatchingId: {
    _id: 'dummy',
    title: 'Urban Hymns',
  },
  invalidMismatchingCode: {
    code: 'dummy',
    title: 'Urban Hymns',
  },
  invalidMismatchingTitle: {
    _id: null,
    title: 'A Storm in Heaven',
  },
  invalidBadId: {
    _id: null,
    title: 'Urban Hymns',
  },
  invalidUnknownId: {
    _id: null,
    title: 'Urban Hymns',
  },
  invalidUnknownCode: {
    code: null,
    title: 'Urban Hymns',
  },
}

describe('DELETE /albums', () => {
  beforeAll(async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(deletePayloads.validCompleteBand)
    postedBandId = res.body._id
    postedBandCode = res.body.code
    bandIdsToClear.push(postedBandId)
    res = await request(app)
      .post('/api/bands')
      .send(deletePayloads.validUnrelatedBand)
    postedUnrelatedBandId = res.body._id
    postedUnrelatedBandCode = res.body.code
    bandIdsToClear.push(postedUnrelatedBandId)
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(deletePayloads.validOtherAlbums.get(1))
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(deletePayloads.validOtherAlbums.get(2))
  })

  beforeEach(async () => {
    await Album.deleteMany({ code: postedAlbumCode }, (err) => {
      if (err) console.log(err)
    })
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(deletePayloads.validCompleteAlbum)
    postedAlbumId = res.body._id
    postedAlbumCode = res.body.code
    bandIdsToClear.push(postedBandId)
  })

  test('delete an album with id', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete an album with code', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('delete an album and returned json should not show band-albums recursion', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.deleted.band).toMatchObject(
      deletePayloads.validCompleteBand
    )
    expect(res.body.deleted.band).toHaveProperty('albums')
    expect(res.body.deleted.band.albums).not.toHaveProperty('band')
  })
  test('delete an album with id filtered by band', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/bands/${postedBandId}/albums/${postedAlbumId}`)
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete an album with code filtered by band', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('delete an album and show the remaining ones from the related band', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.deleted.band.albums).toMatchObject([
      deletePayloads.validOtherAlbums.get(1),
      deletePayloads.validOtherAlbums.get(2),
    ])
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedBandId}`)
      .send(deletePayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedBandCode}`)
      .send(deletePayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    deletePayloads.invalidBothIdAndCode._id = postedAlbumId
    deletePayloads.invalidBothIdAndCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}`)
      .send(deletePayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing title', async () => {
    deletePayloads.invalidMissingTitle._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMissingTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedBandCode}`)
      .send(deletePayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching title', async () => {
    deletePayloads.invalidMismatchingTitle._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMismatchingTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid id', async () => {
    deletePayloads.invalidBadId._id = postedAlbumId.slice(1)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidBadId._id)
      .send(deletePayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 404 on unknown id', async () => {
    deletePayloads.invalidUnknownId._id =
      postedAlbumId.slice(1) + postedAlbumId.charAt(0)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidUnknownId._id)
      .send(deletePayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown code', async () => {
    deletePayloads.invalidUnknownCode.code =
      postedAlbumCode.slice(1) + postedAlbumCode.charAt(0)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidUnknownCode.code)
      .send(deletePayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/bands/${postedUnrelatedBandId}/albums/${postedAlbumId}`)
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedUnrelatedBandCode}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (id)', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(
        `/api/bands/${
          postedBandId.slice(1) + postedBandId.charAt(0)
        }/albums/${postedAlbumId}`
      )
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (code)', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedBandCode.slice(1)}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
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

import mongoose from 'mongoose'
import request from 'supertest'
import app from '../app.mjs'
import { Album } from './models/Album.mjs'
import Band from './models/Band.mjs'
import t from './helpers/translate.mjs'

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
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.album.errors.props.title,
    ])
  })
  test('throw error 400 on empty album title', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidEmptyTitle)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.album.errors.props.title,
    ])
  })
  test('throw error 400 on releaseDate before 1900', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidMinReleaseDate)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.album.errors.props.releaseDate.min,
    ])
  })
  test('throw error 400 on invalid releaseDate', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidReleaseDate)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'album.errors.props.releaseDate.invalid', {
        date: null,
      }),
    ])
  })
  test('throw error 400 on invalid type', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidType)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
  })
  test('throw error 404 on unknown band id', async () => {
    const res = await request(app)
      .post(
        `/api/bands/${postedBandId.slice(1) + postedBandId.charAt(0)}/albums`
      )
      .send(postPayloads.invalidUnknownBandId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.notFound
    )
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
    expect(res.body.error).toEqual(
      app.locals.translations.en.band.errors.notFound
    )
  })
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(postPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.invalidFields
    )
  })

  afterAll(async () => {
    try {
      await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] })
    } catch (err) {
      console.log(err)
    }
    bandIdsToClear = []
  })
})

const getPayloads = {
  validBandFetchedById: {
    name: 'Calvin Harris',
    formationYear: 2002,
    bio: `Calvin Harris sort en 2007 son premier album I Created Disco, qui deviendra disque d'or au Royaume-Uni`,
    tags: ['house'],
  },
  validAlbumsForBandFetchedById: new Map([
    [
      3,
      {
        title: 'I Created Disco',
        releaseDate: new Date('2007-06-15').toJSON(),
        type: 'Studio',
        tags: ['electro', 'edm'],
      },
    ],
    [
      1,
      {
        title: '18 Months',
        releaseDate: new Date('2014-10-31').toJSON(),
        type: 'Studio',
        tags: ['electro', 'edm'],
      },
    ],
    [
      4,
      {
        title: 'Motion (Deluxe)',
        releaseDate: new Date('2014-10-31').toJSON(),
        type: 'Studio',
        tags: ['edm'],
      },
    ],
    [
      6,
      {
        title: "We'll Be Coming Back",
        type: 'EP',
      },
    ],
    [
      5,
      {
        title: 'Ready for the Weekend',
        releaseDate: new Date('2009-08-14').toJSON(),
        type: 'Studio',
        tags: ['electro'],
      },
    ],
    [
      2,
      {
        title: 'Funk Wav Bounces Vol. 1',
        releaseDate: new Date('2017-06-30').toJSON(),
        type: 'Studio',
        tags: ['funk', 'disco', 'electro', 'house', 'edm'],
      },
    ],
  ]),
  validBandFetchedByCode: {
    name: 'Avicii',
    formationYear: 2011,
    bio: `Avicii, considéré comme l'un des plus grands DJ de sa génération, sort son premier album True en septembre 2013 qui établit sa réputation dans le monde de la house et de la dance.`,
    tags: ['electro', 'house'],
  },
  validAlbumsForBandFetchedByCode: new Map([
    [
      5,
      {
        title: 'True (Avicii by Avicii)',
        releaseDate: new Date('2014-03-24').toJSON(),
        type: 'Studio',
        tags: ['electro'],
      },
    ],
    [
      4,
      {
        title: 'True',
        releaseDate: new Date('2013-09-13').toJSON(),
        type: 'Studio',
        tags: ['house', 'country'],
      },
    ],
    [
      2,
      {
        title: 'Stories (Deluxe)',
        releaseDate: new Date('2013-09-13').toJSON(),
        type: 'Studio',
        tags: ['house'],
      },
    ],
    [
      3,
      {
        title: 'The Days / Nights EP',
        releaseDate: new Date('2014-12-01').toJSON(),
        type: 'EP',
        tags: ['house'],
      },
    ],
    [
      1,
      {
        title: 'Avīci (01)',
        releaseDate: new Date('2017-08-10').toJSON(),
        type: 'EP',
        tags: ['house'],
      },
    ],
  ]),
  validAlbumFetchedById: {},
  validAlbumFetchedByCode: {},
}

getPayloads.validAlbumFetchedById = {
  ...getPayloads.validAlbumsForBandFetchedById.get(2),
}
getPayloads.validAlbumFetchedByCode = {
  ...getPayloads.validAlbumsForBandFetchedByCode.get(5),
}

describe('GET /albums', () => {
  beforeAll(async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(getPayloads.validBandFetchedById)
    postedBandId = res.body._id
    bandIdsToClear.push(postedBandId)
    for (let [key, album] of getPayloads.validAlbumsForBandFetchedById) {
      let res = await request(app)
        .post(`/api/bands/${postedBandId}/albums`)
        .send(album)
      if (key === 2) {
        postedAlbumId = res.body._id
      }
    }
    res = await request(app)
      .post('/api/bands')
      .send(getPayloads.validBandFetchedByCode)
    postedBandCode = res.body.code
    bandIdsToClear.push(res.body._id)
    for (let [key, album] of getPayloads.validAlbumsForBandFetchedByCode) {
      let res = await request(app)
        .post(`/api/bands/${postedBandCode}/albums`)
        .send(album)
      if (key === 5) {
        postedAlbumCode = res.body.code
      }
    }
  })

  test('search an existing album with id', async () => {
    const res = await request(app).get('/api/albums/' + postedAlbumId)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedById])
  })
  test('search an existing album with code', async () => {
    const res = await request(app).get('/api/albums/' + postedAlbumCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedByCode])
  })
  test('search an existing album and returned json should not show band-albums recursion', async () => {
    const res = await request(app).get('/api/albums/' + postedAlbumCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedByCode])
    expect(res.body[0].band).toMatchObject(getPayloads.validBandFetchedByCode)
    expect(res.body[0].band).toHaveProperty('albums')
    expect(res.body[0].band.albums).not.toHaveProperty('band')
  })
  test('search an existing album with id filtered by band', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums/${postedAlbumId}`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedById])
  })
  test('search an existing album with code filtered by band', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums/${postedAlbumCode}`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedByCode])
  })
  test('search all existing albums for a given band (id)', async () => {
    const res = await request(app).get(`/api/bands/${postedBandId}/albums`)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(1),
      getPayloads.validAlbumsForBandFetchedById.get(2),
      getPayloads.validAlbumsForBandFetchedById.get(3),
      getPayloads.validAlbumsForBandFetchedById.get(4),
      getPayloads.validAlbumsForBandFetchedById.get(5),
    ])
  })
  test('search all existing albums for a given band (code)', async () => {
    const res = await request(app).get(`/api/bands/${postedBandCode}/albums`)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(1),
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(5),
    ])
  })
  test('search an existing album with title', async () => {
    let res = await request(app).get('/api/albums?title=delux')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
    ])
    res = await request(app).get('/api/albums?title=DELUX')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
    ])
  })
  test('search an existing album with releaseDate', async () => {
    const res = await request(app).get('/api/albums?releaseDate=2013-09-13')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
    ])
  })
  test('search an existing album with releaseYear', async () => {
    const res = await request(app).get('/api/albums?releaseYear=2014')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(1),
      getPayloads.validAlbumsForBandFetchedById.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedByCode.get(5),
    ])
  })
  test('search an existing album with title for a given band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums?title=wav`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedById])
  })
  test('search an existing album with title for a given band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums?title=e`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(5),
    ])
  })
  test('search existing albums with same tag', async () => {
    const res = await request(app).get(
      '/api/albums?tags=' +
        getPayloads.validAlbumsForBandFetchedByCode.get(5).tags
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(1),
      getPayloads.validAlbumsForBandFetchedById.get(2),
      getPayloads.validAlbumsForBandFetchedById.get(3),
      getPayloads.validAlbumsForBandFetchedById.get(5),
      getPayloads.validAlbumsForBandFetchedByCode.get(5),
    ])
  })
  test('search existing albums with same type', async () => {
    const res = await request(app).get(
      '/api/albums?type=' +
        getPayloads.validAlbumsForBandFetchedById.get(6).type
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(1),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedById.get(6),
    ])
  })
  test('search existing albums among several tags', async () => {
    const res = await request(app).get(`/api/albums?tags=country,funk`)
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(2),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
    ])
  })
  test('search an existing album with tag for a given band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums?tags=funk`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([getPayloads.validAlbumFetchedById])
  })
  test('search an existing album with tag for a given band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums?tags=${
        getPayloads.validAlbumsForBandFetchedByCode.get(5).tags
      }`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(5),
    ])
  })
  test('search an existing album with type for a given band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums?type=EP`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(6),
    ])
  })
  test('search an existing album with type for a given band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums?type=EP`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(1),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
    ])
  })
  test('use parameter limit to get 3 albums out of 5', async () => {
    const res = await request(app).get('/api/albums?tags=house&limit=3')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(1),
      getPayloads.validAlbumFetchedById,
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
    ])
  })
  test('use parameter skip to get the last 2 albums', async () => {
    const res = await request(app).get('/api/albums?tags=house&skip=3')
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
    ])
  })
  test('sort results based on releaseDate, then on reverse order title', async () => {
    const res = await request(app).get(
      '/api/albums?tags=house&sort=releaseDate,-title'
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumFetchedById,
      getPayloads.validAlbumsForBandFetchedByCode.get(1),
    ])
  })
  test('combine limit, skip and sort parameters', async () => {
    const res = await request(app).get(
      '/api/albums?tags=house&limit=3&skip=1&sort=-releaseDate,-title'
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumFetchedById,
      getPayloads.validAlbumsForBandFetchedByCode.get(3),
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
    ])
  })
  test('combine limit, skip and sort parameters filtered by band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums?tags=edm&limit=3&skip=1&sort=releaseDate,-title`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedById.get(4),
      getPayloads.validAlbumsForBandFetchedById.get(1),
      getPayloads.validAlbumsForBandFetchedById.get(2),
    ])
  })
  test('combine limit, skip and sort parameters filtered by band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums?tags=house&limit=2&skip=2&sort=-releaseDate,-title`
    )
    expect(res.statusCode).toEqual(200)
    expect(res.body).toMatchObject([
      getPayloads.validAlbumsForBandFetchedByCode.get(4),
      getPayloads.validAlbumsForBandFetchedByCode.get(2),
    ])
  })
  test('throw error 400 on invalid releaseYear', async () => {
    const res = await request(app).get('/api/albums?releaseYear=dummy')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.props.releaseYear
    )
  })
  test.each([
    'dummy',
    null,
    '1953/12/25',
    '2021-02-29',
    '2021-12-32',
    new Date('2021-12-32'),
  ])('throw error 400 on invalid releaseDate', async (date) => {
    const res = await request(app).get('/api/albums?releaseDate=' + date)
    expect(res.statusCode).toEqual(400)
    expect(res.body).toHaveProperty('invalidDateFilters')
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.invalidDateValues
    )
  })
  test('throw error 400 on invalid type', async () => {
    const res = await request(app).get('/api/albums?type=dummy')
    expect(res.statusCode).toEqual(400)
    expect(res.body).toHaveProperty('invalidEnumFilters', [
      {
        field: 'type',
        providedEnumValue: 'dummy',
        expectedEnumValues: Album.getEnumFilters()['type'],
      },
    ])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.invalidEnumValues
    )
  })
  test('throw error 400 on invalid filters', async () => {
    const res = await request(app).get('/api/albums?dummy=value')
    expect(res.statusCode).toEqual(400)
    expect(res.body).toHaveProperty('invalidFilters', ['dummy'])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.invalidFilters
    )
  })
  test('throw error 400 on invalid limit and skip parameters', async () => {
    let res = await request(app).get('/api/albums?tags=house&limit=-1')
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
    res = await request(app).get('/api/albums?tags=house&skip=1.5')
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.pagination.invalidValues
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.filters.pagination.skip', {
        skip: 1.5,
      }),
    ])
    res = await request(app).get('/api/albums?tags=house&limit=a&skip=b')
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
      '/api/albums?tags=house&limit=' +
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
    const res = await request(app).get('/api/albums?tags=house&sort=dummy')
    expect(res.statusCode).toEqual(400)
    expect(res.body).toHaveProperty('invalidSortables', ['dummy'])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.filters.sort
    )
  })
  test('throw error 404 on album not found', async () => {
    let res = await request(app).get(
      '/api/albums/' + postedAlbumId.slice(1) + postedAlbumId.charAt(0)
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
    res = await request(app).get('/api/albums/dummy')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
    res = await request(app).get('/api/albums?title=dummy')
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandId}/albums/${postedAlbumCode}`
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode}/albums/${postedAlbumId}`
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.notFound
    )
  })
  test('throw error 404 on unknown related band (id)', async () => {
    const res = await request(app).get(
      `/api/bands/${
        postedBandId.slice(1) + postedBandId.charAt(0)
      }/albums/${postedAlbumId}`
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandId.slice(1) + postedBandId.charAt(0),
        }
      )
    )
  })
  test('throw error 404 on unknown related band (code)', async () => {
    const res = await request(app).get(
      `/api/bands/${postedBandCode.slice(1)}/albums/${postedAlbumCode}`
    )
    expect(res.statusCode).toEqual(404)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandCode.slice(1),
        }
      )
    )
  })

  afterAll(async () => {
    try {
      await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] })
    } catch (err) {
      console.log(err)
    }
    bandIdsToClear = []
  })
})

const patchPayloads = {
  validBandWithCode: {
    name: 'The Prodigy',
    formationYear: 1990,
    bio: 'The Prodigy apparait sur la scène rave underground au début des années 1990, et atteint depuis lors une immense popularité et une renommée mondiale.',
    tags: ['breakbeat', 'rave'],
  },
  validBandWithId: {
    name: 'Fatboy Slim',
    bio: 'Brighton Port Authority',
  },
  validUnrelatedBand: {
    name: 'The Dust Brothers',
  },
  validCompleteAlbumWithCode: {
    code: null,
    title: 'The Fat of the Land',
    releaseDate: new Date('1997-06-30').toJSON(),
    type: 'Studio',
    tags: ['big beat'],
  },
  validCompleteAlbumWithId: {
    _id: null,
    title: "You've Come a Long Way, Baby",
    releaseDate: new Date('1998-10-19').toJSON(),
    type: 'Studio',
    tags: ['big beat'],
  },
  validAlbumToUpdateWithCode: {
    title: '     The Added Fat     ',
    releaseDate: new Date('2012-12-03').toJSON(),
    type: ' EP  ',
    tags: ['big beat', '  remixes '],
  },
  expectedCompleteAlbumUpdate: {
    title: 'The Added Fat',
    releaseDate: new Date('2012-12-03').toJSON(),
    type: 'EP',
    tags: ['big-beat', 'remixes'],
  },
  validMinimalUpdateWithId: {
    _id: null,
    title: "You've Come a Very Long Way, Baby",
  },
  validMinimalUpdateWithCode: {
    code: null,
    title: 'The Slim of the Land',
  },
  expectedMinimalUpdate: {
    name: 'Gorillaz',
    formationYear: 1998,
    bio: 'Damon Albarn & Jamie Hewlett',
    tags: ['electro'],
  },
  validDuplicateTagsUpdate: {
    code: null,
    tags: ['big beat', 'BIG BEAT', ' big beat   '],
  },
  expectedDedupTagsUpdate: {
    tags: ['big-beat'],
  },
  invalidMissingId: {
    _id: undefined,
    title: "You've Come a Very Long Way, Baby",
  },
  invalidMissingCode: {
    code: undefined,
    title: 'The Slim of the Land',
  },
  invalidBothIdAndCode: {
    _id: null,
    code: null,
    title: "You've Come a Very Long Way, Baby",
  },
  invalidMismatchingId: {
    _id: 'dummy',
    title: "You've Come a Very Long Way, Baby",
  },
  invalidMismatchingCode: {
    code: 'dummy',
    title: 'The Slim of the Land',
  },
  invalidEmptyTitle: {
    _id: null,
    title: '',
  },
  invalidReleaseDate: {
    _id: null,
    releaseDate: new Date('2007-25-42'),
  },
  invalidMinReleaseDate: {
    _id: null,
    releaseDate: new Date('1899-12-31'),
  },
  invalidType: {
    _id: null,
    type: ['33 1/3 rpm'],
  },
  invalidUnknownField: {
    _id: null,
    title: "You've Come a Very Long Way, Baby",
    dummy: false,
  },
  invalidBadId: {
    _id: null,
    title: "You've Come a Very Long Way, Baby",
  },
  invalidUnknownId: {
    _id: null,
    title: "You've Come a Very Long Way, Baby",
  },
  invalidUnknownCode: {
    code: null,
    title: 'The Slim of the Land',
  },
  expectedMinimalUpdateWithId: {},
  expectedMinimalUpdateWithCode: {},
}

patchPayloads.expectedMinimalUpdateWithId = {
  ...patchPayloads.validCompleteAlbumWithId,
  title: patchPayloads.validMinimalUpdateWithId.title,
  tags: ['big-beat'],
}
patchPayloads.expectedMinimalUpdateWithCode = {
  ...patchPayloads.validCompleteAlbumWithCode,
  title: patchPayloads.validMinimalUpdateWithCode.title,
  tags: ['big-beat'],
}

describe('PATCH /albums', () => {
  beforeAll(async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validBandWithCode)
    postedBandCode = res.body.code
    bandIdsToClear.push(res.body._id)
    res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validBandWithId)
    postedBandId = res.body._id
    bandIdsToClear.push(postedBandId)
    res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validUnrelatedBand)
    postedUnrelatedBandId = res.body._id
    postedUnrelatedBandCode = res.body.code
    bandIdsToClear.push(postedUnrelatedBandId)
  })

  beforeEach(async () => {
    try {
      await Album.deleteMany({ code: postedAlbumCode })
    } catch (err) {
      console.log(err)
    }
    let res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(patchPayloads.validCompleteAlbumWithId)
    postedAlbumId = res.body._id
    res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(patchPayloads.validCompleteAlbumWithCode)
    postedAlbumCode = res.body.code
  })

  test('update an album', async () => {
    patchPayloads.validAlbumToUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumCode)
      .send(patchPayloads.validAlbumToUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedCompleteAlbumUpdate
    )
    expect(res.body.updatedAlbum.band).toMatchObject(
      patchPayloads.validBandWithCode
    )
  })
  test('update an album with id and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedAlbumId
    patchPayloads.expectedMinimalUpdateWithId._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithId
    )
  })
  test('update an album with code and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedAlbumCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumCode)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
  })
  test('update an album and returned json should not show band-albums recursion', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedAlbumCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumCode)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
    expect(res.body.updatedAlbum.band).toMatchObject(
      patchPayloads.validBandWithCode
    )
    expect(res.body.updatedAlbum.band).toHaveProperty('albums')
    expect(res.body.updatedAlbum.band.albums).not.toHaveProperty('band')
    expect(res.body.originalAlbum.band).toMatchObject(
      patchPayloads.validBandWithCode
    )
    expect(res.body.originalAlbum.band).toHaveProperty('albums')
    expect(res.body.originalAlbum.band.albums).not.toHaveProperty('band')
  })
  test('update an album with id and minimal information filtered by band', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedAlbumId
    patchPayloads.expectedMinimalUpdateWithId._id = postedAlbumId
    const res = await request(app)
      .patch(`/api/bands/${postedBandId}/albums/${postedAlbumId}`)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithId
    )
  })
  test('update an album with code and minimal information filtered by band', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedAlbumCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
  })
  test('dedup tags on album update', async () => {
    patchPayloads.validDuplicateTagsUpdate.code = postedAlbumCode
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumCode)
      .send(patchPayloads.validDuplicateTagsUpdate)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedAlbum).toMatchObject(
      patchPayloads.expectedDedupTagsUpdate
    )
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
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
      .patch('/api/albums/' + postedAlbumCode)
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
    patchPayloads.invalidBothIdAndCode._id = postedAlbumId
    patchPayloads.invalidBothIdAndCode.code = postedAlbumCode
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.bothKeys,
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: patchPayloads.invalidBothIdAndCode.code,
        urlKey: postedAlbumId,
      }),
    ])
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.idMismatch', {
        jsonId: patchPayloads.invalidMismatchingId._id,
        urlKey: postedAlbumId,
      }),
    ])
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumCode)
      .send(patchPayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.codeMismatch', {
        jsonCode: patchPayloads.invalidMismatchingCode.code,
        urlKey: postedAlbumCode,
      }),
    ])
  })
  test('throw error 400 on empty title', async () => {
    patchPayloads.invalidEmptyTitle._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidEmptyTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid releaseDate', async () => {
    patchPayloads.invalidReleaseDate._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidReleaseDate)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'album.errors.props.releaseDate.invalid', {
        date: null,
      }),
    ])
  })
  test('throw error 400 on releaseDate before 1900', async () => {
    patchPayloads.invalidMinReleaseDate._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidMinReleaseDate)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.album.errors.props.releaseDate.min,
    ])
  })
  test('throw error 400 on invalid type', async () => {
    patchPayloads.invalidType._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidType)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.album.errors.validation
    )
  })
  test('throw error 400 on unknown posted fields', async () => {
    patchPayloads.invalidUnknownField._id = postedAlbumId
    const res = await request(app)
      .patch('/api/albums/' + postedAlbumId)
      .send(patchPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.invalidFields
    )
  })
  test('throw error 400 on invalid id', async () => {
    patchPayloads.invalidBadId._id = postedAlbumId.slice(1)
    const res = await request(app)
      .patch('/api/albums/' + patchPayloads.invalidBadId._id)
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
      postedAlbumId.slice(1) + postedAlbumId.charAt(0)
    const res = await request(app)
      .patch('/api/albums/' + patchPayloads.invalidUnknownId._id)
      .send(patchPayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'album',
        keyName: '_id',
        keyValue: patchPayloads.invalidUnknownId._id,
      })
    )
  })
  test('throw error 404 on unknown code', async () => {
    patchPayloads.invalidUnknownCode.code =
      postedAlbumCode.slice(1) + postedAlbumCode.charAt(0)
    const res = await request(app)
      .patch('/api/albums/' + patchPayloads.invalidUnknownCode.code)
      .send(patchPayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'album',
        keyName: 'code',
        keyValue: patchPayloads.invalidUnknownCode.code,
      })
    )
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedAlbumId
    const res = await request(app)
      .patch(`/api/bands/${postedUnrelatedBandId}/albums/${postedAlbumId}`)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelMismatch',
        {
          relatedModelName: 'Band',
          key: postedUnrelatedBandId,
          relatedModelNameLowerCase: 'band',
        }
      )
    )
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch(`/api/bands/${postedUnrelatedBandCode}/albums/${postedAlbumCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelMismatch',
        {
          relatedModelName: 'Band',
          key: postedUnrelatedBandCode,
          relatedModelNameLowerCase: 'band',
        }
      )
    )
  })
  test('throw error 404 on unknown related band (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedAlbumId
    const res = await request(app)
      .patch(
        `/api/bands/${
          postedBandId.slice(1) + postedBandId.charAt(0)
        }/albums/${postedAlbumId}`
      )
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandId.slice(1) + postedBandId.charAt(0),
        }
      )
    )
  })
  test('throw error 404 on unknown related band (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedAlbumCode
    const res = await request(app)
      .patch(`/api/bands/${postedBandCode.slice(1)}/albums/${postedAlbumCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandCode.slice(1),
        }
      )
    )
  })

  afterAll(async () => {
    try {
      await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] })
    } catch (err) {
      console.log(err)
    }
    bandIdsToClear = []
  })
})

const deletePayloads = {
  validCompleteBand: {
    name: 'The Verve',
    formationYear: 1990,
    bio: 'Longtemps considéré comme un des groupes les plus innovants et captivants de la scène pop contemporaine britannique, The Verve fit finalement surface en 1997 avec le tube Bitter Sweet Symphony.',
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
    try {
      await Album.deleteMany({ code: postedAlbumCode })
    } catch (err) {
      console.log(err)
    }
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
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
  })
  test('delete an album with code', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
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
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
  })
  test('delete an album with id filtered by band', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/bands/${postedBandId}/albums/${postedAlbumId}`)
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
  })
  test('delete an album with code filtered by band', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
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
    expect(res.body.success).toEqual(
      app.locals.translations.en.album.success.delete
    )
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedBandId}`)
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
      .delete(`/api/albums/${postedBandCode}`)
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
    deletePayloads.invalidBothIdAndCode._id = postedAlbumId
    deletePayloads.invalidBothIdAndCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}`)
      .send(deletePayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      app.locals.translations.en.json.errors.validation.bothKeys,
      t(app.locals.translations.en, 'json.errors.validation.idMismatch', {
        jsonId: deletePayloads.invalidBothIdAndCode._id,
        urlKey: postedAlbumCode,
      }),
      t(app.locals.translations.en, 'json.errors.validation.invalidId', {
        invalidId: postedAlbumCode,
      }),
    ])
  })
  test('throw error 400 on missing title', async () => {
    deletePayloads.invalidMissingTitle._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMissingTitle)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.mandatoryKey', {
        mandatoryKey: 'title',
      }),
    ])
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      app.locals.translations.en.json.errors.validation.failed
    )
    expect(res.body.messages).toEqual([
      t(app.locals.translations.en, 'json.errors.validation.idMismatch', {
        jsonId: deletePayloads.invalidMismatchingId._id,
        urlKey: postedAlbumId,
      }),
    ])
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .delete(`/api/albums/${postedBandCode}`)
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
  test('throw error 400 on mismatching title', async () => {
    deletePayloads.invalidMismatchingTitle._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}`)
      .send(deletePayloads.invalidMismatchingTitle)
    expect(res.statusCode).toEqual(400)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.mandatoryKeyMismatch',
        {
          modelName: 'Album',
          keyName: '_id',
          keyValue: deletePayloads.invalidMismatchingTitle._id,
          mandatoryKey: 'title',
        }
      )
    )
  })
  test('throw error 400 on invalid id', async () => {
    deletePayloads.invalidBadId._id = postedAlbumId.slice(1)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidBadId._id)
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
      postedAlbumId.slice(1) + postedAlbumId.charAt(0)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidUnknownId._id)
      .send(deletePayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'album',
        keyName: '_id',
        keyValue: deletePayloads.invalidUnknownId._id,
      })
    )
  })
  test('throw error 404 on unknown code', async () => {
    deletePayloads.invalidUnknownCode.code =
      postedAlbumCode.slice(1) + postedAlbumCode.charAt(0)
    const res = await request(app)
      .delete('/api/albums/' + deletePayloads.invalidUnknownCode.code)
      .send(deletePayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(app.locals.translations.en, 'json.errors.validation.modelNotFound', {
        modelName: 'album',
        keyName: 'code',
        keyValue: deletePayloads.invalidUnknownCode.code,
      })
    )
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    deletePayloads.validAlbumToDeleteWithId._id = postedAlbumId
    const res = await request(app)
      .delete(`/api/bands/${postedUnrelatedBandId}/albums/${postedAlbumId}`)
      .send(deletePayloads.validAlbumToDeleteWithId)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelMismatch',
        {
          relatedModelName: 'Band',
          key: postedUnrelatedBandId,
          relatedModelNameLowerCase: 'band',
        }
      )
    )
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedUnrelatedBandCode}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelMismatch',
        {
          relatedModelName: 'Band',
          key: postedUnrelatedBandCode,
          relatedModelNameLowerCase: 'band',
        }
      )
    )
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
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandId.slice(1) + postedBandId.charAt(0),
        }
      )
    )
  })
  test('throw error 404 on unknown related band (code)', async () => {
    deletePayloads.validAlbumToDeleteWithCode.code = postedAlbumCode
    const res = await request(app)
      .delete(`/api/bands/${postedBandCode.slice(1)}/albums/${postedAlbumCode}`)
      .send(deletePayloads.validAlbumToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
    expect(res.body.error).toEqual(
      t(
        app.locals.translations.en,
        'json.errors.validation.relatedModelNotFound',
        {
          relatedModelName: 'band',
          key: postedBandCode.slice(1),
        }
      )
    )
  })

  afterAll(async () => {
    try {
      await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] })
    } catch (err) {
      console.log(err)
    }
    bandIdsToClear = []
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../app')
const { Album } = require('./models/Album')
const Band = require('./models/Band')
const Song = require('./models/Song')

let postedBandId,
  postedBandCode,
  postedUnrelatedBandId,
  postedUnrelatedBandCode,
  postedAlbumId,
  postedAlbumCode,
  postedUnrelatedAlbumId,
  postedUnrelatedAlbumCode,
  postedSongId,
  postedSongCode,
  bandIdsToClear = [],
  albumIdsToClear = []
const postPayloads = {
  validBand: {
    name: `Noel Gallagher's High Flying Birds`,
    formationYear: 2010,
    bio: `Noel Gallagher's High Flying Birds est un groupe de rock britannique formé par Noel Gallagher, de l'ancien pianiste du groupe Oasis Mark Rowe, du batteur Jeremy Stacey de The Lemon Tree, et du bassiste Russell Pritchard.`,
    tags: ['rock', 'alternative-rock'],
  },
  validAlbumWithId: {
    title: `Noel Gallagher's High Flying Birds`,
    releaseDate: new Date('2011-10-17').toJSON(),
    type: 'Studio',
    tags: ['alternative-rock'],
  },
  validAlbumWithCode: {
    title: 'Chasing Yesterday',
    releaseDate: new Date('2015-02-25').toJSON(),
    type: 'Studio',
    tags: ['alternative-rock', 'psychedelic-rock'],
  },
  validSongCollectionForAlbumPostedById: new Map([
    [
      1,
      {
        title: `Everybody's on the Run`,
        position: 1,
      },
    ],
    [
      2,
      {
        title: 'Dream On',
        position: 2,
      },
    ],
  ]),
  validSongCollectionForAlbumPostedByCode: new Map([
    [
      1,
      {
        title: 'Riverman',
        position: 1,
      },
    ],
    [
      2,
      {
        title: 'Do the Damage',
        position: 11,
      },
    ],
  ]),
  validCompleteSong: {
    title: '   Lock All the Doors',
    position: 4,
    duration: '3:01',
    singers: ' Noel Gallagher  ',
    lyrics: `     She wore a star-shaped tambourine
    Prettiest girl I'd ever seen
    Was standing lost and lonely on the shore
    I tried to catch her every night
    Dancing on the road in her candlelight
    But I can't seem to reach her anymore
    Lock all the doors
    Maybe they'll never find us
    I could be sure, like never before, this time   `,
    myRating: 8,
  },
  validSongWithDurationAndRating: {
    title: 'The Right Stuff',
    position: 6,
    duration: '5:27',
    myRating: 7,
  },
  validSameSongTitles: new Map([
    [
      1,
      {
        title: 'In the Heat of the Moment',
        position: 2,
        duration: '3:29',
      },
    ],
    [
      2,
      {
        title: 'In the Heat of the Moment',
        position: 14,
        duration: '5:58',
      },
    ],
  ]),
  invalidNoTitle: {
    position: 3,
  },
  invalidEmptyTitle: {
    title: undefined,
    position: 3,
  },
  invalidNoPosition: {
    title: 'The Girl with X-Ray Eyes',
  },
  invalidDuplicatePosition: new Map([
    [
      'duplicate',
      {
        title: 'While the Song Remains the Same',
        position: 7,
      },
    ],
    [
      'samePositionDifferentAlbum',
      {
        title: 'Soldier Boys and Jesus Freaks',
        position: 7,
      },
    ],
  ]),
  invalidPositions: [
    {
      title: 'The Girl with X-Ray Eyes',
      position: 1.5,
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: -1,
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 'a',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: undefined,
    },
  ],
  invalidDurations: [
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: '3',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: '3:',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: ':20',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: '-3:20',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: '3:61',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: 'a',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      duration: null,
    },
  ],
  invalidMyRatings: [
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      myRating: -1,
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      myRating: 5.5,
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      myRating: 11,
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      myRating: 'a',
    },
    {
      title: 'The Girl with X-Ray Eyes',
      position: 3,
      myRating: null,
    },
  ],
  invalidUnknownField: {
    title: 'The Right Stuff',
    position: 6,
    duration: '05:27',
    dummy: false,
  },
  expectedSongCollectionForAlbumPostedById: new Map(),
  expectedSongCollectionForAlbumPostedByCode: new Map(),
  expectedCompleteSong: {},
  expectedSongWithDurationAndRating: {},
}

postPayloads.validSongCollectionForAlbumPostedById.forEach((song, key) => {
  let { title, position } = song
  postPayloads.expectedSongCollectionForAlbumPostedById.set(key, {
    title,
    position,
    duration: null,
    rating: null,
  })
})
postPayloads.validSongCollectionForAlbumPostedByCode.forEach((song, key) => {
  let { title, position } = song
  postPayloads.expectedSongCollectionForAlbumPostedByCode.set(key, {
    title,
    position,
    duration: null,
    rating: null,
  })
})

postPayloads.expectedCompleteSong = {
  ...postPayloads.validCompleteSong,
  title: 'Lock All the Doors',
  duration: '03:01',
  singers: 'Noel Gallagher',
  lyrics: `She wore a star-shaped tambourine
Prettiest girl I'd ever seen
Was standing lost and lonely on the shore
I tried to catch her every night
Dancing on the road in her candlelight
But I can't seem to reach her anymore
Lock all the doors
Maybe they'll never find us
I could be sure, like never before, this time`,
  rating: '8.00',
}
/* TODO: remove this when the user resource is implemented */
delete postPayloads.expectedCompleteSong.myRating

postPayloads.expectedSongWithDurationAndRating = {
  ...postPayloads.validSongWithDurationAndRating,
  duration: '05:27',
  rating: '7.00',
}
/* TODO: remove this when the user resource is implemented */
delete postPayloads.expectedSongWithDurationAndRating.myRating

beforeAll(async () => {
  let res = await request(app).post('/api/bands').send(postPayloads.validBand)
  postedBandId = res.body._id
  postedBandCode = res.body.code
  bandIdsToClear.push(res.body._id)
  res = await request(app)
    .post(`/api/bands/${postedBandId}/albums`)
    .send(postPayloads.validAlbumWithId)
  postedAlbumId = res.body._id
  albumIdsToClear.push(res.body._id)
  res = await request(app)
    .post(`/api/bands/${postedBandCode}/albums`)
    .send(postPayloads.validAlbumWithCode)
  postedAlbumCode = res.body.code
  albumIdsToClear.push(res.body._id)
})

describe('POST /songs', () => {
  test('create a song with minimal information using album id', async () => {
    let res = await request(app)
      .post(`/api/bands/${postedBandId}/albums/${postedAlbumId}/songs`)
      .send(postPayloads.validSongCollectionForAlbumPostedById.get(1))
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.expectedSongCollectionForAlbumPostedById.get(1)
    )
    expect(res.body.album).toMatchObject(postPayloads.validAlbumWithId)
    expect(res.body.album.band).toMatchObject(postPayloads.validBand)
    res = await request(app)
      .post(`/api/albums/${postedAlbumId}/songs`)
      .send(postPayloads.validSongCollectionForAlbumPostedById.get(2))
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.expectedSongCollectionForAlbumPostedById.get(2)
    )
    expect(res.body.album).toMatchObject(postPayloads.validAlbumWithId)
    expect(res.body.album.band).toMatchObject(postPayloads.validBand)
  })
  test('create a song with minimal information using album code', async () => {
    let res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validSongCollectionForAlbumPostedByCode.get(1))
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.expectedSongCollectionForAlbumPostedByCode.get(1)
    )
    expect(res.body.album).toMatchObject(postPayloads.validAlbumWithCode)
    expect(res.body.album.band).toMatchObject(postPayloads.validBand)
    res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validSongCollectionForAlbumPostedByCode.get(2))
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.expectedSongCollectionForAlbumPostedByCode.get(2)
    )
    expect(res.body.album).toMatchObject(postPayloads.validAlbumWithCode)
    expect(res.body.album.band).toMatchObject(postPayloads.validBand)
  })
  test('create a song with full information', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validCompleteSong)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(postPayloads.expectedCompleteSong)
    expect(res.body.album).toMatchObject(postPayloads.validAlbumWithCode)
    expect(res.body.album.band).toMatchObject(postPayloads.validBand)
  })
  test('create a song and returned json should not show hidden props', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validSongWithDurationAndRating)
    expect(res.statusCode).toEqual(201)
    expect(res.body).toMatchObject(
      postPayloads.expectedSongWithDurationAndRating
    )
    expect(res.body).not.toHaveProperty('voters')
    expect(res.body).not.toHaveProperty('ratingSum')
  })
  test('create songs with the same title and get unique codes', async () => {
    let res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validSameSongTitles.get(1))
    expect(res.statusCode).toEqual(201)
    let firstSongCode = res.body.code
    res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.validSameSongTitles.get(2))
    expect(res.statusCode).toEqual(201)
    expect(res.body.code).not.toEqual(firstSongCode)
  })
  test('show created songs in related album', async () => {
    const res = await request(app).get(`/api/albums/${postedAlbumId}`)
    expect(res.body[0].songs).toMatchObject([
      postPayloads.validSongCollectionForAlbumPostedById.get(1),
      postPayloads.validSongCollectionForAlbumPostedById.get(2),
    ])
  })
  test('throw error 400 on missing song title key', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidNoTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on empty song title', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidEmptyTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing song position key', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidNoPosition)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 for two songs with same position', async () => {
    let res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidDuplicatePosition.get('duplicate'))
    expect(res.statusCode).toEqual(201)
    res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidDuplicatePosition.get('duplicate'))
    expect(res.statusCode).toEqual(400)
    expect(res.body.duplicateSongPosition).toMatchObject(
      postPayloads.invalidDuplicatePosition.get('duplicate')
    )
    res = await request(app)
      .post(`/api/albums/${postedAlbumId}/songs`)
      .send(
        postPayloads.invalidDuplicatePosition.get('samePositionDifferentAlbum')
      )
    expect(res.statusCode).toEqual(201)
  })
  test.each(postPayloads.invalidPositions)(
    'throw error 400 on invalid song position',
    async (json) => {
      let res = await request(app)
        .post(`/api/albums/${postedAlbumCode}/songs`)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test.each(postPayloads.invalidDurations)(
    'throw error 400 on invalid song duration',
    async (json) => {
      let res = await request(app)
        .post(`/api/albums/${postedAlbumCode}/songs`)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test.each(postPayloads.invalidMyRatings)(
    'throw error 400 on invalid song myRating',
    async (json) => {
      let res = await request(app)
        .post(`/api/albums/${postedAlbumCode}/songs`)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test('throw error 404 on unknown album id', async () => {
    const res = await request(app)
      .post(
        `/api/albums/${postedAlbumId.slice(1) + postedAlbumId.charAt(0)}/songs`
      )
      .send(postPayloads.validCompleteSong)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown album code', async () => {
    const res = await request(app)
      .post(
        `/api/albums/${
          postedAlbumCode.slice(1) + postedAlbumCode.charAt(0)
        }/songs`
      )
      .send(postPayloads.validCompleteSong)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 400 on unknown posted fields', async () => {
    const res = await request(app)
      .post(`/api/albums/${postedAlbumCode}/songs`)
      .send(postPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
  })

  afterAll(async () => {
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
    await Album.deleteMany({ $or: [{ _id: albumIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    albumIdsToClear = []
  })
})

const deletePayloads = {
  validCompleteBand: {
    name: 'Etienne de Crécy',
    formationYear: 1992,
    bio:
      'Avec Super Discount en 1996, Etienne de Crécy contribue grandement à populariser la French touch.',
    tags: ['french-touch'],
  },
  validUnrelatedBand: {
    name: 'Kavinsky',
  },
  validCompleteAlbum: {
    title: 'Super Discount',
    releaseDate: new Date('1996-10-16').toJSON(),
    type: 'Studio',
    tags: ['house'],
  },
  validUnrelatedAlbum: {
    title: 'Super Discount 2',
  },
  validSongToDeleteWithId: {
    _id: null,
    title: 'Tout Doit Disparaître',
    position: 6,
  },
  validSongToDeleteWithCode: {
    code: null,
    title: 'Tout Doit Disparaître',
    position: 6,
  },
  validOtherSongs: new Map([
    [
      1,
      {
        title: 'Le patron est devenu fou',
        position: 1,
        duration: '10:07',
      },
    ],
    [
      2,
      {
        title: 'Prix choc',
        position: 2,
        duration: '08:52',
      },
    ],
  ]),
  invalidMissingId: {
    _id: undefined,
    title: 'Tout Doit Disparaître',
  },
  invalidMissingCode: {
    code: undefined,
    title: 'Liquidation Totale',
  },
  invalidMissingTitle: {
    _id: null,
    title: null,
  },
  invalidBothIdAndCode: {
    id: null,
    code: null,
    title: 'Liquidation Totale',
  },
  invalidMismatchingId: {
    _id: 'dummy',
    title: 'Tout Doit Disparaître',
  },
  invalidMismatchingCode: {
    code: 'dummy',
    title: 'Liquidation Totale',
  },
  invalidMismatchingTitle: {
    _id: null,
    title: 'Destockage Massif',
  },
  invalidBadId: {
    _id: null,
    title: 'Tout Doit Disparaître',
  },
  invalidUnknownId: {
    _id: null,
    title: 'Tout Doit Disparaître',
  },
  invalidUnknownCode: {
    code: null,
    title: 'Liquidation Totale',
  },
}

describe('DELETE /songs', () => {
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
      .send(deletePayloads.validCompleteAlbum)
    postedAlbumId = res.body._id
    postedAlbumCode = res.body.code
    albumIdsToClear.push(postedAlbumId)
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(deletePayloads.validUnrelatedAlbum)
    postedUnrelatedAlbumId = res.body._id
    postedUnrelatedAlbumCode = res.body.code
    albumIdsToClear.push(res.body._id)
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums/${postedAlbumId}/songs`)
      .send(deletePayloads.validOtherSongs.get(1))
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums/${postedAlbumId}/songs`)
      .send(deletePayloads.validOtherSongs.get(2))
  })

  beforeEach(async () => {
    await Song.deleteMany({ code: postedSongCode }, (err) => {
      if (err) console.log(err)
    })
    let res = await request(app)
      .post(`/api/bands/${postedBandId}/albums/${postedAlbumId}/songs`)
      .send(deletePayloads.validSongToDeleteWithId)
    postedSongId = res.body._id
    postedSongCode = res.body.code
  })

  test('delete a song with id', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(`/api/songs/${postedSongId}`)
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song with code', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song and returned json should not show album-songs recursion', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.deleted.album).toMatchObject(
      deletePayloads.validCompleteAlbum
    )
    expect(res.body.deleted.album.band).toMatchObject(
      deletePayloads.validCompleteBand
    )
    expect(res.body.deleted.album).toHaveProperty('songs')
    expect(res.body.deleted.album.songs).not.toHaveProperty('album')
  })
  test('delete a song with id filtered by album', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumId}/songs/${postedSongId}`)
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song with code filtered by album', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song with id filtered by band and album', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(
        `/api/bands/${postedBandId}/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song with code filtered by band and album', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(
        `/api/bands/${postedBandCode}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
  })
  test('delete a song and show the remaining ones from the related album', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode}/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.deleted.album.songs).toMatchObject([
      deletePayloads.validOtherSongs.get(1),
      deletePayloads.validOtherSongs.get(2),
    ])
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .delete(`/api/songs/${postedSongId}`)
      .send(deletePayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .delete(`/api/songs/${postedSongCode}`)
      .send(deletePayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    deletePayloads.invalidBothIdAndCode._id = postedSongId
    deletePayloads.invalidBothIdAndCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/songs/${postedSongCode}`)
      .send(deletePayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing title', async () => {
    deletePayloads.invalidMissingTitle._id = postedSongId
    const res = await request(app)
      .delete(`/api/songs/${postedSongId}`)
      .send(deletePayloads.invalidMissingTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .delete(`/api/songs/${postedSongId}`)
      .send(deletePayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .delete(`/api/songs/${postedSongCode}`)
      .send(deletePayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching title', async () => {
    deletePayloads.invalidMismatchingTitle._id = postedSongId
    const res = await request(app)
      .delete(`/api/songs/${postedSongId}`)
      .send(deletePayloads.invalidMismatchingTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on invalid id', async () => {
    deletePayloads.invalidBadId._id = postedSongId.slice(1)
    const res = await request(app)
      .delete('/api/songs/' + deletePayloads.invalidBadId._id)
      .send(deletePayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 404 on unknown id', async () => {
    deletePayloads.invalidUnknownId._id =
      postedSongId.slice(1) + postedSongId.charAt(0)
    const res = await request(app)
      .delete('/api/songs/' + deletePayloads.invalidUnknownId._id)
      .send(deletePayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown code', async () => {
    deletePayloads.invalidUnknownCode.code =
      postedSongCode.slice(1) + postedSongCode.charAt(0)
    const res = await request(app)
      .delete('/api/songs/' + deletePayloads.invalidUnknownCode.code)
      .send(deletePayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related album (id)', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(`/api/albums/${postedUnrelatedAlbumId}/songs/${postedSongId}`)
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related album (code)', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/albums/${postedUnrelatedAlbumCode}/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related album (id)', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(
        `/api/albums/${
          postedAlbumId.slice(1) + postedAlbumId.charAt(0)
        }/songs/${postedSongId}`
      )
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related album (code)', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(`/api/albums/${postedAlbumCode.slice(1)}/songs/${postedSongCode}`)
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(
        `/api/bands/${postedUnrelatedBandId}/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(
        `/api/bands/${postedUnrelatedBandCode}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (id)', async () => {
    deletePayloads.validSongToDeleteWithId._id = postedSongId
    const res = await request(app)
      .delete(
        `/api/bands/${
          postedBandId.slice(1) + postedBandId.charAt(0)
        }/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(deletePayloads.validSongToDeleteWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (code)', async () => {
    deletePayloads.validSongToDeleteWithCode.code = postedSongCode
    const res = await request(app)
      .delete(
        `/api/bands/${postedBandCode.slice(
          1
        )}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(deletePayloads.validSongToDeleteWithCode)
    expect(res.statusCode).toEqual(404)
  })

  afterAll(async () => {
    await Album.deleteMany({ $or: [{ _id: albumIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    albumIdsToClear = []
    await Band.deleteMany({ $or: [{ _id: bandIdsToClear }] }, (err) => {
      if (err) console.log(err)
    })
    bandIdsToClear = []
  })
})

afterAll(async () => {
  await mongoose.connection.close()
})

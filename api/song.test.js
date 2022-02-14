'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../app')
const { Album } = require('./models/Album')
const Band = require('./models/Band')

let postedBandId,
  postedBandCode,
  postedAlbumId,
  postedAlbumCode,
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

afterAll(async () => {
  await mongoose.connection.close()
})

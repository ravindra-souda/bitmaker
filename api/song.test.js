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

const patchPayloads = {
  validBandWithCode: {
    name: 'London Grammar',
    formationYear: 2009,
    bio:
      "La musique de London Grammar est minimaliste, mélange d'ambiances électroniques, soul et parfois plus classiques.",
    tags: ['indie-pop', 'electro'],
  },
  validBandWithId: {
    name: 'Clean Bandit',
    formationYear: 2008,
    bio:
      "Clean Bandit a connu le succès en mélangeant la musique classique et l'electro pour créer un son rythmé, souvent accompagné de guests de renom.",
    tags: ['electro-pop', 'house'],
  },
  validAlbumWithCode: {
    title: 'If You Wait',
    releaseDate: new Date('2013-09-06').toJSON(),
    type: 'Studio',
    tags: ['electro', 'downtempo'],
  },
  validAlbumWithId: {
    title: 'What Is Love?',
    releaseDate: new Date('2018-11-30').toJSON(),
    type: 'Studio',
    tags: ['electro'],
  },
  validCompleteSongWithCode: {
    title: 'Wasting My Young Years',
    position: 4,
    duration: '03:24',
    singers: 'Hannah Reid',
    lyrics: `You crossed this line
Do you find it hard to sit with me tonight?
I've walked these miles, but I've walked them straight lined
You'll never know what it's like to be
Fine

And I'm wasting my young years
It doesn't matter if I'm chasing old ideas
It doesn't matter if, maybe, we are, we are
Maybe I'm wasting my young years
Maybe, we are, we are
Maybe I'm wasting my young years`,
    myRating: 9,
  },
  validCompleteSongWithId: {
    title: 'I Miss You',
    position: 11,
    duration: '03:25',
    singers: 'Julia Michaels',
    lyrics: `I know you're out in Cabo
Hanging with your brother
Wishin' that I was your bottle
So I could be close to your lips again
I know you didn't call your parents and tell 'em that we ended
'Cause you know that they'd be offended
Did you not want to tell 'em it's the end?

And I know we're not supposed to talk
But I'm getting ahead of myself
I get scared when we're not
'Cause I'm scared you're with somebody else
So, I guess that it's gone
And I just keep lying to myself
Oh, I can't believe it, I-

I miss you, yeah, I miss you
I miss you, yeah, I miss you, oh, I do
I miss you, yeah, I miss you
Though I’m tryin’ not to right now`,
    myRating: 8,
  },
  validSongToUpdateWithCode: {
    title: '    Wasting My Young Years (Kids of the Apocalypse Remix)  ',
    position: 88,
    duration: '3:05',
    singers: '  Hannah Felicity May Reid ',
    lyrics: `Baby I'm wasting my young years
    Baby I'm wasting
      Baby I'm wasting
        Baby I'm wasting
          Baby I'm wasting
    My young years`,
    myRating: 6,
  },
  expectedCompleteSongUpdate: {
    title: 'Wasting My Young Years (Kids of the Apocalypse Remix)',
    position: 88,
    duration: '03:05',
    singers: 'Hannah Felicity May Reid',
    lyrics: `Baby I'm wasting my young years
Baby I'm wasting
Baby I'm wasting
Baby I'm wasting
Baby I'm wasting
My young years`,
    rating: '7.50',
  },
  validMinimalUpdateWithId: {
    _id: null,
    title: 'I Miss You feat. Julia Michaels',
    position: 12,
  },
  validMinimalUpdateWithCode: {
    code: null,
    title: 'Wasting My Old Years',
    position: 99,
  },
  invalidMissingId: {
    _id: undefined,
    title: "I Don't Really Miss You",
  },
  invalidMissingCode: {
    code: undefined,
    title: 'Wasting My Old Years',
  },
  invalidBothIdAndCode: {
    _id: null,
    code: null,
    title: 'Wasting My Old Years',
  },
  invalidMismatchingId: {
    _id: 'dummy',
    title: "I Don't Really Miss You",
  },
  invalidMismatchingCode: {
    code: 'dummy',
    title: 'Wasting My Old Years',
  },
  invalidEmptyTitle: {
    _id: null,
    title: '',
  },
  invalidDuplicatePosition: new Map([
    [
      'duplicate',
      {
        title: 'Solo',
        position: 3,
      },
    ],
    [
      'samePositionSameAlbum',
      {
        _id: null,
        title: 'I Miss You',
        position: 3,
      },
    ],
    [
      'samePositionDifferentAlbum',
      {
        code: null,
        title: 'Wasting My Young Years',
        position: 3,
      },
    ],
    [
      'sameSongTitleEdited',
      {
        code: null,
        title: 'Wasting My Old Years',
        position: 3,
      },
    ],
  ]),
  invalidPositions: [
    {
      code: null,
      title: 'Wasting My Old Years',
      position: 9.75,
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      position: 0,
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      position: '?',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      position: null,
    },
  ],
  invalidDurations: [
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: '4',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: '4:',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: ':44',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: '-4:44',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: '4:61',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: '!',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      duration: null,
    },
  ],
  invalidMyRatings: [
    {
      code: null,
      title: 'Wasting My Old Years',
      myRating: -4,
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      myRating: 8.5,
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      myRating: 42,
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      myRating: '*',
    },
    {
      code: null,
      title: 'Wasting My Old Years',
      myRating: null,
    },
  ],
  invalidUnknownField: {
    _id: null,
    title: 'Wasting My Old Years',
    dummy: false,
  },
  invalidBadId: {
    _id: null,
    title: 'Wasting My Old Years',
  },
  invalidUnknownId: {
    _id: null,
    title: 'Wasting My Old Years',
  },
  invalidUnknownCode: {
    code: null,
    title: "I Don't Really Miss You",
  },
  expectedMinimalUpdateWithId: {},
  expectedMinimalUpdateWithCode: {},
}

patchPayloads.expectedMinimalUpdateWithId = {
  ...patchPayloads.validCompleteSongWithId,
  title: patchPayloads.validMinimalUpdateWithId.title,
  position: patchPayloads.validMinimalUpdateWithId.position,
  rating: '8.00',
}
/* TODO: remove this when the user resource is implemented */
delete patchPayloads.expectedMinimalUpdateWithId.myRating

patchPayloads.expectedMinimalUpdateWithCode = {
  ...patchPayloads.validCompleteSongWithCode,
  title: patchPayloads.validMinimalUpdateWithCode.title,
  position: patchPayloads.validMinimalUpdateWithCode.position,
  rating: '9.00',
}
/* TODO: remove this when the user resource is implemented */
delete patchPayloads.expectedMinimalUpdateWithCode.myRating

describe('PATCH /songs', () => {
  beforeAll(async () => {
    let res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validBandWithCode)
    postedBandCode = res.body.code
    bandIdsToClear.push(res.body._id)
    res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums`)
      .send(patchPayloads.validAlbumWithCode)
    postedAlbumCode = res.body.code
    albumIdsToClear.push(res.body._id)
    res = await request(app)
      .post('/api/bands')
      .send(patchPayloads.validBandWithId)
    postedBandId = res.body._id
    bandIdsToClear.push(res.body._id)
    res = await request(app)
      .post(`/api/bands/${postedBandId}/albums`)
      .send(patchPayloads.validAlbumWithId)
    postedAlbumId = res.body._id
    albumIdsToClear.push(res.body._id)
  })

  beforeEach(async () => {
    await Song.deleteMany(
      { $or: [{ _id: postedSongId }, { code: postedSongCode }] },
      (err) => {
        if (err) console.log(err)
      }
    )
    let res = await request(app)
      .post(`/api/bands/${postedBandId}/albums/${postedAlbumId}/songs`)
      .send(patchPayloads.validCompleteSongWithId)
    postedSongId = res.body._id
    res = await request(app)
      .post(`/api/bands/${postedBandCode}/albums/${postedAlbumCode}/songs`)
      .send(patchPayloads.validCompleteSongWithCode)
    postedSongCode = res.body.code
  })

  test('update a song', async () => {
    patchPayloads.validSongToUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch('/api/songs/' + postedSongCode)
      .send(patchPayloads.validSongToUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedCompleteSongUpdate
    )
    expect(res.body.updatedSong.album).toMatchObject(
      patchPayloads.validAlbumWithCode
    )
    expect(res.body.updatedSong.album.band).toMatchObject(
      patchPayloads.validBandWithCode
    )
  })
  test('update a song with id and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    patchPayloads.expectedMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithId
    )
  })
  test('update a song with code and minimal information', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch('/api/songs/' + postedSongCode)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
  })
  test('update a song and returned json should not show album-songs recursion', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch('/api/songs/' + postedSongCode)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
    expect(res.body.updatedSong.album).toMatchObject(
      patchPayloads.validAlbumWithCode
    )
    expect(res.body.updatedSong.album).toHaveProperty('songs')
    expect(res.body.updatedSong.album.songs).not.toHaveProperty('album')
    expect(res.body.originalSong.album).toMatchObject(
      patchPayloads.validAlbumWithCode
    )
    expect(res.body.originalSong.album).toHaveProperty('songs')
    expect(res.body.originalSong.album.songs).not.toHaveProperty('album')
  })
  test('update a song with id and minimal information filtered by album', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    patchPayloads.expectedMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(`/api/albums/${postedAlbumId}/songs/${postedSongId}`)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithId
    )
  })
  test('update a song with code and minimal information filtered by album', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(`/api/albums/${postedAlbumCode}/songs/${postedSongCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
  })
  test('update a song with id and minimal information filtered by band and album', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    patchPayloads.expectedMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(
        `/api/bands/${postedBandId}/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithId
    )
  })
  test('update a song with code and minimal information filtered by band and album', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    patchPayloads.expectedMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(
        `/api/bands/${postedBandCode}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.expectedMinimalUpdateWithCode
    )
  })
  test('throw error 400 on missing id', async () => {
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.invalidMissingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on missing code', async () => {
    const res = await request(app)
      .patch('/api/songs/' + postedSongCode)
      .send(patchPayloads.invalidMissingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 when JSON contains both id and code', async () => {
    patchPayloads.invalidBothIdAndCode._id = postedSongId
    patchPayloads.invalidBothIdAndCode.code = postedSongCode
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.invalidBothIdAndCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching id', async () => {
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.invalidMismatchingId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on mismatching code', async () => {
    const res = await request(app)
      .patch('/api/songs/' + postedSongCode)
      .send(patchPayloads.invalidMismatchingCode)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 on empty title', async () => {
    patchPayloads.invalidEmptyTitle._id = postedSongId
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.invalidEmptyTitle)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 400 for two songs with same position', async () => {
    let res = await request(app)
      .post(`/api/albums/${postedAlbumId}/songs`)
      .send(patchPayloads.invalidDuplicatePosition.get('duplicate'))
    expect(res.statusCode).toEqual(201)
    patchPayloads.invalidDuplicatePosition.get(
      'samePositionSameAlbum'
    )._id = postedSongId
    res = await request(app)
      .patch(`/api/albums/${postedAlbumId}/songs/${postedSongId}`)
      .send(patchPayloads.invalidDuplicatePosition.get('samePositionSameAlbum'))
    expect(res.statusCode).toEqual(400)
    expect(res.body.duplicateSongPosition).toMatchObject(
      patchPayloads.invalidDuplicatePosition.get('duplicate')
    )
    patchPayloads.invalidDuplicatePosition.get(
      'samePositionDifferentAlbum'
    ).code = postedSongCode
    res = await request(app)
      .patch(`/api/albums/${postedAlbumCode}/songs/${postedSongCode}`)
      .send(
        patchPayloads.invalidDuplicatePosition.get('samePositionDifferentAlbum')
      )
    expect(res.statusCode).toEqual(200)
    expect(res.body.updatedSong).toMatchObject(
      patchPayloads.invalidDuplicatePosition.get('samePositionDifferentAlbum')
    )
    patchPayloads.invalidDuplicatePosition.get(
      'sameSongTitleEdited'
    ).code = postedSongCode
    res = await request(app)
      .patch(`/api/albums/${postedAlbumCode}/songs/${postedSongCode}`)
      .send(patchPayloads.invalidDuplicatePosition.get('sameSongTitleEdited'))
    expect(res.statusCode).toEqual(200)
  })
  test.each(patchPayloads.invalidPositions)(
    'throw error 400 on invalid song position',
    async (json) => {
      json.code = postedSongCode
      let res = await request(app)
        .patch('/api/songs/' + postedSongCode)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test.each(patchPayloads.invalidDurations)(
    'throw error 400 on invalid song duration',
    async (json) => {
      json.code = postedSongCode
      let res = await request(app)
        .patch('/api/songs/' + postedSongCode)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test.each(patchPayloads.invalidMyRatings)(
    'throw error 400 on invalid song myRating',
    async (json) => {
      json.code = postedSongCode
      let res = await request(app)
        .patch('/api/songs/' + postedSongCode)
        .send(json)
      expect(res.statusCode).toEqual(400)
    }
  )
  test('throw error 400 on unknown posted fields', async () => {
    patchPayloads.invalidUnknownField._id = postedSongId
    const res = await request(app)
      .patch('/api/songs/' + postedSongId)
      .send(patchPayloads.invalidUnknownField)
    expect(res.statusCode).toEqual(400)
    expect(res.body.invalidFields).toEqual(['dummy'])
  })
  test('throw error 400 on invalid id', async () => {
    patchPayloads.invalidBadId._id = postedSongId.slice(1)
    const res = await request(app)
      .patch('/api/songs/' + patchPayloads.invalidBadId._id)
      .send(patchPayloads.invalidBadId)
    expect(res.statusCode).toEqual(400)
  })
  test('throw error 404 on unknown id', async () => {
    patchPayloads.invalidUnknownId._id =
      postedSongId.slice(1) + postedSongId.charAt(0)
    const res = await request(app)
      .patch('/api/songs/' + patchPayloads.invalidUnknownId._id)
      .send(patchPayloads.invalidUnknownId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown code', async () => {
    patchPayloads.invalidUnknownCode.code =
      postedSongCode.slice(1) + postedSongCode.charAt(0)
    const res = await request(app)
      .patch('/api/songs/' + patchPayloads.invalidUnknownCode.code)
      .send(patchPayloads.invalidUnknownCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related album (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(`/api/albums/${postedAlbumCode}/songs/${postedSongId}`)
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related album (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(`/api/albums/${postedAlbumId}/songs/${postedSongCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related album (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(
        `/api/albums/${
          postedAlbumId.slice(1) + postedAlbumId.charAt(0)
        }/songs/${postedSongId}`
      )
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related album (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(`/api/albums/${postedAlbumCode.slice(1)}/songs/${postedSongCode}`)
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(
        `/api/bands/${postedBandCode}/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on mismatching related band (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(
        `/api/bands/${postedBandId}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (id)', async () => {
    patchPayloads.validMinimalUpdateWithId._id = postedSongId
    const res = await request(app)
      .patch(
        `/api/bands/${
          postedBandId.slice(1) + postedBandId.charAt(0)
        }/albums/${postedAlbumId}/songs/${postedSongId}`
      )
      .send(patchPayloads.validMinimalUpdateWithId)
    expect(res.statusCode).toEqual(404)
  })
  test('throw error 404 on unknown related band (code)', async () => {
    patchPayloads.validMinimalUpdateWithCode.code = postedSongCode
    const res = await request(app)
      .patch(
        `/api/bands/${postedBandCode.slice(
          1
        )}/albums/${postedAlbumCode}/songs/${postedSongCode}`
      )
      .send(patchPayloads.validMinimalUpdateWithCode)
    expect(res.statusCode).toEqual(404)
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

'use strict'

const mongoose = require('mongoose')
const request = require('supertest')
const app = require('./app')

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

afterAll(async () => {
  await mongoose.connection.close()
})

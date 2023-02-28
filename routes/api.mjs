import express from 'express'
import albumController from '../api/album.mjs'
import bandController from '../api/band.mjs'
import songController from '../api/song.mjs'

const router = express.Router()

router.get('/bands/:key', (req, res) => {
  bandController.get(req, res)
})
router.get('/bands', (req, res) => {
  bandController.get(req, res)
})
router.post('/bands', (req, res) => {
  bandController.post(req, res)
})
router.patch('/bands/:key', (req, res) => {
  bandController.patch(req, res)
})
router.delete('/bands/:key', (req, res) => {
  bandController.delete(req, res)
})

router.get('/albums/:key', (req, res) => {
  albumController.get(req, res)
})
router.get('/albums', (req, res) => {
  albumController.get(req, res)
})
router.get('/bands/:bandKey/albums/:key', (req, res) => {
  albumController.get(req, res)
})
router.get('/bands/:bandKey/albums', (req, res) => {
  albumController.get(req, res)
})
router.post('/bands/:key/albums', (req, res) => {
  albumController.post(req, res)
})
router.patch('/albums/:key', (req, res) => {
  albumController.patch(req, res)
})
router.patch('/bands/:bandKey/albums/:key', (req, res) => {
  albumController.patch(req, res)
})
router.delete('/albums/:key', (req, res) => {
  albumController.delete(req, res)
})
router.delete('/bands/:bandKey/albums/:key', (req, res) => {
  albumController.delete(req, res)
})

router.get('/songs/:key', (req, res) => {
  songController.get(req, res)
})
router.get('/songs', (req, res) => {
  songController.get(req, res)
})
router.get('/albums/:albumKey/songs/:key', (req, res) => {
  songController.get(req, res)
})
router.get('/albums/:albumKey/songs', (req, res) => {
  songController.get(req, res)
})
router.get('/bands/:bandKey/albums/:albumKey/songs/:key', (req, res) => {
  songController.get(req, res)
})
router.get('/bands/:bandKey/albums/:albumKey/songs', (req, res) => {
  songController.get(req, res)
})
router.post('/bands/:bandKey/albums/:key/songs', (req, res) => {
  songController.post(req, res)
})
router.post('/albums/:key/songs', (req, res) => {
  songController.post(req, res)
})
router.patch('/songs/:key', (req, res) => {
  songController.patch(req, res)
})
router.patch('/albums/:albumKey/songs/:key', (req, res) => {
  songController.patch(req, res)
})
router.patch('/bands/:bandKey/albums/:albumKey/songs/:key', (req, res) => {
  songController.patch(req, res)
})
router.delete('/songs/:key', (req, res) => {
  songController.delete(req, res)
})
router.delete('/albums/:albumKey/songs/:key', (req, res) => {
  songController.delete(req, res)
})
router.delete('/bands/:bandKey/albums/:albumKey/songs/:key', (req, res) => {
  songController.delete(req, res)
})

export default router

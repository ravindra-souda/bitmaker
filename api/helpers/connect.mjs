import mongoose from 'mongoose'

export default async (res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true
    }
    mongoose.set('strictQuery', true)
    await mongoose.connect(
      `mongodb://${process.env.MONGODB_SERVER}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
      }
    )
  } catch (err) {
    console.log(err)
    if (res !== undefined) {
      res.status(500).json({
        error: 'Cannot connect to mongoDB',
      })
    }
    return false
  }
  return true
}

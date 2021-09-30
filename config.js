
const config = {
  mongoUrl: process.env.MONGO_URL,
  origins: process.env.ORIGINS.split(','),
  secret: process.env.SECRET
}

module.exports = config
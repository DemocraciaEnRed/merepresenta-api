
const config = {
  mongoUrl: process.env.MONGO_URL,
  origins: process.env.ORIGINS.split(',')
}

module.exports = config
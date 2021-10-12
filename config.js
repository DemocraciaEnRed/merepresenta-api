
const config = {
  mongoUrl: process.env.MONGO_URL,
  origins: process.env.ORIGINS.split(','),
  perfilesMongoUrl: process.env.DB_PERFILES_MONGO_URL,
  perfilesMongoDatabase: process.env.DB_PERFILES_DB,
  perfilesMongoCollection: process.env.DB_PERFILES_COLLECTION,
  secret: process.env.SECRET
}

module.exports = config
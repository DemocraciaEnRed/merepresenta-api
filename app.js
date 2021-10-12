require('dotenv').config()
const config = require('./config')
const dbo = require("./conn");
const utils = require("./utils");
const csv = require("fast-csv")
const express = require("express");
const morgan = require("morgan");
const mongodb = require("mongodb");
const stream = require('stream');
var cors = require('cors')
// const { ConnectionClosedEvent } = require('mongodb');
// const restrictOrigin = require('./restrictOrigin')
const conn = require('./conn');
// Multer - Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
const multer = require('multer');
const fetch = require("node-fetch");



const csvFilter = (req, file, cb) => {
  if (file.mimetype.includes("csv")) {
    cb(null, true);
  } else {
    cb("Please upload only csv file.", false);
  }
};

const storage = multer.memoryStorage()
const upload = multer({ storage: storage, fileFilter: csvFilter })

const app = express();  //Create new instance
const PORT = process.env.PORT || 5000; //Declare the port number

app.use(express.json()); //allows us to access request body as req.body
app.use(morgan("dev"));  //enable incoming request logging in dev mode
app.use(cors())
// app.use(restrictOrigin)

//Define the endpoint

dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }

  // start the Express server
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
});

// app.get("/twitter/:screenName", async (req, res) => {
//   try {
//     const dbConnect = dbo.getDb();
//     const collection = dbConnect.collection('csv')

//     // Query for a movie that has the title 'The Room'
//     const query = { screen_name: req.params.screenName };
//     const options = {
//       //   sort: { "imdb.rating": -1 },
//       //   projection: { _id: 0, title: 1, imdb: 1 },
//     };
//     const data = await collection.findOne(query, options);
//     if(!data){
//       console.log(`[mongo] Not found: ${req.params.screenName}`);
//       return res.status(200).send({
//         data: null
//       })
//     }
//     console.log(`[mongo] Found screen_name! ${data.screen_name}`);
//     const dataRes = utils.pick(data,['screen_name','name','profile_image_url','followers_count','description'])
//     return res.status(200).send({
//       data: dataRes
//     })
//   } catch (error) {
//     console.log("catch error-", error);
//     return res.status(500).send({
//       message: "Could not upload the file: " + req.file.originalname,
//     });
//   }
// });

/*
 * Requires the MongoDB Node.js Driver
 * https://mongodb.github.io/node-mongodb-native
 */

// const agg = [
//   {
//     '$group': {
//       '_id': {
//         'status_id': '$status_id', 
//         'status_url': '$status_url', 
//         'is_retweet': '$is_retweet'
//       }, 
//       'retweet_count': {
//         '$max': '$retweet_count'
//       }, 
//       'favourite_count': {
//         '$max': '$favorite_count'
//       }
//     }
//   }, {
//     '$sort': {
//       'retweet_count': -1, 
//       'favorite_count': -1
//     }
//   }, {
//     '$match': {
//       '_id.is_retweet': 'FALSE'
//     }
//   }, {
//     '$limit': 3
//   }, {
//     '$project': {
//       '_id': true, 
//       'retweet_count': true, 
//       'favourite_count': true, 
//       'string': true
//     }
//   }
// ];

// MongoClient.connect(
//   'mongodb+srv://new_user:password_new_123@cluster0.coceb.mongodb.net/test?authSource=admin&replicaSet=atlas-rsoaq8-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true',
//   { useNewUrlParser: true, useUnifiedTopology: true },
//   function(connectErr, client) {
//     assert.equal(null, connectErr);
//     const coll = client.db('CAND_FDT_db').collection('SantoroLeandro');
//     coll.aggregate(agg, (cmdErr, result) => {
//       assert.equal(null, cmdErr);
//     });
//     client.close();
//   });
/**
 * 
 */


app.get("/twitter/:screenName", async (req, res) => {
  try {
    const dbConnect = dbo.getDb();
    const collection = dbConnect.collection('csv')

    const query = { screen_name: req.params.screenName };
    const options = {
      //   sort: { "imdb.rating": -1 },
      //   projection: { _id: 0, title: 1, imdb: 1 },
    };
    const data = await collection.findOne(query, options);
    if(!data){
      console.log(`[mongo] Not found: ${req.params.screenName}`);
      return res.status(200).send({
        data: null
      })
    }
    console.log(`[mongo] Found screen_name! ${data.screen_name}`);
    Promise.all([
      mongodb.MongoClient.connect(config.perfilesMongoUrl, {useUnifiedTopology: true}),
      mongodb.MongoClient.connect(data.url_path, {useUnifiedTopology: true}),
    ]).then(async (clients) => {
        console.log(`[external mongo] External DBs Connected!`);
        console.log(clients[0].s.url)
        console.log(clients[1].s.url)
        const dbConnProfile = clients[0].db(config.perfilesMongoDatabase)
        const collectionProfile = dbConnProfile.collection(config.perfilesMongoCollection)
        const dbConnTweets = clients[1].db(data.database)
        const collectionTweets = dbConnTweets.collection(data.screen_name);
        const queryProfile = {
          screen_name: data.screen_name 
        }
        const optionsProfile = {
          sort: {date: -1},
        }
        // const queryTweets = {
        //   is_retweet: 'FALSE'
        // }
        // const optionsTweets = {
        //   sort: { created_at: -1, retweet_count: -1, favorite_count: -1},
        // }
        const aggretationsTweets = [
          {
            '$group': {
              '_id': {
                'status_id': '$status_id', 
                'status_url': '$status_url', 
                'is_retweet': '$is_retweet'
              }, 
              'retweet_count': {
                '$max': '$retweet_count'
              }, 
              'favourite_count': {
                '$max': '$favorite_count'
              }
            }
          }, {
            '$sort': {
              'retweet_count': -1, 
              'favorite_count': -1
            }
          }, {
            '$match': {
              '_id.is_retweet': 'FALSE'
            }
          }, {
            '$limit': 3
          }, {
            '$project': {
              '_id': true, 
              'retweet_count': true, 
              'favourite_count': true, 
              'string': true
            }
          }
        ];
        const resultsProfile = await collectionProfile.findOne(queryProfile, optionsProfile)
        // const resultsTweets = await collectionTweets.find(queryTweets, optionsTweets).limit(3).toArray()
        const resultsTweets = await collectionTweets.aggregate(aggretationsTweets).toArray()
        let resultsWithEmbebed = []
        for (const tweet of resultsTweets) {
          try {
            const response = await fetch(`https://publish.twitter.com/oembed?url=${tweet._id.status_url}`);
            const json = await response.json();
            let aux = Object.assign({},tweet)
            aux.html = json.html
            resultsWithEmbebed.push(aux)
            // console.log(json)
          } catch (error) {
            console.error(error);
            continue
          }
        }
        res.status(200).send({
          data: {
            profile: resultsProfile,
            popularTweets: resultsWithEmbebed
          }
        })
    })
    // mongodb.MongoClient.connect(data.url_path, {
    //     useUnifiedTopology: true,
    //   })
    //   .then(async (client) => {
    //     console.log(`[external mongo] External DB Connected! ${data.url_path}`);
    //     console.log(`[external mongo] mongoUrl: ${data.url_path}`);
    //     console.log(`[external mongo] Database: ${data.screen_name} / Collection ${data.screen_name}`);
    //     const dbConn = client.db(data.database);
    //     const collection = dbConn.collection(data.screen_name);
    //     const query = {}
    //     const options = {
    //       sort: {created_at: -1}
    //     }
    //     const results = await collection.find(query, options).limit(10).toArray()
        
    //     res.status(200).send({
    //       data: results
    //     })
    //   })
    //   .catch(err => {
    //     res.status(500).send({
    //         message: "Fail!",
    //         error: err.message,
    //     });
    //   });
  } catch (error) {
    console.log("catch error-", error);
    res.status(500).send({
      message: "Could not upload the file: " + req.file.originalname,
    });
  }
});

app.get("/twitter/:screenName/tweets", async (req, res) => {
  try {
    const dbConnect = dbo.getDb();
    const collection = dbConnect.collection('csv')

    const query = { screen_name: req.params.screenName };
    const options = {
      //   sort: { "imdb.rating": -1 },
      //   projection: { _id: 0, title: 1, imdb: 1 },
    };
    const data = await collection.findOne(query, options);
    if(!data){
      console.log(`[mongo] Not found: ${req.params.screenName}`);
      return res.status(200).send({
        data: null
      })
    }
    console.log(`[mongo] Found screen_name! ${data.screen_name}`);
    mongodb.MongoClient.connect(data.url_path, {
        useUnifiedTopology: true,
      })
      .then(async (client) => {
        console.log(`[external mongo] External DB Connected! ${data.url_path}`);
        console.log(`[external mongo] mongoUrl: ${data.url_path}`);
        console.log(`[external mongo] Database: ${data.screen_name} / Collection ${data.screen_name}`);
        const dbConn = client.db(data.database);
        const collection = dbConn.collection(data.screen_name);
        const query = {}
        const options = {
          sort: {created_at: -1}
        }
        const results = await collection.find(query, options).limit(10).toArray()
        
        res.status(200).send({
          data: results
        })
      })
      .catch(err => {
        res.status(500).send({
            message: "Fail!",
            error: err.message,
        });
      });
  } catch (error) {
    console.log("catch error-", error);
    res.status(500).send({
      message: "Could not upload the file: " + req.file.originalname,
    });
  }
});

const checkBearer = async (req, res, next) => {
  if(req.header('authorization') != `Bearer ${config.secret}`){
    return res.status(403).send({
      message: 'Forbidden. Wrong secret.'
    })
  }
  console.log('Correct bearer token')
  next()
};

app.post("/upload/csv", checkBearer, upload.single("csvFile"), async (req, res) => {
  try {
    const dbConnect = dbo.getDb();
    
    if (req.file == undefined) {
      return res.status(400).send({
        message: "Please upload a CSV file!"
      });
    }
    
    // Import CSV File to MongoDB database
    let csvData = [];
    let theFile = req.file.buffer.toString('utf8');
    // Initiate the source
    var bufferStream = new stream.PassThrough();
    
    // Write your buffer
    bufferStream.end(Buffer.from(theFile));
    
    // Pipe it to something else  (i.e. stdout)
    bufferStream
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => {
        throw error.message;
      })
      .on("data", (row) => {
        csvData.push(row);
      })
      .on("end", () => {
        // Establish connection to the database
        dbConnect.listCollections({ name: 'csv' })
          .next(function (err, collinfo) {
            if (collinfo) {
              console.log('[mongo] Collection csv exists...')
              // The collection exists
              dbConnect.collection('csv').deleteMany({})
              .then(() => {
                console.log('[mongo] Cleaned collection CSV')
                dbConnect.collection('csv').insertMany(csvData)
                  .then((result) => {
                    console.log("[mongo] Added " + result.insertedCount + " documents");
                    res.status(200).send({
                      message: "Upload/import the CSV data into database successfully: " + req.file.originalname,
                    });
                  })
                  .catch(err => {
                    console.log("catch error-", err);
                    res.status(500).send({
                      message: "Error during inserts..",
                    });
                  })
              })
            } else {
              console.log('[mongo] Collection csv does not exists...')
              dbConnect.createCollection('csv').then(() => {
                console.log('[mongo] Created collection csv')
                dbConnect.collection('csv').insertMany(csvData)
                  .then((result) => {
                    console.log("[mongo] Added " + result.insertedCount + " documents");
                    res.status(200).send({
                      message: "Upload/import the CSV data into database successfully: " + req.file.originalname,
                    });
                  })
                  .catch(err => {
                    console.log("catch error-", err);
                    res.status(500).send({
                      message: "Error during inserts..",
                    });
                  })
              })
            }
          });
      });
  } catch (error) {
    console.log("catch error-", error);
    res.status(500).send({
      message: "Could not upload the file: " + req.file.originalname,
    });
  }
})


app.get("*", async (req, res) => {
  return res.status(404).send({
    message: "Not found"
  })
})
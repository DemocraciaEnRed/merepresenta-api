require('dotenv').config()
const config = require('./config')
const dbo = require("./conn");
const utils = require("./utils");
const csv = require("fast-csv")
const express = require("express");
const morgan = require("morgan");
const mongodb = require("mongodb");
const stream = require('stream');

// const { ConnectionClosedEvent } = require('mongodb');
// const restrictOrigin = require('./restrictOrigin')
const conn = require('./conn');

const fs = require('fs');

// Multer - Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
const multer = require('multer');
/**
 * The memory storage engine stores the files in memory as Buffer objects. It doesn't have any options.
 * 
 * const storage = multer.memoryStorage()
 * const upload = multer({ storage: storage })
 * 
 * When using memory storage, the file info will contain a field called buffer that contains the entire file.
 * 
 * WARNING: Uploading very large files, or relatively small files in large numbers very quickly, can cause your application to run out of memory when memory storage is used.
 */
// Filter for CSV file
// Set global directory
global.__basedir = __dirname;

// // Multer Upload Storage
// const storage = multer.diskStorage({
  //   destination: (req, file, cb) => {
    //     cb(null, __basedir + '/uploads/')
    //   },
    //   filename: (req, file, cb) => {
      //     cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname)
      //   }
      // });
      
      // Filter for CSV file
const csvFilter = (req, file, cb) => {
  if (file.mimetype.includes("csv")) {
    cb(null, true);
  } else {
    cb("Please upload only csv file.", false);
  }
};
// const upload = multer({ storage: storage, fileFilter: csvFilter });

const storage = multer.memoryStorage()
const upload = multer({ storage: storage, fileFilter: csvFilter })

const app = express();  //Create new instance
const PORT = process.env.PORT || 5000; //Declare the port number

app.use(express.json()); //allows us to access request body as req.body
app.use(morgan("dev"));  //enable incoming request logging in dev mode
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

app.get("/twitter/:screenName", async (req, res) => {
  try {
    const dbConnect = dbo.getDb();
    const collection = dbConnect.collection('csv')

    // Query for a movie that has the title 'The Room'
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
    const dataRes = utils.pick(data,['screen_name','name','profile_image_url','followers_count','description'])
    return res.status(200).send({
      data: dataRes
    })
  } catch (error) {
    console.log("catch error-", error);
    return res.status(500).send({
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
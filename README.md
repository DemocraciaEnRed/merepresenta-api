# Me representa - API Microservice

API for Me representa project

### Install

```
npm install
```

### Run for development

Create a `.env` file with the variables in `.env.dist` and fill with the following data:

```
MONGO_URL=
ORIGINS=
SECRET=
PORT=
```

| Variable| Description| Default |
| - | - | - |
| `MONGO_URL` | A mongo string connection url. We use mongo3.6 so you might try to use the same version of mongo or another one. Ex.: `mongodb://localhost:27017/merepresenta` | `-` |
| `ORIGINS` | Allowed origins. For development, you should put `localhost` | `-` |
| `SECRET` | A random string that will be used to upload CSV | `-` |
| `PORT` | The port that the app listens to | `5000` |

For development we can use nodemon with hot-reload, you can use: 

```
npm run dev
```

Without nodemon, just run `start`, which is similar to 

```
npm run start
```

### How to start 

First you should fill your mongo database. For that, you should send the csv to the following endpoint `POST /upload/csv`. You need to use a Bearer token, which is the one defined in `.env` called `SECRET`

I recommend using a Rest tool like [Insomnia](https://insomnia.rest/). But you can use any other tool like Postman.

After sending the CSV, the database will be filled with the data:

```
200 OK

{
  "message": "Upload/import the CSV data into database successfully: candidatxs_2021_p_demoenred.csv"
}
```


### Endpoints



##### `GET /twitter/<screen_name>`

Gets data from the uploaded CSV.

```
GET http://localhost:3000/twitter/SantoroLeandro

{
  "data": {
    "screen_name": "SantoroLeandro",
    "name": "Leandro Santoro",
    "profile_image_url": "http://pbs.twimg.com/profile_images/1430179894990974986/UCTfkFMm_400x400.jpg",
    "followers_count": "335236",
    "description": "Diputado de la Ciudad Aut�noma de Buenos Aires. @FrenteDeTodos"
  }
}
```

##### `GET /twitter/<screen_name>/tweets`

Gets the last 10 tweets. This one will take a few seconds, because its going to connect to a external DB.

```
GET http://localhost:3000/twitter/SantoroLeandro

{
  "data": [
    { ... },
    { ... },
    { ... },
    ...
    ]
}

```


##### `POST /upload/csv`

Requieres a Bearer Token. 
Must be the same defined in `SECRET`
It expects a `multipart/form-data` with a field called `csvFile` and the value it's the CSV.

```
200 OK

{
  "message": "Upload/import the CSV data into database successfully: candidatxs_2021_p_demoenred.csv"
}
```
const dotenv = require("dotenv")
const { MongoClient } = require("mongodb");
const mongoose = require('mongoose')
const express = require('express')
const User = require('./models/User')
var cors = require('cors')
var fetch = require('node-fetch')
// set up mongodb
dotenv.config()
const connectionString = `mongodb+srv://${process.env.REACT_APP_DB_USERNAME}:${process.env.REACT_APP_DB_PASSWORD}@csbulletin.gjbzahg.mongodb.net/Users?retryWrites=true&w=majority`

const client = new MongoClient(connectionString);
var ObjectId = require('mongodb').ObjectId; 

// set up server
const port = process.env.PORT_DB
const app = express()
app.use(express.json())
console.log(process.env.BASE_URL_CLIENT + "3000", process.env.BASE_URL_API + process.env.PORT_DB, process.env.BASE_URL_API + process.env.PORT_AUTH)
app.use(cors({
  origin: ['https://cs-bulletin.onrender.com', 'https://www.csbullet.in', process.env.BASE_URL_API + process.env.PORT_AUTH, , 'www.csbullet.in', 'csbullet.in', 'https://csbullet.in', 'www.cs-bulletin.onrender.com', 'cs-bulletin.onrender.com', 'https://cs-bulletin-api.onrender.com', 'www.cs-bulletin-api.onrender.com', 'cs-bulletin.onrender.com'],
  // development: origin: [process.env.BASE_URL_CLIENT + "3000", process.env.BASE_URL_API + process.env.PORT_DB, process.env.BASE_URL_API + process.env.PORT_AUTH],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true // bypass limitations of multiple ports
}));
// mongodb/mongoose configurations
mongoose.connect(connectionString)
  .then(() => {
    app.listen(port, () => {
      console.log('Connected to MongoDB, listening on port', port)
    })
  })
  .catch((error) => {
    console.log(error)
  })
// functions

app.get('/getAllListings', async (req, res) => {
  try {
    const order = req.query.order
    const database = client.db('Users');
    const listings = database.collection('users');
    var listing = listings.find({}, { Listings:1, SteamID: 1, ProfilePic: 1, _id: 0}).sort({createdAt: order})
    if ((await listings.countDocuments({})) === 0) {
      console.log("No documents found!");
    }
    var allPostings = []
    for await (var doc of listing) {
      doc.Listings.push({SteamID: doc.SteamID})
      if ('ProfilePic' in doc) {
        doc.Listings.push({ProfilePic: doc.ProfilePic})
      }
      if ('Tradelink' in doc) {
        doc.Listings.push({Tradelink: doc.Tradelink})
      }
      allPostings.push(doc)
    }
    //console.log(allPostings)
    res.status(200).send({UserPosts: allPostings})
  } catch (err) {
    res.status(400).send({message: err.message})
  }
})

app.post('/getTradelink', async (req, res) => {
  try {
    const {SteamID} = req.body
    const database = client.db('Users');
    const listings = database.collection('users');
    const query = { SteamID: SteamID }
    const listing = await listings.findOne(query)
    console.log(listing)
    res.status(200).send({tradelink: listing.Tradelink})
  } catch (error) {
    res.status(400).send({message: error.message})
  }
})

app.post('/addTradelink', async (req, res) => {
  try {
    const {SteamID, Tradelink, ProfilePic} = req.body
    console.log('Test to see if the right endpoint is being hit', process.env.BASE_URL_API + process.env.PORT_DB + '/findUser')
    let userExists = await fetch(process.env.BASE_URL_API + process.env.PORT_DB + '/findUser', {
      method: 'POST',
      credentials: 'include',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({
        SteamID: SteamID
      })
    })
    .then(response => response.text())
  
    if (!userExists) { // edit here too
      await fetch(process.env.BASE_URL_API + process.env.PORT_DB + '/createUser', { // creates user in db
        method: 'POST',
        credentials: 'include',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify({
          SteamID: SteamID,
          ProfilePic: ProfilePic
        })
      })
    }
    const database = client.db('Users');
    const listings = database.collection('users');
    const query = { SteamID: SteamID }
    const listing = await listings.updateOne(query, {
      $set: {
        Tradelink: Tradelink
      },
      $currentDate: {
        lastModified: true
      }
    })
    console.log(listing)
    res.status(200).send({message: "Tradelink Added"})
  } catch (error) {
    res.send({error: error.message})
  }
})

app.post('/findUser', async (req, res) => {
  try {
    const {SteamID} = req.body
    const database = client.db('Users')
    const listings = database.collection('users')
    const query = { SteamID: SteamID }
    const listing = await listings.findOne(query)
    console.log(listing)
    res.send(listing)
  } catch (error) {
    res.send(null)
  }
})

app.post('/deletePost', async(req, res) => {
  try {
    console.log('i did something')
    const {SteamID, id} = req.body
    const database = client.db('Users')
    const listings = database.collection('users')
    const query = {SteamID: SteamID}
    const result = await listings.updateOne(query,
      { $pull: { Listings: { id: id }}},
    );
    console.log(result)
    res.status(200).send(result)
  } catch (error) {
    res.status(400).send(error)
  }
})

app.post('/addPost', async (req, res) => {
  try {
    const {SteamID, TradingElementsImage, TradingElementsText, ReceivingElementsImage, ReceivingElementsText, Notes, id, dateCreated} = req.body
    const database = client.db('Users');
    const listings = database.collection('users');
    const query = { SteamID: SteamID }
    const dateCreatedDatetime = new Date(dateCreated)
    /*let userExists = await fetch('http://localhost:5500/findUser', { // finds user in db // now returns a json BREAKING
      method: 'POST',
      credentials: 'include',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({
        SteamID: SteamID
      })
    })*/
    //userObject = JSON.parse(userExists) // possibly not needed
    const listing = await listings.updateOne(query, {
      $push: {
        Listings: {
          ItemsToTradeImage: TradingElementsImage,
          ItemsToTradeText: TradingElementsText,
          Notes: Notes,
          ItemsToReceiveImage: ReceivingElementsImage,
          ItemsToReceiveText: ReceivingElementsText,
          id: id,
          dateCreated: dateCreatedDatetime
        }
      },
      $currentDate: {
        lastModified: true 
      }
    })
    console.log(listing)
    console.log(listing.matchedCount)
    if (listing.matchedCount==0) {
      res.send('failed to find document')
    }
    else { res.status(200).send('Found and inserted into document') }
  } catch (error) {
    res.send({error: error.message})
  }
})

app.post('/sendListingData', async (req, res) => {
  const {ToTradeElementsText, ToTradeElementsImage, ToReceiveElementsText, ToReceiveElementsImage, Notes, UserSteamID, ProfilePic, id, dateCreated} = req.body
  console.log(ToTradeElementsImage)
  console.log(ToTradeElementsText)
  console.log(ToReceiveElementsImage)
  console.log(ToReceiveElementsText)
  console.log('here is my steam id:', UserSteamID)
  let flag = false
  let userExists = await fetch(process.env.BASE_URL_API + process.env.PORT_DB + '/findUser', {
    method: 'POST',
    credentials: 'include',
    headers: {
      "Content-Type": 'application/json'
    },
    body: JSON.stringify({
      SteamID: UserSteamID
    })
  })
  .then(response => response.text())
  
  if (!userExists) { // edit here too
    await fetch(process.env.BASE_URL_API + process.env.PORT_DB + '/createUser', { // creates user in db
      method: 'POST',
      credentials: 'include',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify({
        SteamID: UserSteamID,
        ProfilePic: ProfilePic
      })
    })
    flag = true
  } 
  let AddPost = await fetch(process.env.BASE_URL_API + process.env.PORT_DB + '/addPost', { // add post - need to implement
    method: 'POST',
    credentials: 'include',
    headers: {
      "Content-Type": 'application/json'
    },
    body: JSON.stringify({
      SteamID: UserSteamID,
      TradingElementsImage: ToTradeElementsImage,
      TradingElementsText: ToTradeElementsText,
      ReceivingElementsImage: ToReceiveElementsImage,
      ReceivingElementsText: ToReceiveElementsText,
      Notes: Notes,
      id: id,
      dateCreated: dateCreated
    })
  })
  console.log
  if (flag) {
    res.status(201).send({message: 'Listing Added and User Created'})
  } else {
    res.status(200).send({message: 'Listing Added'})
  }
})


// endpoints/routes
app.post('/createUser', async (req, res) => {
  const {SteamID, ProfilePic} = req.body // destructure all params
  try {
    const user = await User.create({SteamID, ProfilePic}) // add more params
    res.status(200).json(user)
  } catch (error) {
    res.status(400).json({error: error.message})
  }
})

app.get('/deleteUser', async (req, res) => {
  const {SteamID} = req.body
  try {
    const database = client.db('Users');
    const listings = database.collection('users');

    const query = { SteamID: SteamID }
    const listing = await listings.deleteOne(query)
    console.log(listing)
  } finally {
    await client.close()
    res.sendStatus(200)
  }
})

app.get('/retrieveURL', (req, res) => {
  res.send(connectionString)
})

app.get('/testondb', (req, res) => {
  res.send('testondb')
})
//run().catch(console.dir);

// endpoints to check sendListingData
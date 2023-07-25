// db imports
const { MongoClient } = require("mongodb");
const mongoose = require('mongoose')
const User = require('./models/User')
const session = require('cookie-session')
var express = require('express'); // cjs
var passport = require('passport');
//var session = require('express-session'); // change to cookie session
var util = require('util')
const dotenv = require("dotenv")
dotenv.config()
var passportSteam = require('passport-steam');
var cors = require('cors');
var SteamStrategy = passportSteam.Strategy; // check this first
// mod.cjs
var fetch = require('node-fetch')
// set up mongodb stuff
const connectionString = `mongodb+srv://${process.env.REACT_APP_DB_USERNAME}:${process.env.REACT_APP_DB_PASSWORD}@csbulletin.gjbzahg.mongodb.net/Users?retryWrites=true&w=majority`
const client = new MongoClient(connectionString);
var ObjectId = require('mongodb').ObjectId; 

var port = process.env.PORT_AUTH

// set up express app
var app = express(); // check here 2nd, didn't set up views 
app.use(express.json())
app.use(cors({
    //origin: [process.env.BASE_URL_CLIENT + "3000", process.env.BASE_URL_API + process.env.PORT_AUTH],
    origin: ['https://cs-bulletin.onrender.com', 'api.csbullet.in', 'https://www.csbullet.in', process.env.BASE_URL_API + process.env.PORT_AUTH, , 'www.csbullet.in', 'csbullet.in', 'https://csbullet.in', 'www.cs-bulletin.onrender.com', 'cs-bulletin.onrender.com', 'https://cs-bulletin-api.onrender.com', 'www.cs-bulletin-api.onrender.com', 'cs-bulletin.onrender.com'],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true // bypass limitations of multiple ports
}));
app.use(session({
    maxAge: 24*60*60*1000,
    keys: ['ewrnoieqngqoi2hn4roiwb104y8fb'],
    domain: 'csbullet.in'
}))


app.use(passport.initialize());
app.use(passport.session());
// check here third, didn't set up express.static
// Required to get data from user for sessions

   // Initiate Strategy
passport.use(new SteamStrategy({
    returnURL: process.env.BASE_URL_API + '/auth/steam/return',
    realm: process.env.BASE_URL_API + '/',
    apiKey: 'BF24A5D4F82A65FC2AC391EDDB960C3D'
    }, function (identifier, profile, done) {
    process.nextTick(function () {
      profile.identifier = identifier;
      return done(null, profile);
    });
}));

passport.serializeUser((user, done) => {
    done(null, user); // saves user
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});


// Routes
app.get('/', function (req, res) {
    res.send(req.user);
});

app.get('/displayinfo', ensureAuthenticated, function(req, res) {
  console.log(req.isAuthenticated())
  console.log(req.user)
});

app.get('/logout', function(req, res){
    req.session = null
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect(process.env.BASE_URL_CLIENT)
    });
});

app.get('/auth/steam', passport.authenticate('steam', {failureRedirect: '/'}), function (req, res) {
    res.redirect('/')
});
app.get('/auth/steam/return', passport.authenticate('steam', {failureRedirect: '/'}), function (req, res) {
    res.redirect(process.env.BASE_URL_CLIENT)
});

app.get('/user', (req, res) => { // not authenticated, if use passport.authenticate, it is still not authenticated
    if(req.isAuthenticated()) {
        res.send(req.user)
    } else {
    res.send(false) } // if not authenticated user
});

app.get('/loggedin', (req, res) => {
    res.send(req.isAuthenticated())
})

mongoose.connect(connectionString)
  .then(() => {
    app.listen(port, () => console.log(`Backend running on port ${port}!`));
  })
  .catch((error) => {
    console.log(error)
  })

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
  
}
//
app.get('/testso', (req, res) => {
    res.send('this endpoint is working')
})

app.get('/steamid', (req, res) => {
    res.send(req.user._json.steamid)
})
app.get('/profilepic', (req, res) => {
   res.send(req.user.photos[1].value)
})

app.get('/test', (req, res) => {
    res.send('test complete')
})

app.get('/getInventory/:steamid', (req, res) => {
    fetch(`http://steamcommunity.com/inventory/${req.params.steamid}/730/2?l=english&count=1999`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            res.send(data)
            //res.send('200')
        })
        .catch(err => {
            console.error("error occurred", err)
        })
})

//MongoDB routes

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
      let userExists = await fetch(process.env.BASE_URL_API + '/findUser', {
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
        await fetch(process.env.BASE_URL_API + '/createUser', { // creates user in db
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
    let userExists = await fetch(process.env.BASE_URL_API + '/findUser', {
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
      await fetch(process.env.BASE_URL_API + '/createUser', { // creates user in db
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
    let AddPost = await fetch(process.env.BASE_URL_API + '/addPost', { // add post - need to implement
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
var express = require('express'); // cjs
var passport = require('passport');
var session = require('express-session');
var util = require('util')
var passportSteam = require('passport-steam');
var cors = require('cors');
var SteamStrategy = passportSteam.Strategy; // check this first
// mod.cjs
var fetch = require('node-fetch')
// set up express app port
var port = 4000;

// set up express app
var app = express(); // check here 2nd, didn't set up views 
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5500", "http://localhost:4000"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true // bypass limitations of multiple ports
}));
app.use(session({
    secret: 'eyhowirngoi3ny4howrsaf',
    saveUninitialized: true,
    resave: true,
    name: 'name of session id'
}))
app.use(passport.initialize());
app.use(passport.session());
// check here third, didn't set up express.static
// Required to get data from user for sessions

   // Initiate Strategy
passport.use(new SteamStrategy({
    returnURL: 'http://localhost:' + port + '/auth/steam/return',
    realm: 'http://localhost:' + port + '/',
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
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('http://localhost:3000/');
    });
});

app.get('/auth/steam', passport.authenticate('steam', {failureRedirect: '/'}), function (req, res) {
    res.redirect('/')
});
app.get('/auth/steam/return', passport.authenticate('steam', {failureRedirect: '/'}), function (req, res) {
    res.redirect('http://localhost:3000/')
});

app.get('/user', (req, res) => { // not authenticated, if use passport.authenticate, it is still not authenticated
    if(req.isAuthenticated()) {
        res.send(req.user)
    } else {
    res.send(false) } // if not authenticated user
    //res.redirect('http://localhost:3000/')
});

app.get('/loggedin', (req, res) => {
    res.send(req.isAuthenticated())
})

app.listen(port, () => console.log(`Authentication running on port ${port}!`));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
  
}

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
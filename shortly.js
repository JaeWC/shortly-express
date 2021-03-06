var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var bcrypt = require('bcrypt');

// var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(
  session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: true
  })
);
var sess;

app.get('/', function (req, res) {
  console.log(req.session);
  if (req.session.username) {
    res.render('index');
  } else {
    res.render('login');
  }
});

app.get('/create', function (req, res) {
  if (req.session.username) {
    res.render('index');
  } else {
    res.render('login');
  }
});

app.get('/links', function (req, res) {
  Links.reset()
    .fetch()
    .then(function (links) {
      res.status(200).send(links.models);
    });
});

app.post('/links', function (req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function (found) {
    console.log(found, 'found');
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function (err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        }).then(function (newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  let userID = req.body.username;
  let userPW = req.body.password;

  new User({ username: userID }).fetch().then(function (found) {
    if (found) {
      console.log('user found');
      bcrypt.compare(userPW, found.attributes.password, (err, result) => {
        if (err) {
          throw err;
        } else {
          if (result) {
            console.log('Login Success');
            sess = req.session;
            sess.username = userID;
            console.log('session', sess);
            res.redirect('/');
          } else {
            console.log('Wrong password');
            res.redirect('/login');
          }
        }
      });
    } else {
      console.log('Login Failed');
      res.redirect('/signup');
    }
  });
});

app.get('/logout', function (req, res) {
  sess = req.session;
  if (sess.username) {
    req.session.destroy(err => {
      if (err) {
        throw err;
      } else {
        res.redirect('/');
      }
    });
  } else {
    res.redirect('/');
  }
});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.post('/signup', function (req, res) {
  var userId = req.body.username;
  var userPW = req.body.password;
  var user = new User({ username: userId, password: userPW });

  user.save().then(newUser => {
    Users.add(newUser);
  });
  res.redirect('/');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function (req, res) {
  new Link({ code: req.params[0] }).fetch().then(function (link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function () {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function () {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

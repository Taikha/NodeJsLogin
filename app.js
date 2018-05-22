require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const mongo = require('mongodb');
const mongoose = require('mongoose');

mongoose.connect(dbUrl.url);
const db = mongoose.connection;

const routes = require('./routes/index');
const users = require('./routes/users');

// Init App
const app = express();

// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));


// Express Session (Passport)
app.use(session({
    secret: 'logintestsecret',
    saveUninitialized: true,
    resave: true
}));

// Middleware (Passport)
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash (Passport)
app.use(flash());

// Express Validatornode
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// homepage route
app.use('/', routes);
// users related route
app.use('/users', users);

// Set Port
app.set('port', (process.env.PORT || 7777));

app.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});

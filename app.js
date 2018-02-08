var express = require('express');
var admin = require("firebase-admin");
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose')
var socketIO = require('socket.io')();
var ejs = require('ejs')

var serviceAccount = require("./serviceAccountKey.json");

var index = require('./routes/index');
var webhook = require('./routes/webhook');
var user = require('./routes/user');
var locations = require('./routes/locations');
var upload = require('./routes/upload');
var news = require('./routes/news');
var chart = require('./routes/chart');

var config = require('./config')
var response = require('./util/response')

var app = express();
mongoose.connect(config.database)
app.socketIO = socketIO;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseAuthVariableOverride: {
    uid: "mbN7Ny4xcpUINGSuqEnMJkJBi8t2"
  }
});
socketIO.on('connection', function (socket) {
  console.log('A client connection occurred!');
});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use((req, res, next) => {
  req.admin = admin;
  req.socketIO = socketIO;
  next()
})
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/webhook', webhook)
app.use('/user', user)
app.use('/locations', locations)
app.use('/upload', upload)
app.use('/chart', chart)
app.use('/news', news)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  // res.locals.message = err.message;
  // res.locals.error = req.app.get('env') === 'development' ? err : {};

  // // render the error page
  // res.status(err.status || 500);
  // res.end(err);
  console.log(err)
  return res.json(response.failure(404, err.message));
});

module.exports = app;

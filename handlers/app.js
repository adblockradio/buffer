var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
server.listen(9820); // no "localhost" binding since this routine is intended to run in a Docker container


app.use('/', express.static('client/build'));

exports.app = app;
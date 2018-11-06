const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);

const { log } = require("abr-log")("app");
const { config } = require("./config");

server.listen(config.user.serverPort); // no "localhost" binding in case this routine would be run in a Docker container

log.info("Server listening on port " + config.user.serverPort);

const DEV = process.env.DEV;

//app.use('/', express.static('client/build'));

if (DEV) {
	log.warn('DEV MODE');
	// proxy everything but /config/*, /status/* and /listen/* requests (managed by this program)
	// everything else is routed to localhost:3000, the react dev server.
	const proxy = require('http-proxy-middleware');
	const apiProxy = proxy('!(/config|/config/**|/status/**|/listen/**)', { target: 'http://localhost:3000', ws: true, loglevel: 'warn' });
	app.use('/', apiProxy);

} else {
	log.warn('Server started in production mode.');
	//app.use('/login.html', express.static('webmin-src/build/login.html'));
	app.use('/', express.static('client/build'));
}

exports.app = app;
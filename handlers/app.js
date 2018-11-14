const http = require('http');
const express = require('express');
const app = express();
app.use(express.json());                       // to support JSON-encoded bodies
app.use(express.urlencoded({extended: true})); // to support URL-encoded bodies
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
	const apiProxy = proxy('!(/config|/config/**|/status/**|/listen/**|/flag)', { target: 'http://localhost:3000', ws: true, loglevel: 'warn' });
	app.use('/', apiProxy);

} else {
	log.warn('Server started in production mode.');
	//app.use('/login.html', express.static('webmin-src/build/login.html'));
	app.use('/', express.static('client/build'));
}

try {
	require('../api/config')(app);
	require('../api/content')(app);
	require('../api/flag')(app);
	require('../api/listen')(app);
	require('../api/radios')(app);
	require('../api/status')(app);
} catch (e) {
	log.warn('API error. e=' + e);
}

exports.app = app;
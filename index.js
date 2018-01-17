// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

var abrsdk = require("adblockradio-sdk");
var log = require("loglevel");
log.setLevel("debug");
var cp = require("child_process");
var findDataFiles = require("./findDataFiles.js");
var async = require("async");
var DlFactory = require("./DlFactory.js");

const DL = true;
const FETCH_METADATA = true;
const SEG_DURATION = 10; // in seconds
const LISTEN_BUFFER = 30; // in seconds

var config = require("./config.js");

if (DL) {
	var dl = [];
	for (var i=0; i<config.radios.length; i++) {
		config.radios[i].liveStatus = {};
		if (config.radios[i].enable) {
			dl.push(DlFactory(config.radios[i], { fetchMetadata: FETCH_METADATA, segDuration: SEG_DURATION }));
		}
	}
}

var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
server.listen(9820, "localhost");

app.get('/config', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var result = { radios: [], user: config.user };
	for (var i=0; i<config.radios.length; i++) { // control on what data is exposed via the api
		var radio = config.radios[i];
		if (!radio.enable) continue;
		result.radios.push({
			country: radio.country,
			name: radio.name,
			enable: radio.enable,
			content: radio.content,
			url: radio.enabled,
			favicon: radio.favicon
		});
	}
	response.json(result);
	//log.debug("config[0]=" + JSON.stringify(config.radios[0]));
});

var { listenHandler, metadataHandler, getRadio } = require("./handlers.js");

app.get('/:action/:radio/:delay', function(request, response) {
	var action = request.params.action;
	var radio = request.params.radio;
	var delay = request.params.delay;
	//log.debug("get: action=" + action + " radio=" + radio + " delay=" + delay);

	if (!getRadio(radio) || !getRadio(radio).enable) {
		response.writeHead(400);
		return response.end();
	}

	switch(action) {
		case "listen":
			var ext = ".mp3"; // TODO check for other extensions
			/*var state = {
				nSegmentsInitialBuffer: Math.floor(LISTEN_BUFFER/SEG_DURATION),
				lastSentDate: new Date(),
				ext: ext,
				requestDate: new Date()
			}
			listenRequestDate = state.requestDate;*/

			switch(ext) {
				case ".aac": response.set('Content-Type', 'audio/aacp'); break;
				case ".mp3": response.set('Content-Type', 'audio/mpeg'); break;
			}
			/*listenHandler(response, radio, after, state, function() {
				response.end();
			});*/
			listenHandler(response, radio, delay, {
				newRequest: true,
				requestDate: new Date()
			}, function() {
				response.end();
			});
			break;

		case "metadata":
			//metadataHandler(response, radio);
			response.set({ 'Access-Control-Allow-Origin': '*' });
			var result = getRadio(radio).liveStatus.metaCache.read();
			response.json(result);
			break;

		default:
			response.writeHead(400);
			response.end();
	}
});

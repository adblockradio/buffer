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

const FETCH_METADATA = true;
const SEG_DURATION = 10; // in seconds
const LISTEN_BUFFER = 30; // in seconds

var { config, getRadios, insertRadio, removeRadio, getAvailableInactive } = require("./config.js");

var dl = [];
var updateDlList = function() {
	// add missing sockets
	for (var i=0; i<config.radios.length; i++) {
		var alreadyThere = false;
		for (var j=0; j<dl.length; j++) {
			if (dl[j].country == config.radios[i].country && dl[j].name == config.radios[i].name) {
				alreadyThere = true;
				break;
			}
		}
		if (!alreadyThere && config.radios[i].enable) {
			config.radios[i].liveStatus = {};
			log.info("updateDlList: start " + config.radios[i].country + "_" + config.radios[i].name);
			dl.push(DlFactory(config.radios[i], { fetchMetadata: FETCH_METADATA, segDuration: SEG_DURATION, cacheLen: config.user.cacheLen }));
		}
	}

	// remove obsolete ones.
	for (var j=dl.length-1; j>=0; j--) {
		var shouldBeThere = false;
		for (var i=0; i<config.radios.length; i++) {
			if (dl[j].country == config.radios[i].country && dl[j].name == config.radios[i].name) {
				shouldBeThere = true;
				break;
			}
		}
		if (!shouldBeThere) {
			log.info("updateDlList: stop " + dl[j].country + "_" + dl[j].name);
			dl[j].stopDl();
			dl.splice(j, 1);
		}
	}
}

updateDlList();

var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
server.listen(9820, "localhost");

app.get('/config', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json({ radios: getRadios(), user: config.user });
});

app.get('/config/radios/insert/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	insertRadio(request.params.country, request.params.name, function(err) {
		if (err) {
			log.error("/config/insert/" + request.params.country + "/" + request.params.name + ": err=" + err);
			response.writeHead(400);
			response.end();
		} else {
			response.writeHead(200);
			response.end();
			updateDlList();
		}
	});
});

app.get('/config/radios/remove/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	removeRadio(request.params.country, request.params.name, function(err) {
		if (err) {
			log.error("/config/remove/" + request.params.country + "/" + request.params.name + ": err=" + err);
			response.writeHead(400);
			response.end();
		} else {
			response.writeHead(200);
			response.end();
			updateDlList();
		}
	});
});

app.get('/config/radios/available', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json(getAvailableInactive());
});

var getRadio = function(country, name) {
	if (name) { // both parameters used
		for (var j=0; j<config.radios.length; j++) {
			if (config.radios[j].country == country && config.radios[j].name == name) {
				return config.radios[j];
			}
		}
	} else { // only first parameter used
		for (var j=0; j<config.radios.length; j++) {
			if (config.radios[j].country + "_" + config.radios[j].name == country) {
				return config.radios[j];
			}
		}
	}
	return null;
}

var listenRequestDate = null;

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

			switch(ext) {
				case ".aac": response.set('Content-Type', 'audio/aacp'); break;
				case ".mp3": response.set('Content-Type', 'audio/mpeg'); break;
			}

			var state = { newRequest: true, requestDate: new Date() };
			var initialBuffer = getRadio(radio).liveStatus.audioCache.readLast(+delay+config.user.streamInitialBuffer,config.user.streamInitialBuffer);

			if (!initialBuffer) {
				log.error("/listen/" + radio + "/" + delay + ": initialBuffer not available");
				response.writeHead(400);
				return response.end();
			}

			log.info("listen: send initial buffer of " + initialBuffer.length + " bytes");
			response.write(initialBuffer);

			var finish = function() {
				clearInterval(listenTimer);
				response.end();
			}

			var listenTimer = setInterval(function() {
				if (state.newRequest) {
					listenRequestDate = state.requestDate;
					state.newRequest = false;
				} else if (listenRequestDate !== state.requestDate) {
					log.warn("request canceled because another one has been initiated");
					return finish();
				}
				var willWaitDrain = !response.write("");
				if (!willWaitDrain) { // detect congestion of stream
					sendMore();
				} else {
					log.debug("listenHandler: will wait for drain event");

					var drainCallback = function() {
						clearTimeout(timeoutMonitor);
						sendMore();
					}
					response.once("drain", drainCallback);
					var timeoutMonitor = setTimeout(function() {
						response.removeListener("drain", drainCallback);
						log.error("listenHandler: drain event not emitted, connection timeout");
						return finish();
					}, config.user.streamGranularity*1500);
				}
			}, 1000*config.user.streamGranularity);
			var sendMore = function() {
				var radioObj = getRadio(radio);
				if (!radioObj) {
					log.error("/listen/" + radio + "/" + delay + ": radio not available");
					return finish();
				}
				var audioCache = radioObj.liveStatus.audioCache;
				if (!audioCache) {
					log.error("/listen/" + radio + "/" + delay + ": audioCache not available");
					return finish();
				}
				response.write(audioCache.readAmountAfterCursor(config.user.streamGranularity));
			}
			break;

		case "metadata":
			response.set({ 'Access-Control-Allow-Origin': '*' });
			var radio = getRadio(radio);
			if (!radio) {
				log.error("/metadata/" + radio + "/" + delay + ": radio not available");
				response.writeHead(400);
				return response.end();
			}
			var metaCache = radio.liveStatus.metaCache;
			if (!metaCache) {
				log.error("/metadata/" + radio + "/" + delay + ": metadata not available");
				response.writeHead(400);
				return response.end();
			} else {
				response.json(metaCache.read());
			}
			break;

		default:
			response.writeHead(400);
			response.end();
	}
});

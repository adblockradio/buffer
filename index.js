// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

const { log, flushLog } = require("./log.js")("master");
const cp = require("child_process");
const findDataFiles = require("./findDataFiles.js");
const DlFactory = require("./DlFactory.js");
const abrsdk = require("adblockradio-sdk")(require("./log.js")("sdk").log);
//const abrsdk = require("../adblockradio-sdk/libabr.js")(require("./log.js")("sdk").log);

const FETCH_METADATA = true;
const SAVE_AUDIO = false;
const SEG_DURATION = 10; // in seconds
const LISTEN_BUFFER = 30; // in seconds
var USE_ABRSDK = true;

var { config, getRadios, getUserConfig, insertRadio, removeRadio, toggleContent, getAvailableInactive } = require("./config.js");

var dl = [];
var updateDlList = function(forcePlaylistUpdate) {
	var playlistChange = false || !!forcePlaylistUpdate;

	// add missing sockets
	for (var i=0; i<config.radios.length; i++) {
		var alreadyThere = false;
		for (var j=0; j<dl.length; j++) {
			if (dl[j].country == config.radios[i].country && dl[j].name == config.radios[i].name) {
				alreadyThere = true;
				break;
			}
		}
		if (!alreadyThere) {
			config.radios[i].liveStatus = {};
			log.info("updateDlList: start " + config.radios[i].country + "_" + config.radios[i].name);
			dl.push(DlFactory(config.radios[i], {
				fetchMetadata: FETCH_METADATA,
				segDuration: SEG_DURATION,
				saveAudio: SAVE_AUDIO,
				cacheLen: config.user.cacheLen + config.user.streamInitialBuffer
			}));
			playlistChange = true;
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
			playlistChange = true;
		}
	}

	if (USE_ABRSDK && playlistChange) {
		var playlistArray = [];
		for (var i=0; i<config.radios.length; i++) {
			playlistArray.push(config.radios[i].country + "_" + config.radios[i].name);
		}
		abrsdk.sendPlaylist(playlistArray, config.user.token, function(err, validatedPlaylist) {
			if (err) {
				log.warn("abrsdk: sendPlaylist error = " + err);
			} else {
				if (playlistArray.length != validatedPlaylist.length) {
					log.warn("abrsdk: playlist not accepted. requested=" + JSON.stringify(playlistArray) + " validated=" + JSON.stringify(validatedPlaylist));
				} else {
					log.debug("abrsdk: playlist successfully updated");
				}
				abrsdk.setPredictionCallback(function(predictions) {
					var status, volume;
					for (var i=0; i<predictions.radios.length; i++) {
						switch (predictions.status[i]) {
							case abrsdk.statusList.STATUS_AD: status = "AD"; break;
							case abrsdk.statusList.STATUS_SPEECH: status = "SPEECH"; break;
							case abrsdk.statusList.STATUS_MUSIC: status = "MUSIC"; break;
							default: status = "not available";
						}
						// normalized volume to apply to the audio tag to have similar loudness between channels
						volume = Math.pow(10, (Math.min(abrsdk.GAIN_REF-predictions.gain[i],0))/20);
						// you can now plug the data to your radio player.
						//log.debug("abrsdk: " + predictions.radios[i] + " has status " + status + " and volume " + Math.round(volume*100)/100);
						var radio = getRadio(predictions.radios[i]);
						if (!radio || !radio.liveStatus || !radio.liveStatus.onClassPrediction) {
							log.error("abrsdk: cannot call prediction callback");
						} else {
							radio.liveStatus.onClassPrediction(status, volume);
						}
					}
				});
			}
		});
	}
}

if (USE_ABRSDK && config.user.email) {
	log.info("abrsdk: token detected for email " + config.user.email);
	abrsdk.connectServer(function(err, isConnected) {
	//abrsdk._newSocket(["http://localhost:3066/"], 0, function(err, isConnected) {
		if (err) {
			log.error("abrsdk: connection error: " + err + ". switch off sdk");
			USE_ABRSDK = false;
		}
		if (isConnected) {
			updateDlList(true);
		} else {
			log.warn("SDK disconnected");
		}
	});
} else {
	updateDlList(false);
}

var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
server.listen(9820); // no "localhost" binding since this routine is intended to run in a Docker container

app.get('/config', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json({ radios: getRadios(), user: getUserConfig() });
});

app.get('/config/radios/insert/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	insertRadio(country, name, function(err) {
		if (err) {
			log.error("/config/insert/" + country + "/" + name + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
			updateDlList();
		}
	});
});

app.get('/config/radios/remove/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	removeRadio(country, name, function(err) {
		if (err) {
			log.error("/config/remove/" + country + "/" + name + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
			updateDlList();
		}
	});
});

app.get('/config/radios/available', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json(getAvailableInactive());
});

app.get('/config/radios/content/:country/:name/:type/:enable', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	var type = decodeURIComponent(request.params.type);
	var enable = decodeURIComponent(request.params.enable);
	toggleContent(country, name, type, enable, function(err) {
		if (err) {
			log.error("/config/radios/content/" + country + "/" + name + "/" + type + "/" + enable + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
		}
	});
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

// /!\ this is a HACK. Chrome mobile sends two requests to listen to a radio.
// the first one is tied to the audio output. the second one is useless.
// this is probably a bug in Chrome mobile.
// this is bad because the code closes the first connection, then
// serve the second. As a result, playback stops on the client after the buffer.
// we do a workaround for this bug by rejecting two consecutive listen requests
// that share the same random query string, originally used to avoid cache issues
var lastQueryRandomNum = null;

app.get('/status/:since', function(request, response) {
	var result = [];
	var since = request.params.since;
	for (let i=0; i<config.radios.length; i++) {
		var obj = {
			country: config.radios[i].country,
			name: config.radios[i].name
		}
		//var hasAvailable =
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.audioCache) {
			Object.assign(obj, { available: Math.floor(config.radios[i].liveStatus.audioCache.getAvailableCache()-config.user.streamInitialBuffer) });
		}
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.metaCache) {
			Object.assign(obj, config.radios[i].liveStatus.metaCache.read(since));
		}
		result.push(obj);
	}
	response.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache, must-revalidate' });
	response.json(result);
});


app.get('/listen/:radio/:delay', function(request, response) {
	var radio = decodeURIComponent(request.params.radio);
	var delay = request.params.delay;

	if (!getRadio(radio)) {
		response.writeHead(400);
		return response.end("radio not found");
	}

	var state = { requestDate: new Date() }; //newRequest: true,
	var queryRandomNum = request.query.t;
	if (lastQueryRandomNum !== null && queryRandomNum == lastQueryRandomNum) {
		log.warn("listen: discarding second listen request with same query string");
		response.writeHead(400);
		return response.end("query string must change at every request");
	}
	listenRequestDate = state.requestDate;
	lastQueryRandomNum = queryRandomNum;

	var radioObj = getRadio(radio);
	var initialBuffer = radioObj.liveStatus.audioCache.readLast(+delay+config.user.streamInitialBuffer,config.user.streamInitialBuffer);
	//log.debug("listen: readCursor set to " + radioObj.liveStatus.audioCache.readCursor);

	if (!initialBuffer) {
		log.error("/listen/" + radio + "/" + delay + ": initialBuffer not available");
		response.writeHead(400);
		return response.end("buffer not available");
	}

	log.info("listen: send initial buffer of " + initialBuffer.length + " bytes (" + getDeviceInfoExpress(request) + ")");

	switch(radioObj.codec) {
		case "AAC": response.set('Content-Type', 'audio/aacp'); break;
		case "MP3": response.set('Content-Type', 'audio/mpeg'); break;
		default: log.warn("unsupported codec: " + radioObj.codec);
	}

	response.write(initialBuffer);

	var finish = function() {
		clearInterval(listenTimer);
		response.end();
	}

	var listenTimer = setInterval(function() {
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
		if (listenRequestDate !== state.requestDate) {
			log.warn("request canceled because another one has been initiated");
			return finish();
		}
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
		var prevReadCursor = audioCache.readCursor;
		response.write(audioCache.readAmountAfterCursor(config.user.streamGranularity));
		//log.debug("listen: readCursor date=" + state.requestDate + " : " + prevReadCursor + " => " + audioCache.readCursor);
	}
});

app.use('/', express.static('client/build'));

var getIPExpress = function(request) {
	var ip = request.headers['x-forwarded-for']; // standard proxy header
	if (!ip) ip = request.headers['x-real-ip']; // nginx proxy header
	if (!ip) ip = request.connection.remoteAddress;
	return ip;
}

var getDeviceInfoExpress = function(request) {
    var agent = request.headers['user-agent'];
    return "login from IP " + getIPExpress(request) + " and UA " + agent;
}

var terminateServer = function(signal) {
	log.info("received SIGTERM signal. exiting...");
	for (var i=0; i<dl.length; i++) {
		dl[i].stopDl();
	}
	flushLog(function() {
		console.log("log written");
		process.exit(signal);
	});
}

process.on('SIGTERM', terminateServer);
process.on('SIGINT', terminateServer);

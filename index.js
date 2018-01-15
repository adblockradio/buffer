// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

var abrsdk = require("adblockradio-sdk");
var fs = require("fs");
var log = require("loglevel");
log.setLevel("debug");
var cp = require("child_process");
var findDataFiles = require("../adblockradio/predictor-db/findDataFiles.js");
var async = require("async");
var DlFactory = require("./DlFactory.js");

const DL = true;
const FETCH_METADATA = true;
const SEG_DURATION = 10;
const LISTEN_BUFFER = 30;

// list of listened radios:
var config = new Object();
try {
	var radiosText = fs.readFileSync("config/radios.json");
	config.radios = JSON.parse(radiosText);
	var userText = fs.readFileSync("config/user.json");
	config.user = JSON.parse(userText);
} catch(e) {
	return log.error("cannot load config. err=" + e);
}

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
	response.json(config);
	//log.debug("config[0]=" + JSON.stringify(config.radios[0]));
});

var getDateFromPath = function(path) {
	var spl = path.split("/");
	return spl[spl.length-1];
}

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

var isLive = function(radio, file) {
	return getRadio(radio).liveStatus.currentPrefix == file;
}

var listenRequestDate = null;
var listenHandler = function(response, radio, after, state, callback) {
	var before = new Date(+new Date(after)+6*SEG_DURATION*1000).toISOString();
	log.debug("listenHandler: after=" + after + " before=" + before + " bufferSeg=" + state.nSegmentsInitialBuffer);
	findDataFiles({ radios: [ radio ], after: after, before: before, path: __dirname }, function(classes) {
		var list = {};
		for (var classItem in classes) {
			Object.assign(list, classes[classItem]);
		}
		var files = Object.keys(list);
		files.sort();

		if (files.length == 0) return callback();

		var timeoutMonitor = null;

		async.forEachOfSeries(files, function(file, index, filesCallback) {
			log.debug("listen: read=" + file + state.ext);

			var rs;
			var livePlay;
			if (isLive(radio, file)) {
				livePlay = true;
				//log.info("listenHandler: currentAudioFile");
				rs = getRadio(radio).liveStatus.liveReadStream;
			} else {
				livePlay = false;
				rs = fs.createReadStream(file + state.ext);
			}

			var dataRead = 0;
			rs.on("data", function(data) {
				response.write(data);
				dataRead += data.length;
			});
			rs.on("error", function(err) {
				log.error("listen: readFile err=" + err + " livePlay=" + livePlay);
			});
			rs.on("end", function() {
				state.lastSentDate = new Date();
				var willWaitDrain = !response.write("");
				log.debug("listen: sent file " + (index+1) + "/" + files.length + " bytes=" + dataRead + " waitDrain=" + willWaitDrain + " live=" + livePlay);
				if (livePlay || !willWaitDrain) { //willWaitDrain) { // detect congestion of stream
					bufManager();
				} else {
					log.debug("listenHandler: will wait for drain event");
					response.once("drain", function() {
						clearTimeout(timeoutMonitor);
						bufManager();
					});
					timeoutMonitor = setTimeout(function() {
						response.removeListener("drain", bufManager);
						response.destroy();
						filesCallback({ message: "drain event not emitted, connection timeout" });
					}, SEG_DURATION*1500);
				}
			});
			var bufManager = function() {
				before = new Date(+new Date(getDateFromPath(file))+1).toISOString();
				if (state.requestDate !== listenRequestDate) {
					filesCallback({ message: "request canceled because another one has been initiated" });
				} else if (livePlay) {
					filesCallback();
				} else if (state.nSegmentsInitialBuffer > 0) {
					state.nSegmentsInitialBuffer--;
					filesCallback();
				} else {
					var delay = +SEG_DURATION*1000 - (new Date()-state.lastSentDate);
					log.debug("listenHandler: send more data in " + delay + " ms");
					setTimeout(filesCallback, delay);
				}
			}
		}, function(err) {
			if (err) {
				log.error("listen: err=" + err.message);
				callback();
			} else {
				listenHandler(response, radio, before, state, callback);
			}
		});
	});
}

var metadataHandler = function(response, radio, after) {
	findDataFiles({ radios: [ radio ], after: after, path: __dirname }, function(classes) {
		//log.debug(classes); // very verbose
		var list = {};
		for (var classItem in classes) {
			Object.assign(list, classes[classItem]);
		}
		var files = Object.keys(list);
		files.sort();
		//response.json(list);
		var isSameSegment = function(curSegment, newData) {
			if (curSegment.class !== newData.class) {
				//log.debug("isSameSegment: curEnd=" + curSegment.end + " diff class cur=" + curSegment.class + " vs new=" + newData.class);
				return false;
			} else if (!curSegment.title || !newData.title) {
				//log.debug("isSameSegment: curEnd=" + curSegment.end + " no title");
				return true;
			} else if (curSegment.title.artist && newData.title.artist && curSegment.title.artist !== newData.title.artist) {
				//log.debug("isSameSegment: curEnd=" + curSegment.end + " diff artist cur=" + curSegment.title.artist + " vs new=" + newData.title.artist);
				return false;
			} else if (curSegment.title.title && newData.title.title && curSegment.title.title !== newData.title.title) {
				//log.debug("isSameSegment: curEnd=" + curSegment.end + " diff title cur=" + curSegment.title.title + " vs new=" + newData.title.title);
				return false;
			} else if (curSegment.title.cover && newData.title.cover && curSegment.title.cover !== newData.title.cover) {
				//log.debug("isSameSegment: curEnd=" + curSegment.end + " diff cover");
				return false;
			} else {
				//log.debug("isSameSegment: same segment");
				return true;
			}
		}
		var newSegment = function(index) {
			return { class: list[files[index]].class, start: getDateFromPath(files[index]), end: getDateFromPath(files[index]), title: null }
		}

		var result = [];
		if (files.length == 0) return response.json(result);
		var curSegment = newSegment(0);
		async.forEachOfSeries(files, function(file, index, filesCallback) {
			//log.debug("metadata: read=" + file + ".json");

			curSegment.end = getDateFromPath(file);

			if (isLive(radio, file)) {
				//log.info("listenHandler: currentAudioFile");
				var pData = { class: list[file].class, title: getRadio(radio).liveStatus.metadata };
				if (!isSameSegment(curSegment, pData)) {
					result.push(curSegment);
					curSegment = newSegment(index);
				}
				curSegment.title = pData.title;
				filesCallback();
			} else {
				fs.readFile(file + ".json", function(err, data) {
					if (err) log.error("metadata: readFile err=" + err);
					try {
						var pData = JSON.parse(data);
					} catch(e) {
						log.error("metadata: json parse error file=" + file + ".json");
						return filesCallback();
					}
					pData.class = list[file].class;
					if (!isSameSegment(curSegment, pData)) {
						result.push(curSegment);
						curSegment = newSegment(index);
					}
					curSegment.title = pData.title;
					filesCallback();
				});
			}


		}, function(err) {
			if (err) log.error("metadata: err=" + err.message);
			result.push(curSegment);
			response.set({ 'Access-Control-Allow-Origin': '*' });
			response.json(result);
		});
	});
}


app.get('/:action/:radio/:after', function(request, response) {
	var action = request.params.action;
	var radio = request.params.radio;
	var after = request.params.after;
	log.debug("get: action=" + action + " radio=" + radio + " after=" + after);


	switch(action) {
		case "listen":
			var ext = ".mp3"; // TODO check for other extensions
			var state = {
				nSegmentsInitialBuffer: Math.floor(LISTEN_BUFFER/SEG_DURATION),
				lastSentDate: new Date(),
				ext: ext,
				requestDate: new Date()
			}
			listenRequestDate = state.requestDate;

			switch(state.ext) {
				case ".aac": response.set('Content-Type', 'audio/aacp'); break;
				case ".mp3": response.set('Content-Type', 'audio/mpeg'); break;
			}
			listenHandler(response, radio, after, state, function() {
				response.end();
			});
			break;

		case "metadata":
			metadataHandler(response, radio, after);
			break;

		default:
			response.setHeader(400);
			response.end();
	}
});

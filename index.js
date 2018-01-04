// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

var abrsdk = require("adblockradio-sdk");
var meta = require("webradio-metadata");
var fs = require("fs");
var log = require("loglevel");
var Dl = require("../adblockradio-dl/dl.js");
log.setLevel("debug");
var { Writable } = require("stream");
var cp = require("child_process");
var findDataFiles = require("../adblockradio/predictor-db/findDataFiles.js");
var async = require("async");

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

class Db {
	constructor(options) {
		this.country = options.country;
		this.name = options.name;
		this.path = options.path;
		this.ext = options.ext;
	}

	newAudioSegment(callback) {
		var now = new Date();
		var dir = this.path + "/records/" + dirDate(now) + "/" + this.country + "_" + this.name + "/todo/";
		var path = dir + now.toISOString();
		log.debug("saveAudioSegment: path=" + path);
		var self = this;
		cp.exec("mkdir -p \"" + dir + "\"", function(error, stdout, stderr) {
			if (error) {
				log.error("warning, could not create path " + path);
			}
			//log.debug("saveAudioSegment: callback");

			callback({
				audio: new fs.createWriteStream(path + "." + self.ext), //new AudioWriteStream(path + "." + self.ext),
				metadata: new MetaWriteStream(path + ".json")
			});
		});
	}
}

/*class AudioWriteStream extends Writable {
	constructor(path) {
		super();
		this.path = path;
		this.file = new fs.createWriteStream(path + ".part");
	}

	_write(data, enc, next) {
		this.file.write(data);
		next();
	}

	_final(next) {
		var self = this;
		this.file.end(function() {
			fs.rename(self.path + ".part", self.path, function(err) {
				if (err) {
					log.error("AudioWriteStream: err=" + err);
				}
				next();
			});
		});
	}
}*/

class MetaWriteStream extends Writable {
	constructor(path) {
		super({ objectMode: true });
		this.file = new fs.createWriteStream(path);
		this.ended = false;
		this.meta = {};
	}

	_write(meta, enc, next) {
		if (!meta.type) {
			log.error("MetaWriteStream: no data type");
			return next();
		}
		//log.debug("MetaWriteStream: data type=" + meta.type);
		this.meta[meta.type] = meta.data;
		next();
	}

	_final(next) {
		//log.debug("MetaWriteStream: end. meta=" + JSON.stringify(this.meta));
		this.file.end(JSON.stringify(this.meta));
		this.ended = true;
		next();
	}
}

var dirDate = function(now) {
	return (now.getUTCFullYear()) + "-" + (now.getUTCMonth()+1 < 10 ? "0" : "") + (now.getUTCMonth()+1) + "-" + (now.getUTCDate() < 10 ? "0" : "") + (now.getUTCDate());
}

var DlFactory = function(radio, metadataCallback) {
	var newDl = new Dl({ country: radio.country, name: radio.name, segDuration: SEG_DURATION });
	var dbs = null;
	newDl.on("error", function(err) {
		console.log("dl err=" + err);
	});
	newDl.on("metadata", function(metadata) {
		log.info(radio.country + "_" + radio.name + " metadata=" + JSON.stringify(metadata));
		metadataCallback(metadata);
		db = new Db({ country: radio.country, name: radio.name, ext: metadata.ext, path: __dirname });

		newDl.on("data", function(dataObj) {
			//dataObj: { newSegment: newSegment, tBuffer: this.tBuffer, data: data
			if (!dataObj.newSegment) {
				dbs.audio.write(dataObj.data);
			} else {
				newDl.pause();
				if (dbs) {
					dbs.audio.end();
					dbs.metadata.end()
				}
				db.newAudioSegment(function(newdbs) {
					dbs = newdbs;
					if (FETCH_METADATA) {
						getMeta(radio.country, radio.name, function(err, parsedMeta, corsEnabled) {
							if (err) {
								log.warn("getMeta: error fetching title meta. err=" + err);
							} else {
								log.info(radio.country + "_" + radio.name + " meta=" + JSON.stringify(parsedMeta));
								if (!dbs.metadata.ended) {
									dbs.metadata.write({ type: "title", data: parsedMeta });
								} else {
									log.warn("getMeta: could not write metadata, stream already ended");
								}
							}
						});
					}
					dbs.audio.write(dataObj.data);
					newDl.resume();
				});
			}
		});
	});
	return newDl;
}

if (DL) {
	var dl = [];
	for (var i=0; i<config.radios.length; i++) {
		if (config.radios[i].enable) dl.push(DlFactory(config.radios[i], function(metadata) {
			for (var j=0; j<config.radios.length; j++) {
				if (config.radios[j].country == metadata.country && config.radios[j].name == metadata.name) {
					config.radios[j].url = metadata.url;
					config.radios[j].favicon = metadata.favicon;
					return;
				}
			}
		}));
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
});

var getDateFromPath = function(path) {
	var spl = path.split("/");
	return spl[spl.length-1];
}

var listenHandler = function(response, radio, after, state, callback) {
	var before = new Date(+new Date(after)+60000).toISOString();
	log.debug("listenHandler: after=" + after + " before=" + before + " bufferSeg=" + state.nSegmentsInitialBuffer);
	findDataFiles({ radios: [ radio ], after: after, before: before, path: __dirname }, function(classes) {
		var list = {};
		for (classItem in classes) {
			Object.assign(list, classes[classItem]);
		}
		var files = Object.keys(list);
		files.sort();

		if (files.length == 0) return callback();

		var timeoutMonitor = null;

		async.forEachOfSeries(files, function(file, index, filesCallback) {
			//log.debug("listen: read=" + file + state.ext);
			fs.readFile(file + state.ext, function(err, data) {
				if (err) log.error("listen: readFile err=" + err)

				var bufManager = function() {
					before = new Date(+new Date(getDateFromPath(file))+1).toISOString();
					if (state.nSegmentsInitialBuffer > 0) {
						state.nSegmentsInitialBuffer--;
						filesCallback();
					} else {
						setTimeout(filesCallback, +SEG_DURATION*1000 - (new Date()-state.lastSentDate));
					}
				}

				state.lastSentDate = new Date();
				log.debug("listen: send " + data.length + " bytes from file " + (index+1) + "/" + files.length);
				if (response.write(data)) {
					bufManager();
				} else {
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
		for (classItem in classes) {
			Object.assign(list, classes[classItem]);
		}
		var files = Object.keys(list);
		files.sort();
		//response.json(list);
		var isSameSegment = function(curSegment, newData) {
			if (curSegment.class !== newData.class) {
				log.debug("isSameSegment: curEnd=" + curSegment.end + " diff class cur=" + curSegment.class + " vs new=" + newData.class);
				return false;
			} else if (!curSegment.title || !newData.title) {
				log.debug("isSameSegment: curEnd=" + curSegment.end + " no title");
				return true;
			} else if (curSegment.title.artist && newData.title.artist && curSegment.title.artist !== newData.title.artist) {
				log.debug("isSameSegment: curEnd=" + curSegment.end + " diff artist cur=" + curSegment.title.artist + " vs new=" + newData.title.artist);
				return false;
			} else if (curSegment.title.title && newData.title.title && curSegment.title.title !== newData.title.title) {
				log.debug("isSameSegment: curEnd=" + curSegment.end + " diff title cur=" + curSegment.title.title + " vs new=" + newData.title.title);
				return false;
			} else if (curSegment.title.cover && newData.title.cover && curSegment.title.cover !== newData.title.cover) {
				log.debug("isSameSegment: curEnd=" + curSegment.end + " diff cover");
				return false;
			} else {
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
			fs.readFile(file + ".json", function(err, data) {
				if (err) log.error("metadata: readFile err=" + err);
				try {
					var pData = JSON.parse(data);
				} catch(e) {
					log.error("metadata: json parse error file=" + file + ".json");
					return filesCallback();
				}
				pData.class = list[file].class;
				if (isSameSegment(curSegment, pData)) {
					curSegment.title = pData.title;
					curSegment.end = getDateFromPath(file);
				} else {
					result.push(curSegment);
					curSegment = newSegment(index);
				}
				filesCallback();
			});
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
				ext: ext
			}
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
	}
});

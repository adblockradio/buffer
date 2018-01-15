"use strict";

var { Writable, Duplex } = require("stream");
var log = require("loglevel");
log.setLevel("debug");
var cp = require("child_process");
var fs = require("fs");
var { getMeta } = require("webradio-metadata");
var Dl = require("../adblockradio-dl/dl.js");


class Db {
	constructor(options) {
		this.country = options.country;
		this.name = options.name;
		this.path = options.path;
		this.ext = options.ext;
	}

	newAudioSegment() {
		var now = new Date();
		var dir = this.path + "/records/" + dirDate(now) + "/" + this.country + "_" + this.name + "/todo/";
		var path = dir + now.toISOString();
		log.debug("newAudioSegment: path=" + path);
		var self = this;
		try {
			cp.execSync("mkdir -p \"" + dir + "\"");
		} catch(e) {
			log.error("warning, could not create path " + path + " e=" + e);
		}

		return {
			audio: new AudioWriteStream(path + "." + self.ext), //new fs.createWriteStream(path + "." + self.ext), //
			metadata: new MetaWriteStream(path + ".json"),
			path: path
		};
	}
}

class AudioWriteStream extends Duplex {
	constructor(path) {
		super();
		this.path = path;
		this.file = new fs.createWriteStream(path + ".part");
		//this.buffer = null;
	}

	_write(data, enc, next) {
		this.file.write(data);
		//this.buffer = this.buffer ? Buffer.concat([ this.buffer, data ]): data;
		this.push(data);
		next();
	}

	_read() {
		//this.push(this.buffer);
		//this.buffer = null;
	}

	_final(next) {
		var self = this;
		this.push(null);
		this.file.end(function() {
			fs.rename(self.path + ".part", self.path, function(err) {
				if (err) {
					log.error("AudioWriteStream: err=" + err);
				}
				next();
			});
		});
	}
}

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

var DlFactory = function(radio, options) {
	var newDl = new Dl({ country: radio.country, name: radio.name, segDuration: options.segDuration });
	var dbs = null;
	newDl.on("error", function(err) {
		log.error("dl err=" + err);
	});
	newDl.on("metadata", function(metadata) {
		//metadataCallback(metadata);
		radio.url = metadata.url;
		radio.favicon = metadata.favicon;
		var db = new Db({ country: radio.country, name: radio.name, ext: metadata.ext, path: __dirname });
		log.debug("DlFactory: " + radio.country + "_" + radio.name + " metadata=" + JSON.stringify(metadata));

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
				//log.debug("DlFactory: " + radio.country + "_" + radio.name + " new segment");
				dbs = db.newAudioSegment();
				Object.assign(radio.liveStatus, {
					currentPrefix: dbs.path,
					liveReadStream: dbs.audio
				});
				if (options.fetchMetadata) {
					getMeta(radio.country, radio.name, function(err, parsedMeta, corsEnabled) {
						if (err) return log.warn("getMeta: error fetching title meta. err=" + err);
						//log.debug(radio.country + "_" + radio.name + " meta=" + JSON.stringify(parsedMeta));
						if (!dbs.metadata.ended) {
							Object.assign(radio.liveStatus, {
								metadata: parsedMeta
							});
							dbs.metadata.write({ type: "title", data: parsedMeta });
						} else {
							log.warn("getMeta: could not write metadata, stream already ended");
						}
					});
				}
				dbs.audio.write(dataObj.data);
				newDl.resume();
			}
		});
	});
	return newDl;
}

module.exports = DlFactory;

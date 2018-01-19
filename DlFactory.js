"use strict";

var { Writable, Duplex } = require("stream");
var log = require("loglevel");
log.setLevel("debug");
var cp = require("child_process");
var fs = require("fs");
var { getMeta } = require("webradio-metadata");
var { StreamDl } = require("../adblockradio-dl/dl.js");
//var config = require("./config.js");

class Db {
	constructor(options) {
		this.country = options.country;
		this.name = options.name;
		this.path = options.path;
		this.ext = options.ext;
		this.audioCache = new AudioCache({ bitrate: options.bitrate, cacheLen: options.cacheLen });
		this.metaCache = new MetaCache({ cacheLen: options.cacheLen });
	}

	dirDate(now) {
		return (now.getUTCFullYear()) + "-" + (now.getUTCMonth()+1 < 10 ? "0" : "") + (now.getUTCMonth()+1) + "-" + (now.getUTCDate() < 10 ? "0" : "") + (now.getUTCDate());
	}

	newAudioSegment() {
		var now = new Date();
		var dir = this.path + "/records/" + this.dirDate(now) + "/" + this.country + "_" + this.name + "/todo/";
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
			date: now,
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

class AudioCache extends Writable {
	constructor(options) {
		super();
		this.buffer = null;
		this.cacheLen = options.cacheLen;
		this.bitrate = options.bitrate;
		this.flushAmount = this.cacheLen * this.bitrate * 0.1;
		this.readCursor = null;
	}

	_write(data, enc, next) {
		this.buffer = this.buffer ? Buffer.concat([ this.buffer, data ]) : data;
		//log.debug("AudioCache: _write: add " + data.length + " to buffer, new len=" + this.buffer.length);
		if (this.buffer.length >= this.cacheLen * this.bitrate + this.flushAmount) {
			log.debug("AudioCache: _write: cutting buffer at len = " + this.cacheLen * this.bitrate);
			this.buffer = this.buffer.slice(this.cacheLen * this.bitrate);
			if (this.readCursor) {
				this.readCursor -= this.flushAmount;
				if (this.readCursor <= 0) this.readCursor = null;
			}
		}
		next();
	}

	readLast(secondsFromEnd, duration) {
		var l = this.buffer.length;
		if (secondsFromEnd < 0 || duration < 0) {
			log.error("AudioCache: readLast: negative secondsFromEnd or duration");
			return null;
		} else if (duration > secondsFromEnd) {
			log.error("AudioCache: readLast: duration=" + duration + " higher than secondsFromEnd=" + secondsFromEnd);
			return null;
		} else if (secondsFromEnd * this.bitrate >= l) {
			log.error("AudioCache: readLast: attempted to read " + secondsFromEnd + " seconds (" + secondsFromEnd * this.bitrate + " b) while bufferLen=" + l);
			return null;
		}
		var data;
		if (duration) {
			data = this.buffer.slice(l - secondsFromEnd * this.bitrate, l - (secondsFromEnd-duration) * this.bitrate);
			this.readCursor = l - (secondsFromEnd-duration) * this.bitrate;
		} else {
			data = this.buffer.slice(l - secondsFromEnd * this.bitrate);
			this.readCursor = l;
		}
		return data;
	}

	readAmountAfterCursor(duration) {
		var nextCursor = this.readCursor + duration * this.bitrate;
		if (duration < 0) {
			log.error("AudioCache: readAmountAfterCursor: negative duration");
			return null;
		} else if (nextCursor >= this.buffer.length) {
			log.warn("AudioCache: readAmountAfterCursor: will read until " + this.buffer.length + " instead of " + nextCursor);
		}
		var data = this.buffer.slice(this.readCursor, nextCursor);
		this.readCursor = Math.min(this.buffer.length, nextCursor);
		return data;
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

class MetaCache extends Writable {
	constructor(options) {
		super({ objectMode: true });
		this.meta = {};
		this.cacheLen = options.cacheLen;
	}

	_write(meta, enc, next) {
		if (!meta.type) {
			log.error("MetaCache: no data type");
			return next();
		} else {
			//log.debug("MetaCache: _write: " + JSON.stringify(meta));
		}
		// events of this kind:
		// meta = { type: "metadata", validFrom: Date, validTo: Date, payload: { artist: "...", title : "...", cover: "..." } }
		// meta = { type: "class", validFrom: Date, validTo: Date, payload: "todo" }
		// meta = { type: "signal", validFrom: Date, validTo: Date, payload: [0.4, 0.3, ...] }

		// are stored in the following structure:
		// this.meta = {
		//		"metadata": [
		//			{ validFrom: ..., validTo: ..., payload: { ... } }, (merges the contiguous segments)
		//			...
		//		],
		//		"class": [
		//			{ validFrom: ..., validTo: ..., payload: ... }, (merges the contiguous segments)
		//			...
		//		],
		//		"signal": [
		//			{ validFrom: ..., validTo: ..., payload: [ ... ] },
		//			...
		//		]
		//	}

		switch (meta.type) {
			case "metadata":
			case "class":
				if (!this.meta[meta.type]) {
					this.meta[meta.type] = [ { validFrom: meta.validFrom, validTo: meta.validTo, payload: meta.payload } ];
				} else {
					var samePayload = true;
					for (var key in meta.payload) {
						if ("" + meta.payload[key] && "" + meta.payload[key] !== "" + this.meta[meta.type][this.meta[meta.type].length-1].payload[key]) {
							samePayload = false;
							log.debug("MetaCache: _write: different payload key=" + key + " new=" + meta.payload[key] + " vs old=" + this.meta[meta.type][this.meta[meta.type].length-1].payload[key]);
							break;
						}
					}
					if (samePayload) {
						this.meta[meta.type][this.meta[meta.type].length-1].validTo = meta.validTo; // extend current segment validity
					} else {
						this.meta[meta.type][this.meta[meta.type].length-1].validTo = meta.validFrom; // create a new segment
						this.meta[meta.type].push({ validFrom: meta.validFrom, validTo: meta.validTo, payload: meta.payload });
					}
				}
				break;
			case "signal":
				if (!this.meta[meta.type]) {
					this.meta[meta.type] = [ { validFrom: meta.validFrom, validTo: meta.validTo, payload: meta.payload } ];
				} else {
					this.meta[meta.type].push({ validFrom: meta.validFrom, validTo: meta.validTo, payload: meta.payload });
				}
				break;
			default:
				log.error("MetaCache: _write: unknown metadata type = " + meta.type);
		}

		// clean old entries
		while (+this.meta[meta.type][0].validTo <= +new Date() - 1000 * this.cacheLen) {
			this.meta[meta.type].splice(0, 1);
		}

		//log.debug("MetaCache: _write: meta[" + meta.type + "]=" + JSON.stringify(this.meta[meta.type]));
		next();
	}

	read() {
		this.meta.now = +new Date();
		return this.meta;
	}
}

module.exports = function(radio, options) {
	var newDl = new StreamDl({ country: radio.country, name: radio.name, segDuration: options.segDuration });
	var dbs = null;
	newDl.on("error", function(err) {
		log.error("dl err=" + err);
	});
	newDl.on("metadata", function(metadata) {
		//metadataCallback(metadata);
		radio.url = metadata.url;
		radio.favicon = metadata.favicon;
		var db = new Db({ country: radio.country, name: radio.name, ext: metadata.ext, bitrate: metadata.bitrate, cacheLen: options.cacheLen, path: __dirname });
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
					liveReadStream: dbs.audio,
					audioCache: db.audioCache,
					metaCache: db.metaCache
				});
				if (options.fetchMetadata) {
					getMeta(radio.country, radio.name, function(err, parsedMeta, corsEnabled) {
						if (err) return log.warn("getMeta: error fetching title meta. err=" + err);
						//log.debug(radio.country + "_" + radio.name + " meta=" + JSON.stringify(parsedMeta));
						if (!dbs.metadata.ended) {
							Object.assign(radio.liveStatus, {
								metadata: parsedMeta
							});
							dbs.metadata.write({ type: "metadata", data: parsedMeta });
							db.metaCache.write({ type: "metadata", validFrom: +dbs.date-500*options.segDuration, validTo: +dbs.date+500*options.segDuration, payload: parsedMeta });
							db.metaCache.write({ type: "class", validFrom: +dbs.date-500*options.segDuration, validTo: +dbs.date+500*options.segDuration, payload: "todo" });
						} else {
							log.warn("getMeta: could not write metadata, stream already ended");
						}
					});
				}
				dbs.audio.write(dataObj.data);
				newDl.resume();
			}
			db.audioCache.write(dataObj.data);
		});
	});
	return newDl;
}

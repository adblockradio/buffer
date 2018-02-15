"use strict";

var { Writable, Duplex } = require("stream");
var log = require("./log.js")("DlFactory");
var cp = require("child_process");
var fs = require("fs");
var { getMeta } = require("../webradio-metadata/getStreamMetadata.js"); // TODO use npm package
var { StreamDl } = require("../adblockradio-dl/dl.js"); // TODO publish source ?
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
		//log.debug("newAudioSegment: path=" + path);
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
		this.cacheLen = options.cacheLen;
		this.bitrate = options.bitrate;
		this.bitrateValidated = false;
		this.flushAmount = 60 * this.bitrate;
		this.readCursor = null;
		this.buffer = Buffer.allocUnsafe(this.cacheLen * this.bitrate + 2*this.flushAmount).fill(0);
		this.writeCursor = 0;
	}

	_write(data, enc, next) {
		if (this.writeCursor + data.length > this.buffer.length) {
			log.warn("AudioCache: _write: buffer overflow wC=" + this.writeCursor + " dL=" + data.length + " bL=" + this.buffer.length);
		}
		data.copy(this.buffer, this.writeCursor);
		this.writeCursor += data.length;

		//log.debug("AudioCache: _write: add " + data.length + " to buffer, new len=" + this.buffer.length);
		if (this.writeCursor >= this.flushAmount && !this.bitrateValidated) {
			var self = this;
			this.evalBitrate(this.buffer, function(bitrate) {
				if (!isNaN(bitrate) && bitrate > 0 && self.bitrate != bitrate) {
					log.info("AudioCache: bitrate adjusted from " + self.bitrate + "bps to " + bitrate + "bps");

					// if bitrate is higher than expected, expand the buffer accordingly.
					if (bitrate > self.bitrate) {
						var expandBuf = Buffer.allocUnsafe(self.cacheLen * (bitrate - self.bitrate)).fill(0);
						log.info("AudioCache: buffer expanded from " + self.buffer.length + " to " + (self.buffer.length + expandBuf.length) + " bytes");
						self.buffer = Buffer.concat([ self.buffer, expandBuf ]);
					}
					self.bitrate = bitrate;
				}
			});
			this.bitrateValidated = true;
		}

		if (this.writeCursor >= this.cacheLen * this.bitrate + this.flushAmount) {
			//log.debug("AudioCache: _write: cutting buffer at len = " + this.cacheLen * this.bitrate);
			this.buffer.copy(this.buffer, 0, this.flushAmount);
			this.writeCursor -= this.flushAmount;

			if (this.readCursor) {
				this.readCursor -= this.flushAmount;
				if (this.readCursor <= 0) this.readCursor = null;
			}
		}
		next();
	}

	readLast(secondsFromEnd, duration) {
		var l = this.writeCursor; //this.buffer.length;
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
		} else if (nextCursor >= this.writeCursor) {
			log.warn("AudioCache: readAmountAfterCursor: will read until " + this.writeCursor + " instead of " + nextCursor);
		}
		nextCursor = Math.min(this.writeCursor, nextCursor);
		var data = this.buffer.slice(this.readCursor, nextCursor);
		this.readCursor = nextCursor;
		return data;
	}

	getAvailableCache() {
		return this.buffer ? this.writeCursor / this.bitrate : 0;
	}

	evalBitrate(buffer, callback) {
		var tmpPath = "/tmp/" + Math.floor(Math.random() * 1000000000);
		fs.writeFile(tmpPath, buffer, function(err) {
			if (err) {
				log.warn("evalBitrate: could not write temp file. err=" + err);
				return callback(null);
			}
			cp.exec("ffmpeg -i 'file:" + tmpPath + "' 2>&1 | grep bitrate", function(error, stdout, stderr) {
				//log.debug("evalBitrate: stdout: " + stdout + ", stderr: " + stderr + ", error: " + error);
				var indexStartBitrate = stdout.indexOf("bitrate:") + 9;
				var output = stdout.slice(indexStartBitrate, stdout.length-1);
				//log.debug("evalBitrate: output1: " + output);
				var indexStopBitrate = output.indexOf("kb/s") - 1;
				output = output.slice(0, indexStopBitrate);
				//log.debug("evalBitrate: output2: ||" + output + "||");
				var ffmpegBitrate = 1000 * parseInt(output) / 8;
				//log.debug("evalBitrate: bitrate: " + ffmpegBitrate);
				return callback(ffmpegBitrate);
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
		} else if (meta.validFrom > meta.validTo) {
			log.error("MetaCache: negative time window validFrom=" + meta.validFrom + " validTo=" + meta.validTo);
			return next();
		} else {
			//log.debug("MetaCache: _write: " + JSON.stringify(meta));
		}
		// events of this kind:
		// meta = { type: "metadata", validFrom: Date, validTo: Date, payload: { artist: "...", title : "...", cover: "..." } } ==> metadata for enhanced experience
		// meta = { type: "class", validFrom: Date, validTo: Date, payload: "todo" } ==> class of audio, for automatic channel hopping
		// meta = { type: "volume", validFrom: Date, validTo: Date, payload: [0.85, 0.89, 0.90, ...] } ==> normalized volume for audio player
		// meta = { type: "signal", validFrom: Date, validTo: Date, payload: [0.4, 0.3, ...] } ==> signal amplitude envelope for visualization

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
			case "volume":
				if (!this.meta[meta.type]) {
					this.meta[meta.type] = [ { validFrom: meta.validFrom, validTo: meta.validTo, payload: meta.payload } ];
				} else {
					var samePayload = true;
					for (var key in meta.payload) {
						if ("" + meta.payload[key] && "" + meta.payload[key] !== "" + this.meta[meta.type][this.meta[meta.type].length-1].payload[key]) {
							samePayload = false;
							//log.debug("MetaCache: _write: different payload key=" + key + " new=" + meta.payload[key] + " vs old=" + this.meta[meta.type][this.meta[meta.type].length-1].payload[key]);
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

		// fix overlapping entries
		for (var i=0; i<this.meta[meta.type].length-1; i++) {
			if (this.meta[meta.type][i].validTo > this.meta[meta.type][i+1].validFrom) {
				//var middle = (this.meta[meta.type][i].validTo + this.meta[meta.type][i+1].validFrom) / 2;
				var delta = (this.meta[meta.type][i].validTo - this.meta[meta.type][i+1].validFrom) / 2;
				log.debug("MetaCache: fix meta " + meta.type + " overlapping prevTo=" + this.meta[meta.type][i].validTo + " nextFrom=" + this.meta[meta.type][i+1].validFrom + " newBound=" + (this.meta[meta.type][i].validTo - delta));
				this.meta[meta.type][i].validTo -= delta;
				this.meta[meta.type][i+1].validFrom += delta;
			}
		}
		//log.debug("MetaCache: _write: meta[" + meta.type + "]=" + JSON.stringify(this.meta[meta.type]));
		next();
	}

	read(since) {
		if (!since) {
			this.meta.now = +new Date();
			return this.meta;
		} else {
			var result = { now: +new Date() };
			var thrDate = result.now - since*1000;
			typeloop:
			for (var type in this.meta) {
				if (type == "now") continue typeloop;
				if (thrDate < this.meta[type][0].validFrom) {
					result[type] = this.meta[type];
					continue;
				} else {
					itemloop:
					for (var i=0; i<this.meta[type].length; i++) {
						if (this.meta[type][i].validFrom <= thrDate && thrDate < this.meta[type][i].validTo) {
							result[type] = this.meta[type].slice(i);
							break itemloop;
						}
					}
					continue;
				}
				log.warn("MetaCache: read since " + since + "s: no data found for type " + type);
			}
			return result;
		}
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
		var db = new Db({
			country: radio.country,
			name: radio.name,
			ext: metadata.ext,
			bitrate: metadata.bitrate,
			cacheLen: options.cacheLen,
			path: __dirname
		});
		log.debug("DlFactory: " + radio.country + "_" + radio.name + " metadata=" + JSON.stringify(metadata));

		var onClassPrediction = function(className, volume) {
			var now = +new Date();
			db.metaCache.write({
				type: "class",
				validFrom: now-500*options.segDuration,
				validTo: now+500*options.segDuration,
				payload: className
			});
			db.metaCache.write({
				type: "volume",
				validFrom: now-500*options.segDuration,
				validTo: now+500*options.segDuration,
				payload: volume
			});
			if (options.saveAudio && dbs && dbs.metadata) {
				dbs.metadata.write({ type: "class", data: className });
				dbs.metadata.write({ type: "volume", data: volume });
			}
		}

		Object.assign(radio.liveStatus, {
			audioCache: db.audioCache,
			metaCache: db.metaCache,
			onClassPrediction: onClassPrediction
		});

		newDl.on("data", function(dataObj) {
			//dataObj: { newSegment: newSegment, tBuffer: this.tBuffer, data: data
			if (!dataObj.newSegment) {
				if (options.saveAudio) dbs.audio.write(dataObj.data);
			} else {
				newDl.pause();
				if (options.saveAudio) {
					if (dbs) {
						dbs.audio.end();
						dbs.metadata.end()
					}
					dbs = db.newAudioSegment();
					Object.assign(radio.liveStatus, {
						currentPrefix: dbs.path,
						liveReadStream: dbs.audio
					});
				}

				if (options.fetchMetadata) {
					getMeta(radio.country, radio.name, function(err, parsedMeta, corsEnabled) {
						if (err) return log.warn("getMeta: error fetching title meta for radio " + radio.country + "_" + radio.name + " err=" + err);
						//log.debug(radio.country + "_" + radio.name + " meta=" + JSON.stringify(parsedMeta));
						if (options.saveAudio) {
							if (!dbs.metadata.ended) {
								dbs.metadata.write({ type: "metadata", data: parsedMeta });
							} else {
								log.warn("getMeta: could not write metadata, stream already ended");
							}
						}

						Object.assign(radio.liveStatus, {
							metadata: parsedMeta
						});
						var now = +new Date();
						db.metaCache.write({ type: "metadata", validFrom: now-500*options.segDuration, validTo: now+500*options.segDuration, payload: parsedMeta });
					});
				}

				if (options.saveAudio) dbs.audio.write(dataObj.data);
				newDl.resume();
			}
			db.audioCache.write(dataObj.data);
		});
	});
	return newDl;
}

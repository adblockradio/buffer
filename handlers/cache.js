'use strict';

const { log } = require('abr-log')('cache');
const { Analyser } = require("../adblockradio/post-processing.js");
const { config } = require('./config');
var dl = [];
var lastPrediction = new Date();


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


const addRadio = function(country, name) {
	const abr = new Analyser({
		country: country,
		name: name,
		config: {
			predInterval: 2,
			saveDuration: 5,
			enablePredictorHotlist: true,
			enablePredictorMl: true,
			saveAudio: false,
			saveMetadata: false,
			fetchMetadata: true,
			verbose: false,
		}
	});

	abr.audioCache = new AudioCache({ bitrate: options.bitrate, cacheLen: config.user.cacheLen });
	abr.metaCache = new MetaCache({ cacheLen: config.user.cacheLen });

	abr.on("data", function(obj) {
		//obj.liveResult.audio = "[redacted]";
		//log.info("status=" + JSON.stringify(Object.assign(obj, { audio: undefined }), null, "\t"));

		db.audioCache.write(dataObj.data);
		// todo update bitrate here. set audioCache in Object mode

		const now = +new Date();
		abr.metaCache.write({
			type: "class",
			validFrom: now-500*options.segDuration,
			validTo: now+500*options.segDuration,
			payload: className
		});
		abr.metaCache.write({
			type: "volume",
			validFrom: now-500*options.segDuration,
			validTo: now+500*options.segDuration,
			payload: volume
		});
		abr.metaCache.write({
			type: "metadata",
			validFrom: now-500*options.segDuration,
			validTo: now+500*options.segDuration,
			payload: parsedMeta
		});
	});

	dl.push(abr);

	/*dl.push(DlFactory(config.radios[i], {
		fetchMetadata: FETCH_METADATA,
		segDuration: SEG_DURATION,
		saveAudio: SAVE_AUDIO,
		cacheLen: config.user.cacheLen + config.user.streamInitialBuffer
	}));*/
}


var updateDlList = function(forcePlaylistUpdate) {
	//var playlistChange = false || !!forcePlaylistUpdate;

	// add missing sockets
	for (var i=0; i<config.radios.length; i++) {
		const alreadyThere = config.radios.filter(r => r.country === dl[j].country && r.name === dl[j].name).length > 0;
		if (!alreadyThere) {
			config.radios[i].liveStatus = {};
			log.info("updateDlList: start " + config.radios[i].country + "_" + config.radios[i].name);
			addRadio(config.radios[i].country, config.radios[i].name);
		}
	}

	// remove obsolete ones.
	for (var j=dl.length-1; j>=0; j--) {
		const shouldBeThere = config.radios.filter(r => r.country === dl[j].country && r.name === dl[j].name).length > 0;
		if (!shouldBeThere) {
			log.info("updateDlList: stop " + dl[j].country + "_" + dl[j].name);
			dl[j].stopDl();
			dl.splice(j, 1);
		}
	}
}

exports.updateDlList = updateDlList;
const { config, getRadio } = require('../handlers/config');
const cp = require("child_process");
const Speaker = require("speaker");
const { log } = require("abr-log")("listen-electron");

const speaker = new Speaker({
	channels: 2,          // 2 channels
	bitDepth: 16,         // 16-bit samples
	sampleRate: 44100     // 44,100 Hz sample rate
});

const bitrate = 44100 * 2 * 2; // 44100 Hz, stereo, 16 bit

speaker.on("error", function(err) {
	log.warn("speaker err=" + err);
});

let speakerOpened = false;
speaker.once("open", function() {
	log.debug("speaker opened in main()");
	speakerOpened = true;
});


let volume = 0;
let transcoder, listenTimer;

// play audio locally
function play(radio, delay) {
	try {
		log.info("play " + radio + " at delay " + delay);

		const radioObj = getRadio(...radio.split("_"));
		if (!radioObj) {
			return "radio not found";
		}

		let skipPcmBytes = Math.max(config.user.streamInitialBuffer - 0.5) * 44100 * 2 * 2; // 44100 Hz, stereo, 16 bit.

		var initialBuffer = radioObj.liveStatus.audioCache.readLast(+delay+config.user.streamInitialBuffer,config.user.streamInitialBuffer);
		//log.debug("listen: readCursor set to " + radioObj.liveStatus.audioCache.readCursor);

		if (!initialBuffer) {
			log.error("/listen/" + radio + "/" + delay + ": initialBuffer not available");
			return "buffer not available";
		}

		stop(); // shut down previous trancoder

		transcoder.stdout.on("data", function(data) {
			if (data.length && skipPcmBytes > 0) {
				skipPcmBytes -= data.length;
				log.debug("skipPcmBytes " + (skipPcmBytes + data.length) + " => " + skipPcmBytes);
				if (skipPcmBytes < 0) {
					data = data.slice(data.length + skipPcmBytes);
				} else {
					return;
				}
			}
			if (!data.length) {
				return log.warn("transcoder returned empty data");
			}
			transcoder.stdout.pause();
			for (let i=0; i<data.length/2; i++) {
				data.writeInt16LE(Math.max(-32767, Math.min(32768, Math.round(volume * data.readInt16LE(2*i)))), 2*i);
			}
			log.debug("got " + data.length + " bytes from transcoder");
			try {
				log.debug("write " + data.length + " bytes");
				speaker.write(data);
			} catch(e) {
				log.error("speaker error=" + e);
			}
			if (speakerOpened) {
				setTimeout(function() {
					transcoder.stdout.resume();
				}, 1000 * data.length / bitrate / 2);
			} else {
				speaker.once("open", function() {
					log.debug("speaker opened in play()");
					speakerOpened = true;
					transcoder.stdout.resume();
				});
			}
		});

		log.info("listen: send initial buffer of " + initialBuffer.length + " bytes");

		transcoder.stdin.write(initialBuffer);

		var sendMore = function() {
			/*if (listenRequestDate !== state.requestDate) {
				log.warn("request canceled because another one has been initiated");
				return stop();
			}*/
			var radioObj = getRadio(...radio.split("_"));
			if (!radioObj) {
				log.error("/listen/" + radio + "/" + delay + ": radio not available");
				return stop();
			}
			var audioCache = radioObj.liveStatus.audioCache;
			if (!audioCache) {
				log.error("/listen/" + radio + "/" + delay + ": audioCache not available");
				return stop();
			}
			//var prevReadCursor = audioCache.readCursor;
			transcoder.stdin.write(audioCache.readAmountAfterCursor(config.user.streamGranularity));
			log.debug("listen: readCursor=" + audioCache.readCursor);
		}

		listenTimer = setInterval(sendMore, 1000*config.user.streamGranularity);

	} catch(e) {
		log.error("play error=" + e);
		log.error(e.stack);
	}
	return null;
}

function newTranscoder() {
	log.debug("new transcoder");
	transcoder = cp.spawn('ffmpeg', [
		'-i', 'pipe:0',
		'-acodec', 'pcm_s16le',
		'-ar', 44100,
		'-ac', 2,
		'-f', 'wav',
		'-v', 'fatal',
		'pipe:1'
	], { stdio: ['pipe', 'pipe', process.stderr] });
	log.debug("stdin hWM: " + transcoder.stdin._writableState.highWaterMark);
	transcoder.stdin._writableState.highWaterMark = 1024;
	log.debug("stdin hWM: " + transcoder.stdin._writableState.highWaterMark);
	log.debug("stdout hWM: " + transcoder.stdout._readableState.highWaterMark);
	transcoder.stdout._readableState.highWaterMark = 1024;
	log.debug("stdout hWM: " + transcoder.stdout._readableState.highWaterMark);
}

newTranscoder();

function stop() {
	log.debug("stop");
	if (listenTimer) {
		clearInterval(listenTimer);
		if (transcoder && transcoder.stdin) {
			transcoder.stdin.end();
			transcoder.kill();
			newTranscoder();
		}
	}
}

function setVolume(vol) {
	if (vol !== volume) {
		log.debug("set volume to " + vol);
		volume = vol;
	}
}

exports.play = play;
exports.stop = stop;
exports.setVolume = setVolume;
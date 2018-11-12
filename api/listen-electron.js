const { config, getRadio } = require('../handlers/config');
const cp = require("child_process");
const { log } = require("abr-log")("listen-electron");

let transcoder, listenTimer;

// play audio locally
function play(radio, delay, playToken, onData) {
	try {
		log.info("play " + radio + " at delay " + delay);

		const radioObj = getRadio(...radio.split("_"));
		if (!radioObj) {
			return "radio not found";
		}

		//let skipPcmBytes = Math.max(config.user.streamInitialBuffer - 0.5) * 44100 * 2 * 2; // 44100 Hz, stereo, 16 bit.

		var initialBuffer = radioObj.liveStatus.audioCache.readLast(+delay+config.user.streamInitialBuffer,config.user.streamInitialBuffer);
		//log.debug("listen: readCursor set to " + radioObj.liveStatus.audioCache.readCursor);

		if (!initialBuffer) {
			log.error("/listen/" + radio + "/" + delay + ": initialBuffer not available");
			return "buffer not available";
		}

		stop(); // shut down previous trancoder

		transcoder.stdout.on("data", function(data) {
			onData(playToken, data);
		});

		log.info("listen: send initial buffer of " + initialBuffer.length + " bytes");

		setImmediate(function() {
			transcoder.stdin.write(initialBuffer);
		});

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
			//onData(audioCache.readAmountAfterCursor(config.user.streamGranularity));
			//log.debug("listen: readCursor=" + audioCache.readCursor);
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
	/*log.debug("stdin hWM: " + transcoder.stdin._writableState.highWaterMark);
	transcoder.stdin._writableState.highWaterMark = 1024;
	log.debug("stdin hWM: " + transcoder.stdin._writableState.highWaterMark);
	log.debug("stdout hWM: " + transcoder.stdout._readableState.highWaterMark);
	transcoder.stdout._readableState.highWaterMark = 1024;
	log.debug("stdout hWM: " + transcoder.stdout._readableState.highWaterMark);*/
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

exports.play = play;
exports.stop = stop;
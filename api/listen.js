const { log } = require('abr-log')('listen');
const { config } = require('../handlers/config');


var listenRequestDate = null;

// /!\ this is a HACK. Chrome mobile sends two requests to listen to a radio.
// the first one is tied to the audio output. the second one is useless.
// this is probably a bug in Chrome mobile.
// this is bad because the code closes the first connection, then
// serve the second. As a result, playback stops on the client after the buffer.
// we do a workaround for this bug by rejecting two consecutive listen requests
// that share the same random query string, originally used to avoid cache issues
var lastQueryRandomNum = null;

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

module.exports = (app) => app.get('/listen/:radio/:delay', function(request, response) {
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
// Copyright (c) 2018 Alexandre Storelli

var audioElement = document.createElement('audio');

audioElement.addEventListener("error", function(err) { // when a player error happens, blacklist the stream for 15 seconds
	console.log("playing error: ")
	console.log(err);
});

audioElement.addEventListener("play", function() {
	console.log("playback started");
});

var play = function(url) {
	stop();
	console.log("play " + url);
	audioElement.src = url;
	audioElement.play();
}

var stop = function() {
	audioElement.pause();
	audioElement.currentTime = 0;
	try {
		audioElement.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAVFYAAFRWAAABAAgAZGF0YQAAAAA=';
		audioElement.play();
	} catch(e) {
		// no-op
	}
}

exports.play = play;
exports.stop = stop;
/*exports.getPlayerTime = function(startDate) {
	if (!startDate) {
		console.log("getPlayerTime: invalid startdate=" + startDate);
		return 0;
	}
	return new Date(+new Date(startDate) + Math.round(1000 * audioElement.currentTime)).toISOString();
}*/

// Copyright (c) 2018 Alexandre Storelli
/* global Media */
/* global Android */

var isCordovaApp = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;

var audioElement, play, stop, setVolume;

if (isCordovaApp) {
	play = function(url, callback) {
		if (audioElement && audioElement.stop) audioElement.stop();
		audioElement = new Media(url, function() {
			console.log("stream successfully loaded");
		}, function(err) {
			console.log("stream loading error=" + err);
		}, function(status) {
			console.log("stream status=" + status);
		});
		audioElement.play();
	}

	stop = function() {
		audioElement.stop();
	}

	setVolume = function(vol) {
		audioElement.setVolume(vol);
	}

} else if (navigator.userAgent === "abr_android") {

	// bindings to native Android APIs
	play = function(url, callback) {
		console.log("android: play url=" + url);
		Android.playbackStart(url, callback);
	}
	stop = function() {
		//console.log("android: stop");
		Android.playbackStop();
	}
	setVolume = function(vol) {
		//console.log("android: set vol=" + Math.round(vol*100) + "%");
		Android.playbackSetVolume("" + Math.round(vol*100));
	}

} else {
	audioElement = document.createElement('audio');

	audioElement.addEventListener("error", function(err) {
		console.log("playing error: ")
		console.log(err);
	});

	audioElement.addEventListener("play", function() {
		console.log("playback started");
	});

	play = function(url, callback) { // https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
		console.log("play " + url);
		audioElement.src = url;
		var playPromise = audioElement.play();
		if (playPromise !== undefined) {
			playPromise.then(_ => {
				if (callback) callback(null);
			})
			.catch(error => {
				if (callback) callback(error);
			});
		}
	}

	stop = function() {
		audioElement.src = "";
		audioElement.load();
	}

	setVolume = function(volume) {
		audioElement.volume = volume;
	}

}

exports.play = play;
exports.stop = stop;
exports.setVolume = setVolume;

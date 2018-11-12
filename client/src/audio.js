// Copyright (c) 2018 Alexandre Storelli
/* global Media */
/* global Android */

const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
const isCordovaApp = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 && !isElectron;

var audioElement, play, stop, setVolume;

if (isElectron) {
	console.log("listen: detected Electron env");

	let audioCtx, gainNode;
	let source;
	let startTime; //, startPlayback;

	function newContext() {
		console.log("new context");
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		gainNode = audioCtx.createGain();
		gainNode.gain.value = 0.5;
		gainNode.connect(audioCtx.destination);
	}

	newContext();

	play = function(url, callback) {
		if (startTime) {
			stop();
			return setTimeout(function() {
				play(url, callback);
			}, 50);
		}
		startTime = +new Date();
		let nextStartTime = null; //audioCtx.currentTime;
		//audioElement = document.createElement('audio');
		const spl = decodeURIComponent(url).split('?')[0].split("/"); // assuming following URL format: "listen/" + encodeURIComponent(radio) + "/" + (delay/1000)
		navigator.abrlisten.play(spl[1], spl[2], startTime, function(receivedStartTime, PCMAudioChunk) {
			if (receivedStartTime !== startTime) {
				console.log('received obsolete PCM chunk');
				return;
			}
			if (!nextStartTime) {
				console.log('start playback');
				nextStartTime = audioCtx.currentTime;
			}
			//if (!startPlayback) startPlayback = new Date();
			const PCMAudioChunk2 = Int8Array.from(PCMAudioChunk); //);
			const frames = PCMAudioChunk2.byteLength / 4;
			//console.log(frames / 44100 + " s => cursor = " + nextStartTime + " buffer=" + (nextStartTime - ((+new Date() - startPlayback)/1000) + " s"));
			const arrayBuffer = audioCtx.createBuffer(2, frames, 44100);

			const nowBufferingL = arrayBuffer.getChannelData(0);
			const nowBufferingR = arrayBuffer.getChannelData(1);
			for (var i = 0; i < frames; i++) {
				nowBufferingL[i] = (PCMAudioChunk2[4*i] + 256 * PCMAudioChunk2[4*i + 1]) / 32768;
				nowBufferingR[i] = (PCMAudioChunk2[4*i + 2] + 256 * PCMAudioChunk2[4*i + 3]) / 32768;
			}

			source = audioCtx.createBufferSource();
			source.buffer = arrayBuffer;
			source.connect(gainNode);
			source.start(nextStartTime);
			nextStartTime += frames / 44100;
		});
	}

	stop = function() {
		console.log("playback stop");
		navigator.abrlisten.stop();
		//source.stop(audioCtx.currentTime);//disconnect(gainNode);
		audioCtx.close();
		startTime = null;
		newContext();
		//setVolume(0);
	}

	setVolume = function(vol) {
		console.log("set volume = " + vol);
		gainNode.gain.value = vol;
	}

} else if (isCordovaApp) {
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
		if (callback) setImmediate(callback);
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

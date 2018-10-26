// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

const { log } = require('abr-log')('main');

const FETCH_METADATA = true;
const SAVE_AUDIO = false;
const SEG_DURATION = 10; // in seconds
const LISTEN_BUFFER = 30; // in seconds
var USE_ABRSDK = true;

var { config } = require("./handlers/config.js");




/*
	if (USE_ABRSDK && playlistChange) {
		var playlistArray = [];
		for (var i=0; i<config.radios.length; i++) {
			playlistArray.push(config.radios[i].country + "_" + config.radios[i].name);
		}

		var predInterval = setInterval(function() {
			let age = +new Date() - lastPrediction;
			if (age > 15000) {
				log.warn("abrsdk: last prediction received " + Math.round(age/1000) + "s ago");
				clearInterval(predInterval);
				updateDlList(true);
			}
		}, 5000);

		abrsdk.sendPlaylist(playlistArray, config.user.token, function(err, validatedPlaylist) {
			if (err) {
				log.warn("abrsdk: sendPlaylist error = " + err);
			} else {
				if (playlistArray.length != validatedPlaylist.length) {
					log.warn("abrsdk: playlist not accepted. requested=" + JSON.stringify(playlistArray) + " validated=" + JSON.stringify(validatedPlaylist));
				} else {
					log.debug("abrsdk: playlist successfully updated");
				}

				abrsdk.setPredictionCallback(function(predictions) {
					let age = +new Date() - lastPrediction;
					if (age > 15000) log.warn("abrsdk: received prediction after a blackout of " + Math.round(age/1000) + "s");
					lastPrediction = new Date();

					var status, volume;
					for (var i=0; i<predictions.radios.length; i++) {
						switch (predictions.status[i]) {
							case abrsdk.statusList.STATUS_AD: status = "AD"; break;
							case abrsdk.statusList.STATUS_SPEECH: status = "SPEECH"; break;
							case abrsdk.statusList.STATUS_MUSIC: status = "MUSIC"; break;
							default: status = "not available";
						}
						// normalized volume to apply to the audio tag to have similar loudness between channels
						volume = Math.pow(10, (Math.min(abrsdk.GAIN_REF-predictions.gain[i],0))/20);
						// you can now plug the data to your radio player.
						//log.debug("abrsdk: " + predictions.radios[i] + " has status " + status + " and volume " + Math.round(volume*100)/100);
						var radio = getRadio(predictions.radios[i]);
						if (!radio || !radio.liveStatus || !radio.liveStatus.onClassPrediction) {
							log.error("abrsdk: cannot call prediction callback");
						} else {
							radio.liveStatus.onClassPrediction(status, volume);
						}
					}
				});
			}
		});
	}
}

if (USE_ABRSDK && config.user.email) {
	log.info("abrsdk: token detected for email " + config.user.email);
	abrsdk.connectServer(function(err, isConnected) {
	//abrsdk._newSocket(["http://localhost:3066/"], 0, function(err, isConnected) {
		if (err) {
			log.error("abrsdk: connection error: " + err + ". switch off sdk");
			USE_ABRSDK = false;
		}
		if (isConnected) {
			updateDlList(true);
		} else {
			log.warn("SDK disconnected");
		}
	});
} else {
	updateDlList(false);
}*/

// start http server
const { app } = require('handlers/app');

try {
	require('api/config')(app);
	require('api/content')(app);
	require('api/listen')(app);
	require('api/radios')(app);
	require('api/status')(app);
} catch (e) {
	log.warn('API error. e=' + e);
}

var terminateServer = function(signal) {
	log.info("received SIGTERM signal. exiting...");
	for (var i=0; i<dl.length; i++) {
		dl[i].stopDl();
	}
}

process.on('SIGTERM', terminateServer);
process.on('SIGINT', terminateServer);

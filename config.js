"use strict";

var log = require("loglevel");
var fs = require("fs");
var { getRadioMetadata } = require("../adblockradio-dl/dl.js");
var { getAvailable } = require("webradio-metadata");


// list of listened radios:
var config = new Object();
try {
	var radiosText = fs.readFileSync("config/radios.json");
	config.radios = JSON.parse(radiosText);
	var userText = fs.readFileSync("config/user.json");
	config.user = JSON.parse(userText);
} catch(e) {
	return log.error("cannot load config. err=" + e);
}

exports.config = config;

var isRadioInConfig = function(country, name) {
	var isAlreadyThere = false;
	for (var i=0; i<config.radios.length; i++) {
		if (config.radios[i].country == country && config.radios[i].name == name) {
			isAlreadyThere = true;
			break;
		}
	}
	return isAlreadyThere;
}

var insertRadio = function(country, name, callback) {
	if (isRadioInConfig()) return callback("Radio already in the list");
	if (config.radios.length >= config.user.maxRadios) return callback("Playlist is already full");

	// now check that the radio is known to our API.
	getRadioMetadata(country, name, function(err, radio) {
		if (!radio) {
			return callback("Radio is not recognized");
		} else {
			config.radios.push({
				"country": country,
				"name": name,
				"content": {
					"ads": true,
					"speech": true,
					"music": true
				},
				"enable": true
			});
			saveRadios();
			return callback(null);
		}
	});
}

var removeRadio = function(country, name, callback) {

	for (var i=0; i<config.radios.length; i++) {
		if (config.radios[i].country == country && config.radios[i].name == name) {
			config.radios.splice(i, 1);
			saveRadios();
			return callback(null);
		}
	}
	return callback("Radio not in the list");
}

exports.insertRadio = insertRadio;
exports.removeRadio = removeRadio;

var getRadios = function() {
	var radios = [];
	for (var i=0; i<config.radios.length; i++) { // control on what data is exposed via the api
		var radio = config.radios[i];
		if (!radio.enable) continue;
		radios.push({
			country: radio.country,
			name: radio.name,
			enable: radio.enable,
			content: radio.content,
			url: radio.enabled,
			favicon: radio.favicon
		});
	}
	return radios;
}

exports.getRadios = getRadios;


var getUserConfig = function() {
	var result = {};
	Object.assign(result, {
		cacheLen: config.user.cacheLen,
		streamInitialBuffer: config.user.streamInitialBuffer,
		streamGranularity: config.user.streamGranularity,
		maxRadios: config.user.maxRadios
	});
	return result;
}

exports.getUserConfig = getUserConfig;

var saveRadios = function() {
	var exportedRadios = getRadios();
	fs.writeFile("config/radios.json", JSON.stringify(exportedRadios), function(err) {
		if (err) {
			log.error("saveRadios: could not save radio config. err=" + err);
		} else {
			log.debug("saveRadios: config saved");
		}
	});
}

var getAvailableInactive = function() {
	var available = getAvailable();
	// remove radios that are currently in playlist
	for (let i=available.length-1; i>=0; i--) {
		let itemInPlaylist = false;
		for (let j=0; j<config.radios.length; j++) {
			if (available[i].country === config.radios[j].country && available[i].name === config.radios[j].name) {
				itemInPlaylist = true;
				break;
			}
		}
		if (itemInPlaylist) {
			available.splice(i, 1);
		}
	}
	return available;
}

exports.getAvailableInactive = getAvailableInactive;

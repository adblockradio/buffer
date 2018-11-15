"use strict";

const { log } = require("abr-log")("config");
const fs = require("fs");
const { getRadioMetadata } = require("stream-tireless-baler");
const axios = require("axios");

// user configuration
var config = new Object();
// radios in playlist
try {
	var radiosText = fs.readFileSync("config/radios.json");
	config.radios = JSON.parse(radiosText);
} catch (e) {
	config.radios = [];
	log.info("default radio list loaded");
}

// radio catalog
try {
	var availableText = fs.readFileSync("config/available.json");
	config.available = JSON.parse(availableText);
} catch (e) {
	config.available = [];
	log.info("default available list loaded");
}

// user preferences
try {
	var userText = fs.readFileSync("config/user.json");
	config.user = JSON.parse(userText);
	if (!config.user.uuid) config.user.uuid = uuidv4()
} catch (e) {
	const uuidv4 = require('uuid/v4');
	log.info("default config loaded");
	config.user = {
		"cacheLen": 900,
		"streamInitialBuffer": 10,
		"streamGranularity": 2,
		"maxRadios": 4,
		"discardSmallSegments": 20,
		"serverPort": 9820,
		"modelRepo": "https://www.adblockradio.com/models/",
		"uuid": uuidv4()
	}
}
try {
	fs.writeFileSync("config/user.json", JSON.stringify(config.user, null, '\t'));
} catch (e) {
	log.error("could not write config file. err=" + e);
}

exports.config = config;

const { startMonitoring } = require("./cache");

// start monitoring radios
for (var i=0; i<config.radios.length; i++) {
	log.info("start " + config.radios[i].country + "_" + config.radios[i].name);
	config.radios[i].liveStatus = startMonitoring(config.radios[i].country, config.radios[i].name, config.user);
}

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

exports.insertRadio = function(country, name, callback) {
	if (isRadioInConfig()) return callback("Radio already in the list");
	if (config.radios.length >= config.user.maxRadios) return callback("Playlist is already full");

	// now check that the radio is known to our API.
	getRadioMetadata(country, name, function(err, radio) {
		if (!radio) {
			return callback("Radio is not recognized");
		} else {
			config.radios.push({
				country: country,
				name: name,
				content: {
					ads: false,
					speech: true,
					music: true
				},
				url: radio.url,
				codec: radio.codec,
				favicon: radio.favicon,
				liveStatus: startMonitoring(country, name, config.user),
			});
			//log.debug(JSON.stringify(config.radios[config.radios.length-1]));
			saveRadios();
			return callback(null);
		}
	});
}

exports.removeRadio = function(country, name, callback) {

	for (var i=0; i<config.radios.length; i++) {
		if (config.radios[i].country == country && config.radios[i].name == name) {
			config.radios[i].liveStatus.predictor.stopDl();
			config.radios.splice(i, 1);
			saveRadios();
			return callback(null);
		}
	}
	return callback("Radio not in the list");
}

exports.toggleContent = function(country, name, type, enable, callback) {
	if (enable != "enable" && enable != "disable") {
		return callback("keywords allowed are 'enable' and 'disable'");
	}
	if (["ads", "speech", "music"].indexOf(type) < 0) {
		return callback("type is either 'ads', 'speech' or 'music'");
	}
	for (var i=0; i<config.radios.length; i++) {
		if (config.radios[i].country == country && config.radios[i].name == name) {
			config.radios[i].content[type] = (enable == "enable") ? true : false;
			saveRadios();
			return callback(null);
		}
	}
	return callback("Radio not in the list");
}

exports.getRadios = function() {
	let radios = [];
	for (let i=0; i<config.radios.length; i++) { // control on what data is exposed via the api
		const radio = config.radios[i];
		radios.push({
			country: radio.country,
			name: radio.name,
			content: radio.content,
			url: radio.enabled, // TODO duh?
			favicon: radio.favicon,
			codec: radio.codec,
		});
	}
	return radios;
}

exports.getRadio = function(country, name) {
	// function to get the object config.radios[j] with matching country and name.
	// can be used with both parameters or with the first one only, with the format COUNTRY + '_' + NAME.
	const result = config.radios.filter(function(r) {
		return (r.country === country && r.name === name) || (r.country + '_' + r.name === name);
	});
	return result ? result[0] : null;
}

var getUserConfig = function() {
	var result = {};
	Object.assign(result, {
		email: config.user.email,
		cacheLen: config.user.cacheLen,
		streamInitialBuffer: config.user.streamInitialBuffer,
		streamGranularity: config.user.streamGranularity,
		maxRadios: config.user.maxRadios,
		discardSmallSegments: config.user.discardSmallSegments
	});
	return result;
}

exports.getUserConfig = getUserConfig;

var saveRadios = function() {
	var exportedRadios = exports.getRadios();
	fs.writeFile("config/radios.json", JSON.stringify(exportedRadios, null, '\t'), function(err) {
		if (err) {
			log.error("saveRadios: could not save radio config. err=" + err);
		} else {
			log.debug("saveRadios: config saved");
		}
	});
}

// function that calls an API to get metadata about a radio
/*const getRadioMetadata = async function(country, name) {
	try {
		const API_PATH = "http://www.radio-browser.info/webservice/json/stations/bynameexact/";
		const result = await fetch(API_PATH + encodeURIComponent(name));
		const results = JSON.parse(result);
		const i = results.map(e => e.country).indexOf(country);

		if (i >= 0) return results[i];
		log.error("getRadioMetadata: radio not found: " + results);
		return null;
	} catch (e) {
		log.warn("Could not get metadata for radio " + country + "_" + name + ". err=" + e);
		return null;
	}
}*/

const saveAvailable = function() {
	fs.writeFile("config/available.json", JSON.stringify(config.available, null, '\t'), function(err) {
		if (err) {
			log.error("saveRadios: could not save available radios config. err=" + err);
		} else {
			log.debug("saveRadios: list of available radios saved");
		}
	});
}

const getAvailable = async function() {
	// fetch the list of available models on remote model repo
	const path = config.user.modelRepo + "list.json";
	try {
		const req = await axios.get(path);
		config.available = req.data;
	} catch (e) {
		log.warn('could not get list of available radios at path ' + path + '. e=' + e);
	}
	saveAvailable();
}

getAvailable();
setInterval(getAvailable, 1000 * 60 * 60); // refresh every hour

const getAvailableInactive = function() {

	let available = config.available.slice();

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

const gatherStatus = function(since) {
	const result = [];
	for (let i=0; i<config.radios.length; i++) {
		const obj = {
			country: config.radios[i].country,
			name: config.radios[i].name
		}
		//var hasAvailable =
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.audioCache) {
			Object.assign(obj, { available: Math.floor(config.radios[i].liveStatus.audioCache.getAvailableCache()) });
		}
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.metaCache) {
			Object.assign(obj, config.radios[i].liveStatus.metaCache.read(since));
		}
		result.push(obj);
	}
	return result;
}

exports.gatherStatus = gatherStatus;

const exit = function() {
	for (let i=0; i<config.radios.length; i++) {
		if (config.radios[i].liveStatus) {
			config.radios[i].liveStatus.predictor.stopDl();
		}
	}
	setTimeout(function() {
		process.exit(0);
	}, 1000);
}

exports.exit = exit;
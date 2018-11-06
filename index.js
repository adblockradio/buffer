// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

const { log } = require('abr-log')('main');
const { config } = require('./handlers/config'); /*(function(country, name) {

}, function(radioObj) {

});*/
const { startMonitoring } = require('./handlers/cache');

// start http server
const { app } = require('./handlers/app');

try {
	require('./api/config')(app);
	require('./api/content')(app);
	require('./api/listen')(app);
	require('./api/radios')(app);
	require('./api/status')(app);
} catch (e) {
	log.warn('API error. e=' + e);
}

// starts downloading and analysing streams
//updateDlList();

const updateDlList = function() { //forcePlaylistUpdate) {
	log.info("refresh playlist");
	//var playlistChange = false || !!forcePlaylistUpdate;

	const configList = config.radios.map(r => r.country + "_" + r.name);
	const currentList = config.radios.filter(r => r.liveStatus).map(r =>  r.country + "_" + r.name);

	// add missing monitors
	for (var i=0; i<configList.length; i++) {
		const alreadyThere = currentList.includes(configList[i]); //.filter(r => r.country === dl[j].country && r.name === dl[j].name).length > 0;
		if (!alreadyThere) {
			log.info("updateDlList: start " + config.radios[i].country + "_" + config.radios[i].name);
			config.radios[i].liveStatus = startMonitoring(config.radios[i].country, config.radios[i].name);
		}
	}

	// remove obsolete ones.
	for (var j=currentList-1; j>=0; j--) {
		const shouldBeThere = configList.includes(currentList[j]);
		if (!shouldBeThere) {
			log.info("updateDlList: stop " + dl[j].country + "_" + dl[j].name);
			const obj = config.radios.filter(r => r.country + "_" + r.name === currentList[j])[0];
			obj.predictor.stopDl();
			delete obj.liveStatus;
		}
	}
}
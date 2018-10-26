'use strict';

const { config } = require('../handlers/config');

module.exports = (app) => app.get('/status/:since', function(request, response) {
	var result = [];
	var since = request.params.since;
	for (let i=0; i<config.radios.length; i++) {
		var obj = {
			country: config.radios[i].country,
			name: config.radios[i].name
		}
		//var hasAvailable =
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.audioCache) {
			Object.assign(obj, { available: Math.floor(config.radios[i].liveStatus.audioCache.getAvailableCache()-config.user.streamInitialBuffer) });
		}
		if (config.radios[i].liveStatus && config.radios[i].liveStatus.metaCache) {
			Object.assign(obj, config.radios[i].liveStatus.metaCache.read(since));
		}
		result.push(obj);
	}
	response.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache, must-revalidate' });
	response.json(result);
});
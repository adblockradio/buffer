'use strict';

const { gatherStatus } = require('../handlers/config');

module.exports = (app) => app.get('/status/:since', function(request, response) {
	const since = request.params.since;
	response.set({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache, must-revalidate' });
	response.json(gatherStatus(since));
});
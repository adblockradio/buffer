
'use strict';

const { log } = require('abr-log')('flag');
const flag = require('../handlers/flag');

module.exports = (app) => app.post('/flag', async function(request, response) {
	const playingRadio = request.body.playingRadio;
	const cursors = request.body.cursors;
	log.debug("received flag request with playingRadio=" + playingRadio);
	response.set({ 'Access-Control-Allow-Origin': '*' });
	try {
		const OK = await flag({ playingRadio: playingRadio, cursors: cursors });
		if (!OK) throw new Error("flag request failed");
		response.status(200).send("OK");
	} catch (e) {
		log.error("api flag err=" + e);
		response.status(400).send("error");
	}
});

log.info("XXXXX flag API ready!");
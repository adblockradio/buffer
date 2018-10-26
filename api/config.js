
'use strict';

//const { log } = require('abr-log')('config');
const { getRadios, getUserConfig } = require('../handlers/config');

module.exports = (app) => app.get('/config', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json({ radios: getRadios(), user: getUserConfig() });
});
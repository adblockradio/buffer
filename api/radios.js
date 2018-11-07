const { log } = require('abr-log')('radios');
const { insertRadio, removeRadio, getAvailableInactive, config } = require('../handlers/config');
const { updateDlList } = require('../handlers/cache');

const insertRadioRoute = (app) => app.put('/config/radios/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	insertRadio(country, name, function(err) {
		if (err) {
			log.error("/config/insert/" + country + "/" + name + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
			updateDlList(config);
		}
	});
});

const removeRadioRoute = (app) => app.delete('/config/radios/:country/:name', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	removeRadio(country, name, function(err) {
		if (err) {
			log.error("/config/remove/" + country + "/" + name + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
			updateDlList(config);
		}
	});
});

const getAvailableRadios = (app) => app.get('/config/radios/available', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	response.json(getAvailableInactive());
});

module.exports = function(app) {
	insertRadioRoute(app);
	removeRadioRoute(app);
	getAvailableRadios(app);
}
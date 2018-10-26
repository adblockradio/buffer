const { log } = require('abr-log')('content');
const { toggleContent } = require('../handlers/config');

module.exports = (app) => app.put('/config/radios/:country/:name/content/:type/:enable', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	var country = decodeURIComponent(request.params.country);
	var name = decodeURIComponent(request.params.name);
	var type = decodeURIComponent(request.params.type);
	var enable = decodeURIComponent(request.params.enable);
	toggleContent(country, name, type, enable, function(err) {
		if (err) {
			log.error("/config/radios/content/" + country + "/" + name + "/" + type + "/" + enable + ": err=" + err);
			response.writeHead(400);
			response.end("err=" + err);
		} else {
			response.writeHead(200);
			response.end("OK");
		}
	});
});
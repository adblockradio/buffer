const { log } = require('abr-log')('content');
const { toggleContent } = require('../handlers/config');

module.exports = (app) => app.put('/config/radios/:country/:name/content/:type/:enable', function(request, response) {
	response.set({ 'Access-Control-Allow-Origin': '*' });
	const country = decodeURIComponent(request.params.country);
	const name = decodeURIComponent(request.params.name);
	const iType = parseInt(decodeURIComponent(request.params.type));
	if (iType < 0 || iType > 1) {
		response.writeHead(400);
		response.end("err=wrong content type");
	}
	const type = ["ads", "speech"][iType];
	const enable = decodeURIComponent(request.params.enable);
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
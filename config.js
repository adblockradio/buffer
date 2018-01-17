var log = require("loglevel");
var fs = require("fs");

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

module.exports = config;

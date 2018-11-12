// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

// load config and start monitoring radios
const Config = require('./handlers/config');

const isElectron = !!process.versions['electron']; // in a Electron environment (https://github.com/electron/electron/issues/2288)

if (!isElectron) {
	// start http server and API endpoints
	require('./handlers/app');
}

module.exports = Config;
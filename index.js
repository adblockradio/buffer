// Adblock Radio module to buffer radio stream data and deliver it to end user
// according to its listening preferences.

"use strict";

// load config and start monitoring radios
require('./handlers/config');

// start http server and API endpoints
require('./handlers/app');
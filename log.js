var log = require("loglevel");
log.setLevel("debug");
var prefix = require('loglevel-plugin-prefix');
var chalk = require('chalk');

// #### logging decoration ####
// see https://github.com/kutuluk/loglevel-plugin-prefix
const colors = {
  TRACE: chalk.magenta,
  DEBUG: chalk.cyan,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
  format(level, name, timestamp) {
    return `${chalk.gray(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)} ${chalk.green(`${name}:`)}`;
  },
});

module.exports = function(moduleName) {
	return log.getLogger(moduleName || "root");
}

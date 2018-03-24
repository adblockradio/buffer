var log = require("loglevel");
log.setLevel("debug");
var prefix = require('loglevel-plugin-prefix');
var chalk = require('chalk');
var fs = require('fs');
var util = require('util');
var moment = require('moment');

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

const WRITE_LOG = true;

var logBuf = "";
function writeLog(callback) {
    if (logBuf && WRITE_LOG) {
        fs.appendFile("log/" + moment(new Date()).format("MM-DD"), logBuf, function(err) {
            if (err) console.log("ERROR, could not write log to file log/" + moment(new Date()).format("MM-DD") + " : " + err);
            if (callback) callback();
        });
        logBuf = "";
    } else if (callback) {
        callback();
    }
}

if (WRITE_LOG) {
    var origLog = console.log;
    console.log = function(msg, ...args) { // probably a bit dirty...
        logBuf += util.format(msg, ...args) + "\n";
        return origLog(msg, ...args);
    }
    var writeLogInterval = setInterval(writeLog, 1000);
}

module.exports = function(moduleName) {
    return {
        log: log.getLogger(moduleName || "root"),
        flushLog: function(callback) {
            clearInterval(writeLogInterval);
            writeLog(callback);
        }
    }
}

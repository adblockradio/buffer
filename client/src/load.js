var getParameterByName = function(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[[\]]/g, "\\$&"); //name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return "";
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

//var HOST = getParameterByName("dev") ? "http://localhost:9820" : "https://bufferapi.s00.adblockradio.com";
var HOST = getParameterByName("dev") ? "http://localhost:9820" : "/bufferapi";

exports.load = function(path, callback) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (xhttp.readyState === 4 && xhttp.status === 200) {
			callback(null, xhttp.responseText); //, xhttp.getResponseHeader("Content-Type"));
		}
	};
	xhttp.onerror = function (e) {
		callback("getHeaders: request failed: " + e, null);
	};
	xhttp.open("GET", HOST + path, true);
	xhttp.send();
}

exports.HOST = HOST;

exports.refreshStatus = function(radios, options, callback) {
	var since = options.requestFullData ? "900" : "10";
	exports.load("/status/" + since + "?t=" + Math.round(Math.random()*1000000), function(err, res) {
		if (err) {
			return console.log("refreshStatus: could not load status update for radios");
		}
		var resParsed = {};
		try {
			resParsed = JSON.parse(res);
		} catch(e) {
			console.log("problem parsing JSON from server: " + e.message);
		}

		callback(resParsed);
	});
}

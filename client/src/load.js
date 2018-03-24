var getParameterByName = function(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[[\]]/g, "\\$&"); //name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return "";
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

//var HOST = getParameterByName("dev") ? "http://localhost:9820/" : "https://bufferapi.s00.adblockradio.com/";
//var HOST = getParameterByName("dev") ? "http://localhost:9820/" : "/bufferapi/";
var HOST = getParameterByName("dev") ? "https://dome.storelli.fr/bufferapi/" : "";

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

// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file
exports.loadScript = function(url, callback) {
	// Adding the script tag to the head as suggested before
	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;

	// Then bind the event to the callback function.
	// There are several events for cross browser compatibility.
	script.onreadystatechange = callback;
	script.onload = callback;

	// Fire the loading
	head.appendChild(script);
}

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
			callback(xhttp.responseText); //, xhttp.getResponseHeader("Content-Type"));
		}
	};
	xhttp.onerror = function (e) {
		console.log("getHeaders: request failed: " + e);
	};
	xhttp.open("GET", HOST + path, true);
	xhttp.send();
}

exports.HOST = HOST;

exports.refreshMetadata = function(radio, callback) {
	exports.load("/metadata/" + encodeURIComponent(radio) + "/0", function(res) {
		var metadata = [];
		try {
			metadata = JSON.parse(res);
			//console.log(metadata);
			//self.setState({ metadata: metadata.reverse(), metaLastRefresh: new Date() }); // most recent content at the top
		} catch(e) {
			console.log("problem parsing JSON from server: " + e.message);
		}
		return callback(metadata);
		//self.setState({ metadataLoading: false });
	});
}

exports.refreshAvailableCache = function(radios, callback) {
	var stateChange = {};
	var f = function(i, finished) {
		if (i >= radios.length) return finished();
		exports.load("/listen/" + encodeURIComponent(radios[i].country + "_" + radios[i].name) + "/available", function(avRes) {
			var avResParsed = {};
			try {
				avResParsed = JSON.parse(avRes);
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			stateChange[radios[i].country + "_" + radios[i].name + "|available"] = avResParsed.available;
			return f(i+1, finished);
		});
	}
	f(0, function() {
		//console.log("load: stateChange=" + JSON.stringify(stateChange));
		callback(stateChange);
	});
}

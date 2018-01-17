const HOST = "http://localhost:9820";
//const HOST = "https://bufferapi.s00.adblockradio.com"

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
	exports.load("/metadata/" + radio + "/0", function(res) {
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

export async function refreshStatus(requestFullData) {
	var since = requestFullData ? "900" : "10"; // TODO insert the real buffer length here instead of 900
	try {
		const request = await fetch("status/" + since + "?t=" + Math.round(Math.random()*1000000));
		const res = await request.text();
		return JSON.parse(res);
	} catch (e) {
		console.log("refreshStatus: could not load status update for radios. err=" + e);
		return null;
	}
}

// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file
export function loadScript(url, callback) {
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

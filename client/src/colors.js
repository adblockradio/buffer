exports.colors = {
	GREY: "rgba(192,192,192,1)",
	LIGHT_GREY: "rgba(225,225,225,1)",
	BLUE: "rgb(0, 181, 222)", /* music */
	RED: "rgb(255, 104, 104)", /* ads */
	GREEN: "rgb(138, 209, 21)", /* speech */
	YELLOW: "rgba(128,128,0,1)",
	PINK: "rgb(239, 102, 176)", /*#ef66b0*/
	LIGHT_PINK: "rgba(239, 102, 176, 0.5)"
}

exports.colorByType = function(type) {
	switch (type) {
		case "ads": return exports.colors.RED;
		case "speech": return exports.colors.GREEN;
		case "music": return exports.colors.BLUE;
		default: return exports.colors.GREY;
	}
}

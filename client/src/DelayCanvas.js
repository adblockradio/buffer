// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
//import styled from "styled-components";
//import classNames from 'classnames';

const colors = {
	GREY: "rgba(128,128,128,1)",
	BLUE: "rgb(0, 181, 222)",
	RED: "rgb(255, 104, 104)",
	GREEN: "rgb(138, 209, 21)",
	YELLOW: "rgba(128,128,0,1)",
	PINK: "rgb(239, 102, 176)", /*#ef66b0*/
	LIGHT_PINK: "rgba(239, 102, 176, 0.5)"
}

const TICKS_INTERVAL = 60000;

class DelayCanvas extends Component {

	constructor(props) {
		super(props);
		this.updateCanvas = this.updateCanvas.bind(this);
		this.play = this.play.bind(this);
		this.getCursorPosition = this.getCursorPosition.bind(this);

	}

	componentDidMount() {
		this.updateHandle = setInterval(this.updateCanvas, 2000);
		this.refs.canvas.addEventListener("mousedown", this.getCursorPosition);
	}

	componentWillUnmount() {
		clearInterval(this.updateHandle);
		//window.cancelAnimationFrame(this.updateHandle);
	}

	componentDidUpdate() {
		//this.drawBg();
		this.updateCanvas();
	}

	play(delay) {
		this.props.playCallback(null, delay);
	}

	getCursorPosition(event) {
		if (this.props.inactive) return;
		var rect = this.refs.canvas.getBoundingClientRect();
		var x = event.clientX - rect.left;

		//var width = this.refs.canvas.getContext("2d").canvas.width;
		var newDelay = Math.round(this.props.cacheLen*(1-x/this.props.width)*1000);
		//console.log("Canvas click: x=" + x + " width=" + width + " cacheLen=" + this.props.cacheLen + " newDelay=" + newDelay);
		this.play(newDelay);
	}

	/*getAvailableCache() {
		var startAvailable = new Date();
		for (var i=0; i<this.props.metaList.length; i++) {
			if (this.props.metaList[i].validFrom < startAvailable) {
				startAvailable = this.props.metaList[i].validFrom;
			}
		}
		return (+this.props.date - startAvailable) / 1000;
	}*/

	delayToX(width, delay) {
		return Math.round(width*(1-delay/1000/this.props.cacheLen));
	}

	updateCanvas() {
		const ctx = this.refs.canvas.getContext("2d");
		let height = ctx.canvas.height; //parseFloat(this.props.style.height);
		let width = this.props.width; //parseFloat(this.props.style.width);

		/*var canvasDom = document.getElementById('canvas');
		var cs = getComputedStyle(canvasDom);
		var width = parseInt(cs.getPropertyValue('width'), 10);*/

		ctx.clearRect(0, 0, width, height);

		if (this.props.inactive) {
			ctx.fillStyle = colors.GREY;
			return ctx.fillRect(0, 0, width, height);
		}


		var cursorX = this.delayToX(width, this.props.playingDelay);
		ctx.fillStyle = colors.LIGHT_PINK;
		ctx.fillRect(0, 0, cursorX, this.props.classList ? 0.4*height : height);

		ctx.cursor = function(x, y, height, width) {
			this.fillStyle = colors.PINK;
			this.beginPath();
			this.moveTo(x, y);
			this.lineTo(Math.round(x+width/2), Math.round(y-height));
			this.lineTo(Math.round(x-width/2), Math.round(y-height));
			this.fill()
		}

		ctx.cursor(cursorX, 0.6*height, 0.6*height, 0.3*height);

		// fill unavailable audio in grey
		//var startCache = this.getAvailableCache();
		if (this.props.availableCache < this.props.cacheLen) {
			ctx.fillStyle = colors.GREY;
			ctx.fillRect(0, 0, this.delayToX(width, this.props.availableCache*1000), this.props.classList ? 0.4*height : height);
		}

		if (this.props.classList) {
			//var logTxt = "";
			for (var i=this.props.classList.length-1; i>=0; i--) {
				var cl = this.props.classList[i];
				switch (cl.payload) {
					case "AD": ctx.fillStyle = colors.RED; break;
					case "SPEECH": ctx.fillStyle = colors.GREEN; break;
					case "MUSIC": ctx.fillStyle = colors.BLUE; break;
					default: ctx.fillStyle = colors.GREY;
				}
				var xStart = Math.max(this.delayToX(width, +this.props.date-cl.validFrom), 0);
				var xStop = this.delayToX(width, cl.validTo ? (+this.props.date-cl.validTo) : 0);
				ctx.fillRect(xStart, 0.6*height, xStop, height);
				//console.log("canvas height=" + height + " px width=" + width + "px playingDelay=" + this.props.playingDelay + " cacheLen=" + this.props.cacheLen + " from0=" + xStart + " to0=" + xStop);
				//logTxt += "i=" + i + " " + xStart + "->" + xStop + " | ";
			}
			//console.log(logTxt);
		}

		ctx.line = function(x1, y1, x2, y2) {
			this.moveTo(x1, y1);
			this.lineTo(x2, y2);
		}

		ctx.beginPath();
		ctx.strokeStyle = colors.YELLOW;
		for (let i=0; i<=Math.floor(this.props.cacheLen/TICKS_INTERVAL*1000); i++) {
			var offset = this.props.date % TICKS_INTERVAL;
			var x = this.delayToX(width, offset + i*TICKS_INTERVAL);
			ctx.line(x,0,x,height);
		}
		ctx.stroke();
	}

	render() {
		return (
			<canvas width={this.props.width} height="60px" ref="canvas" id="canvas" style={canvasStyle} />
		)
	}
}

DelayCanvas.propTypes = {
	playingDelay: PropTypes.number,
	availableCache: PropTypes.number,
	date: PropTypes.object.isRequired,
	cacheLen: PropTypes.number.isRequired,
	playCallback: PropTypes.func.isRequired
};

/*var canvasContainerStyle = {
	width: "100%",
	height: "10px"
}*/

var canvasStyle = {
	position: "absolute",
	/*width: "800px",*/
	minWidth: "100%",
	height: "40px",
	alignSelf: "flex-start",
}

export default DelayCanvas;

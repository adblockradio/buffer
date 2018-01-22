// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
//import styled from "styled-components";
//import classNames from 'classnames';

const colors = {
	GREY: "rgba(128,128,128,1)",
	BLUE: "rgba(0,0,128,1)",
	RED: "rgba(128,0,0,1)",
	GREEN: "rgba(0,128,0,1)",
	YELLOW: "rgba(128,128,0,1)"
}

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

		var canvasDom = document.getElementById('canvas');
		var cs = getComputedStyle(canvasDom);
		var width = parseInt(cs.getPropertyValue('width'), 10);

		//var width = this.refs.canvas.getContext("2d").canvas.width;
		var newDelay = Math.round(this.props.cacheLen*(1-x/width)*1000);
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
		let width = ctx.canvas.width; //parseFloat(this.props.style.width);

		/*var canvasDom = document.getElementById('canvas');
		var cs = getComputedStyle(canvasDom);
		var width = parseInt(cs.getPropertyValue('width'), 10);*/

		ctx.clearRect(0, 0, width, height);

		if (this.props.inactive) {
			ctx.fillStyle = colors.GREY;
			return ctx.fillRect(0, 0, width, height);
		}


		ctx.fillStyle = colors.BLUE;
		ctx.fillRect(0, this.props.classList ? height / 2 : 0, this.delayToX(width, this.props.playingDelay), height);

		// fill unavailable audio in grey
		//var startCache = this.getAvailableCache();
		if (this.props.availableCache < this.props.cacheLen) {
			ctx.fillStyle = colors.GREY;
			ctx.fillRect(0, this.props.classList ? height / 2 : 0, this.delayToX(width, this.props.availableCache*1000), height);
		}

		if (this.props.classList) {
			for (var i=0; i<this.props.classList.length; i++) {
				var cl = this.props.classList[i];
				switch (cl.payload) {
					case "AD": ctx.fillStyle = colors.RED; break;
					case "SPEECH": ctx.fillStyle = colors.GREEN; break;
					case "MUSIC": ctx.fillStyle = colors.BLUE; break;
					default: ctx.fillStyle = colors.GREY;
				}
				ctx.fillRect(this.delayToX(width, +this.props.date-cl.validFrom), 0, this.delayToX(width, cl.validTo ? (+this.props.date-cl.validTo) : 0), height/2);
				if (i == 0) {
					console.log("canvas height=" + height + " px width=" + width + "px playingDelay=" + this.props.playingDelay + " cacheLen=" + this.props.cacheLen + " from0=" + (+this.props.date-cl.validFrom) + " to0=" + (cl.validTo ? (+this.props.date-cl.validTo) : 0));
				}
			}
		}

		ctx.line = function(x1, y1, x2, y2) {
			this.moveTo(x1, y1);
			this.lineTo(x2, y2);
		}

		ctx.beginPath();
		ctx.strokeStyle = colors.YELLOW;
		for (var i=0; i<=Math.floor(this.props.cacheLen/60); i++) {
			var offset = this.props.date % 60000;
			var x = this.delayToX(width, offset + i*60000);
			ctx.line(x,0,x,height);
		}
		ctx.stroke();

	}

	render() {
		return (
			<canvas width="800px" height="60px" ref="canvas" id="canvas" style={canvasStyle} />
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

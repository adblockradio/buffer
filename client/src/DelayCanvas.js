// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
//import styled from "styled-components";
import classNames from 'classnames';


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

	updateCanvas() {
		const ctx = this.refs.canvas.getContext("2d");
		let height = ctx.canvas.height; //parseFloat(this.props.style.height);
		let width = ctx.canvas.width; //parseFloat(this.props.style.width);
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = "rgba(0,0,128,1)";
		//console.log("canvas height=" + height + " px width=" + width + "px playingDelay=" + this.props.playingDelay + " cacheLen=" + this.props.cacheLen);
		ctx.fillRect(0, 0, Math.round(width*(1-this.props.playingDelay/1000/this.props.cacheLen)), height);
	}

	render() {
		return (
			<canvas width={canvasStyle.width} height={canvasStyle.height} ref="canvas" id="canvas" style={canvasStyle} />
		)
	}
}

DelayCanvas.propTypes = {
	playing: PropTypes.bool.isRequired,
	playingDelay: PropTypes.number,
	cacheLen: PropTypes.number.isRequired,
	playCallback: PropTypes.func.isRequired
};

/*var canvasContainerStyle = {
	width: "100%",
	height: "10px"
}*/

var canvasStyle = {
	position: "absolute",
	width: "100%",
	height: "10px",
	alignSelf: "flex-start",
}

export default DelayCanvas;

// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
//import styled from "styled-components";
//import classNames from 'classnames';
import { colors } from "./colors.js";
import loading from "./img/loading.svg";

const TICKS_INTERVAL = 60000;

class DelaySVG extends Component {

	constructor(props) {
		super(props);
		this.play = this.play.bind(this);
		this.getCursorPosition = this.getCursorPosition.bind(this);
	}

	play(delay) {
		console.log("play with delay=" + delay);
		this.props.playCallback(delay);
	}

	getCursorPosition(event) {
		//if (this.props.inactive) return;
		var rect = this.refs.canvas.getBoundingClientRect();
		var x = event.clientX - rect.left;

		//var width = this.refs.canvas.getContext("2d").canvas.width;
		var newDelay = Math.round((this.props.cacheLen*(1-x/this.props.width)-(this.props.cacheLen-this.props.availableCache))*1000);
		//console.log("Canvas click: x=" + x + " width=" + width + " cacheLen=" + this.props.cacheLen + " newDelay=" + newDelay);
		this.play(newDelay);
	}

	delayToX(width, delay) {
		return Math.round(width*(1-(this.props.cacheLen-this.props.availableCache+delay/1000)/this.props.cacheLen));
	}

	render() {
		var self = this;
		const height = 24; // pixels
		const lang = this.props.locale;

		if (!this.props.availableCache) {
			return (
				<img src={loading} height={height} alt={{ en: "Loading...", fr: "Chargement..."}[lang]} />
			)
		}

		const cursorX = this.delayToX(this.props.width, this.props.cursor);

		if (this.props.classList) {
			var nClasses = this.props.classList.length-1;
			var xStartClass = new Array(nClasses);
			var xStopClass = new Array(nClasses);
			var colorClass = new Array(nClasses);

			for (var i=nClasses; i>=0; i--) {
				var cl = this.props.classList[i];
				switch (cl.payload) {
					case "0-ads": colorClass[i] = colors.RED; break;
					case "1-speech": colorClass[i] = colors.GREEN; break;
					case "2-music": colorClass[i] = colors.BLUE; break;
					default: colorClass[i] = colors.GREY;
				}
				xStartClass[i] = Math.max(this.delayToX(this.props.width, +this.props.date-cl.validFrom), 0);
				xStopClass[i] = Math.max(xStartClass[i], this.delayToX(this.props.width, cl.validTo ? (+this.props.date-cl.validTo) : 0));
				//ctx.fillRect(xStart, 0.6*height, xStop, height);
			}
		}

		var nLines = Math.floor(this.props.cacheLen/TICKS_INTERVAL*1000)
		var xLines = new Array(nLines);
		var offset = this.props.date % TICKS_INTERVAL;
		for (let i=0; i<=nLines; i++) {
			xLines[i] = this.delayToX(this.props.width, offset + i*TICKS_INTERVAL);
		}
		const ticksStyle = {
			stroke: colors.LIGHT_GREY,
			strokeWidth: 1
		};

		const cursorShape = "" + cursorX + "," + 0.6*height + " " +
			Math.round(cursorX+0.3*height) + ",0 " +
			Math.round(cursorX-0.3*height) + ",0";

		return (
			<svg width={this.props.width} height={height + "px"} onClick={self.getCursorPosition} ref="canvas" style={{marginTop: "10px"}}>

				{/*!isNaN(cursorX) &&
					<rect x={0} y={0} width={cursorX} height={this.props.classList ? 0.4*height : height} style={{fill: this.props.playing ? colors.LIGHT_PINK : colors.LIGHT_GREY}} />
				*/}

				{this.props.classList && xStartClass.map(function(xStart, i) {
					return (
						<rect x={xStart} y={0.6*height} width={xStopClass[i]-xStart} height={0.4*height} style={{fill:colorClass[i]}} key={"c" + i} />
					)
				})}
				{xLines.map(function(x, i) {
					if (x < 0) return null
					return <line x1={x} y1={0} x2={x} y2={height} style={ticksStyle} key={"l" + i} />
				})}

				{!isNaN(cursorX) &&
					<polygon points={cursorShape} style={{fill: this.props.playing ? colors.PINK : colors.GREY}} />
				}
			</svg>
		)
	}
}

DelaySVG.propTypes = {
	cursor: PropTypes.number,
	availableCache: PropTypes.number,
	date: PropTypes.object.isRequired,
	cacheLen: PropTypes.number.isRequired,
	playCallback: PropTypes.func.isRequired,
	classList: PropTypes.array,
	locale: PropTypes.string.isRequired,
};

/*var canvasContainerStyle = {
	width: "100%",
	height: "10px"
}*/


export default DelaySVG;

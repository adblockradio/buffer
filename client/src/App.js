// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from 'react';
import './App.css';
import Radio from './Radio.js';
import Metadata from './Metadata.js';

import { load, refreshMetadata, HOST } from './load.js';
import { play, stop } from './audio.js';
import styled from "styled-components";
import * as moment from 'moment';
import classNames from 'classnames';


import iconPlay from "./img/start_1279169.svg";
import iconStop from "./img/stop_1279170.svg";
//import iconNext from "./img/next_607554.svg";

const LIVE_DELAY = 15000;

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			configLoaded: false,
			config: [],
			playingRadio: null,
			playingDate: null
		}
		this.play = this.play.bind(this);
		this.seekBackward = this.seekBackward.bind(this);
		this.seekForward = this.seekForward.bind(this);
	}

	componentDidMount() {
		let self = this;

		var refreshMetadataContainer = function() {
			var stateChange = {};
			var f = function(iradio, callback) {
				if (iradio >= self.state.config.radios.length) return callback();
				var radio = self.state.config.radios[iradio].country + "_" + self.state.config.radios[iradio].name;
				var startDate = self.state.playingRadio === radio ? new Date(+new Date() - 120*60000) : new Date(+new Date() - 60000);
				refreshMetadata(radio, startDate.toISOString(), function(metadata) {
					metadata[metadata.length-1].end = null;
					stateChange["meta" + radio] = metadata.reverse();
					f(iradio+1, callback);
				});
			}
			f(0, function() {
				self.setState(stateChange);
			});
		}

		load("/config", function(res) {
			try {
				var config = JSON.parse(res);
				console.log(config);
				self.setState({ config: config }, function() {
					self.metadataTimerID = setInterval(refreshMetadataContainer, 2000);
					refreshMetadataContainer();
				});
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			self.setState({ configLoaded: true });
		});
		this.timerID = setInterval(function() { self.tick() }, 300);
	}

	componentWillUnmount() {
		clearInterval(this.timerID);
		clearInterval(this.metadataTimerID);
	}

	tick() {
		this.setState({ date: new Date() });
	}

	play(radio, date) {
		var self = this;
		if (radio) {
			console.log("playing delta = " + (+new Date() - new Date(date)));
			if (!date) {
				date = new Date(+new Date() - LIVE_DELAY).toISOString();
				this.setState({ playingLive: true });
			} else {
				this.setState({ playingLive: false });
			}

			this.setState({
				playingRadio: radio,
				playingDate: date,
				playingDelta: +new Date() - new Date(date)
			});
			play(HOST + "/listen/" + radio + "/" + date);
			document.title = radio.split("_")[1] + " - Adblock Radio";
		} else {
			this.setState({
				playingRadio: null,
				playingDate: null,
				playingDelta: 0,
				playingLive: null
			});
			clearInterval(self.metadataTimerID);
			stop();
			document.title = "Adblock Radio";
		}
	}

	seekBackward() {
		if (!this.state.playingRadio) return;
		this.play(this.state.playingRadio, new Date(+new Date(this.state.playingDate) - 30000).toISOString());
	}

	seekForward() {
		if (!this.state.playingRadio) return;
		var targetDate = +new Date(this.state.playingDate) + 30000;
		if (targetDate > +new Date() - LIVE_DELAY) { // switch to live
			this.play(this.state.playingRadio);
		} else {
			this.play(this.state.playingRadio, new Date(targetDate).toISOString());
		}
	}

	render() {
		let config = this.state.config;
		var self = this;
		if (!this.state.configLoaded) {
			return (
				<div>
					<div className="RadioItem">
						<p>Loading…</p>
					</div>
				</div>
			);
		} else if (config.radios.length === 0) {
			return (
				<div className="RadioItem">
					<p>No radios, please add some in config/radios.json and restart server</p>
				</div>
			);
		}

		var statusText;
		if (self.state.playingRadio) {
			statusText = (
				<span>
					{self.state.playingRadio.split("_")[1]}
					{self.state.playingLive ?
						" (direct)"
					:
					" (" + moment(+self.state.date - self.state.playingDelta + LIVE_DELAY).fromNow() + ")"
					}
				</span>
			)
		} else {
			statusText = (
				<span>
					{"Lancez une radio"}
				</span>
			)
		}

		var status = (
			<StatusTextContainer>
				<StatusClock>{moment(self.state.date).format("HH:mm")}</StatusClock>
				&nbsp;–&nbsp;{statusText}
			</StatusTextContainer>
		);

		var buttons = (
			<StatusButtonsContainer>
				<PlaybackButton className={classNames({ flip: true, inactive: !self.state.playingRadio })} src={iconPlay} alt="Backward 30s" onClick={self.seekBackward} />
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio })} src={iconStop} alt="Stop" onClick={() => self.play(null, null)} />
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio || self.state.playingLive })} src={iconPlay} alt="Forward 30s" onClick={self.seekForward} />
			</StatusButtonsContainer>
		);


		return (
			<AppParent>
				<AppView>
					<RadioList className={classNames({ withPreview: !self.state.playingRadio })}>
						{config.radios.map(function(radio, i) {
							var playing = self.state.playingRadio === radio.country + "_" + radio.name;
							return (
								<Radio metadata={radio}
									playCallback={self.play}
									playing={playing}
									showMetadata={!self.state.playingRadio}
									liveMetadata={self.state["meta" + radio.country + "_" + radio.name]}
									key={"radio" + i} />
							)
						})}
					</RadioList>
					{self.state.playingRadio &&
						<Metadata playingRadio={self.state.playingRadio}
							metaList={self.state["meta" + self.state.playingRadio]}
							playingDate={+self.state.date - self.state.playingDelta}
							currentDate={self.state.date}
							playCallback={self.play} />
					}
				</AppView>
				<Controls>
					{status}
					{buttons}
					{/*<PlayerStatus settings={this.props.settings} bsw={this.props.bsw} condensed={this.props.condensed} playbackAction={this.togglePlayer} />*/}
				</Controls>
			</AppParent>
		);
	}
}

const AppParent = styled.div`
	height: 100%;
`;

const AppView = styled.div`
	display: flex;
	height: calc(100% - 60px);
`;

const RadioList = styled.div`
	display: inline-flex;
	flex-wrap: wrap;
	justify-content: center;
	flex-grow: 0;
	flex-direction: column;
	align-self: flex-start;

	&.withPreview {
		flex-grow: 1;
	}
`;

const Controls = styled.div`
	margin: -60px 0 0 0px;
	z-index: 1000;
	background: #eee;
	height: 60px;
	align-items: center;
	display: flex;
	border-top: 2px solid #888;
	bottom: 0;
	position: fixed;
	width: 100%;
	justify-content: space-between;
`;

const StatusTextContainer = styled.span`
	padding: 0 20px;
`;

const StatusClock = styled.span`
	font-weight: bold;
`;

const StatusButtonsContainer = styled.span`

`;

const PlaybackButton = styled.img`
	height: 40px;
	margin-right: 10px;
	cursor: pointer;

	&.flip {
		transform: rotate(180deg);
	}
	&.inactive {
		filter: opacity(0.25);
		cursor: unset;
	}
`;

export default App;
/*{this.state.playingRadio && this.state.playingDate &&
	<audio src={HOST + "/listen/" + this.state.playingRadio + "/" + this.state.playingDate} controls autoPlay />
}*/

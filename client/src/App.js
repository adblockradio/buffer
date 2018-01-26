// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from 'react';
import './App.css';
import Radio from './Radio.js';
import Metadata from './Metadata.js';
import DelayCanvas from './DelayCanvas.js';
import Playlist from './Playlist.js';

import { load, refreshMetadata, refreshAvailableCache, HOST } from './load.js';
import { play, stop } from './audio.js';
import styled from "styled-components";
import * as moment from 'moment';
import classNames from 'classnames';


import iconPlay from "./img/start_1279169.svg";
import iconStop from "./img/stop_1279170.svg";
import iconList from "./img/list_241386.svg";
//import iconNext from "./img/next_607554.svg";

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			configLoaded: false,
			config: [],
			playingRadio: null,
			playingDate: null,
			clockDiff: 0,
			playlistEditMode: false
		}
		this.play = this.play.bind(this);
		this.seekBackward = this.seekBackward.bind(this);
		this.seekForward = this.seekForward.bind(this);
		this.switchPlaylistEditMode = this.switchPlaylistEditMode.bind(this);
		this.refreshMetadataContainer = this.refreshMetadataContainer.bind(this);
		this.refreshConfig = this.refreshConfig.bind(this);
		this.insertRadio = this.insertRadio.bind(this);
		this.removeRadio = this.removeRadio.bind(this);
	}

	componentDidMount() {
		this.refreshConfig();
		this.timerID = setInterval(() => this.tick(), 300);
	}

	componentWillUnmount() {
		clearInterval(this.timerID);
		clearInterval(this.metadataTimerID);
	}

	refreshMetadataContainer() {
		var self = this;
		var stateChange = {};
		var f = function(iradio, callback) {
			if (iradio >= self.state.config.radios.length) return callback();
			var radio = self.state.config.radios[iradio].country + "_" + self.state.config.radios[iradio].name;
			refreshMetadata(radio, function(metadata) {
				for (var type in metadata) {
					if (type === "now") {
						stateChange.clockDiff = +new Date() - metadata.now;
					} else {
						metadata[type][metadata[type].length-1].validTo = null;
						stateChange[radio + "|" + type] = metadata[type].reverse();
					}
				}
				f(iradio+1, callback);
			});
		}
		f(0, function() {
			refreshAvailableCache(self.state.config.radios, function(stateCache) {
				Object.assign(stateChange, stateCache);
				//console.log("stateChange = " + JSON.stringify(stateChange));
				self.setState(stateChange);
			});
		});
	}

	refreshConfig(callback) {
		var self = this;
		load("/config?t=" + Math.round(Math.random()*1000000), function(res) {
			try {
				var config = JSON.parse(res);
				//console.log(config);
				self.setState({ config: config }, function() {
					self.metadataTimerID = setInterval(self.refreshMetadataContainer, 2000);
					self.refreshMetadataContainer();
				});
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			self.setState({ configLoaded: true });
			if (callback) callback();
		});
	}

	tick() {
		this.setState({ date: new Date() });
	}

	defaultDelay(radio) {
		return Math.min(+this.state[radio + "|available"]*1000, this.state.config.user.cacheLen*1000*2/3);
	}

	play(radio, delay) {
		if (radio || delay) {
			//var delay = +new Date() - this.state.clockDiff - (date ? new Date(date) : new Date();
			//var secondsDelay = Math.round(delay/1000);
			radio = radio || this.state.playingRadio;
			if (delay === null || delay === undefined || isNaN(delay)) { // delay == 0 is a valid delay.
				delay = this.defaultDelay(radio);
			} else if (delay < 0) {
				delay = 0;
			} else if (delay > this.state.config.user.cacheLen*1000) {
				delay = this.state.config.user.cacheLen*1000;
			}

			console.log("Play: radio=" + radio + " delay=" + delay);
			this.setState({
				playingRadio: radio,
				//playingDate: date,
				playingDelay: delay,
				playingLive: delay === 0
			});

			play(HOST + "/listen/" + radio + "/" + Math.round(delay/1000) + "?t=" + Math.round(Math.random()*1000000));
			document.title = radio.split("_")[1] + " - Adblock Radio";
		} else {
			this.setState({
				playingRadio: null,
				//playingDate: null,
				playingDelay: null,
				playingLive: null
			});
			//clearInterval(self.metadataTimerID);
			stop();
			document.title = "Adblock Radio";
		}
	}

	seekBackward() {
		if (!this.state.playingRadio) return;
		this.play(this.state.playingRadio, Math.min(this.state.playingDelay + 30000, this.state.config.user.cacheLen*1000));
	}

	seekForward() {
		if (!this.state.playingRadio) return;
		//var targetDate = +new Date(this.state.playingDate) + 30000;
		/*if (targetDate > +new Date() - LIVE_DELAY) { // switch to live
			this.play(this.state.playingRadio);
		} else {
			this.play(this.state.playingRadio, new Date(targetDate).toISOString());
		}*/
		this.play(this.state.playingRadio, Math.max(this.state.playingDelay - 30000,0));
	}

	switchPlaylistEditMode() {
		this.setState({ playlistEditMode: !this.state.playlistEditMode });
	}

	insertRadio(country, name, callback) {
		var self = this;
		load("/config/radios/insert/" + country + "/" + name + "?t=" + Math.round(Math.random()*1000000), function(res) {
			self.refreshConfig(callback);
		});
	}

	removeRadio(country, name, callback) {
		var self = this;
		load("/config/radios/remove/" + country + "/" + name + "?t=" + Math.round(Math.random()*1000000), function(res) {
			self.refreshConfig(callback);
		});
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
		}

		var statusText;
		if (self.state.playingRadio) {
			var delayText = " (direct)";
			if (!self.state.playingLive) {
				var delaySeconds = Math.round(self.state.playingDelay/1000); // + self.state.config.user.streamInitialBuffer);
				var delayMinutes = Math.floor(delaySeconds / 60);
				delaySeconds = delaySeconds % 60;
				var textDelay = (delayMinutes ? delayMinutes + " min" : "");
				textDelay += (delaySeconds ? ((delaySeconds < 10 && delayMinutes ? " 0" : " ") + delaySeconds + "s") : "");
				delayText = " (en différé de " + textDelay + ")";
			}
			statusText = (
				<span>
					{self.state.playingRadio.split("_")[1]}
					{delayText}
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
				<PlaybackButton className={classNames({ inactive: !self.state.playlistEditMode })} src={iconList} alt="Edit playlist" onClick={self.switchPlaylistEditMode} />
				<PlaybackButton className={classNames({ flip: true, inactive: !self.state.playingRadio || self.state.playingDelay >= self.state.config.user.cacheLen*1000 })} src={iconPlay} alt="Backward 30s" onClick={self.seekBackward} />
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio })} src={iconStop} alt="Stop" onClick={() => self.play(null, null)} />
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio || self.state.playingLive })} src={iconPlay} alt="Forward 30s" onClick={self.seekForward} />
			</StatusButtonsContainer>
		);

		//console.log("Metadata props: date=" + (+self.state.date) + " clockDiff=" + self.state.clockDiff + " playingDelay=" + self.state.playingDelay);

		return (
			<AppParent>
				<AppView>
					<RadioList className={classNames({ withPreview: !self.state.playingRadio && !self.state.playlistEditMode })}>
						{config.radios.map(function(radio, i) {
							var playing = self.state.playingRadio === radio.country + "_" + radio.name;
							var showMetadata = !self.state.playingRadio && !self.state.playlistEditMode;
							var liveMetadata;
							if (showMetadata) {
								var metaList = self.state[radio.country + "_" + radio.name + "|metadata"];
								if (metaList) {
									for (let j=0; j<metaList.length; j++) {
										if (metaList[j].validFrom - 1000 <= (self.state.date-self.defaultDelay(radio.country + "_" + radio.name)) &&
											(!metaList[j].validTo || (self.state.date-self.defaultDelay(radio.country + "_" + radio.name) < +metaList[j].validTo - 1000))) {
											liveMetadata = [metaList[j]];
											break;
										}
									}
								}
							}
							return (
								<Radio metadata={radio}
									playCallback={self.play}
									playing={playing}
									showMetadata={showMetadata}
									liveMetadata={liveMetadata}
									key={"radio" + i} />
							)
						})}
					</RadioList>
					{self.state.playingRadio && !self.state.playlistEditMode && config.radios.length > 0 &&
						<Metadata playingRadio={self.state.playingRadio}
							playingDelay={self.state.playingDelay}
							metaList={self.state[self.state.playingRadio + "|metadata"]}
							date={new Date(+self.state.date - self.state.clockDiff)}
							playCallback={self.play} />
					}
					{(self.state.playlistEditMode || config.radios.length === 0) &&
						<Playlist config={self.state.config}
							insertRadio={self.insertRadio}
							removeRadio={self.removeRadio} />
					}
				</AppView>
				<Controls id="controls">
					{status}
					{buttons}
					{/*metaList={self.state[self.state.playingRadio + "|metadata"]}*/}
					<DelayCanvas playingDelay={self.state.playingDelay}
						availableCache={self.state[self.state.playingRadio + "|available"]}
						classList={self.state[self.state.playingRadio + "|class"]}
						date={new Date(+self.state.date - self.state.clockDiff)}
						inactive={!self.state.playingRadio || !self.state[self.state.playingRadio + "|metadata"]}
						cacheLen={self.state.config.user.cacheLen}
						width={self.state.canvasWidth || 100}
						playCallback={self.play} />
					{/*<PlayerStatus settings={this.props.settings} bsw={this.props.bsw} condensed={this.props.condensed} playbackAction={this.togglePlayer} />*/}
				</Controls>
			</AppParent>
		);
	}

	componentDidUpdate() {
		var canvasContainerDom = document.getElementById('controls');
		if (!canvasContainerDom) return;
		var cs = getComputedStyle(canvasContainerDom);
		var canvasWidth = parseInt(cs.getPropertyValue('width'), 10);
		if (canvasWidth === this.state.canvasWidth) return;
		this.setState({ canvasWidth: canvasWidth });
	}
}

const AppParent = styled.div`
	height: 100%;
`;

const AppView = styled.div`
	display: flex;
	height: calc(100% - 100px);
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
	margin: -100px 0 0 0px;
	z-index: 1000;
	background: #eee;
	height: 100px;
	align-items: center;
	display: flex;
	border-top: 2px solid #888;
	bottom: 0;
	position: fixed;
	width: 100%;
	justify-content: space-between;
`;

const StatusTextContainer = styled.span`
	padding: 40px 20px 0 20px;
`;

const StatusClock = styled.span`
	font-weight: bold;
`;

const StatusButtonsContainer = styled.span`
	padding: 10px 0 0 0;
`;

const PlaybackButton = styled.img`
	height: 40px;
	margin-right: 10px;
	cursor: pointer;
	margin-top: 35px;

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

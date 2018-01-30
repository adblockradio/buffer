// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from 'react';
import './App.css';
//import Radio from './Radio.js';
//import Metadata from './Metadata.js';
import DelayCanvas from './DelayCanvas.js';
import Playlist from './Playlist.js';

import { load, refreshMetadata, refreshAvailableCache, HOST } from './load.js';
import { play, stop } from './audio.js';
import styled from "styled-components";
import * as moment from 'moment';
import classNames from 'classnames';


//import iconPlay from "./img/start_1279169.svg";
import iconStop from "./img/stop_1279170.svg";
import iconList from "./img/list_241386.svg";
//import iconNext from "./img/next_607554.svg";
import defaultCover from "./img/default_radio_logo.svg";


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
		//this.seekBackward = this.seekBackward.bind(this);
		//this.seekForward = this.seekForward.bind(this);
		this.switchPlaylistEditMode = this.switchPlaylistEditMode.bind(this);
		this.refreshMetadataContainer = this.refreshMetadataContainer.bind(this);
		this.refreshConfig = this.refreshConfig.bind(this);
		this.insertRadio = this.insertRadio.bind(this);
		this.removeRadio = this.removeRadio.bind(this);
		this.toggleContent = this.toggleContent.bind(this);
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

			play(HOST + "/listen/" + encodeURIComponent(radio) + "/" + Math.round(delay/1000) + "?t=" + Math.round(Math.random()*1000000));
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

	/*seekBackward() {
		if (!this.state.playingRadio) return;
		this.play(this.state.playingRadio, Math.min(this.state.playingDelay + 30000, this.state.config.user.cacheLen*1000));
	}

	seekForward() {
		if (!this.state.playingRadio) return;
		this.play(this.state.playingRadio, Math.max(this.state.playingDelay - 30000,0));
	}*/

	switchPlaylistEditMode() {
		this.setState({ playlistEditMode: !this.state.playlistEditMode });
	}

	insertRadio(country, name, callback) {
		var self = this;
		load("/config/radios/insert/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "?t=" + Math.round(Math.random()*1000000), function(res) {
			self.refreshConfig(callback);
		});
	}

	removeRadio(country, name, callback) {
		var self = this;
		load("/config/radios/remove/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "?t=" + Math.round(Math.random()*1000000), function(res) {
			self.refreshConfig(callback);
		});
	}

	toggleContent(country, name, contentType, enabled, callback) {
		var self = this;
		load("/config/radios/content/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "/" + encodeURIComponent(contentType) + "/" + (enabled ? "enable" : "disable") + "?t=" + Math.round(Math.random()*1000000), function(res) {
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
				{/*<PlaybackButton className={classNames({ flip: true, inactive: !self.state.playingRadio || self.state.playingDelay >= self.state.config.user.cacheLen*1000 })} src={iconPlay} alt="Backward 30s" onClick={self.seekBackward} />*/}
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio })} src={iconStop} alt="Stop" onClick={() => self.play(null, null)} />
				{/*<PlaybackButton className={classNames({ inactive: !self.state.playingRadio || self.state.playingLive })} src={iconPlay} alt="Forward 30s" onClick={self.seekForward} />*/}
			</StatusButtonsContainer>
		);

		//console.log("Metadata props: date=" + (+self.state.date) + " clockDiff=" + self.state.clockDiff + " playingDelay=" + self.state.playingDelay);

		let mainContents;
		if (self.state.playlistEditMode || config.radios.length === 0) {
			mainContents = (
				<Playlist config={self.state.config}
					insertRadio={self.insertRadio}
					removeRadio={self.removeRadio}
					toggleContent={self.toggleContent} />
			);
		} else {
			mainContents = (
				<RadioList>
					{config.radios.map(function(radioObj, i) {
						var radio = radioObj.country + "_" + radioObj.name;
						var playing = self.state.playingRadio === radio;

						var liveMetadata;

						var metaList = self.state[radio + "|metadata"];
						if (metaList) {
							var targetDate = self.state.date - (playing ? self.state.playingDelay : self.defaultDelay(radio));
							for (let j=0; j<metaList.length; j++) {
								if (metaList[j].validFrom - 1000 <= targetDate &&
									(!metaList[j].validTo || (targetDate < +metaList[j].validTo - 1000)))
								{
										liveMetadata = metaList[j];
										break;
								}
							}
						}

						return (
							<RadioItem className={classNames({ playing: playing })}
								id={"RadioItem" + i}
								key={"RadioItem" + i}>

								<RadioItemTopLine onClick={function() { self.play(radio); }}>
									<RadioLogo src={radioObj.favicon} alt="logo" />
									{liveMetadata &&
										<MetadataItem>
											<MetadataText>
												{liveMetadata.payload.artist} - {liveMetadata.payload.title}
											</MetadataText>
											<MetadataCover src={liveMetadata.payload.cover || defaultCover} alt="logo" />
										</MetadataItem>
									}
								</RadioItemTopLine>

								{metaList &&
									<DelayCanvas playingDelay={self.state.playingDelay}
										availableCache={self.state[radio + "|available"]}
										classList={self.state[radio + "|class"]}
										date={new Date(+self.state.date - self.state.clockDiff)}
										playing={playing}
										cacheLen={self.state.config.user.cacheLen}
										width={self.state.canvasWidth || 100}
										playCallback={function(delay) { self.play(radio, delay); }} />
								}

							</RadioItem>
						)
					})}
				</RadioList>
			);
		}


		return (
			<AppParent>
				<AppView>
					{mainContents}
				</AppView>
				<Controls>
					{status}
					{buttons}
					{/*metaList={self.state[self.state.playingRadio + "|metadata"]}*/}

					{/*<PlayerStatus settings={this.props.settings} bsw={this.props.bsw} condensed={this.props.condensed} playbackAction={this.togglePlayer} />*/}
				</Controls>
			</AppParent>
		);
	}

	componentDidUpdate() {
		var canvasContainerDom = document.getElementById('RadioItem0');
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
	height: calc(100% - 60px);
	margin: 0 10px;
`;

const RadioList = styled.div`
	display: inline-flex;
	flex-wrap: wrap;
	justify-content: center;
	flex-grow: 0;
	flex-direction: column;
	align-self: flex-start;
	flex-grow: 1;
	padding-bottom: 70px;
	overflow-y: scroll;
`;

const RadioItem = styled.div`
	border: 2px solid grey;
	border-radius: 10px;
	margin: 10px 10px 0px 10px;
	padding: 10px 10px 10px 10px;
	flex-shrink: 0;
	display: flex;
	cursor: pointer;
	flex-direction: column;

	&.playing {
		border: 2px solid red;
	}
`;

const RadioItemTopLine = styled.div`
	display: flex;
	flex-direction: row;
`;

const RadioLogo = styled.img`
	height: 80px;
	width: 80px;
`;

const MetadataItem = styled.div`
	flex-grow: 1;
	margin: 0 0 0 15px;
	padding: 0 10px;
	flex-shrink: 1;
	background: #eee;
	display: flex;
	cursor: pointer;
`;

const MetadataText = styled.p`
	flex-grow: 1;
	align-self: center;
	margin: 10px 0;
`

const MetadataCover = styled.img`
	width: 60px;
	height: 60px;
	align-self: center;
	margin-left: 10px;
`;


const Controls = styled.div`
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
	padding: 0px 20px 0 20px;
	flex-shrink: 1;
`;

const StatusClock = styled.span`
	font-weight: bold;
`;

const StatusButtonsContainer = styled.span`
	padding: 10px 0 0 0;
	flex-shrink: 0;
`;

const PlaybackButton = styled.img`
	height: 40px;
	margin-right: 10px;
	cursor: pointer;
	margin-top: 0px;

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

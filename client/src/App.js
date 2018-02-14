// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from 'react';
import './App.css';
//import Radio from './Radio.js';
//import Metadata from './Metadata.js';
import DelayCanvas from './DelayCanvas.js';
import Config from './Config.js';
import Playlist from './Playlist.js';

import { load, refreshMetadata, refreshAvailableCache, HOST } from './load.js';
import { play, stop, setVolume } from './audio.js';
import styled from "styled-components";
/*import * as moment from 'moment';*/
import classNames from 'classnames';
import async from 'async';


//import iconPlay from "./img/start_1279169.svg";
import iconStop from "./img/stop_1279170.svg";
import iconList from "./img/list_241386.svg";
import iconConfig from "./img/ads_135894.svg";
//import iconNext from "./img/next_607554.svg";
//import defaultCover from "./img/default_radio_logo.svg";
import playing from "./img/playing.gif";


class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			configLoaded: false,
			configError: false,
			config: [],
			playingRadio: null,
			playingDelay: null,
			clockDiff: 0,
			playlistEditMode: false,
			configEditMode: false,
			locale: "fr"
		}
		this.play = this.play.bind(this);
		//this.seekBackward = this.seekBackward.bind(this);
		//this.seekForward = this.seekForward.bind(this);
		this.switchPlaylistEditMode = this.switchPlaylistEditMode.bind(this);
		this.switchConfigEditMode = this.switchConfigEditMode.bind(this);
		this.refreshMetadataContainer = this.refreshMetadataContainer.bind(this);
		this.refreshConfig = this.refreshConfig.bind(this);
		this.insertRadio = this.insertRadio.bind(this);
		this.removeRadio = this.removeRadio.bind(this);
		this.toggleContent = this.toggleContent.bind(this);
		this.setLocale = this.setLocale.bind(this);
	}

	componentDidMount() {
		this.refreshConfig();
		this.timerID = setInterval(() => this.tick(), 400);
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
		var onError = function(err) {
			console.log("problem parsing JSON from server: " + err);
			self.setState({ configError: true, configLoaded: true });
		}

		load("/config?t=" + Math.round(Math.random()*1000000), function(err, res) {
			if (err) return onError(err);
			try {
				var config = JSON.parse(res);
				self.setState({ config: config, configLoaded: true }, function() {
					self.metadataTimerID = setInterval(self.refreshMetadataContainer, 2000);
					self.refreshMetadataContainer();
				});
			} catch(e) {
				return onError(e.message);
			}

			if (callback) callback();
		});
	}

	tick() {
		var self = this;
		this.setState({ date: new Date() }, function() {
			if (!this.state.config || !this.state.config.radios) return;
			var acceptableContent = new Array(this.state.config.radios.length);
			async.forEachOf(this.state.config.radios, function(radio, iRadio, onCursorChecked) {
				var radioName = radio.country + "_" + radio.name;
				self.checkCursor(radioName, function(res) {
					//res = { err: ... , delayChanged: ..., hasAcceptableContent: ... }
					acceptableContent[iRadio] = res.hasAcceptableContent;
					if (self.state.playingRadio === radioName && res.hasAcceptableContent && res.delayChanged) {
						// here, we know we are playing a channel with good content at the updated delay
						self.play(radioName, null, function(err) {
							onCursorChecked();
						});
					} else {
						onCursorChecked();
					}
				});
			}, function(err) {
				var iPlayingRadio = self.getRadioIndex(self.state.playingRadio);
				// here, all cursors have been updated
				//console.log("iPlayingRadio=" + iPlayingRadio + " acceptable=" + acceptableContent[iPlayingRadio]);
				if (iPlayingRadio < 0 || acceptableContent[iPlayingRadio]) return;
				// here, we need to change channel.
				console.log("need to change channel")
				var listRadiosToTry = [];
				for (var i=iPlayingRadio + 1; i<acceptableContent.length; i++) {
					listRadiosToTry.push(i);
				}
				for (i=0; i<iPlayingRadio; i++) {
					listRadiosToTry.push(i);
				}
				for (i=0; i<listRadiosToTry.length; i++) {
					if (acceptableContent[listRadiosToTry[i]]) {
						var radioObj = self.state.config.radios[listRadiosToTry[i]];
						return self.play(radioObj.country + "_" + radioObj.name, null, null);
					}
				}
				// as a last resort, turn down the volume
				//if (DEBUG) console.log("no alt content to play, lower volume");
				setVolume(0.1);
			});
		});
	}

	acceptableContent(iRadio, classObj) {
		return ((this.state.config.radios[iRadio].content.ads || classObj.payload !== "AD") &&
			(this.state.config.radios[iRadio].content.speech || classObj.payload !== "SPEECH"))
	}

	checkCursor(radio, callback) {
		var DEBUG = false;
		/*if (!this.state.playingRadio || !this.state.playingDelay) {
			return; // we are not playing anything
		}*/

		var i;
		var stateChange = {};

		var iRadio = this.getRadioIndex(radio);
		if (iRadio < 0) {
			if (DEBUG) console.log("radio not found " + radio);
			return callback({ err: "radio not found", delayChanged: false, hasAcceptableContent: null }); // radio not found
		}

		if (!this.state[radio + "|cursor"]) { // set the default delay
			stateChange[radio + "|cursor"] = +this.state.date - this.defaultDelay(radio);
			return this.setState(stateChange, function() {
				callback({ err: null, delayChanged: true, hasAcceptableContent: true });
			});
		}

		var classes = this.state[radio + "|class"];
		if (!classes) {
			if (DEBUG) console.log("no classes metadata to use for radio " + radio);
			return callback({ err: "no class metadata", delayChanged: false, hasAcceptableContent: true });
			// no classes metadata to use. acceptable content by default
		}

		var iCurrentClass = -1;
		var playingEpoch = this.state[radio + "|cursor"]; //+this.state.date - this.state[radio + "|cursor"]; //Math.min(, );
		for (i=classes.length-1; i>=0; i--) {
			if (classes[i].validFrom <= playingEpoch && (!classes[i].validTo || playingEpoch < classes[i].validTo)) {
				iCurrentClass = i;
				break;
			}
		}
		/*if (iCurrentClass < 0 ) {
			if (DEBUG) console.log("there are no metadata available for the given position.");
			return callback({ err: "no metadata", delayChanged: false, hasAcceptableContent: null });
			iCurrentClass = classes.length-1;
			// there are no metadata available for the current playing position.
		}*/

		if (iCurrentClass >= 0 && !this.acceptableContent(iRadio, classes[iCurrentClass])) {
			// that radio has bad content, we move the cursor forward until we find a good content.
			// we scan classes at later times, i.e. at lower indexes.
			var iTargetClass = -1;
			for (i=iCurrentClass; i>=0; i--) {
				if (this.acceptableContent(iRadio, classes[i])
					&& (!classes[i].validTo || classes[i].validTo - classes[i].validFrom > this.state.config.user.discardSmallSegments*1000)) {
					iTargetClass = i;
					break;
				}
			}

			if (iTargetClass >= 0) {
				var delay = Math.floor((+this.state.date - classes[iTargetClass].validFrom)/1000)*1000;
				//var delay1 = +this.state.date - this.state[radio + "|lastPlayedDate"];
				//var delay = Math.max(delay0, delay1);
				if (DEBUG) console.log("fast forward to delay " + delay);
				stateChange[radio + "|cursor"] = +this.state.date - delay;
				return this.setState(stateChange, function() {
					callback({ err: null, delayChanged: true, hasAcceptableContent: true });
				});
			}

			// no acceptable audio after
			stateChange[radio + "|cursor"] = +this.state.date;
			this.setState(stateChange, function() {
				callback({ err: null, delayChanged: true, hasAcceptableContent: false });
			});

		} else if (this.state.playingRadio !== radio && this.state[radio + "|cursor"] < +this.state.date - this.state.config.user.cacheLen*2/3*1000) {
			// not played radios must not have their cursor go too far backwards
			stateChange[radio + "|cursor"] = +this.state.date - this.state.config.user.cacheLen*2/3*1000;
			return this.setState(stateChange, function() {
				callback({ err: null, delayChanged: true, hasAcceptableContent: true });
			});
		} else if (this.state.playingRadio === radio) {
			// played radio must have a constant delay, so we need to push its cursor regularly
			stateChange[this.state.playingRadio + "|cursor"] = +this.state.date - this.state.playingDelay;
			return this.setState(stateChange, function() {
				callback({ err: null, delayChanged: false, hasAcceptableContent: true });
			});
		} else {
			return callback({ err: null, delayChanged: false, hasAcceptableContent: true });
		}
	}

	defaultDelay(radio) {
		var delays = [+this.state[radio + "|available"]*1000, this.state.config.user.cacheLen*1000*2/3];
		var classes = this.state[radio + "|class"];
		if (classes) {
			var firstMetaDate = classes[classes.length-1].validFrom;
			delays.push(+this.state.date-firstMetaDate);
		}
		return Math.min(...delays);
	}

	getRadioIndex(radio) {
		for (var i=0; i<this.state.config.radios.length; i++) {
			var triedRadioName = this.state.config.radios[i].country + "_" + this.state.config.radios[i].name;
			if (radio === triedRadioName) {
				return i;
			}
		}
		return -1;
	}

	play(radio, delay, callback) {
		if (radio || delay) {
			radio = radio || this.state.playingRadio;
			if (delay === null || delay === undefined || isNaN(delay)) { // delay == 0 is a valid delay.
				delay = +this.state.date - this.state[radio + "|cursor"];
			} else if (delay < 0) {
				delay = 0;
			} else if (delay > Math.min(this.state.config.user.cacheLen*1000, +this.state[radio + "|available"]*1000)) {
				delay = Math.min(this.state.config.user.cacheLen*1000, +this.state[radio + "|available"]*1000);
			}
			delay = Math.round(delay/1000)*1000; // rounded seconds

			console.log("Play: radio=" + radio + " delay=" + delay + "ms");

			var stateChange = {};
			stateChange[radio + "|cursor"] = +this.state.date - delay;
			stateChange["playingRadio"] = radio;
			stateChange["playingDelay"] = delay;
			this.setState(stateChange);

			setVolume(1);
			document.title = radio.split("_")[1] + " - Adblock Radio Buffer";
			var url = HOST + "/listen/" + encodeURIComponent(radio) + "/" + (delay/1000) + "?t=" + Math.round(Math.random()*1000000000);
			play(url, function(err) {
				if (err) console.log("Play: error=" + err);
				if (callback) callback(err);
			});

		} else {
			this.setState({
				playingRadio: null,
				playingDelay: null
			});
			document.title = "Adblock Radio Buffer";
			stop();
			if (callback) callback(null);
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
		this.setState({ playlistEditMode: !this.state.playlistEditMode, configEditMode: false });
	}

	switchConfigEditMode() {
		this.setState({ configEditMode: !this.state.configEditMode, playlistEditMode: false });
	}

	setLocale(lang) {
		this.setState({ locale: lang });
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
		let lang = this.state.locale;
		var self = this;
		if (!this.state.configLoaded) {
			return (
				<SoloMessage>
					<p>{{ en: "Loading…", fr: "Chargement…" }[lang]}</p>
				</SoloMessage>
			);
		} else if (this.state.configError) {
			return (
				<SoloMessage>
					<p>{{ en: "Oops, could not connect to server :(", fr: "Oops, problème de connexion au serveur :(" }[lang]}</p>
					<p>{{ en: "Restart it then press reload this page", fr: "Redémarrez-le puis rechargez cette page" }[lang]}</p>
				</SoloMessage>
			)
		}

		var statusText;
		if (self.state.playingRadio) {
			var delayText = { en: "Live", fr: "En direct" }[lang];
			if (self.state.playingDelay > 0) {
				var delaySeconds = Math.round(self.state.playingDelay/1000); // + self.state.config.user.streamInitialBuffer);
				var delayMinutes = Math.floor(delaySeconds / 60);
				delaySeconds = delaySeconds % 60;
				var textDelay = (delayMinutes ? delayMinutes + " min" : "");
				textDelay += (delaySeconds ? ((delaySeconds < 10 && delayMinutes ? " 0" : " ") + delaySeconds + "s") : "");
				delayText = { en: textDelay + " ago", fr: "Différé de " + textDelay }[lang];
			}
			statusText = (
				<span>
					{self.state.playingRadio.split("_")[1]}<br />
					<DelayText>{delayText}</DelayText>
				</span>
			)
		} else {
			statusText = (
				<span>
					{{ en: "Start a radio", fr: "Lancez une radio" }[lang]}
				</span>
			)
		}

		var status = (
			<StatusTextContainer>
				{/*<StatusClock>{moment(self.state.date).format("HH:mm")}</StatusClock>&nbsp;–&nbsp;*/}
				{statusText}
			</StatusTextContainer>
		);

		var buttons = (
			<StatusButtonsContainer>
				<PlaybackButton className={classNames({ inactive: !self.state.configEditMode })} src={iconConfig} alt={{ en: "Edit config", fr: "Configurer l'écoute" }[lang]} onClick={self.switchConfigEditMode} />
				<PlaybackButton className={classNames({ inactive: !self.state.playlistEditMode })} src={iconList} alt={{ en: "Edit playlist", fr: "Changer de liste de radios" }[lang]} onClick={self.switchPlaylistEditMode} />
				{/*<PlaybackButton className={classNames({ flip: true, inactive: !self.state.playingRadio || self.state.playingDelay >= self.state.config.user.cacheLen*1000 })} src={iconPlay} alt="Backward 30s" onClick={self.seekBackward} />*/}
				<PlaybackButton className={classNames({ inactive: !self.state.playingRadio })} src={iconStop} alt="Stop" onClick={() => self.play(null, null, null)} />
				{/*<PlaybackButton className={classNames({ inactive: !self.state.playingRadio || self.state.playingLive })} src={iconPlay} alt="Forward 30s" onClick={self.seekForward} />*/}
			</StatusButtonsContainer>
		);

		//console.log("Metadata props: date=" + (+self.state.date) + " clockDiff=" + self.state.clockDiff + " playingDelay=" + self.state.playingDelay);

		let mainContents;
		if (self.state.configEditMode || !config.user.email) {
			mainContents = (
				<Config config={self.state.config}
					toggleContent={self.toggleContent}
					locale={self.state.locale}
					setLocale={self.setLocale} />
			);
		} else if (self.state.playlistEditMode || config.radios.length === 0) {
			mainContents = (
				<Playlist config={self.state.config}
					insertRadio={self.insertRadio}
					removeRadio={self.removeRadio}
					locale={self.state.locale} />
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
							var targetDate = self.state[radio + "|cursor"];
							for (let j=0; j<metaList.length; j++) {
								if (metaList[j].validFrom - 1000 <= targetDate &&
									(!metaList[j].validTo || (targetDate < +metaList[j].validTo - 1000)))
								{
										liveMetadata = metaList[j];
										break;
								}
							}
						}

						var metaText = radioObj.name;
						if (liveMetadata && liveMetadata.payload) {
							var p = liveMetadata.payload;
							if (p.artist && p.title) {
								metaText = p.artist + " - " + p.title;
							} else if (p.artist || p.title) {
								metaText = p.artist || p.title;
							}
						}

						return (
							<RadioItem className={classNames({ playing: playing })}
								id={"RadioItem" + i}
								key={"RadioItem" + i}>

								<RadioItemTopLine onClick={function() { self.play(radio, null, null); }}>
									<RadioLogo src={radioObj.favicon} alt={radio} />
									<MetadataItem>
										<MetadataText>
											{metaText}
										</MetadataText>
										{liveMetadata && liveMetadata.payload && liveMetadata.payload.cover &&
											<MetadataCover src={liveMetadata.payload.cover} />
										}
									</MetadataItem>
								</RadioItemTopLine>

								{metaList &&
									<DelayCanvas cursor={+self.state.date - self.state[radio + "|cursor"]}
										availableCache={self.state[radio + "|available"]}
										classList={self.state[radio + "|class"]}
										date={new Date(+self.state.date - self.state.clockDiff)}
										playing={playing}
										cacheLen={self.state.config.user.cacheLen}
										width={self.state.canvasWidth || 100}
										playCallback={function(delay) { self.play(radio, delay, null); }} />
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
					<MaxWidthContainer>
						{self.state.playingRadio &&
							<PlayingGif src={playing} />
						}
						{status}
						{buttons}
						{/*metaList={self.state[self.state.playingRadio + "|metadata"]}*/}

						{/*<PlayerStatus settings={this.props.settings} bsw={this.props.bsw} condensed={this.props.condensed} playbackAction={this.togglePlayer} />*/}
					</MaxWidthContainer>
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
	width: 100%;
`;

const AppView = styled.div`
	display: flex;
	height: calc(100% - 60px);
	max-width: 600px;
	margin: auto;
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
	overflow-y: auto;
`;

const RadioItem = styled.div`
	border: 2px solid grey;
	border-radius: 10px;
	margin: 10px 10px 0px 10px;
	padding: 10px 10px 6px 10px;
	width: calc(100% - 44px);
	cursor: pointer;
	background: white;

	&.playing {
		border: 2px solid #ef66b0;
	}
`;

const RadioItemTopLine = styled.div`
	display: flex;
	flex-direction: row;
`;

const RadioLogo = styled.img`
	height: 60px;
	width: 60px;
	border: 1px solid grey;
`;

const MetadataItem = styled.div`
	flex-grow: 1;
	border-radius: 0 5px 5px 0;
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
	font-size: 13px;
`;

const MetadataCover = styled.img`
	width: 40px;
	height: 40px;
	align-self: center;
	margin-left: 10px;
`;

const PlayingGif = styled.img`
	align-self: center;
	height: 40px;
	width: 40px;
	margin: 0 -10px 0 10px;
`;

const Controls = styled.div`
	z-index: 1000;
	background: #eee;
	height: 60px;
	border-top: 2px solid #888;
	bottom: 0;
	position: fixed;
	width: 100%;
`;

const MaxWidthContainer = styled.div`
	max-width: 600px;
	margin: auto;
	align-items: center;
	display: flex;
	justify-content: space-between;
	height: 100%;
`;

const StatusTextContainer = styled.span`
	padding: 0px 10px 0 20px;
	flex-shrink: 1;
	flex-grow: 1;
`;

/*const StatusClock = styled.span`
	font-weight: bold;
`;*/

const DelayText = styled.span`
	font-size: 12px;
`;

const StatusButtonsContainer = styled.span`
	padding: 5px 0 0 0;
	flex-shrink: 0;
	margin-right: 20px;
`;

const PlaybackButton = styled.img`
	height: 35px;
	margin-left: 7px;
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

const SoloMessage = styled.div`
	align-self: center;
	margin: 50px auto;
	padding: 20px 40px;
	background: white;
	border: 1px solid grey;
	border-radius: 20px;
`;

export default App;
/*{this.state.playingRadio && this.state.playingDate &&
	<audio src={HOST + "/listen/" + this.state.playingRadio + "/" + this.state.playingDate} controls autoPlay />
}*/

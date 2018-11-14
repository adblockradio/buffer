// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from 'react';
import './App.css';
import Onboarding from './Onboarding.js';
import Config from './Config.js';
import Playlist from './Playlist.js';
import Playing from './Playing.js';
import Controls from './Controls.js';
import SoloMessage from './SoloMessage';

import { play, stop, setVolume } from './audio.js';
import styled from "styled-components";
import classNames from 'classnames';
import async from 'async';

/* global cordova */
/* global Android */

const DELAYS = {
	FETCH_UPDATES_PLAYING: 1000,
	FETCH_UPDATES_IDLE: 1000, // if higher than 10, need to update value in load.js
	VISUALS_ACTIVE: 1000,
	VISUALS_HIDDEN: 10000
}

const VOLUMES = {
	MUTED: 0.1,
	DEFAULT: 0.5
}

const VIEWS = {
	LOADING: 100,
	ONBOARDING: 101,
	PLAYLIST: 102,
	CONFIG: 103,
	PLAYER: 104,
}

class App extends Component {
	constructor(props) {
		super(props);
		const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1; // in a Electron environment (https://github.com/electron/electron/issues/2288)
		this.state = {
			configLoaded: false,
			configError: false,
			config: [],
			playingRadio: null,
			playingDelay: null,
			clockDiff: 0,
			view: VIEWS.LOADING,
			locale: "fr",
			stopUpdates: false,
			communicationError: false,
			//doVisualUpdates: true,
			isElectron: isElectron,
			isCordovaApp: document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1 && !isElectron,
			isAndroidApp: navigator.userAgent === "abr_android"
		}
		this.play = this.play.bind(this);
		this.refreshStatusContainer = this.refreshStatusContainer.bind(this);
		this.refreshConfig = this.refreshConfig.bind(this);
		this.tick = this.tick.bind(this);
		this.insertRadio = this.insertRadio.bind(this);
		this.removeRadio = this.removeRadio.bind(this);
		this.toggleContent = this.toggleContent.bind(this);
		this.setLocale = this.setLocale.bind(this);
		this.getCurrentMetaForRadio = this.getCurrentMetaForRadio.bind(this);
		this.flagContent = this.flagContent.bind(this);
	}

	componentDidMount() {
		var self = this;
		if (this.state.isElectron) {
			console.log("detected Electron environment");
		} else if (this.state.isCordovaApp) {
			console.log("detected Cordova environment");
			// https://stackoverflow.com/questions/950087/how-do-i-include-a-javascript-file-in-another-javascript-file
			const head = document.getElementsByTagName('head')[0];
			const script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = "./cordova.js";
			const callback = function() {
				console.log("cordova script loaded");
			}
			script.onreadystatechange = callback;
			script.onload = callback;
			head.appendChild(script);
		} else if (this.state.isAndroidApp) {
			console.log("detected Android environment");
		} else {
			console.log("detected web environment");
		}
		this.refreshConfig(function() {
			if (self.state.config.radios && self.state.config.radios.length === 0) {
				self.setState({ view: VIEWS.ONBOARDING });
			} else {
				self.setState({ view: VIEWS.PLAYER });
			}
		});
		this.newTickInterval(DELAYS.VISUALS_ACTIVE);

		document.addEventListener('visibilitychange', function() {
			//self.setState({ doVisualUpdates: !document.hidden });
			console.log("visibilitychange: visible=" + !document.hidden);
			self.newTickInterval(document.hidden ? DELAYS.VISUALS_HIDDEN : DELAYS.VISUALS_ACTIVE);
		});

		var onHop = function (notification, eopts) {
			if (self.state.config.radios.length > 1) {
				var index = self.getRadioIndex(self.state.playingRadio);
				var newIndex = (index + 1) % self.state.config.radios.length;
				var newRadio = self.state.config.radios[newIndex].country + "_" + self.state.config.radios[newIndex].name;
				self.play(newRadio, null, null);
				console.log("notification: next channel");
			} else {
				console.log("notification: next channel but not possible");
			}
		};

		var onStop = function (notification, eopts) {
			console.log("notification: stop playback");
			self.play(null, null, null);
		};

		if (this.state.isCordovaApp) { // set up notifications actions callbacks
			document.addEventListener("deviceready", function(){
				self.setState({ isCordovaDeviceReady: true });
				cordova.plugins.notification.local.on('hop', onHop);
				cordova.plugins.notification.local.on('stop', onStop);
			});
		} else if (this.state.isAndroidApp) {
			window.notificationHop = onHop;
			window.notificationHop = window.notificationHop.bind(this);
			window.notificationStop = onStop;
			window.notificationStop = window.notificationStop.bind(this);
		}
	}

	componentWillUnmount() {
		clearInterval(this.timerID);
		this.newRefreshStatusInterval(0);
	}

	newRefreshStatusInterval(interval, requestFullDataAtOnce) {
		if (this.metadataTimerID) clearInterval(this.metadataTimerID);
		if (interval > 0) {
			this.metadataTimerID = setInterval(() => this.refreshStatusContainer({ requestFullData: false}), interval);
			this.refreshStatusContainer({ requestFullData: requestFullDataAtOnce });
		}
	}

	async refreshStatus(requestFullData) {
		const since = requestFullData ? this.state.config.user.cacheLen : Math.round(Math.max(DELAYS.FETCH_UPDATES_IDLE, DELAYS.FETCH_UPDATES_PLAYING)/1000 + 5);
		if (!this.state.isElectron) {
			try {
				const request = await fetch("status/" + since + "?t=" + Math.round(Math.random()*1000000));
				const res = await request.text();
				return JSON.parse(res);
			} catch (e) {
				console.log("refreshStatus: could not load status update for radios. err=" + e);
				return null;
			}
		} else {
			return navigator.abrserver.gatherStatus(since);
		}
	}

	async refreshStatusContainer(options) {
		if (this.state.stopUpdates) return;

		//console.log("refresh status");
		var self = this;
		const resParsed = await this.refreshStatus(options.requestFullData);
		if (!resParsed) {
			this.play(null, null, function() {});
			return this.setState({ communicationError: true });
		}

		var stateChange = { communicationError: false };
		var types = ["class", "metadata", "volume"];
		for (var i=0; i<resParsed.length; i++) { // for each radio
			var radio = resParsed[i].country + "_" + resParsed[i].name;
			stateChange[radio + "|available"] = resParsed[i].available;

			// TODO: after a stream restart, buffer has collapsed. We should set cursor accordingly.
			/*if (this.state[radio + "|cursor"] && resParsed[i].available < +this.state.date - this.state[radio + "|cursor"]) {
				stateChange[radio + "|cursor"] = +this.state.date - resParsed[i].available;
			}*/
			stateChange.clockDiff = +new Date() - resParsed[i].now;

			for (var j=0; j<types.length; j++) { // for each of ["class", "metadata", "volume"]
				if (!resParsed[i][types[j]]) {
					//console.log("refreshStatus: radio=" + radio + " has no field " + types[j]);
					continue;
				}
				var tO = resParsed[i][types[j]];
				tO[tO.length-1].validTo = null;

				var rt = radio + "|" + types[j];
				stateChange[rt] = self.state[rt] || [];
				for (var itO=0; itO<tO.length; itO++) {
					var alreadyThere = false;
					var itS;
					for (itS=stateChange[rt].length-1; itS>=0; itS--) {
						if (stateChange[rt][itS].validTo && stateChange[rt][itS].validTo < +self.state.date - self.state.config.user.cacheLen*1000) {
							//if (types[j] === "class") console.log("refreshStatus: " + rt + " remove old item validTo=" + stateChange[rt][itS].validTo);
							stateChange[rt].splice(itS, 1); // remove old elements
						} else if (tO[itO].validFrom === stateChange[rt][itS].validFrom) {
							alreadyThere = true;
							break;
						}
					}
					if (alreadyThere && tO[itO].validTo !== null && stateChange[rt][itS].validTo === null) { // we overwrite the last element, because validTo was erased
						//if (types[j] === "class") console.log("refreshStatus: " + rt + " overwrite validFrom=" + tO[itO].validFrom);
						stateChange[rt][itS] = tO[itO];
					} else if (!alreadyThere) {
						//if (types[j] === "class") console.log("refreshStatus: " + rt + " unshift validFrom=" + tO[itO].validFrom);
						stateChange[rt].unshift(tO[itO]);
					}
				}
				//stateChange[radio + "|" + types[j]] = tO.reverse();
			}
		}
		await this.setStateAsync(stateChange);
		this.showNotification();
	}

	async setStateAsync(state) {
		return new Promise((resolve) => {
			this.setState(state, resolve);
		});
	}

	async refreshConfig(callback) {
		try {
			if (!this.state.isElectron) {
				const request = await fetch("config?t=" + Math.round(Math.random()*1000000));
				const res = await request.text();
				var config = JSON.parse(res);
			} else {
				/*await new Promise((resolve) => {
					ipcRenderer.send('config', '');
					ipcRenderer.once('config', (event, arg) => {
						console.log(arg) // prints "pong"
						config = JSON.parse(arg);
						resolve();
					});
				});*/
				config = { radios: navigator.abrserver.getRadios(), user: navigator.abrserver.getUserConfig() };
			}
			await this.setState({ config: config, configError: false, configLoaded: true });
			this.newRefreshStatusInterval(DELAYS.FETCH_UPDATES_IDLE, true);
		} catch (e) {
			console.log("problem refreshing config from server: " + e);
			this.setState({ configError: true, configLoaded: true });
			clearInterval(this.timerID);
			clearInterval(this.metadataTimerID);
		}
		if (callback) callback();
	}


	newTickInterval(interval) {
		if (this.timerID) clearInterval(this.timerID);
		if (interval > 0) {
			this.timerID = setInterval(this.tick, interval);
			this.tick();
		}
	}

	tick() {
		if (this.state.stopUpdates) return;
		var self = this;
		this.setState({ date: new Date() }, function() {
			if (!this.state.config || !this.state.config.radios) return;
			var acceptableContent = new Array(this.state.config.radios.length);
			async.forEachOf(this.state.config.radios, function(radio, iRadio, onCursorChecked) {
				var radioName = radio.country + "_" + radio.name;
				self.checkCursor(radioName, function(res) {
					//res = { err: ... , delayChanged: ..., hasAcceptableContent: ... }
					acceptableContent[iRadio] = res.hasAcceptableContent;
					if (self.state.playingRadio === radioName && res.hasAcceptableContent && !res.delayChanged) {
						self.setVolumeForRadio(radioName, VOLUMES.DEFAULT);
						onCursorChecked();
					} else if (self.state.playingRadio === radioName && res.hasAcceptableContent && res.delayChanged) {
						// here, we know we are playing a channel with good content at the updated delay
						self.play(radioName, null, function(err) {
							onCursorChecked();
						});
					} else {
						onCursorChecked();
					}
				});
			}, function(err) {
				if (err) console.log("tick err=" + err);
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
				self.setVolumeForRadio(self.state.playingRadio, VOLUMES.MUTED);
			});
		});
	}

	acceptableContent(iRadio, classObj) {
		return ((this.state.config.radios[iRadio].content.ads || classObj.payload !== "0-ads") &&
			(this.state.config.radios[iRadio].content.speech || classObj.payload !== "1-speech"))
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
			console.log(radio + " set default delay");
			stateChange[radio + "|cursor"] = +this.state.date - this.defaultDelay(radio);
			return this.setState(stateChange, function() {
				callback({ err: null, delayChanged: true, hasAcceptableContent: true });
			});
		}

		const minCursor = +this.state.date - 1000*this.state[radio + "|available"];
		if (this.state[radio + "|cursor"] < minCursor) {
			console.log(radio + " move cursor from" + this.state[radio + "|cursor"] + " to " + minCursor);
			stateChange[radio + "|cursor"] = minCursor;
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
		var delays = [(+this.state[radio + "|available"])*1000, this.state.config.user.cacheLen*1000*2/3];
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

	setVolumeForRadio(radio, volume) {
		let targetVolume = volume || VOLUMES.DEFAULT;
		if (this.state[radio + "|volume"] && this.state[radio + "|volume"].length > 0) {
			targetVolume = Math.pow(10, (Math.min(70-this.state[radio + "|volume"][0].payload,0))/20)
		}
		setVolume(targetVolume);
	}

	getCurrentMetaForRadio(radio) {
		var liveMetadata;
		var metaList = this.state[radio + "|metadata"];
		if (metaList) {
			var targetDate = this.state[radio + "|cursor"];
			for (let j=0; j<metaList.length; j++) {
				if (metaList[j].validFrom - 1000 <= targetDate &&
					(!metaList[j].validTo || (targetDate < +metaList[j].validTo - 1000)))
				{
						liveMetadata = metaList[j];
						break;
				}
			}
		}

		if (liveMetadata && liveMetadata.payload) {
			var metaText;
			var p = liveMetadata.payload;
			if (p.artist && p.title) {
				metaText = p.artist + " - " + p.title;
			} else if (p.artist || p.title) {
				metaText = p.artist || p.title;
			}
			return { text: metaText, image: liveMetadata.payload.favicon };
		} else {
			return {};
		}

	}

	showNotification() {
		if (this.state.isCordovaApp) return this.cordovaNotification();
		if (this.state.isAndroidApp) return this.androidNotification();
	}

	cordovaNotification() {
		if (!this.state.isCordovaApp || !this.state.isCordovaDeviceReady) return

		if (this.state.playingRadio) {
			var index = this.getRadioIndex(this.state.playingRadio);
			var name = this.state.config.radios[index].name;
			var lang = this.state.locale;
			var meta = this.getCurrentMetaForRadio(this.state.playingRadio);
			var hasMeta = !!meta.text;

			var notifTitle = hasMeta ? name : 'Adblock Radio';
			var notifText = hasMeta ? meta.text : name;

			var self = this;
			cordova.plugins.notification.local.get(1, function (notification) {
				if (!notification || notification.title !== notifTitle || notification.text !== notifText) {
					console.log("notification: show");
					var actions = [	{ id: 'stop',  title: { en: "Stop", fr: "Stop" }[lang] } ];
					if (self.state.config.radios.length > 1) {
						actions.unshift({ id: 'hop', title: { en: "Change channel", fr: "Changer de station"}[lang] });
					}
					cordova.plugins.notification.local.schedule({
						id: 1,
					    title: notifTitle,
					    text: notifText,
					    actions: actions,
						sticky: true,
						led: false,
						sound: false,
						wakeup: false
					});
				}
			});

		} else {
			cordova.plugins.notification.local.clearAll(function() {
				console.log("notification: clear all");
			}, this);
		}
	}

	androidNotification() {
		if (this.state.playingRadio) {
			var index = this.getRadioIndex(this.state.playingRadio);
			var name = this.state.config.radios[index].name;
			var lang = this.state.locale;
			var meta = this.getCurrentMetaForRadio(this.state.playingRadio);
			var hasMeta = !!meta.text;
			var notifTitle = hasMeta ? name : 'Adblock Radio';
			var notifText = hasMeta ? meta.text : name;
			var actions = [	{ id: 'stop',  title: { en: "Stop", fr: "Stop" }[lang] } ];
			if (this.state.config.radios.length > 1) {
				actions.unshift({ id: 'hop', title: { en: "Change channel", fr: "Changer de station"}[lang] });
			}
			Android.showNotification(notifTitle, notifText, actions);
		} else {
			Android.clearNotification();
		}
	}

	play(radio, delay, callback) {
		// play radio. params:
		//     radio: if present, play that radio, otherwise stop
		//     delay: if present, play at that delay. otherwise, play at current cursor position.
		//     callback: optional

		const maxDelay = 1000 * (Math.min(this.state.config.user.cacheLen, +this.state[radio + "|available"]));// - this.state.config.user.streamInitialBuffer);
		console.log("play radio=" + radio + " delay=" + delay + " maxDelay=" + maxDelay);

		if (radio && maxDelay > 0 && !(delay === null && radio === this.state.playingRadio)) {
			radio = radio || this.state.playingRadio;
			if (delay === null || delay === undefined || isNaN(delay)) { // delay == 0 is a valid delay.
				delay = +this.state.date - this.state[radio + "|cursor"];
			}

			if (delay < 0) delay = 0;
			if (delay > maxDelay) delay = maxDelay;

			delay = Math.round(delay/1000)*1000; // rounded seconds

			console.log("Play: radio=" + radio + " delay=" + delay + "ms");

			var stateChange = {};
			stateChange[radio + "|cursor"] = +this.state.date - delay;
			stateChange["playingRadio"] = radio;
			stateChange["playingDelay"] = delay;
			this.setState(stateChange, function() {
				this.showNotification();
			});

			document.title = radio.split("_")[1] + " - Adblock Radio";
			const url = "listen/" + encodeURIComponent(radio) + "/" + (delay/1000) + "?t=" + Math.round(Math.random()*1000000000);
			play(url, function(err) {
				if (err) console.log("Play: error=" + err);
				if (callback) callback(err);
			});
			this.setVolumeForRadio(radio, VOLUMES.DEFAULT);
			this.newRefreshStatusInterval(DELAYS.FETCH_UPDATES_PLAYING, false);

		} else {
			this.setState({
				playingRadio: null,
				playingDelay: null
			}, function() {
				this.showNotification();
			});
			document.title = "Adblock Radio";
			stop();
			this.newRefreshStatusInterval(DELAYS.FETCH_UPDATES_IDLE, false);

			if (callback) callback(null);
		}
	}

	setLocale(lang) {
		this.setState({ locale: lang });
	}

	async insertRadio(country, name) {
		try {
			if (!this.state.isElectron) {
				await fetch("config/radios/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "?t=" + Math.round(Math.random()*1000000), { method: "PUT" });
			} else {
				await new Promise((resolve) => { navigator.abrserver.insertRadio(country, name, resolve) });
			}
			await this.refreshConfig();
		} catch (e) {
			console.log("could not insert radio " + country + "_" + name + ". err=" + e);
		}
	}

	async removeRadio(country, name) {
		if (this.state.playingRadio === country + "_" + name) this.play(null, null, function() {});
		try {
			if (!this.state.isElectron) {
				await fetch("config/radios/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "?t=" + Math.round(Math.random()*1000000), { method: "DELETE" });
			} else {
				await new Promise((resolve) => { navigator.abrserver.removeRadio(country, name, resolve) });
			}
			await this.refreshConfig();
		} catch (e) {
			console.log("could not remove radio " + country + "_" + name + ". err=" + e);
		}
	}

	async toggleContent(country, name, contentType, enabled) {
		try {
			// /config/radios/:country/:name/content/:type/:enable
			// Note: */ads/* is blocked by browser ad blocker, hence the indexOf(...).
			if (!this.state.isElectron) {
				await fetch("config/radios/" + encodeURIComponent(country) + "/" + encodeURIComponent(name) + "/content/" +
					["ads", "speech"].indexOf(contentType) + "/" + (enabled ? "enable" : "disable") + "?t=" + Math.round(Math.random()*1000000), { method: "PUT" });
			} else {
				await new Promise((resolve) => { navigator.abrserver.toggleContent(country, name, contentType, (enabled ? "enable" : "disable"), resolve); });
			}
			await this.refreshConfig();
		} catch (e) {
			console.log("could not toggle content for radio " + country + "_" + name + " content=" + contentType + " enabled=" + enabled + " err=" + e);
		}
	}

	async flagContent() {
		console.log("will submit flag");
		const cursors = {};
		for (let i=0; i<this.state.config.radios.length; i++) {
			const radio = this.state.config.radios[i];
			const canonical = radio.country + "_" + radio.name;
			cursors[canonical] = this.state[canonical + "|cursor"];
		}

		const outData = {
			playingRadio: this.state.playingRadio,
			cursors: cursors
		}

		if (!this.state.isElectron) {
			await fetch("flag", {
				method: "POST",
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(outData)
			});
		} else {
			await navigator.abrflag(outData);
		}
		console.log("flag submitted");
	}

	render() {
		let config = this.state.config;
		let lang = this.state.locale;
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
					<p>{{ en: "Check the server is running then reload this page", fr: "Vérifiez que le serveur est toujours actif puis rechargez cette page" }[lang]}</p>
				</SoloMessage>
			)
		}

		//console.log("Metadata props: date=" + (+this.state.date) + " clockDiff=" + this.state.clockDiff + " playingDelay=" + this.state.playingDelay);

		let mainContents;
		if (this.state.view === VIEWS.ONBOARDING) {
			mainContents = (
				<Onboarding setLocale={this.setLocale}
					locale={this.state.locale}
					canvasWidth={this.state.canvasWidth}
					finished={() => this.setState({ view: VIEWS.PLAYLIST })} />
			);

		} else if (this.state.view === VIEWS.CONFIG) {
			mainContents = (
				<Config config={this.state.config}
					toggleContent={this.toggleContent}
					locale={this.state.locale}
					finish={() => this.setState({ view: VIEWS.PLAYER })}
					setLocale={this.setLocale} />
			);

		} else if (this.state.view === VIEWS.PLAYLIST || config.radios.length === 0) {
			mainContents = (
				<Playlist config={this.state.config}
					insertRadio={this.insertRadio}
					removeRadio={this.removeRadio}
					finish={() => this.setState({ view: VIEWS.CONFIG })}
					locale={this.state.locale} />
			);

		} else if (this.state.view === VIEWS.PLAYER) {
			const radioState = {};
			const self = this;
			this.state.config.radios.map(function(radioObj, i) {
				var radio = radioObj.country + "_" + radioObj.name;
				return radioState[radio] = {
					metadata: self.state[radio + "|metadata"],
					cursor: self.state[radio + "|cursor"],
					availableCache: self.state[radio + "|available"],
					classList: self.state[radio + "|class"],
				}
			});

			mainContents = (
				<Playing communicationError={this.state.communicationError}
					config={this.state.config}
					playingRadio={this.state.playingRadio}
					radioState={radioState}
					canvasWidth={this.state.canvasWidth}
					date={+this.state.date}
					clockDiff={this.state.clockDiff}
					locale={this.state.locale}
					play={this.play}
					getCurrentMetaForRadio={this.getCurrentMetaForRadio} />
			);
		}

		return (
			<AppParent>
				<Tabs>
					<MaxWidthContainer>
						<TabItem onClick={() => this.state.config.radios.length && this.setState({ view: VIEWS.PLAYER })}
							className={classNames({ 'active': this.state.view === VIEWS.PLAYER, 'disabled': !this.state.config.radios.length })}>
							{{ en: "Adblock Radio", fr: "Adblock Radio" }[lang]}
						</TabItem>
						<TabItem onClick={() => this.setState({ view: VIEWS.PLAYLIST })}
							className={classNames({ 'active': this.state.view === VIEWS.PLAYLIST })}>
							{{ en: "Playlist", fr: "Playlist" }[lang]}
						</TabItem>
						<TabItem onClick={() => this.state.config.radios.length && this.setState({ view: VIEWS.CONFIG })}
							className={classNames({ 'active': this.state.view === VIEWS.CONFIG, 'disabled': !this.state.config.radios.length })}>
							{{ en: "Filters", fr: "Filtres" }[lang]}
						</TabItem>
						<TabItem onClick={() => this.setState({ view: VIEWS.ONBOARDING })}
							className={classNames({ 'active': this.state.view === VIEWS.ONBOARDING })}>
							{{ en: "Help", fr: "Aide" }[lang]}
						</TabItem>
					</MaxWidthContainer>
				</Tabs>
				<TabSpacer />
				<AppView>
					{mainContents}
				</AppView>
				<Controls playingRadio={this.state.playingRadio}
					playingDelay={this.state.playingDelay}
					play={this.play}
					flag={this.flagContent}
					locale={this.state.locale}
					canStart={this.state.playingRadio || this.state.view === VIEWS.PLAYER} />
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
	display: flex;
	flex-direction: column;
	align-items: center;
	/*background: url('bg.jpg') no-repeat center center fixed;*/
	background: #dff0ff;
	-webkit-background-size: cover;
	-moz-background-size: cover;
	-o-background-size: cover;
	background-size: cover;
	height: 100vh;
`;

const AppView = styled.div`
	height: calc(100% - 127px);
	max-width: 600px;
	margin: 67px auto 0px auto;
	position: fixed;
	overflow-y: auto;
	overflow-x: hidden;
	width: 100%;
	/*background: white;*/
`;

const TabSpacer = styled.div`
	height: 55px;
`;

const Tabs = styled.div`
	padding: 10px 0px;
	width: 100%;
	position: fixed;
	height: 45px;
	z-index: 1000;
	background: white;
	border-bottom: 2px solid grey;
`;

const TabItem = styled.div`
	cursor: pointer;

	&.active {
		font-weight: bold;
	}

	&.disabled {
		color: #bbb;
		cursor: not-allowed;
	}
`;

/*const Container = styled.div`
	z-index: 1000;
	background: #eee;
	height: 60px;
	border-top: 2px solid #888;
	bottom: 0;
	position: fixed;
	width: 100%;
`;*/

const MaxWidthContainer = styled.div`
	max-width: 600px;
	margin: auto;
	align-items: center;
	display: flex;
	justify-content: space-around;
	height: 100%;
	width: calc(100% - 20px);
	background: white;
`;

export default App;
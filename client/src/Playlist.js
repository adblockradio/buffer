// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { load } from './load.js';
import classNames from 'classnames';
import Checkbox from 'rc-checkbox';
import 'rc-checkbox/assets/index.css';
import FlagContainer from "./Flag.js";
import defaultCover from "./img/default_radio_logo.svg";
import userIcon from "./img/user_1085539.svg";
import removeIcon from "./img/remove_991614.svg";

class Playlist extends Component {
	constructor(props) {
		super(props);
		this.insert = this.insert.bind(this);
		this.remove = this.remove.bind(this);
		this.componentDidMount = this.componentDidMount.bind(this);
		this.state = {
			radiosLoaded: false,
			radiosError: false,
			radios: []
		}
	}

	translateContentName(type, lang) {
		switch (type) {
			case "ads": return { en: "ads", fr: "pubs" }[lang];
			case "speech": return { en: "speech", fr: "prises de parole" }[lang];
			default: return "unknown content name";
		}
	}

	componentDidMount() {
		let self = this;

		load("/config/radios/available?t=" + Math.round(Math.random()*1000000), function(err, res) {
			if (err) {
				return self.setState({ radiosLoaded: true, radiosError: true });
			}
			try {
				var radios = JSON.parse(res);
				self.setState({ radiosLoaded: true, radios: radios });
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
				self.setState({ radiosLoaded: true, radiosError: true });
			}
		});
	}

	insert(country, name) {
		this.props.insertRadio(country, name, this.componentDidMount);
	}

	remove(country, name) {
		this.props.removeRadio(country, name, this.componentDidMount);
	}

	/*toggleContent(country, name, contentType, enabled) {
		console.log("toggleContent radio=" + country + "_" + name + " contentType=" + contentType + " enable=" + enabled);
		this.props.toggleContent(country, name, contentType, enabled, this.componentDidMount);
	}*/

	render() {
		var lang = this.props.locale;
		var self = this;
		if (this.state.radiosError) {
			return (
				<SoloMessage>
					<p>{{en: "Oops, could not get the list of radios.", fr: "Oops, problème pour récupérer la liste des radios." }[lang]}</p>
					<p>{{en: "Check that the server is running and reload this page", fr: "Vérifiez que le serveur est actif et rechargez cette page" }[lang]}</p>
				</SoloMessage>
			);
		} else if (!this.state.radiosLoaded) {
			return (
				<SoloMessage>
					<p>{{en: "Loading…", fr: "Chargement…" }[lang]}</p>
				</SoloMessage>
			);
		}

		var current = this.props.config.radios;
		var available = this.state.radios;
		var playlistFull = this.props.config.radios.length >= this.props.config.user.maxRadios;
		var playlistEmpty = this.props.config.radios.length === 0;
		var loggedAs = self.props.config.user.email;

		return (
			<PlaylistContainer>
				<PlaylistSectionTitle>{{en: "Terms of use", fr: "Conditions d'utilisation" }[lang]}</PlaylistSectionTitle>
				<PlaylistItem>
					<TOSContainer>
						{{ en: "Adblock Radio Buffer. All rights reserved, Alexandre Storelli, 2018", fr: "Adblock Radio Buffer. Tous droits réservés, Alexandre Storelli, 2018." }[lang]}<br />
						{{ en: "This website is not intended to be available to the public", fr: "Ce site n'a pas vocation à être diffusé au public." }[lang]}<br />
						{{ en: "It is provided for demo purposes only", fr: "Il est mis à disposition pour un usage strictement limité à fins de démonstration." }[lang]}"<br />
						{{ en: "Only one visitor can use it at the same time", fr: "L'écoute est limitée à un seul utilisateur simultané."}[lang]}
					</TOSContainer>
					{loggedAs &&
						<TOSContainer>
							<LoginIcon src={userIcon} />
							<span>{{ en: "Connected to Adblock Radio with the account ", fr: "Connecté à Adblock Radio avec le compte " }[lang] + loggedAs}</span>
						</TOSContainer>
					}
					<ChoiceL10nContainer>
						{["en", "fr"].map(function(lang, index) {
							return (
								<FlagContainer country={lang}
									key={index}
									selected={self.props.locale === lang}
									onClick={() => self.props.setLocale(lang)}
									width={32}
									height={24} >
								</FlagContainer>
							);
						})}
					</ChoiceL10nContainer>
				</PlaylistItem>
				{!playlistEmpty &&
					<PlaylistSectionTitle>{{ en: "Your current favorites", fr: "Vos favoris" }[lang]}</PlaylistSectionTitle>
				}
				{current.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: true })} key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
								<PlaylistItemText onClick={function() { self.remove(radio.country, radio.name); }}>
									{radio.name}
								</PlaylistItemText>
								<RemoveIcon src={removeIcon} onClick={function() { self.remove(radio.country, radio.name); }} />
							</PlaylistItemTopRow>
							<PlaylistItemConfigContainer>
								{["ads", "speech"].map(function(type, j) {
									return (
										<PlaylistItemConfigItem key={"item" + i + "config" + j}>
											<Checkbox
												checked={!radio.content[type] && !!self.props.config.user.email}
												onChange={(e) => self.props.toggleContent(radio.country, radio.name, type, !e.target.checked, self.componentDidMount)}
												disabled={!self.props.config.user.email}
											/>
											&nbsp; {{ en: "skip " + self.translateContentName(type, lang), fr: "zapper les " + self.translateContentName(type, lang) }[lang]}
										</PlaylistItemConfigItem>
									)
								})}
							</PlaylistItemConfigContainer>
						</PlaylistItem>
					)
				})}
				{!playlistFull ?
					<PlaylistSectionTitle>{{ en: "Add radios to your favorites", fr: "Ajouter des radios à vos favoris" }[lang]}</PlaylistSectionTitle>
				:
				<PlaylistSectionTitle>{{ en: "Your playlist is full. If you want to change it, first make room in it", fr: "Votre playlist est pleine. Si vous souhaitez la modifier, faites-y d'abord de la place" }[lang]}</PlaylistSectionTitle>
				}
				{available.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: !playlistFull })} key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt={radio.name} />
								<PlaylistItemText>
									{radio.name}
								</PlaylistItemText>
								{!playlistFull &&
									<AddIcon src={removeIcon} onClick={function() { if (!playlistFull) self.insert(radio.country, radio.name); }} />
								}
							</PlaylistItemTopRow>
						</PlaylistItem>
					)
				})}
			</PlaylistContainer>
		)
	}
}

Playlist.propTypes = {
	config: PropTypes.object.isRequired,
	insertRadio: PropTypes.func.isRequired,
	removeRadio: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired
};

const PlaylistContainer = styled.div`
	flex-grow: 1;
	padding-bottom: 60px;
`;

const PlaylistSectionTitle = styled.h3`
	text-align: center;
	margin: 10px 10px 0px 10px;
`;

const TOSContainer = styled.p`
	margin: 10px;
	text-align: center;
	font-size: 12px;
`;

const LoginIcon = styled.img`
	width: 32px;
	vertical-align: middle;
	margin: 0 10px 0 0;
`;

const ChoiceL10nContainer = styled.div`
	align-self: center;
`;

const PlaylistItem = styled.div`
	border: 2px solid #eee;
	border-radius: 10px;
	margin: 10px;
	padding: 10px;
	flex-shrink: 0;
	background: white;
	display: flex;
	flex-direction: column;
	cursor: not-allowed;

	&.active {
		cursor: pointer;
	}
`;

const PlaylistItemTopRow = styled.div`
	display: flex;
	flex-direction: row;
`;

const PlaylistItemText = styled.p`
	flex-grow: 1;
	align-self: center;
`;

const PlaylistItemLogo = styled.img`
	width: 50px;
	height: 50px;
	align-self: center;
	margin-right: 10px;
	border: 1px solid grey;
`;

const RemoveIcon = styled.img`
	width: 32px;
	height: 32px;
	align-self: center;
`;

const AddIcon = styled.img`
	width: 32px;
	height: 32px;
	align-self: center;
	transform: rotate(45deg);
`;

const PlaylistItemConfigContainer = styled.div`
	flex-grow: 1;
	margin-top: 10px;
`;

const PlaylistItemConfigItem = styled.label`
	margin-right: 10px;
	display: block;
	margin: 5px 5px 0 5px;
`;

const SoloMessage = styled.div`
	align-self: center;
	margin: auto;
	padding: 20px 40px;
	background: white;
	border: 1px solid grey;
	border-radius: 20px;
`;

export default Playlist;

/*&.playing {
	width: 60px;
	height: 60px;
}*/

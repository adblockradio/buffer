// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
//import classNames from 'classnames';
import 'rc-checkbox/assets/index.css';
import defaultCover from "./img/default_radio_logo.svg";
import removeIcon from "./img/remove_991614.svg";
import FlagContainer from "./Flag.js";
import BlueButton from "./BlueButton.js";

const countries = [
	"France",
	"United Kingdom",
	"Belgium",
	"Spain",
	"Switzerland",
	"Italy",
	"Germany",
]

class Playlist extends Component {
	constructor(props) {
		super(props);
		this.insert = this.insert.bind(this);
		this.remove = this.remove.bind(this);
		this.componentDidMount = this.componentDidMount.bind(this);
		this.state = {
			radiosLoaded: false,
			radiosError: false,
			radios: [],
			isElectron: navigator.userAgent.toLowerCase().indexOf(' electron/') > -1,
			selectionCountry: 0,
		}
	}

	translateContentName(type, lang) {
		switch (type) {
			case "ads": return { en: "ads", fr: "pubs" }[lang];
			case "speech": return { en: "speech", fr: "prises de parole" }[lang];
			case "music": return { en: "music", fr: "musique" }[lang];
			default: return "unknown content name";
		}
	}

	async componentDidMount() {
		try {
			if (!this.state.isElectron) {
				const request = await fetch("config/radios/available?t=" + Math.round(Math.random()*1000000));
				const res = await request.text();
				var radios = JSON.parse(res);
			} else {
				radios = navigator.abrserver.getAvailableInactive();
			}
			this.setState({ radiosLoaded: true, radios: radios, radiosError: false });
		} catch (e) {
			console.log("problem getting available radios. err=" + e.message);
			this.setState({ radiosLoaded: true, radiosError: true });
		}
	}

	async insert(country, name) {
		await this.props.insertRadio(country, name);
		this.componentDidMount();
	}

	async remove(country, name) {
		await this.props.removeRadio(country, name);
		this.componentDidMount();
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

		return (
			<PlaylistContainer>
				{/*!playlistEmpty &&
					<PlaylistSectionTitle>{{ en: "Your playlist", fr: "Votre playlist" }[lang]}</PlaylistSectionTitle>
				*/}
				{current.map(function(radio, i) {
					// TODO it would be nice to make the default cover display if the original logo gives a 40x error.
					// as is, it does not work
					return (
						<PlaylistItem key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo"
									onError={(e)=>{e.target.src=defaultCover}} />
								<PlaylistItemText>
									{radio.name}
								</PlaylistItemText>
								<RemoveIcon src={removeIcon} onClick={() => self.remove(radio.country, radio.name)} />
							</PlaylistItemTopRow>
						</PlaylistItem>
					)
				})}
				{current.length > 1 &&
					<FullNoticeContainer>
						<PlaylistSectionTitle>
							{{en: "When your playlist is ready, customize your filters.",
								fr: "Quand votre playlist est prête, personnalisez vos filtres."}[lang]}
						</PlaylistSectionTitle>
						<BlueButton onClick={() => this.props.finish()}>
							{{ en: "Select filters", fr: "Choisir les filtres" }[lang]}
						</BlueButton>
					</FullNoticeContainer>
				}
				{!playlistFull ?
					<AddRadiosContainer>
						<PlaylistSectionTitle>
							{{ en: "Add up to MAX radios to your playlist",
								fr: "Ajoutez jusqu'à MAX radios à votre playlist" }[lang].replace("MAX", this.props.config.user.maxRadios)}
							</PlaylistSectionTitle>
						<ChoiceCountryContainer>
							{/*<p>{{ en: "Choose the country of radios", fr: "Choisissez le pays des radios" }[lang]}</p>*/}
							{countries.map(function(lang, index) {
								return (
									<FlagContainer country={lang}
										key={index}
										selected={self.state.selectionCountry === index}
										onClick={() => self.setState({ selectionCountry: index })}
										width={32}
										height={24} >
									</FlagContainer>
								);
							})}
						</ChoiceCountryContainer>

						{available.filter(r => r.country === countries[this.state.selectionCountry]).map(function(radio, i) {
							return (
								<PlaylistItem key={"item" + i}>
									<PlaylistItemTopRow>
										<PlaylistItemLogo src={radio.favicon || defaultCover} alt={radio.name} />
										<PlaylistItemText>
											{radio.name}
										</PlaylistItemText>
										<AddIcon src={removeIcon} onClick={() => self.insert(radio.country, radio.name) }/>
									</PlaylistItemTopRow>
								</PlaylistItem>
							)
						})}
					</AddRadiosContainer>
				:
					<FullNoticeContainer>
						<PlaylistSectionTitle>
							{{ en: "If you want to change the playlist, first make room in it.",
								fr: "Si vous souhaitez modifier votre playlist, faites-y d'abord de la place." }[lang]}
						</PlaylistSectionTitle>
					</FullNoticeContainer>

				}


			</PlaylistContainer>
		)
	}
}

Playlist.propTypes = {
	config: PropTypes.object.isRequired,
	insertRadio: PropTypes.func.isRequired,
	removeRadio: PropTypes.func.isRequired,
	locale: PropTypes.string.isRequired,
	finish: PropTypes.func.isRequired,
};

const PlaylistContainer = styled.div`
	flex-grow: 1;
	padding-bottom: 10px;
`;

const PlaylistSectionTitle = styled.p`
	font-size: bigger;
	text-align: center;
	margin: 10px 10px 0px 10px;
`;

const PlaylistItem = styled.div`
	border: 1px solid grey;
	border-radius: 10px;
	margin: 10px;
	padding: 10px;
	flex-shrink: 0;
	background: white;
	display: flex;
	flex-direction: column;
	box-shadow: 0px 2px 3px grey;
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
	cursor: pointer;
`;

const AddIcon = styled.img`
	width: 32px;
	height: 32px;
	align-self: center;
	transform: rotate(45deg);
	cursor: pointer;
`;

const SoloMessage = styled.div`
	align-self: center;
	margin: 50px auto;
	padding: 20px 40px;
	background: white;
	border: 1px solid grey;
	border-radius: 20px;
`;

const ChoiceCountryContainer = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
`;

const AddRadiosContainer = styled.div`
	margin-top: 30px;
`;

const FullNoticeContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	background: white;
	width: 80%;
	margin: auto;
	border-radius: 10px;
	padding: 10px;
`;

export default Playlist;

/*&.playing {
	width: 60px;
	height: 60px;
}*/

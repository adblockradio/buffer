// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import classNames from 'classnames';
import 'rc-checkbox/assets/index.css';
import defaultCover from "./img/default_radio_logo.svg";
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
			case "music": return { en: "music", fr: "musique" }[lang];
			default: return "unknown content name";
		}
	}

	async componentDidMount() {
		try {
			const request = await fetch("config/radios/available?t=" + Math.round(Math.random()*1000000));
			const res = await request.text();
			var radios = JSON.parse(res);
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
		var playlistEmpty = this.props.config.radios.length === 0;

		return (
			<PlaylistContainer>
				{!playlistEmpty &&
					<PlaylistSectionTitle>{{ en: "Your playlist", fr: "Votre playlist" }[lang]}</PlaylistSectionTitle>
				}
				{current.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: true })} key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
								<PlaylistItemText onClick={() => self.remove(radio.country, radio.name)}>
									{radio.name}
								</PlaylistItemText>
								<RemoveIcon src={removeIcon} onClick={() => self.remove(radio.country, radio.name)} />
							</PlaylistItemTopRow>
						</PlaylistItem>
					)
				})}
				{!playlistFull ?
					<PlaylistSectionTitle>{{ en: "Add radios to your playlist", fr: "Ajouter des radios à votre playlist" }[lang]}</PlaylistSectionTitle>
				:
				<PlaylistSectionTitle>{{ en: "Your playlist is full. If you want to change it, first make room in it", fr: "Votre playlist est pleine. Si vous souhaitez la modifier, faites-y d'abord de la place" }[lang]}</PlaylistSectionTitle>
				}
				{available.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: !playlistFull })} key={"item" + i} onClick={function() { if (!playlistFull) self.insert(radio.country, radio.name); }}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt={radio.name} />
								<PlaylistItemText>
									{radio.name}
								</PlaylistItemText>
								{!playlistFull &&
									<AddIcon src={removeIcon} />
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

const SoloMessage = styled.div`
	align-self: center;
	margin: 50px auto;
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

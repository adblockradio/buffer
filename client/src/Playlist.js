// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { load } from './load.js';
import classNames from 'classnames';
import Checkbox from 'rc-checkbox';
import 'rc-checkbox/assets/index.css';
import defaultCover from "./img/default_radio_logo.svg";
import userIcon from "./img/user_1085539.svg";

class Playlist extends Component {
	constructor(props) {
		super(props);
		this.insert = this.insert.bind(this);
		this.remove = this.remove.bind(this);
		this.componentDidMount = this.componentDidMount.bind(this);
		this.state = {
			radiosLoaded: false,
			radios: []
		}
	}

	componentDidMount() {
		let self = this;

		load("/config/radios/available?t=" + Math.round(Math.random()*1000000), function(res) {
			try {
				var radios = JSON.parse(res);
				self.setState({ radios: radios });
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			self.setState({ radiosLoaded: true });
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
		var self = this;
		if (!this.state.radiosLoaded) {
			return (
				<p>Loading...</p>
			);
		}

		var current = this.props.config.radios;
		var available = this.state.radios;
		var playlistFull = this.props.config.radios.length >= this.props.config.user.maxRadios;
		var playlistEmpty = this.props.config.radios.length === 0;
		var loggedAs = self.props.config.user.email;

		return (
			<PlaylistContainer>
				<PlaylistSectionTitle>Terms of use</PlaylistSectionTitle>
				<PlaylistItem>
					<TOSContainer>
						Adblock Radio Buffer. Tous droits réservés, Alexandre Storelli, 2018.<br />
						Ce site n'a pas vocation à être diffusé au public.<br />
						Il est mis à disposition pour un usage strictement limité à fins de démonstration.<br />
						L'écoute est limitée à un seul utilisateur simultané.
					</TOSContainer>
					{loggedAs &&
						<TOSContainer>
							<LoginIcon src={userIcon} />
							<span>Connecté à Adblock Radio avec le compte {loggedAs}</span>
						</TOSContainer>
					}
				</PlaylistItem>
				{!playlistEmpty &&
					<PlaylistSectionTitle>Your current favorites : click to remove</PlaylistSectionTitle>
				}
				{current.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: true })} key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" onClick={function() { self.remove(radio.country, radio.name); }} />
								<PlaylistItemText onClick={function() { self.remove(radio.country, radio.name); }}>
									{radio.name}
								</PlaylistItemText>
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
											&nbsp; skip {type}
										</PlaylistItemConfigItem>
									)
								})}
							</PlaylistItemConfigContainer>
						</PlaylistItem>
					)
				})}
				{!playlistFull ?
					<PlaylistSectionTitle>Add radios to your favorites</PlaylistSectionTitle>
				:
				<PlaylistSectionTitle>Your favorites playlist is full. Make room, then click to add</PlaylistSectionTitle>
				}
				{available.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: !playlistFull })} key={"item" + i} onClick={function() { if (!playlistFull) self.insert(radio.country, radio.name); }}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
								<PlaylistItemText>
									{radio.name}
								</PlaylistItemText>
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
	removeRadio: PropTypes.func.isRequired
};

const PlaylistContainer = styled.div`
	flex-grow: 1;
	overflow-y: scroll;
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
	margin-bottom: 10px;
`;

const PlaylistItemText = styled.p`
	flex-grow: 1;
	align-self: center;
`;

const PlaylistItemLogo = styled.img`
	width: 60px;
	height: 60px;
	align-self: center;
	margin-right: 10px;
	border: 1px solid grey;
`;

const PlaylistItemConfigContainer = styled.div`
	flex-grow: 1;
`;

const PlaylistItemConfigItem = styled.label`
	margin-right: 10px;
`;

export default Playlist;

/*&.playing {
	width: 60px;
	height: 60px;
}*/

// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { load } from './load.js';
import classNames from 'classnames';
import Checkbox from 'rc-checkbox';
import 'rc-checkbox/assets/index.css';
import defaultCover from "./img/default_radio_logo.svg";

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

		return (
			<PlaylistContainer>
				<p>
					Adblock Radio Buffer. Tous droits réservés, Alexandre Storelli, 2018.<br />
					Ce site n'a pas vocation à être diffusé au public.<br />
					Il est mis à disposition pour un usage strictement limité à fins de démonstration.<br />
					L'écoute est limitée à un seul utilisateur simultané.
				</p>
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
								<label>
									<Checkbox
										checked={!radio.content.ads}
										onChange={(e) => self.props.toggleContent(radio.country, radio.name, "ads", !e.target.checked, self.componentDidMount)}
										disabled={!self.props.config.user.token}
									/>
									&nbsp; skip ads
								</label>
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
`;

const PlaylistSectionTitle = styled.h3`
	text-align: center;
`;

const PlaylistItem = styled.div`
	border: 2px solid #eee;
	border-radius: 10px;
	margin: 10px;
	padding: 10px;
	flex-shrink: 0;
	background: #eee;
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
`;

const PlaylistItemConfigContainer = styled.div`
	flex-grow: 1;
`;

export default Playlist;

/*&.playing {
	width: 60px;
	height: 60px;
}*/

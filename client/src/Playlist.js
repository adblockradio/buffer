// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { load } from './load.js';
import classNames from 'classnames';
import defaultCover from "./img/default_radio_logo.svg";

class Playlist extends Component {
	constructor(props) {
		super(props);
		this.insert = this.insert.bind(this);
		this.remove = this.remove.bind(this);
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
		this.props.insertRadio(country, name);
	}

	remove(country, name) {
		this.props.removeRadio(country, name);
	}

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

		return (
			<PlaylistContainer>
				<PlaylistSectionTitle>Your current favorites : click to remove</PlaylistSectionTitle>
				{current.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: true })} key={"item" + i} onClick={function() { self.remove(radio.country, radio.name); }}>
							<PlaylistItemText>
								{radio.name}
							</PlaylistItemText>
							<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
						</PlaylistItem>
					)
				})}
				{!playlistFull ?
					<PlaylistSectionTitle>More radios : click to add</PlaylistSectionTitle>
				:
				<PlaylistSectionTitle>More radios : make room in your favorites, then click to add</PlaylistSectionTitle>
				}
				{available.map(function(radio, i) {
					return (
						<PlaylistItem className={classNames({ active: !playlistFull })} key={"item" + i} onClick={function() { if (!playlistFull) self.insert(radio.country, radio.name); }}>
							<PlaylistItemText>
								{radio.name}
							</PlaylistItemText>
							<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
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
	cursor: not-allowed;

	&.active {
		cursor: pointer;
	}
`;

const PlaylistItemText = styled.p`
	flex-grow: 1;
	align-self: center;
`

const PlaylistItemLogo = styled.img`
	width: 60px;
	height: 60px;
	align-self: center;
	margin-left: 10px;
`;

export default Playlist;

/*&.playing {
	width: 60px;
	height: 60px;
}*/

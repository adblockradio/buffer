// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
//import classNames from 'classnames';
import Checkbox from 'rc-checkbox';
import 'rc-checkbox/assets/index.css';
import defaultCover from "./img/default_radio_logo.svg";
import BlueButton from "./BlueButton.js";

class Config extends Component {

	constructor() {
		super();
		this.toggleContent = this.toggleContent.bind(this);
	}

	async toggleContent(country, name, contentType, enabled) {
		console.log("toggleContent radio=" + country + "_" + name + " contentType=" + contentType + " enable=" + enabled);
		await this.props.toggleContent(country, name, contentType, enabled);
	}

	translateContentName(type, lang) {
		switch (type) {
			case "ads": return { en: "ads", fr: "pubs" }[lang];
			case "speech": return { en: "speech", fr: "prises de parole" }[lang];
			case "music": return { en: "music", fr: "musique" }[lang];
			default: return "unknown content name";
		}
	}

	render() {
		var lang = this.props.locale;
		var self = this;
		var current = this.props.config.radios;

		return (
			<PlaylistContainer>
				{current.map(function(radio, i) {
					return (
						<PlaylistItem key={"item" + i}>
							<PlaylistItemTopRow>
								<PlaylistItemLogo src={radio.favicon || defaultCover} alt="logo" />
								<PlaylistItemText>
									{radio.name}
								</PlaylistItemText>
							</PlaylistItemTopRow>
							<PlaylistItemConfigContainer>
								{["ads", "speech"].map(function(type, j) {
									return (
										<PlaylistItemConfigItem key={"item" + i + "config" + j}>
											<Checkbox
												checked={!radio.content[type]}
												onChange={(e) => self.toggleContent(radio.country, radio.name, type, !e.target.checked)}
												disabled={false}
											/>
											&nbsp; {{ en: "skip " + self.translateContentName(type, lang), fr: "zapper les " + self.translateContentName(type, lang) }[lang]}
										</PlaylistItemConfigItem>
									)
								})}
							</PlaylistItemConfigContainer>
						</PlaylistItem>
					)
				})}
				<ButtonContainer>
					<ButtonTitle>
						{{ en: "When you are ready, you can start listening!",
							fr: "Quand vous êtes prêt, vous pouvez écouter la radio !" }[lang]}
					</ButtonTitle>
					<BlueButton onClick={() => this.props.finish()}>
						{{ en: "Listen to the radio", fr: "Écouter la radio" }[lang]}
					</BlueButton>
				</ButtonContainer>
			</PlaylistContainer>
		)
	}
}

Config.propTypes = {
	config: PropTypes.object.isRequired,
	locale: PropTypes.string.isRequired,
	finish: PropTypes.func.isRequired,
};

const PlaylistContainer = styled.div`
	flex-grow: 1;
	padding-bottom: 10px;
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

const PlaylistItemConfigContainer = styled.div`
	flex-grow: 1;
	margin-top: 10px;
`;

const PlaylistItemConfigItem = styled.label`
	margin-right: 10px;
	display: block;
	margin: 5px 5px 0 5px;
	cursor: pointer;
`;

const ButtonContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	background: white;
	width: 80%;
	margin: auto;
	border-radius: 10px;
	padding: 10px;
`;

const ButtonTitle = styled.p`
	font-size: bigger;
	text-align: center;
	margin: 10px 10px 0px 10px;
`;

export default Config;

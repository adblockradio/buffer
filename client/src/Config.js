// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
//import classNames from 'classnames';
import Checkbox from 'rc-checkbox';
import 'rc-checkbox/assets/index.css';
import FlagContainer from "./Flag.js";
import defaultCover from "./img/default_radio_logo.svg";
import userIcon from "./img/user_1085539.svg";
import { colorByType } from "./colors.js";

class Config extends Component {

	translateContentName(type, lang) {
		switch (type) {
			case "ads": return { en: "ads", fr: "pubs" }[lang];
			case "speech": return { en: "speech", fr: "prises de parole" }[lang];
			case "music": return { en: "music", fr: "musique" }[lang];
			default: return "unknown content name";
		}
	}

	/*toggleContent(country, name, contentType, enabled) {
		console.log("toggleContent radio=" + country + "_" + name + " contentType=" + contentType + " enable=" + enabled);
		this.props.toggleContent(country, name, contentType, enabled, this.componentDidMount);
	}*/

	render() {
		var lang = this.props.locale;
		var self = this;
		var current = this.props.config.radios;
		var playlistEmpty = this.props.config.radios.length === 0;
		var loggedAs = this.props.config.user.email;

		return (
			<PlaylistContainer>
				<PlaylistItem>
					<span>{{ en: "With Adblock Radio, get live info about what is being broadcast:", fr: "Adblock Radio vous indique en direct ce qui passe à la radio:" }[lang]}</span>
					<ul>
						{["music", "speech", "ads"].map(function(type, index) {
							return (
								<ColorItem key={"type" + index}>
									<ColorDot style={{backgroundColor: colorByType(type)}} alt={self.translateContentName(type, lang)}></ColorDot>
									<ColorLabel>{self.translateContentName(type, lang)}</ColorLabel>
								</ColorItem>
							);
						})}
					</ul>
					<span>{{ en: "For each radio in your playlist, you can automatically skip ads and/or chit-chat", fr: "Pour chacune des radios de votre playlist, vous pouvez passer automatiquement les pubs et/ou les prises de parole."}[lang]}</span>
				</PlaylistItem>
				{!playlistEmpty &&
					<PlaylistSectionTitle>{{ en: "Choose the contents you want to skip", fr: "Choisissez les contenus que vous voulez zapper" }[lang]}</PlaylistSectionTitle>
				}
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
				<PlaylistSectionTitle>{{en: "Preferences", fr: "Préférences" }[lang]}</PlaylistSectionTitle>
				<PlaylistItem>
					<PreferencesItemTitle>{{ en: "Site language:", fr: "Langue d'affichage:"}[lang]}</PreferencesItemTitle>
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
					<PreferencesItemTitle>{{ en: "Connected to Adblock Radio as:", fr: "Connecté à Adblock Radio en tant que :"}[lang]}</PreferencesItemTitle>
					{loggedAs &&
						<ProfileContainer>
							<LoginIcon src={userIcon} />
							<span>{loggedAs}</span> {/*{{ en: "Connected to Adblock Radio with the account ", fr: "Connecté à Adblock Radio avec le compte " }[lang] + */}
						</ProfileContainer>
					}
				</PlaylistItem>
				<PlaylistSectionTitle>{{en: "Terms of use", fr: "Conditions d'utilisation" }[lang]}</PlaylistSectionTitle>
				<PlaylistItem>
					<TOSContainer>
						{{ en: "Adblock Radio Buffer. All rights reserved, Alexandre Storelli, 2018", fr: "Adblock Radio Buffer. Tous droits réservés, Alexandre Storelli, 2018." }[lang]}<br />
						{{ en: "This website is not intended to be available to the public", fr: "Ce site n'a pas vocation à être diffusé au public." }[lang]}<br />
						{{ en: "It is provided for demo purposes only", fr: "Il est mis à disposition pour un usage strictement limité à fins de démonstration." }[lang]}<br />
						{{ en: "Only one visitor can use it at the same time", fr: "L'écoute est limitée à un seul utilisateur simultané."}[lang]}
					</TOSContainer>
				</PlaylistItem>
			</PlaylistContainer>
		)
	}
}

Config.propTypes = {
	config: PropTypes.object.isRequired,
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

const ColorItem = styled.li`
	display: flex;
	margin-bottom: 3px;
`;

const ColorDot = styled.span`
	width: 18px;
	height: 18px;
	border-radius: 9px;
`;

const ColorLabel = styled.span`
	align-self: center;
	margin-left: 10px;
`;

const ProfileContainer = styled.div`
	text-align: center;
	margin: 10px;
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

const PreferencesItemTitle = styled.p`
	margin-bottom: 0;
`;

export default Config;

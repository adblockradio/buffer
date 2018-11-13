import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import FlagContainer from "./Flag.js";
import { colorByType } from "./colors.js";
import BlueButton from "./BlueButton.js";

import abrlogo from './img/round_logo.png';
import leap from './img/leap_219178.svg';
import meter from './img/meter_1697884.svg';
import target from './img/target_925909.svg';
//import classnames from "classnames";

const LOCALE_FOR_COUNTRY = {
	"United Kingdom": "en",
	"France": "fr"
}

class Onboarding extends Component {
	constructor() {
		super();
		this.state = {
			step: 0,
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

	render() {
		const self = this;
		const lang = this.props.locale;
		let contents;

		switch (this.state.step) {
			case 0:
				contents = (
					<ContentsContainer>
						<AbrLogo src={abrlogo} alt='' />
						<h4>Bienvenue sur Adblock Radio Buffer&nbsp;!</h4>
						<p>{{ en: "Listen to the radio and fast-forward ads.", fr: "Écoutez la radio et sautez les pubs." }[lang]}</p>
						<ChoiceL10nContainer>
							{Object.keys(LOCALE_FOR_COUNTRY).map(function(lang, index) {
								return (
									<FlagContainer country={lang}
										key={index}
										selected={self.props.locale === LOCALE_FOR_COUNTRY[lang]}
										onClick={() => self.props.setLocale(LOCALE_FOR_COUNTRY[lang])}
										width={32}
										height={24} >
									</FlagContainer>
								);
							})}
						</ChoiceL10nContainer>
						<Credits>
							<p>
								{{ en: "Adblock Radio SAS. All rights reserved, 2018",
									fr: "Adblock Radio SAS. Tous droits réservés, 2018." }[lang]}
							</p>
							<p>
								{{ en: "More info on ", fr: "Plus d'informations sur " }[lang]} <a target="_blank" href="https://www.adblockradio.com" rel="noopener noreferrer">adblockradio.com</a>.
							</p>
						</Credits>

						<BlueButton onClick={() => this.setState({ step: this.state.step + 1})}>
							{{ en: "Next", fr: "Suivant" }[lang]}
						</BlueButton>
					</ContentsContainer>
				);
				break;
			case 1:
				contents = (
					<ContentsContainer>
						<img src={leap} width={128} alt='' />

						<p>{{ en: "You are about to listen to your favorite radios with a delay of a few minutes.",
							fr: "Vous allez écouter vos radios favorites avec un différé de quelques minutes." }[lang]}</p>
						<p>{{ en: "That way, you will be able to fast-forward ads and chit-chat!",
							fr: "Ainsi, vous pourrez sauter les pubs et le blabla !"}[lang]}
							</p>

						<BlueButton onClick={() => this.setState({ step: this.state.step + 1})}>
							{{ en: "Next", fr: "Suivant" }[lang]}
						</BlueButton>
					</ContentsContainer>
				);
				break;
			case 2:
				contents = (
					<ContentsContainer>
						<img src={meter} width={128} alt='' />

						<p>{{ en: "The player gives an overview on what kind of content has just been broadcast.",
							fr: "Le lecteur donne un aperçu de la nature du contenu qui passe à la radio."}[lang]}</p>
						<p>{{ en: "Here is the color it uses.",
							fr: "Voici les couleurs qu'il utilise."}[lang]}</p>
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
						<BlueButton onClick={() => this.setState({ step: this.state.step + 1})}>
							{{ en: "Next", fr: "Suivant" }[lang]}
						</BlueButton>

					</ContentsContainer>
				);
				break;

			case 3:
				contents = (
					<ContentsContainer>
						<img src={target} width={128} alt='' />

						<p>{{ en: "Sometimes Adblock Radio is wrong…",
							fr: "Parfois Adblock Radio fait des erreurs…"}[lang]}</p>
						<p>{{ en: "Not a problem! You can tell him and he will improve.",
							fr: "Pas grave ! Vous pouvez lui dire et il s'améliorera."}[lang]}</p>

						<BlueButton onClick={() => this.props.finished()}>
							{{ en: "Choose my radios", fr: "Choisir mes radios" }[lang]}
						</BlueButton>
					</ContentsContainer>
				);
				break;

			default:
				contents = null
		}

		return (
			<Container>
				{contents}
				{/*<ul className="step">
					<li className={classnames({ "step-item": true, "active": this.state.step === 0 })}>
						<a href="#" class="tooltip" data-tooltip="Présentation">1</a>
					</li>
					<li className={classnames({ "step-item": true, "active": this.state.step === 1 })}>
						<a href="#" class="tooltip" data-tooltip="Écoute en différé">2</a>
					</li>
					<li className={classnames({ "step-item": true, "active": this.state.step === 2 })}>
						<a href="#" class="tooltip" data-tooltip="Code couleur du contenu">3</a>
					</li>
				</ul>*/}
			</Container>
		);
	}
}

Onboarding.propTypes = {
	locale: PropTypes.string.isRequired,
	setLocale: PropTypes.func.isRequired,
	finished: PropTypes.func.isRequired,
}

const AbrLogo = styled.img`
	width: 96px;
	border-radius: 100%;
	margin-bottom: 20px;
`;

const Container = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
	padding-bottom: 15px;
	background: white;
	height: 100%;
`;

const ContentsContainer = styled.div`
	text-align: center;
	padding: 40px 15px 15px 15px;
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	background: white;
	height: 100%;
`;

const ChoiceL10nContainer = styled.div`
	align-self: center;
	flex-grow: 1;
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

const Credits = styled.div`
	font-size: small;
`;


export default Onboarding;
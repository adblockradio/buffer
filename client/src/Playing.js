
import React, { Component } from 'react';
import DelaySVG from './DelaySVG.js';
import styled from "styled-components";
import classNames from 'classnames';
import PropTypes from "prop-types";
import SoloMessage from './SoloMessage';


class Playlist extends Component {
	/*constructor(props) {
		super(props);
	}*/

	render() {
		const self = this;
		const lang = this.props.locale;

		let minimumCache = null;
		return (
			<RadioList>
				{this.props.communicationError &&
					<SoloMessage>
						<p>{{ en: "The communication with the server is temporarily unavailable…", fr: "La connection au serveur est momentanément interrompue…" }[lang]}</p>
					</SoloMessage>
				}
				{this.props.config.radios.map(function(radioObj, i) {
					var radio = radioObj.country + "_" + radioObj.name;
					var playing = self.props.playingRadio === radio;
					var meta = self.props.getCurrentMetaForRadio(radio);
					minimumCache = Math.max(minimumCache, self.props.radioState[radio].availableCache);

					return (
						<RadioItem className={classNames({ playing: playing })}
							id={"RadioItem" + i}
							key={"RadioItem" + i}>

							<RadioItemTopLine onClick={function() { self.props.play(radio, null, null); }}>
								<RadioLogo src={radioObj.favicon} alt={radio} />
								<MetadataItem>
									<MetadataText>
										{meta.text || radio}
									</MetadataText>
									{meta.image &&
										<MetadataCover src={meta.image} />
									}
								</MetadataItem>
							</RadioItemTopLine>

							<DelaySVG cursor={+self.props.date - self.props.radioState[radio].cursor}
								availableCache={self.props.radioState[radio].availableCache}
								classList={self.props.radioState[radio].classList}
								date={new Date(+self.props.date - self.props.clockDiff)}
								playing={playing}
								cacheLen={self.props.config.user.cacheLen}
								width={self.props.canvasWidth || 100}
								locale={self.props.locale}
								playCallback={function(delay) { self.props.play(radio, delay, null); }} />

						</RadioItem>
					)
				})}

				{minimumCache < this.props.config.user.cacheLen / 2 &&
					<CacheWarning>
						<p>
							{{ en: "The player is building the buffer.",
								fr: "Le lecteur enregistre les radios."}[lang]}
						</p>
						<p>
							{{ en: "You can listen but ads fast-forwards may not yet be available.",
								fr: "Vous pouvez commencer l'écoute mais le saut des publicités ne sera peut-être pas encore possible."}[lang]}
						</p>
						<p>
							{{ en: "This message will disappear in a few minutes.",
								fr: "Ce message disparaîtra au bout de quelques minutes."}[lang]}
						</p>
					</CacheWarning>
				}
			</RadioList>
		)
	}
}

Playlist.propTypes = {
	communicationError: PropTypes.bool.isRequired,
	locale: PropTypes.string.isRequired,
	config: PropTypes.object.isRequired,
	playingRadio: PropTypes.string,
	radioState: PropTypes.object,
	canvasWidth: PropTypes.number,
	date: PropTypes.number.isRequired,
	clockDiff: PropTypes.number.isRequired,
	play: PropTypes.func.isRequired,
	getCurrentMetaForRadio: PropTypes.func.isRequired,
}

const RadioList = styled.div`
	display: flex;
	justify-content: center;
	flex-grow: 1;
	flex-direction: column;
	align-self: auto;
	padding-bottom: 10px;
	overflow-y: auto;
`;

const RadioItem = styled.div`
	border: 1px solid grey;
	border-radius: 10px;
	margin: 10px 10px 0px 10px;
	padding: 10px 10px 6px 10px;
	width: calc(100% - 44px);
	cursor: pointer;
	background: white;
	box-shadow: 0px 2px 3px grey;

	&.playing {
		border: 2px solid #ef66b0;
		box-shadow: 0px 2px 3px #ef66b0;
	}
`;

const RadioItemTopLine = styled.div`
	display: flex;
	flex-direction: row;
`;

const RadioLogo = styled.img`
	height: 60px;
	width: 60px;
	border: 1px solid grey;
`;

const MetadataItem = styled.div`
	flex-grow: 1;
	border-radius: 0 5px 5px 0;
	padding: 0 10px;
	flex-shrink: 1;
	background: #f8f8f8;
	display: flex;
	cursor: pointer;
`;

const MetadataText = styled.p`
	flex-grow: 1;
	align-self: center;
	margin: 10px 0;
	font-size: 13px;
`;

const MetadataCover = styled.img`
	width: 40px;
	height: 40px;
	align-self: center;
	margin-left: 10px;
`;

const CacheWarning = styled.div`
	border: 3px solid orange;
	width: 80%;
	margin: 20px auto 0px auto;
	padding: 10px 10px 0px 10px;
	border-radius: 5px;
	background: white;
`;

export default Playlist;
// Copyright (c) 2018 Alexandre Storelli

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import classNames from 'classnames';
import Metadata from './Metadata.js';

//import play from "./img/start_1279169.svg";
//import stop from "./img/stop_1279170.svg";

class Radio extends Component {
	constructor(props) {
		super(props);
		this.play = this.play.bind(this);
		this.stop = this.stop.bind(this);
		this.state = {
			metadata: null
		}
	}

	/*componentDidMount() {
		var self = this;
		load("/metadata/" + this.props.metadata.country + "_" + this.props.metadata.name + "/" + new Date(+new Date() - 30*60000).toISOString(), function(res) {
			try {
				var metadata = JSON.parse(res);
				console.log(metadata);
				self.setState({ metadata: metadata.reverse() });
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			self.setState({ metadataLoaded: true });
		});
	}*/

	play() {
		var radio = this.props.metadata.country + "_" + this.props.metadata.name;
		this.props.playCallback(radio);
	}

	stop() {
		this.props.playCallback(null, null);
	}

	render() {
		var self = this;
		var metadata = this.props.metadata;

		//console.log(JSON.stringify(this.props.liveMetadata));

		return (
			<RadioItem className={classNames({ playing: self.props.playing })} onClick={function() { self.play(); }}>
				<RadioLogo src={metadata.favicon} alt="logo" />
				{self.props.showMetadata &&
					<Metadata playingRadio={self.props.metadata.country + "_" + self.props.metadata.name}
						metaList={self.props.liveMetadata}
						maxItems={1}
						playCallback={self.play} />
				}
			</RadioItem>
		)
	}
}

Radio.propTypes = {
	playing: PropTypes.bool.isRequired,
	metadata: PropTypes.object.isRequired,
	showMetadata: PropTypes.bool.isRequired,
	liveMetadata: PropTypes.array,
	playCallback: PropTypes.func.isRequired
};

const RadioItem = styled.div`
	border: 2px solid grey;
	border-radius: 10px;
	margin: 10px 10px 0px 10px;
	padding: 10px 10px 10px 10px;
	flex-shrink: 0;
	display: flex;
	cursor: pointer;

	&.playing {
		border: 2px solid red;
	}
`;

const RadioLogo = styled.img`
	height: 80px;
	width: 80px;
`;

/*const RadioName = styled.p`
	font-weight: bold;
`;*/

export default Radio;

/*{this.state.metadataLoaded ?
	this.state.metadata.map(function(item, i) {
		if (!item.title) return null
		return (
			<div key={"item" + i} onClick={function() { self.play(item.start); }}>
				<p>{item.title.artist} - {item.title.title}</p>
				<p>{moment(item.start).format("HH:mm")}</p>
				{item.title.cover ?
					<TitleCover src={item.title.cover} alt="logo" />
				:
				<TitleCover src={defaultCover} alt="logo" />
				}
			</div>
		)
	})
:
<span>loading...</span>
}*/

/*<RadioName>{metadata.name}</RadioName>
{this.props.playing ?
	<PlaybackButton src={stop} alt="Stop" />
:
<PlaybackButton src={play} alt="Play" />
}*/

import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import classNames from "classnames";

import Argentina from "./img/flags/Argentina.svg";
import Belgium from "./img/flags/Belgium.svg";
import Canada from "./img/flags/Canada.svg";
import Finland from "./img/flags/Finland.svg";
import France from "./img/flags/France.svg";
import Germany from "./img/flags/Germany.svg";
import Italy from "./img/flags/Italy.svg";
import Netherlands from "./img/flags/Netherlands.svg";
import NewZealand from "./img/flags/New Zealand.svg";
import Slovakia from "./img/flags/Slovakia.svg";
import Spain from "./img/flags/Spain.svg";
import Switzerland from "./img/flags/Switzerland.svg";
import UK from "./img/flags/United Kingdom.svg";
import USA from "./img/flags/United States of America.svg";
import Uruguay from "./img/flags/Uruguay.svg";

const flags = {
	"Argentina": Argentina,
	"Belgium": Belgium,
	"Canada": Canada,
	"Finland": Finland,
	"France": France,
	"Italy": Italy,
	"Germany": Germany,
	"Netherlands": Netherlands,
	"New Zealand": NewZealand,
	"Slovakia": Slovakia,
	"Spain": Spain,
	"Switzerland": Switzerland,
	"United Kingdom": UK,
	"United States of America": USA,
	"Uruguay": Uruguay,
}

const FlagBox = styled.div`
	border-radius: 5px;
	display: inline-block;
	margin: 5px;
	&.selected {
		margin: 2px;
		border: #ef66b0 3px solid;
	}
	&.clickable {
		cursor: pointer;
	}
`;

const Flag = styled.img`
	/*width: 64px;
	height: 48px;*/
	margin: 4px 4px 1px 4px;
	border-radius: 5px;
	border: 0px;
`;

class FlagContainer extends Component {
	constructor() {
		super();
		this.countries = Object.keys(flags);
	}

	render() {
		return (
			<FlagBox className={classNames({ selected: this.props.selected, clickable: this.props.onClick })} onClick={this.props.onClick}>
				<Flag src={flags[this.props.country]} style={{width: this.props.width || 64, height: this.props.height || 48}}></Flag>
			</FlagBox>
		);
	}
}

FlagContainer.propTypes = {
	country: PropTypes.string.isRequired,
	selected: PropTypes.bool.isRequired,
	onClick: PropTypes.func,
	height: PropTypes.number,
	width: PropTypes.number
};

export default FlagContainer;

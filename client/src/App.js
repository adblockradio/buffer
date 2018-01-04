// Copyright (c) 2017 Alexandre Storelli
// This file is licensed under the Affero General Public License version 3 or later.
// See the LICENSE file.

import React, { Component } from 'react';
import './App.css';

const HOST = "http://localhost:9820";

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			configLoaded: false,
			config: [],
		}
	}

	load(path, callback) {
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState === 4 && xhttp.status === 200) {
				callback(xhttp.responseText); //, xhttp.getResponseHeader("Content-Type"));
			}
		};
		xhttp.onerror = function (e) {
			console.log("getHeaders: request failed: " + e);
		};
		xhttp.open("GET", path, true);
		xhttp.send();
	}

	componentDidMount() {
		let self = this;
		self.load(HOST + "/config", function(res) {
			try {
				var config = JSON.parse(res);
				console.log(config);
				self.setState({ config: config });
			} catch(e) {
				console.log("problem parsing JSON from server: " + e.message);
			}
			self.setState({ configLoaded: true });
		});
	}

	render() {
		let config = this.state.config;
		let mainComponent;
		if (!this.state.configLoaded) {
			mainComponent = (
				<div>
					<div className="RadioItem">
						<p>Loading…</p>
					</div>
				</div>
			);
		} else if (config.radios.length === 0) {
			mainComponent = (
				<div className="RadioItem">
					<p>No radios, please add some in config/radios.json and restart server</p>
				</div>
			);
		} else {
			mainComponent = (
				<div className="RadioList">
					{config.radios.map(function(radio, i) {
						return (
							<div className="RadioItem" key={"radio" + i}>
								<h1 className="App-title">{radio.country + " - " + radio.name}</h1>
								<div className="App-intro">
									{/*<p>Artist: {metadata.data.artist}</p>
									<p>Title: {metadata.data.title}</p>*/}
									{radio.favicon &&
										<p><img src={radio.favicon} className="App-logo" alt="logo" /></p>
									}
								</div>
								<audio src={HOST + "/listen/" + radio.country + "_" + radio.name + "/2018-01-04"} />
							</div>
						)
					})}
				</div>
			);
		}

		return (
			<div>
				{mainComponent}
				<div className="Footer">
					Software released under licence AGPL v3.0. Parsed contents may be protected by copyright
				</div>
			</div>
		);
	}
}

export default App;

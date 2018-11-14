"use strict";

const { log } = require("abr-log")("flag");
const axios = require("axios");
const { config } = require("./config");
const fs = require("fs-extra");

const SERVER_LIST = "https://www.adblockradio.com/api/servers";
const MODEL_PATH = process.cwd() + '/model';
const CHECKSUM_SUFFIX = '.sha256sum';

const flag = async function(data) {
	try {
		const playingRadio = data.playingRadio;
		const cursors = data.cursors;

		const outData = {
			config: config.user,
			radios: []
		}

		if (!config.radios.length) {
			throw new Error("cannot flag when no radios are active");
		}

		for (let i=0; i<config.radios.length; i++) {
			const canonical = config.radios[i].country + "_" + config.radios[i].name;
			const radioObj = {
				country: config.radios[i].country,
				name: config.radios[i].name,
				playing: canonical === playingRadio,
				cursor: cursors[canonical]
			}

			try {
				radioObj.mlsha = "" + await fs.readFile(MODEL_PATH + '/' + canonical + ".keras.tar.gz" + CHECKSUM_SUFFIX);
			} catch (e) {
				log.warn("could not get ML checksum for radio " + canonical + ". err=" + e);
			}
			try {
				radioObj.dbsha = "" + await fs.readFile(MODEL_PATH + '/' + canonical + ".sqlite.tar.gz" + CHECKSUM_SUFFIX);
			} catch (e) {
				log.warn("could not get SQLite checksum for radio " + canonical + ". err=" + e);
			}
			outData.radios.push(radioObj);
		}

		const req = await axios.get(SERVER_LIST);
		let nodes = req.data;
		log.info("found " + nodes.length + " nodes");

		const inode = Math.floor(Math.random()*nodes.length);
		nodes = nodes.slice(inode).concat(nodes.slice(0, inode));

		for (let i=0; i<nodes.length; i++) {
			try {
				await axios.post("https://status." + nodes[i] + "/flag", outData);
				//await axios.post("http://localhost:3066/flag", outData); // for dev only
				log.info("successfully submitted flag to node " + nodes[i]);
				return true;
			} catch (e) {
				log.warn("node " + nodes[i] + " rejected flag. err=" + e);
				continue;
			}
		}

		log.error("all nodes failed. could not submit flag :(");
		return false;
	} catch (e) {
		log.warn("could not submit flag. err=" + e);
		return false;
	}
}

module.exports = flag;
'use strict';

class _Tools {
	constructor() {
		this.loaded = [];
		this.failed = [];
		this.Formats = require("./data/formats-data.js").BattleFormatsData;
		this.Pokedex = require("./data/pokedex.js").BattlePokedex;
		this.Movedex = require("./data/moves.js").BattleMovedex;
		this.Abilities = require("./data/abilities.js").BattleAbilities;
		this.Items = require("./data/items.js").BattleItems;
		this.Words = Object.assign({},
			this.arrayToObject(Object.keys(this.Pokedex).map(p => this.Pokedex[p].species), "Pokémon"),
			this.arrayToObject(Object.keys(this.Movedex).map(p => this.Movedex[p].name), "Pokémon Move"),
			this.arrayToObject(Object.keys(this.Abilities).map(p => this.Abilities[p].name), "Pokémon Ability"),
			this.arrayToObject(Object.keys(this.Items).map(p => this.Items[p].name), "Pokémon Item")
		);
	}
	toTitleCase(str) {
		return str.replace(/\b[a-z]/g, m => m.toUpperCase());
	}
	shuffle(array) {
		let i = array.length;
		while (i) {
			let j = Math.floor(Math.random() * i);
			let t = array[--i];
			array[i] = array[j];
			array[j] = t;
		}
		return array;
	}
	getTimeAgo(time) {
		time = ~~((Date.now() - time) / 1000);
		
		let seconds = time % 60;
		let times = [];
		if (seconds) times.push(seconds + (seconds === 1 ? ' second' : ' seconds'));
		if (time >= 60) {
			time = ~~((time - seconds) / 60);
			let minutes = time % 60;
			if (minutes) times.unshift(minutes + (minutes === 1 ? ' minute' : ' minutes'));
			if (time >= 60) {
				time = ~~((time - minutes) / 60);
				let hours = time % 24;
				if (hours) times.unshift(hours + (hours === 1 ? ' hour' : ' hours'));
				if (time >= 24) {
					time = ~~((time - hours) / 24);
					let days = time % 365;
					if (days) times.unshift(days + (days === 1 ? ' day' : ' days'));
					if (time >= 365) {
						let years = ~~((time - days) / 365);
						if (days) times.unshift(years + (years === 1 ? ' year' : ' years'));
					}
				}
			}
		}
		if (!times.length) return '0 seconds';
		return times.join(', ');
	}
	uncacheTree(root) {
		let uncache = [require.resolve(root)];
		do {
			let newuncache = [];
			for (let i = 0; i < uncache.length; ++i) {
				if (require.cache[uncache[i]]) {
					newuncache.push.apply(
						newuncache,
						require.cache[uncache[i]].children.map(module => module.filename)
					);
					delete require.cache[uncache[i]];
				}
			}
			uncache = newuncache;
		} while (uncache.length > 0);
	}
	arrayToObject(array, value) {
		let obj = {};
		for (let i = 0; i < array.length; i++) {
			obj[array[i]] = value;
		}
		return obj;
	}
	reload() {
		this.uncacheTree("./commands.js");
		try {
			global.Commands = require("./commands.js").commands;
			log("ok", "Reloaded commands.js");
		}
		catch (e) {
			log("error", "Unable to load commands.js");
			return false;
		}
		
		Monitor.games = {};
		fs.readdirSync('./chat-plugins/').forEach(f => {
			try {
				this.uncacheTree("./chat-plugins/" + f);
				
				let plugin = require("./chat-plugins/" + f);
				if (plugin.commands) Object.assign(Commands, plugin.commands);
				if (plugin.game) {
					Monitor.games[plugin.game] = plugin.game;
					if (plugin.aliases) plugin.aliases.forEach(alias => Monitor.games[alias] = plugin.game);
				}
				
				this.loaded.push(f);
			}
			catch (e) {
				this.failed.push(f);
				console.log(e.stack);
			}
		});
		if (this.loaded.length) {
			log("info", "Loaded command files: " + this.loaded.join(", "));
		}
		if (this.failed.length) {
			log("error", "Failed to load: " + this.failed.join(", "));
			return false;
		}
		return true;
	}
	matchText(str1, str2) {
		if (!str1 || !str2) return 0;
		let length = str1.length > str2.length ? str1.length : str2.length;
		let match = this.matchStrings(str1.toLowerCase(), str2.toLowerCase()) * 100;
		return match / length;
	}
	matchStrings(first, second) {
		// Calculates the similarity between two strings  
		// taken from: http://phpjs.org/functions/similar_text

		if (first === null || second === null || typeof first === 'undefined' || typeof second === 'undefined') {
			return 0;
		}

		first += '';
		second += '';

		let pos1 = 0,
		pos2 = 0,
		max = 0,
		firstLength = first.length,
		secondLength = second.length,
		p, q, l, sum;

		max = 0;

		for (p = 0; p < firstLength; p++) {
			for (q = 0; q < secondLength; q++) {
				for (l = 0;
					(p + l < firstLength) && (q + l < secondLength) && (first.charAt(p + l) === second.charAt(q + l)); l++);
				if (l > max) {
					max = l;
					pos1 = p;
					pos2 = q;
				}
			}
		}

		sum = max;

		if (sum) {
			if (pos1 && pos2) {
				sum += this.matchStrings(first.substr(0, pos2), second.substr(0, pos2));
			}

			if ((pos1 + max < firstLength) && (pos2 + max < secondLength)) {
				sum += this.matchStrings(first.substr(pos1 + max, firstLength - pos1 - max), second.substr(pos2 + max, secondLength - pos2 - max));
			}
		}
		return sum;
	}
	regexify(string) {
		if (!string) return "";
		return string.split("").map(l => (/[a-zA-Z0-9\s]/i.test(l) ? l : "\\" + l)).join("");
	}
	uploadToHastebin(toUpload, callback) {
		if (typeof callback !== 'function') return false;
		let reqOpts = {
			hostname: 'hastebin.com',
			method: 'POST',
			path: '/documents'
		};

		let req = require('https').request(reqOpts, res => {
			res.on('data', chunk => {
				// CloudFlare can go to hell for sending the body in a header request like this
				let filename;
				try {
					filename = JSON.parse(chunk).key;
				}
				catch (e) {
					if (typeof chunk === 'string' && /^[^\<]*\<!DOCTYPE html\>/.test(chunk)) {
						callback('Cloudflare-related error uploading to Hastebin: ' + e.message);
					}
					else {
						callback('Unknown error uploading to Hastebin: ' + e.message);
					}
				}
				callback('http://hastebin.com/raw/' + filename);
			});
		});
		req.on('error', e => {
			callback('Error uploading to Hastebin: ' + e.message);
			//throw e;
		});
		req.write(toUpload);
		req.end();
	}
}

exports.Tools = new _Tools();
/*globals log Commands Monitor fs*/

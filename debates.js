'use strict';

class Debates {
	constructor(room) {
		this.room = room;
		this.users = {};
		this.userList = [];
		this.gameId = "game";
		this.gameName = "Game";
		this.allowJoins = false;
		this.official = false;
		this.state = null;
		this.answerCommand = "standard";
		this.allowRenames = true;

		this.playerType = null;
	}

	onRename(oldId, newName) {
		if (!this.allowRenames) return false;
		if (!this.userList.includes(oldId)) return false;
		let newId = toId(newName);
		if (newId !== oldId) {
			this.users[newId] = this.users[oldId];
			delete this.users[oldId];
			this.userList.splice(this.userList.indexOf(oldId), 1, newId);
		}
		this.users[newId].rename(newName);
		if (this.currentPlayer && this.currentPlayer === oldId) this.currentPlayer = newId;
	}

	sendRoom(message) {
		this.room.post(`${Users.get(Monitor.username).hasRank(this.room, "%") ? "/wall " : ""}${message}`);
	}

	onJoin(user) {
		if (!this.allowJoins) return;
		this.users[user.userid] = this.playerObject ? new this.playerObject(user, this) : new botGamePlayer(user, this);
		this.userList.push(user.userid);
	}

	onLeave(user) {
		delete this.users[user.userid];
		this.userList.splice(this.userList.indexOf(user.userid), 1);
		return true;
	}

	buildPlayerList() {
		return {count: this.userList.length, players: this.userList.sort().map(u => this.users[u].name).join(", ")};
	}

	postPlayerList() {
		this.list = this.buildPlayerList();
		this.sendRoom(`Players (${this.list.count}): ${this.list.players}`);
	}

	onEnd() {
		this.destroy();
	}

	destroy() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		if (this.autoStartTimer) {
			clearTimeout(this.autoStartTimer);
			this.autoStartTimer = null;
		}
		delete this.room.game;
	}

	runAutoStart(seconds) {
		if (!('onStart' in this) || this.state !== 'signups') return; // the game does not start

		// validate input
		const int = parseInt(seconds);
		if ((!int || int < 0) && seconds !== 'off') return false;

		if (this.autoStartTimer) clearTimeout(this.autoStartTimer);
		if (seconds === 'off') return this.sendRoom('The autostart timer has been turned off.');

		this.autoStartTimer = setTimeout(() => {
			this.onStart(); // we will assume that it will not try to start 2 games at the same time.
		}, seconds * 1000);

		this.sendRoom("The debate will automatically start in " + seconds + " seconds.");
	}
}

class DebatePlayer {
	constructor(user, game) {
		this.name = user.name;
		this.userid = user.userid;
		this.user = user;

		this.game = game;
	}

	rename(name) {
		this.userid = toId(name);
		this.user = Users.get(this.userid);
		this.name = this.user.name;
	}
}

module.exports = {
	debate: Debates,
	player: DebatePlayer,
};

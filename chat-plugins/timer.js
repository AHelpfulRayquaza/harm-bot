'use strict';

class Timer {
	constructor(room, user, durationString) {
		this.timer = null;
		this.room = room;
		this.name = user.name;

		this.run(durationString);
	}

	toTimeString(int) {
		if (!int) return "00";
		if (int < 10) return '0' + int;
		return int;
	}

	run(durationString) {
		const bits = durationString.split(':').reverse();
		const [seconds, minutes, hours] = bits.map(p => {
			const int = parseInt(p);
			return int && int > 0 ? int : 0;
		});

		const duration = (seconds || 0) * 1000 + (minutes || 0) * 60000 + (hours || 0) * 3600000;
		if (!duration) {
			this.send('Invalid duration.');
			this.destroy();
			return;
		}
		this.endTime = Date.now() + duration;

		this.timer = setTimeout(() => {
			this.send(`[${this.name}] Time's up!`);
			this.destroy();
		}, duration);

		// report duration
		this.send(`A timer has been set for: ${this.toTimeString(hours)}:${this.toTimeString(minutes)}:${this.toTimeString(seconds)}`);
	}

	getTimeLeft() {
	let diff = Math.ceil((this.endTime - Date.now()) / 1000);

		const seconds = diff % 60;
		diff = Math.floor(diff / 60);
		const minutes = diff % 60;
		const hours = Math.floor(diff / 60);

		return `[Timer by ${this.name}] Remaining: ${this.toTimeString(hours)}:${this.toTimeString(minutes)}:${this.toTimeString(seconds)}`;
	}

	destroy() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.room.countdown = null;
	}
}
exports.commands = {
	timer: function (target, room, user) {
		if (!room || !user.hasBotRank('host')) return false;
		if (typeof target == 'string' && target.toLowerCase() === 'end') {
			if (!room.countdown) return this.send('There is no timer running in this room.');
			this.send(room.countdown.getTimeLeft() + '. The timer has been ended.');
			room.countdown.destroy();
			return;
		}
		if (room.countdown) return this.send(room.countdown.getTimeLeft());
		if (target <= 0) return this.send('Invalid Duration.');
		room.countdown = new Timer(room, user, target);
	},
};
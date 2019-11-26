// @ts-check
const fs = require("fs");
const path = require("path");
const pj = path.join;

function localPath(dir) {
	return pj(__dirname, "..", dir);
}

const currentYear = new Date().getFullYear();

module.exports = class Reloader {
	constructor(log = false) {
		this.watched = new Map();
		this.syncers = [];
		this.reloadEvent = new (require("events").EventEmitter)();
		this.log = log;
	}
	/**
	 * @param {Array<string>} filenames
	 */
	watch(filenames) {
		for (let filename of filenames) {
			filename = localPath(filename);
			if (!this.watched.has(filename)) {
				if (this.log) console.log(`Watching ${filename}`);
				this.watched.set(filename,
					fs.watchFile(filename, { interval: currentYear }, () => {
						if (this.log) console.log(`Changed ${filename}`);
						this._update(filename);
					})
				);
			}
		}
		return this;
	}
	/**
	 * @param {Array<string>} filenames
	 */
	watchAndLoad(filenames) {
		this.watch(filenames);
		for (const filename of filenames) {
			this._update(localPath(filename));
		}
		return this;
	}
	/**
	 * @param {string} filename
	 * @param {Object} object
	 */
	sync(filename, object) {
		filename = localPath(filename);
		if (!this.watched.has(filename)) console.error(`A file asked to keep an object in sync with ${filename}, but that file is not being watched.`);

		this.syncers.push({ filename, object });
		return this;
	}
	/**
	 * @param {string} filename
	 * @private
	 */
	_update(filename) {
		this.reloadEvent.emit(path.basename(filename));
		const syncers = this.syncers.filter(o => o.filename == filename);
		delete require.cache[require.resolve(filename)];
		const result = require(filename);
		syncers.forEach(syncer => Object.assign(syncer.object, result));
	}
};
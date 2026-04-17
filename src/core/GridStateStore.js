import { cloneValue, deepMerge } from '../utils/object.js';

export class GridStateStore {
	constructor(initialState = {}) {
		this.state = deepMerge({}, initialState);
		this.listeners = new Set();
	}

	getState() {
		return cloneValue(this.state);
	}

	peek() {
		return this.state;
	}

	setState(patch) {
		const previous = this.getState();

		this.state = deepMerge(this.state, patch);

		const current = this.getState();

		this.listeners.forEach((listener) => {
			listener({
				current,
				previous
			});
		});
	}

	replaceState(nextState) {
		const previous = this.getState();

		this.state = cloneValue(nextState);

		const current = this.getState();

		this.listeners.forEach((listener) => {
			listener({
				current,
				previous
			});
		});
	}

	subscribe(listener) {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}
}

export class GridCommandRegistry {
	constructor(grid) {
		this.grid = grid;
		this.commands = new Map();
	}

	register(name, handler) {
		if (!name || typeof handler !== 'function') {
			throw new Error('A command requires a name and a handler function.');
		}

		this.commands.set(name, handler);

		return this;
	}

	remove(name) {
		this.commands.delete(name);
		return this;
	}

	has(name) {
		return this.commands.has(name);
	}

	createContext() {
		return {
			grid: this.grid,
			store: this.grid.store,
			events: this.grid.events,
			commands: this,

			getState: () => {
				return this.grid.getState();
			},

			peekState: () => {
				return this.grid.store.peek();
			},

			setState: (patch) => {
				this.grid.setState(patch);
				return this.grid;
			},

			execute: (commandName, payload) => {
				return this.execute(commandName, payload);
			},

			requestRender: () => {
				this.grid.render();
				return this.grid;
			},

			requestReload: () => {
				return this.grid.reload();
			},

			getOptions: () => {
				return this.grid.options;
			},

			getPluginOptions: (pluginName) => {
				if (!pluginName) {
					return {};
				}

				return this.grid.options.pluginOptions?.[pluginName] || {};
			}
		};
	}

	execute(name, payload) {
		if (!this.commands.has(name)) {
			throw new Error(`Unknown command "${name}".`);
		}

		const handler = this.commands.get(name);

		return handler(this.createContext(), payload);
	}
}

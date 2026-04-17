function mergeColumns(currentColumns, storedColumns) {
	if (!Array.isArray(currentColumns) || !Array.isArray(storedColumns)) {
		return currentColumns;
	}

	const storedMap = new Map();

	storedColumns.forEach((column) => {
		if (column && column.key) {
			storedMap.set(column.key, column);
		}
	});

	return currentColumns.map((column) => {
		if (!storedMap.has(column.key)) {
			return column;
		}

		return {
			...column,
			...storedMap.get(column.key)
		};
	});
}

function buildSerializableState(state, sections) {
	const result = {};

	sections.forEach((section) => {
		if (!(section in state)) {
			return;
		}

		result[section] = state[section];
	});

	return result;
}

function buildRestorePatch(currentState, storedState, sections) {
	const patch = {};

	sections.forEach((section) => {
		if (!(section in storedState)) {
			return;
		}

		if (section === 'columns') {
			patch.columns = mergeColumns(currentState.columns || [], storedState.columns || []);
			return;
		}

		if (section === 'query') {
			patch.query = {
				...(currentState.query || {}),
				...(storedState.query || {})
			};
			return;
		}

		if (section === 'selection') {
			patch.selection = {
				...(currentState.selection || {}),
				...(storedState.selection || {})
			};
			return;
		}

		patch[section] = storedState[section];
	});

	return patch;
}

function resolveStorageKey(context, pluginName, options) {
	if (typeof options.key === 'function') {
		return options.key({
			grid: context.grid,
			context
		});
	}

	if (options.key) {
		return options.key;
	}

	if (context.grid.container.id) {
		return `modulargrid:${pluginName}:${context.grid.container.id}`;
	}

	return `modulargrid:${pluginName}:default`;
}

export function createStorageStatePlugin(config = {}) {
	const {
		name,
		createDefaultAdapter
	} = config;

	if (!name) {
		throw new Error('Storage state plugin factory requires a plugin name.');
	}

	if (typeof createDefaultAdapter !== 'function') {
		throw new Error(`Storage state plugin "${name}" requires createDefaultAdapter.`);
	}

	const commandNames = {
		save: `${name}:saveStoredState`,
		restore: `${name}:restoreStoredState`,
		clear: `${name}:clearStoredState`
	};

	function resolveOptions(context) {
		return {
			adapter: null,
			key: '',
			sections: ['query', 'columns'],
			autoRestore: true,
			...context.getPluginOptions(name)
		};
	}

	function resolveAdapter(context) {
		const options = resolveOptions(context);

		if (options.adapter) {
			return options.adapter;
		}

		return createDefaultAdapter(context, options);
	}

	return {
		name,

		commandNames,

		commands: {
			[commandNames.save](context) {
				const options = resolveOptions(context);
				const adapter = resolveAdapter(context);
				const key = resolveStorageKey(context, name, options);
				const state = context.peekState();
				const serializableState = buildSerializableState(state, options.sections || []);

				adapter.write(key, serializableState);

				context.events.emit('storage:saved', {
					grid: context.grid,
					plugin: name,
					key,
					sections: options.sections || []
				});

				return true;
			},

			[commandNames.restore](context) {
				const options = resolveOptions(context);
				const adapter = resolveAdapter(context);
				const key = resolveStorageKey(context, name, options);
				const storedState = adapter.read(key);

				if (!storedState) {
					return false;
				}

				const currentState = context.peekState();
				const patch = buildRestorePatch(currentState, storedState, options.sections || []);

				context.setState(patch);

				context.events.emit('storage:restored', {
					grid: context.grid,
					plugin: name,
					key,
					sections: options.sections || []
				});

				return true;
			},

			[commandNames.clear](context) {
				const options = resolveOptions(context);
				const adapter = resolveAdapter(context);
				const key = resolveStorageKey(context, name, options);

				adapter.remove(key);

				context.events.emit('storage:cleared', {
					grid: context.grid,
					plugin: name,
					key
				});

				return true;
			}
		},

		install(context) {
			const cleanup = [];
			let persistEnabled = false;

			cleanup.push(
				context.events.on('grid:init', () => {
					const options = resolveOptions(context);

					if (options.autoRestore !== false) {
						context.execute(commandNames.restore);
					}

					persistEnabled = true;
					context.execute(commandNames.save);
				})
			);

			cleanup.push(
				context.events.on('state:changed', () => {
					if (!persistEnabled) {
						return;
					}

					context.execute(commandNames.save);
				})
			);

			context._storageStateCleanup = cleanup;
		},

		destroy(context) {
			const cleanup = context._storageStateCleanup || [];

			cleanup.forEach((unsubscribe) => {
				if (typeof unsubscribe === 'function') {
					unsubscribe();
				}
			});

			context._storageStateCleanup = [];
		}
	};
}

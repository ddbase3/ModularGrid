function resolveOptions(context) {
	return {
		key: '',
		sections: ['query', 'columns'],
		autoRestore: true,
		...context.getPluginOptions('localStorage')
	};
}

function resolveStorageKey(context, options) {
	if (options.key) {
		return options.key;
	}

	if (context.grid.container.id) {
		return `modulargrid:${context.grid.container.id}`;
	}

	return 'modulargrid:default';
}

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

		patch[section] = storedState[section];
	});

	return patch;
}

export const LocalStoragePlugin = {
	name: 'localStorage',

	commands: {
		saveStoredState(context) {
			const options = resolveOptions(context);
			const key = resolveStorageKey(context, options);
			const state = context.peekState();
			const serializableState = buildSerializableState(state, options.sections || []);

			localStorage.setItem(key, JSON.stringify(serializableState));

			return true;
		},

		restoreStoredState(context) {
			const options = resolveOptions(context);
			const key = resolveStorageKey(context, options);
			const raw = localStorage.getItem(key);

			if (!raw) {
				return false;
			}

			try {
				const parsed = JSON.parse(raw);
				const currentState = context.peekState();
				const patch = buildRestorePatch(currentState, parsed, options.sections || []);

				context.setState(patch);
				return true;
			} catch (error) {
				console.warn('Failed to parse stored grid state.', error);
				return false;
			}
		},

		clearStoredState(context) {
			const options = resolveOptions(context);
			const key = resolveStorageKey(context, options);

			localStorage.removeItem(key);

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
					context.execute('restoreStoredState');
				}

				persistEnabled = true;
				context.execute('saveStoredState');
			})
		);

		cleanup.push(
			context.events.on('state:changed', () => {
				if (!persistEnabled) {
					return;
				}

				context.execute('saveStoredState');
			})
		);

		context._localStorageCleanup = cleanup;
	},

	destroy(context) {
		const cleanup = context._localStorageCleanup || [];

		cleanup.forEach((unsubscribe) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		context._localStorageCleanup = [];
	}
};

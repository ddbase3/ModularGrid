function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeState(rawState) {
	const state = isPlainObject(rawState) ? rawState : {};
	const entries = isPlainObject(state.entries) ? state.entries : {};

	return {
		rowId: state.rowId ?? null,
		entries
	};
}

function normalizeEntry(rawEntry) {
	const entry = isPlainObject(rawEntry) ? rawEntry : {};

	return {
		status: entry.status || 'idle',
		payload: entry.payload ?? null,
		error: entry.error ?? null,
		requestId: entry.requestId ?? null,
		version: Number(entry.version) || 0
	};
}

function resolveAsyncDetailOptions(configuredOptions) {
	const configuredAsyncDetail = configuredOptions.asyncDetail;
	const normalizedConfiguredAsyncDetail = isPlainObject(configuredAsyncDetail)
		? configuredAsyncDetail
		: {};
	const load = typeof normalizedConfiguredAsyncDetail.load === 'function'
		? normalizedConfiguredAsyncDetail.load
		: null;

	return {
		enabled: load !== null,
		cache: true,
		load,
		render: null,
		renderLoading: null,
		renderError: null,
		...normalizedConfiguredAsyncDetail,
		load
	};
}

function resolveOptions(context) {
	const configuredOptions = context.getPluginOptions('rowDetail') || {};
	const options = {
		stateKey: 'detailView',
		rowIdKey: 'id',
		level: 1,
		clearOnDataReload: false,
		...configuredOptions
	};

	options.asyncDetail = resolveAsyncDetailOptions(options);

	return options;
}

function resolveRowIdFromPayload(payload, options) {
	if (payload === null || payload === undefined || payload === '') {
		return null;
	}

	if (typeof payload === 'object' && !Array.isArray(payload)) {
		if (payload.rowId !== undefined && payload.rowId !== null && payload.rowId !== '') {
			return payload.rowId;
		}

		if (payload.row && payload.row[options.rowIdKey] !== undefined && payload.row[options.rowIdKey] !== null) {
			return payload.row[options.rowIdKey];
		}
	}

	return payload;
}

function resolveDetailDescriptor(payload, options) {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		return {
			rowId: resolveRowIdFromPayload(payload, options),
			row: payload.row ?? null,
			viewModel: payload.viewModel ?? null,
			level: Number(payload.level) || Number(options.level) || 1
		};
	}

	return {
		rowId: resolveRowIdFromPayload(payload, options),
		row: null,
		viewModel: null,
		level: Number(options.level) || 1
	};
}

function setState(context, stateKey, nextState) {
	context.setState({
		[stateKey]: nextState
	});
}

function updateEntry(entries, rowId, updater) {
	const entryKey = String(rowId);
	const currentEntry = normalizeEntry(entries[entryKey]);
	const nextEntryPatch = updater(currentEntry) || {};

	return {
		...entries,
		[entryKey]: {
			...currentEntry,
			...nextEntryPatch,
			version: currentEntry.version + 1
		}
	};
}

function updateRowDetailEntry(context, stateKey, rowId, updater) {
	if (rowId === null || rowId === undefined || rowId === '') {
		return null;
	}

	const currentState = normalizeState(context.peekState()[stateKey]);
	const nextEntries = updateEntry(currentState.entries, rowId, updater);
	const nextState = {
		...currentState,
		entries: nextEntries
	};

	setState(context, stateKey, nextState);

	return normalizeEntry(nextEntries[String(rowId)]);
}

async function ensureAsyncDetailLoaded(context, options, descriptor) {
	const asyncDetailOptions = options.asyncDetail;
	const stateKey = options.stateKey || 'detailView';
	const rowId = descriptor.rowId;

	if (asyncDetailOptions.enabled !== true || typeof asyncDetailOptions.load !== 'function' || rowId === null) {
		return;
	}

	const currentState = normalizeState(context.peekState()[stateKey]);
	const currentEntry = normalizeEntry(currentState.entries[String(rowId)]);

	if (currentEntry.status === 'loading') {
		return;
	}

	if (asyncDetailOptions.cache !== false && currentEntry.status === 'loaded') {
		return;
	}

	const requestId = `row-detail-${++context._rowDetailLoadSequence}`;

	updateRowDetailEntry(context, stateKey, rowId, () => {
		return {
			status: 'loading',
			payload: null,
			error: null,
			requestId
		};
	});

	context.events.emit('detail:loading', {
		grid: context.grid,
		rowId,
		stateKey,
		level: descriptor.level
	});

	try {
		const payload = await asyncDetailOptions.load({
			...descriptor,
			grid: context.grid,
			context
		});
		const latestState = normalizeState(context.peekState()[stateKey]);
		const latestEntry = normalizeEntry(latestState.entries[String(rowId)]);

		if (latestEntry.requestId !== requestId) {
			return;
		}

		updateRowDetailEntry(context, stateKey, rowId, () => {
			return {
				status: 'loaded',
				payload,
				error: null,
				requestId: null
			};
		});

		context.events.emit('detail:loaded', {
			grid: context.grid,
			rowId,
			stateKey,
			level: descriptor.level,
			payload
		});
	}
	catch (error) {
		const latestState = normalizeState(context.peekState()[stateKey]);
		const latestEntry = normalizeEntry(latestState.entries[String(rowId)]);

		if (latestEntry.requestId !== requestId) {
			return;
		}

		const message = error instanceof Error
			? error.message
			: String(error || 'Failed to load detail.');

		updateRowDetailEntry(context, stateKey, rowId, () => {
			return {
				status: 'error',
				payload: null,
				error: message,
				requestId: null
			};
		});

		context.events.emit('detail:error', {
			grid: context.grid,
			rowId,
			stateKey,
			level: descriptor.level,
			error: message
		});
	}
}

function setActiveDetailRow(context, options, descriptor) {
	const stateKey = options.stateKey || 'detailView';
	const currentState = normalizeState(context.peekState()[stateKey]);
	const nextState = {
		...currentState,
		rowId: descriptor.rowId
	};

	setState(context, stateKey, nextState);

	context.events.emit('detail:changed', {
		grid: context.grid,
		rowId: descriptor.rowId,
		stateKey,
		level: descriptor.level
	});
}

export const RowDetailPlugin = {
	name: 'rowDetail',

	install(context) {
		const options = resolveOptions(context);
		const stateKey = options.stateKey || 'detailView';
		const state = context.peekState();
		const cleanup = [];

		context._rowDetailLoadSequence = 0;

		if (!state[stateKey]) {
			setState(context, stateKey, normalizeState(null));
		}
		else {
			setState(context, stateKey, normalizeState(state[stateKey]));
		}

		if (options.clearOnDataReload === true) {
			cleanup.push(
				context.events.on('data:loading', () => {
					context.execute('clearDetailRow');
				})
			);
		}

		context._rowDetailCleanup = cleanup;
	},

	destroy(context) {
		const cleanup = context._rowDetailCleanup || [];

		cleanup.forEach((unsubscribe) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		context._rowDetailCleanup = [];
	},

	commands: {
		setDetailRow(context, payload = null) {
			const options = resolveOptions(context);
			const descriptor = resolveDetailDescriptor(payload, options);

			setActiveDetailRow(context, options, descriptor);
			ensureAsyncDetailLoaded(context, options, descriptor);

			return context.grid;
		},

		clearDetailRow(context) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';
			const currentState = normalizeState(context.peekState()[stateKey]);
			const nextState = {
				...currentState,
				rowId: null
			};

			setState(context, stateKey, nextState);

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: null,
				stateKey,
				level: Number(options.level) || 1
			});

			return context.grid;
		},

		toggleDetailRow(context, payload = null) {
			const options = resolveOptions(context);
			const descriptor = resolveDetailDescriptor(payload, options);
			const currentState = normalizeState(context.peekState()[options.stateKey]);
			const currentRowId = currentState.rowId ?? null;
			const nextRowId = currentRowId === descriptor.rowId ? null : descriptor.rowId;
			const nextDescriptor = {
				...descriptor,
				rowId: nextRowId
			};

			setActiveDetailRow(context, options, nextDescriptor);

			if (nextRowId !== null) {
				ensureAsyncDetailLoaded(context, options, nextDescriptor);
			}

			return context.grid;
		},

		clearDetailCache(context, payload = null) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';
			const currentState = normalizeState(context.peekState()[stateKey]);

			if (payload === null || payload === undefined || payload === '') {
				setState(context, stateKey, {
					...currentState,
					entries: {}
				});

				return context.grid;
			}

			const rowId = resolveRowIdFromPayload(payload, options);
			const nextEntries = {
				...currentState.entries
			};

			delete nextEntries[String(rowId)];

			setState(context, stateKey, {
				...currentState,
				entries: nextEntries
			});

			return context.grid;
		}
	}
};


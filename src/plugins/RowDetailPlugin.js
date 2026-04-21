function resolveOptions(context) {
	return {
		stateKey: 'detailView',
		clearOnDataReload: false,
		cache: true,
		level: 1,
		parentPath: [],
		asyncDetail: null,
		...context.getPluginOptions('rowDetail')
	};
}

function buildInitialState() {
	return {
		rowId: null,
		entries: {}
	};
}

function cloneEntries(sectionState) {
	if (!sectionState || typeof sectionState.entries !== 'object' || sectionState.entries === null) {
		return {};
	}

	return {
		...sectionState.entries
	};
}

function cloneChildEntries(entry) {
	if (!entry || typeof entry.childEntries !== 'object' || entry.childEntries === null) {
		return {};
	}

	return {
		...entry.childEntries
	};
}

function buildStatePatch(stateKey, sectionState, patch = {}) {
	return {
		[stateKey]: {
			...buildInitialState(),
			...(sectionState || {}),
			...patch
		}
	};
}

function buildEntryPatch(stateKey, sectionState, rowId, entryPatch) {
	const entries = cloneEntries(sectionState);
	const entryKey = String(rowId);
	const previousEntry = entries[entryKey] && typeof entries[entryKey] === 'object'
		? entries[entryKey]
		: {};

	entries[entryKey] = {
		...previousEntry,
		...entryPatch
	};

	return buildStatePatch(stateKey, sectionState, {
		entries
	});
}

function buildChildEntryKey(parentPath) {
	if (!Array.isArray(parentPath) || parentPath.length === 0) {
		return '';
	}

	return parentPath.map((part) => String(part)).join('>');
}

function buildChildEntryPatch(stateKey, sectionState, rowId, parentPath, childEntryPatch) {
	const childEntryKey = buildChildEntryKey(parentPath);

	if (!childEntryKey) {
		return buildStatePatch(stateKey, sectionState);
	}

	const entries = cloneEntries(sectionState);
	const entryKey = String(rowId);
	const previousEntry = entries[entryKey] && typeof entries[entryKey] === 'object'
		? entries[entryKey]
		: {};
	const childEntries = cloneChildEntries(previousEntry);
	const previousChildEntry = childEntries[childEntryKey] && typeof childEntries[childEntryKey] === 'object'
		? childEntries[childEntryKey]
		: {};

	childEntries[childEntryKey] = {
		...previousChildEntry,
		...childEntryPatch
	};

	entries[entryKey] = {
		...previousEntry,
		childEntries
	};

	return buildStatePatch(stateKey, sectionState, {
		entries
	});
}

function buildClearedStatePatch(stateKey, sectionState, clearEntries = false) {
	return buildStatePatch(stateKey, sectionState, {
		rowId: null,
		entries: clearEntries ? {} : cloneEntries(sectionState)
	});
}

function normalizeErrorMessage(error) {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error.trim()) {
		return error.trim();
	}

	return 'Failed to load detail.';
}

function findRowById(context, rowId, rowIdKey) {
	const state = context.peekState();
	const rows = state?.data?.rows;

	if (!Array.isArray(rows)) {
		return null;
	}

	return rows.find((row) => {
		if (!row || typeof row !== 'object') {
			return false;
		}

		return row[rowIdKey] === rowId;
	}) || null;
}

function normalizePayload(payload, options, context) {
	if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
		const row = payload.row && typeof payload.row === 'object'
			? payload.row
			: null;
		const rowId = payload.rowId ?? payload.id ?? (row ? row[options.rowIdKey || 'id'] : null);

		return {
			rowId,
			row: row || (rowId !== null && rowId !== undefined ? findRowById(context, rowId, options.rowIdKey || 'id') : null),
			level: Number(payload.level) || Number(options.level) || 1,
			parentPath: Array.isArray(payload.parentPath) ? payload.parentPath : (Array.isArray(options.parentPath) ? options.parentPath : [])
		};
	}

	const rowId = payload ?? null;

	return {
		rowId,
		row: rowId !== null && rowId !== undefined ? findRowById(context, rowId, options.rowIdKey || 'id') : null,
		level: Number(options.level) || 1,
		parentPath: Array.isArray(options.parentPath) ? options.parentPath : []
	};
}

function normalizeChildPayload(payload, options, context) {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return {
			rowId: null,
			row: null,
			child: null,
			childId: null,
			level: Number(options.level) || 1,
			parentPath: Array.isArray(options.parentPath) ? options.parentPath : []
		};
	}

	const rowId = payload.rowId ?? payload.id ?? null;
	const row = payload.row && typeof payload.row === 'object'
		? payload.row
		: rowId !== null && rowId !== undefined
			? findRowById(context, rowId, options.rowIdKey || 'id')
			: null;
	const child = payload.child && typeof payload.child === 'object'
		? payload.child
		: null;
	const parentPath = Array.isArray(payload.parentPath)
		? payload.parentPath
		: [];
	const childId = payload.childId ?? (parentPath.length > 0 ? parentPath[parentPath.length - 1] : null);

	return {
		rowId,
		row,
		child,
		childId,
		level: Number(payload.level) || Number(options.level) || 1,
		parentPath
	};
}

async function loadAsyncDetail(context, options, payloadInfo) {
	const asyncDetail = options.asyncDetail;

	if (!asyncDetail || typeof asyncDetail.load !== 'function') {
		return;
	}

	const rowId = payloadInfo.rowId;

	if (rowId === null || rowId === undefined) {
		return;
	}

	const stateKey = options.stateKey || 'detailView';
	const sectionState = context.peekState()[stateKey] || buildInitialState();
	const entryKey = String(rowId);
	const existingEntry = sectionState.entries?.[entryKey] || null;

	if (options.cache !== false && existingEntry?.status === 'loaded') {
		return;
	}

	context.setState(
		buildEntryPatch(stateKey, sectionState, rowId, {
			status: 'loading',
			payload: existingEntry?.payload ?? null,
			error: null,
			level: payloadInfo.level,
			parentPath: payloadInfo.parentPath
		})
	);

	context.events.emit('detail:loading', {
		grid: context.grid,
		rowId,
		row: payloadInfo.row,
		stateKey
	});

	try {
		const payload = await asyncDetail.load({
			row: payloadInfo.row,
			rowId,
			grid: context.grid,
			level: payloadInfo.level,
			parentPath: payloadInfo.parentPath
		});

		const nextSectionState = context.peekState()[stateKey] || buildInitialState();

		context.setState(
			buildEntryPatch(stateKey, nextSectionState, rowId, {
				status: 'loaded',
				payload: payload ?? null,
				error: null,
				level: payloadInfo.level,
				parentPath: payloadInfo.parentPath
			})
		);

		context.events.emit('detail:loaded', {
			grid: context.grid,
			rowId,
			row: payloadInfo.row,
			payload: payload ?? null,
			stateKey
		});
	}
	catch (error) {
		const nextSectionState = context.peekState()[stateKey] || buildInitialState();

		context.setState(
			buildEntryPatch(stateKey, nextSectionState, rowId, {
				status: 'error',
				payload: null,
				error: normalizeErrorMessage(error),
				level: payloadInfo.level,
				parentPath: payloadInfo.parentPath
			})
		);

		context.events.emit('detail:error', {
			grid: context.grid,
			rowId,
			row: payloadInfo.row,
			error: normalizeErrorMessage(error),
			stateKey
		});
	}
}

async function loadAsyncChildDetail(context, options, payloadInfo) {
	const asyncDetail = options.asyncDetail;

	if (!asyncDetail || typeof asyncDetail.loadChildDetail !== 'function') {
		return;
	}

	const rowId = payloadInfo.rowId;
	const childPath = payloadInfo.parentPath;
	const childEntryKey = buildChildEntryKey(childPath);

	if (rowId === null || rowId === undefined || !childEntryKey) {
		return;
	}

	const stateKey = options.stateKey || 'detailView';
	const sectionState = context.peekState()[stateKey] || buildInitialState();
	const existingEntry = sectionState.entries?.[String(rowId)] || null;
	const existingChildEntry = existingEntry?.childEntries?.[childEntryKey] || null;

	if (options.cache !== false && existingChildEntry?.status === 'loaded') {
		return;
	}

	context.setState(
		buildChildEntryPatch(stateKey, sectionState, rowId, childPath, {
			expanded: true,
			status: 'loading',
			payload: existingChildEntry?.payload ?? null,
			error: null,
			level: payloadInfo.level,
			parentPath: childPath,
			childId: payloadInfo.childId
		})
	);

	context.events.emit('detail:child:loading', {
		grid: context.grid,
		rowId,
		row: payloadInfo.row,
		child: payloadInfo.child,
		childId: payloadInfo.childId,
		parentPath: childPath,
		stateKey
	});

	try {
		const payload = await asyncDetail.loadChildDetail({
			row: payloadInfo.row,
			rowId,
			child: payloadInfo.child,
			childId: payloadInfo.childId,
			grid: context.grid,
			level: payloadInfo.level,
			parentPath: childPath
		});

		const nextSectionState = context.peekState()[stateKey] || buildInitialState();

		context.setState(
			buildChildEntryPatch(stateKey, nextSectionState, rowId, childPath, {
				expanded: true,
				status: 'loaded',
				payload: payload ?? null,
				error: null,
				level: payloadInfo.level,
				parentPath: childPath,
				childId: payloadInfo.childId
			})
		);

		context.events.emit('detail:child:loaded', {
			grid: context.grid,
			rowId,
			row: payloadInfo.row,
			child: payloadInfo.child,
			childId: payloadInfo.childId,
			parentPath: childPath,
			payload: payload ?? null,
			stateKey
		});
	}
	catch (error) {
		const nextSectionState = context.peekState()[stateKey] || buildInitialState();

		context.setState(
			buildChildEntryPatch(stateKey, nextSectionState, rowId, childPath, {
				expanded: true,
				status: 'error',
				payload: null,
				error: normalizeErrorMessage(error),
				level: payloadInfo.level,
				parentPath: childPath,
				childId: payloadInfo.childId
			})
		);

		context.events.emit('detail:child:error', {
			grid: context.grid,
			rowId,
			row: payloadInfo.row,
			child: payloadInfo.child,
			childId: payloadInfo.childId,
			parentPath: childPath,
			error: normalizeErrorMessage(error),
			stateKey
		});
	}
}

export const RowDetailPlugin = {
	name: 'rowDetail',

	install(context) {
		const options = resolveOptions(context);
		const stateKey = options.stateKey || 'detailView';
		const state = context.peekState();
		const cleanup = [];

		if (!state[stateKey]) {
			context.setState(buildStatePatch(stateKey, null));
		}

		if (options.clearOnDataReload === true) {
			cleanup.push(
				context.events.on('data:loading', () => {
					const currentState = context.peekState()[stateKey] || buildInitialState();
					const shouldClearEntries = options.cache === false;

					context.setState(
						buildClearedStatePatch(stateKey, currentState, shouldClearEntries)
					);

					context.events.emit('detail:changed', {
						grid: context.grid,
						rowId: null,
						stateKey
					});
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
			const stateKey = options.stateKey || 'detailView';
			const normalizedPayload = normalizePayload(payload, options, context);
			const sectionState = context.peekState()[stateKey] || buildInitialState();

			context.setState(
				buildStatePatch(stateKey, sectionState, {
					rowId: normalizedPayload.rowId
				})
			);

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: normalizedPayload.rowId,
				stateKey
			});

			if (normalizedPayload.rowId !== null && normalizedPayload.rowId !== undefined) {
				void loadAsyncDetail(context, options, normalizedPayload);
			}

			return context.grid;
		},

		clearDetailRow(context) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';
			const sectionState = context.peekState()[stateKey] || buildInitialState();

			context.setState(
				buildStatePatch(stateKey, sectionState, {
					rowId: null
				})
			);

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: null,
				stateKey
			});

			return context.grid;
		},

		toggleDetailRow(context, payload = null) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';
			const normalizedPayload = normalizePayload(payload, options, context);
			const sectionState = context.peekState()[stateKey] || buildInitialState();
			const currentRowId = sectionState?.rowId ?? null;
			const nextRowId = currentRowId === normalizedPayload.rowId ? null : normalizedPayload.rowId;

			context.setState(
				buildStatePatch(stateKey, sectionState, {
					rowId: nextRowId
				})
			);

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: nextRowId,
				stateKey
			});

			if (nextRowId !== null && nextRowId !== undefined) {
				void loadAsyncDetail(context, options, normalizedPayload);
			}

			return context.grid;
		},

		toggleDetailChild(context, payload = null) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';
			const normalizedPayload = normalizeChildPayload(payload, options, context);
			const sectionState = context.peekState()[stateKey] || buildInitialState();
			const entry = sectionState.entries?.[String(normalizedPayload.rowId)] || null;
			const childEntryKey = buildChildEntryKey(normalizedPayload.parentPath);
			const currentChildEntry = childEntryKey && entry?.childEntries
				? entry.childEntries[childEntryKey] || null
				: null;
			const nextExpanded = currentChildEntry?.expanded === true ? false : true;

			if (normalizedPayload.rowId === null || normalizedPayload.rowId === undefined || !childEntryKey) {
				return context.grid;
			}

			context.setState(
				buildChildEntryPatch(stateKey, sectionState, normalizedPayload.rowId, normalizedPayload.parentPath, {
					expanded: nextExpanded,
					status: currentChildEntry?.status || 'idle',
					payload: currentChildEntry?.payload ?? null,
					error: currentChildEntry?.error ?? null,
					level: normalizedPayload.level,
					parentPath: normalizedPayload.parentPath,
					childId: normalizedPayload.childId
				})
			);

			context.events.emit('detail:child:changed', {
				grid: context.grid,
				rowId: normalizedPayload.rowId,
				row: normalizedPayload.row,
				child: normalizedPayload.child,
				childId: normalizedPayload.childId,
				parentPath: normalizedPayload.parentPath,
				expanded: nextExpanded,
				stateKey
			});

			if (nextExpanded === true) {
				void loadAsyncChildDetail(context, options, normalizedPayload);
			}

			return context.grid;
		}
	}
};


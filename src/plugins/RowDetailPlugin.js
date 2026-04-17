function resolveOptions(context) {
	return {
		stateKey: 'detailView',
		clearOnDataReload: false,
		...context.getPluginOptions('rowDetail')
	};
}

function buildStatePatch(stateKey, rowId) {
	return {
		[stateKey]: {
			rowId
		}
	};
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
			const stateKey = options.stateKey || 'detailView';

			context.setState(buildStatePatch(stateKey, payload));

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: payload,
				stateKey
			});

			return context.grid;
		},

		clearDetailRow(context) {
			const options = resolveOptions(context);
			const stateKey = options.stateKey || 'detailView';

			context.setState(buildStatePatch(stateKey, null));

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
			const currentRowId = context.peekState()[stateKey]?.rowId ?? null;
			const nextRowId = currentRowId === payload ? null : payload;

			context.setState(buildStatePatch(stateKey, nextRowId));

			context.events.emit('detail:changed', {
				grid: context.grid,
				rowId: nextRowId,
				stateKey
			});

			return context.grid;
		}
	}
};

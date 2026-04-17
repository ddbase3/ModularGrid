function resolveOptions(context) {
	return {
		zone: 'actions',
		order: 5,
		rowIdKey: 'id',
		showSelectedCount: true,
		selectedLabel: 'Selected',
		emptyText: 'No selection',
		items: [],
		...context.getPluginOptions('bulkActions')
	};
}

function getSelectionState(context) {
	const state = context.peekState();

	if (!state.selection) {
		return {
			selectedRowIds: []
		};
	}

	return {
		selectedRowIds: Array.isArray(state.selection.selectedRowIds) ? state.selection.selectedRowIds : []
	};
}

function getLoadedRows(context) {
	return Array.isArray(context.peekState().data?.rows) ? context.peekState().data.rows : [];
}

function getSelectedRows(context, options) {
	const selectedRowIds = getSelectionState(context).selectedRowIds;
	const selectedIdSet = new Set(selectedRowIds);

	return getLoadedRows(context).filter((row) => {
		return selectedIdSet.has(row?.[options.rowIdKey]);
	});
}

function buildActionContext(context, action, options) {
	const selectedRowIds = getSelectionState(context).selectedRowIds;
	const selectedRows = getSelectedRows(context, options);

	return {
		grid: context.grid,
		context,
		action,
		selectedRowIds,
		selectedRows
	};
}

function resolveItems(context, options) {
	const source = typeof options.items === 'function'
		? options.items({
			grid: context.grid,
			context,
			selectedRowIds: getSelectionState(context).selectedRowIds,
			selectedRows: getSelectedRows(context, options)
		})
		: options.items;

	if (!Array.isArray(source)) {
		return [];
	}

	return source
		.map((item) => {
			if (!item || typeof item !== 'object') {
				return null;
			}

			const actionContext = buildActionContext(context, item, options);

			if (typeof item.isVisible === 'function' && item.isVisible(actionContext) === false) {
				return null;
			}

			if (item.visible === false) {
				return null;
			}

			const disabled = typeof item.isDisabled === 'function'
				? item.isDisabled(actionContext) === true
				: item.disabled === true;

			return {
				...item,
				key: item.key || item.label || 'bulk-action',
				label: item.label || item.key || 'Action',
				disabled
			};
		})
		.filter(Boolean);
}

export const BulkActionsPlugin = {
	name: 'bulkActions',

	commands: {
		runBulkAction(context, payload = {}) {
			const options = resolveOptions(context);
			const action = payload.action;

			if (!action) {
				return context.grid;
			}

			const actionContext = buildActionContext(context, action, options);

			if (typeof action.onClick === 'function') {
				action.onClick(actionContext);
			}

			if (typeof action.command === 'string') {
				context.execute(action.command, {
					action,
					selectedRowIds: actionContext.selectedRowIds,
					selectedRows: actionContext.selectedRows
				});
			}

			context.events.emit('bulkAction:run', {
				grid: context.grid,
				action,
				selectedRowIds: actionContext.selectedRowIds,
				selectedRows: actionContext.selectedRows
			});

			return context.grid;
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					const selectedRowIds = getSelectionState(context).selectedRowIds;
					const selectedRows = getSelectedRows(context, options);
					const items = resolveItems(context, options);

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-bulk-actions';

					if (options.showSelectedCount !== false) {
						const label = document.createElement('span');
						label.className = 'mg-bulk-actions-label';

						if (selectedRowIds.length === 0) {
							label.textContent = options.emptyText;
						}
						else {
							label.textContent = `${options.selectedLabel}: ${selectedRowIds.length}`;
						}

						wrapper.appendChild(label);
					}

					items.forEach((action) => {
						const button = document.createElement('button');
						button.type = 'button';
						button.className = 'mg-button mg-bulk-action-button';
						button.textContent = action.label;
						button.disabled = action.disabled === true || selectedRows.length === 0;

						button.addEventListener('click', () => {
							context.execute('runBulkAction', {
								action
							});
						});

						wrapper.appendChild(button);
					});

					return wrapper;
				}
			}
		];
	}
};

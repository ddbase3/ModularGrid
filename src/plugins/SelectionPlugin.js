function resolveOptions(context) {
	return {
		rowIdKey: 'id',
		columnKey: '__mg_selection__',
		position: 'start',
		columnOrder: 5,
		columnWidth: 44,
		zone: 'actions',
		zoneOrder: 5,
		showSummary: true,
		selectPageLabel: 'Select page',
		clearLabel: 'Clear',
		selectedLabel: 'Selected',
		...context.getPluginOptions('selection')
	};
}

function buildUniqueIds(values) {
	const seen = new Set();
	const result = [];

	values.forEach((value) => {
		if (value === null || value === undefined) {
			return;
		}

		const signature = `${typeof value}:${String(value)}`;

		if (seen.has(signature)) {
			return;
		}

		seen.add(signature);
		result.push(value);
	});

	return result;
}

function getSelectionState(context) {
	const state = context.peekState();

	if (!state.selection) {
		return {
			enabled: true,
			selectedRowIds: []
		};
	}

	return {
		enabled: state.selection.enabled !== false,
		selectedRowIds: Array.isArray(state.selection.selectedRowIds) ? state.selection.selectedRowIds : []
	};
}

function getRowId(row, options) {
	if (!row || typeof row !== 'object') {
		return null;
	}

	const value = row[options.rowIdKey];

	if (value === null || value === undefined) {
		return null;
	}

	return value;
}

function getSelectedRowIds(context) {
	return getSelectionState(context).selectedRowIds;
}

function setSelectedRowIds(context, ids) {
	const nextIds = buildUniqueIds(ids);

	context.setState({
		selection: {
			enabled: true,
			selectedRowIds: nextIds
		}
	});

	context.events.emit('selection:changed', {
		grid: context.grid,
		selectedRowIds: nextIds
	});

	return context.grid;
}

function isRowSelected(context, row, options) {
	const rowId = getRowId(row, options);

	if (rowId === null) {
		return false;
	}

	return getSelectedRowIds(context).some((selectedId) => selectedId === rowId);
}

function createHeaderCheckbox(grid, context, options) {
	const prepared = grid.getPreparedRows();
	const visibleRows = prepared.rows;
	const visibleIds = visibleRows
		.map((row) => getRowId(row, options))
		.filter((value) => value !== null);

	const selectedIds = getSelectedRowIds(context);
	const selectedVisibleCount = visibleIds.filter((id) => selectedIds.some((selectedId) => selectedId === id)).length;
	const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
	const someSelected = selectedVisibleCount > 0 && !allSelected;

	const wrapper = document.createElement('label');
	wrapper.className = 'mg-selection-toggle';

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = allSelected;
	input.indeterminate = someSelected;

	input.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	input.addEventListener('change', () => {
		if (input.checked) {
			context.execute('selectVisibleRows');
			return;
		}

		context.execute('clearVisibleSelection');
	});

	wrapper.appendChild(input);

	return wrapper;
}

function createRowCheckbox(row, context, options) {
	const wrapper = document.createElement('label');
	wrapper.className = 'mg-selection-toggle';

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = isRowSelected(context, row, options);

	input.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	input.addEventListener('change', (event) => {
		event.stopPropagation();

		context.execute('toggleRowSelection', {
			row
		});
	});

	wrapper.appendChild(input);

	return wrapper;
}

export const SelectionPlugin = {
	name: 'selection',

	install(context) {
		const state = context.peekState();

		if (!state.selection) {
			context.setState({
				selection: {
					enabled: true,
					selectedRowIds: []
				}
			});
		}
	},

	commands: {
		setSelectedRowIds(context, payload = []) {
			return setSelectedRowIds(context, Array.isArray(payload) ? payload : []);
		},

		clearSelection(context) {
			return setSelectedRowIds(context, []);
		},

		toggleRowSelection(context, payload = {}) {
			const options = resolveOptions(context);
			const rowId = getRowId(payload.row, options);

			if (rowId === null) {
				return context.grid;
			}

			const selectedIds = getSelectedRowIds(context);
			const exists = selectedIds.some((selectedId) => selectedId === rowId);

			if (exists) {
				return setSelectedRowIds(
					context,
					selectedIds.filter((selectedId) => selectedId !== rowId)
				);
			}

			return setSelectedRowIds(context, [...selectedIds, rowId]);
		},

		selectVisibleRows(context) {
			const options = resolveOptions(context);
			const visibleRows = context.grid.getPreparedRows().rows;
			const visibleIds = visibleRows
				.map((row) => getRowId(row, options))
				.filter((value) => value !== null);

			return setSelectedRowIds(context, [...getSelectedRowIds(context), ...visibleIds]);
		},

		clearVisibleSelection(context) {
			const options = resolveOptions(context);
			const visibleRows = context.grid.getPreparedRows().rows;
			const visibleIds = visibleRows
				.map((row) => getRowId(row, options))
				.filter((value) => value !== null);

			return setSelectedRowIds(
				context,
				getSelectedRowIds(context).filter((selectedId) => {
					return !visibleIds.some((visibleId) => visibleId === selectedId);
				})
			);
		}
	},

	columnContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				position: options.position,
				order: options.columnOrder,
				column: {
					key: options.columnKey,
					label: '',
					sortable: false,
					visible: true,
					width: options.columnWidth,
					headerRender: (column, grid) => {
						return createHeaderCheckbox(grid, context, options);
					},
					render: (value, row) => {
						return createRowCheckbox(row, context, options);
					}
				}
			}
		];
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.zoneOrder,
				render() {
					if (options.showSummary === false) {
						return null;
					}

					const selectedIds = getSelectedRowIds(context);
					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-selection-summary';

					const label = document.createElement('span');
					label.className = 'mg-selection-label';
					label.textContent = `${options.selectedLabel}: ${selectedIds.length}`;

					const selectPageButton = document.createElement('button');
					selectPageButton.type = 'button';
					selectPageButton.className = 'mg-button';
					selectPageButton.textContent = options.selectPageLabel;

					selectPageButton.addEventListener('click', () => {
						context.execute('selectVisibleRows');
					});

					const clearButton = document.createElement('button');
					clearButton.type = 'button';
					clearButton.className = 'mg-button';
					clearButton.textContent = options.clearLabel;
					clearButton.disabled = selectedIds.length === 0;

					clearButton.addEventListener('click', () => {
						context.execute('clearSelection');
					});

					wrapper.appendChild(label);
					wrapper.appendChild(selectPageButton);
					wrapper.appendChild(clearButton);

					return wrapper;
				}
			}
		];
	}
};

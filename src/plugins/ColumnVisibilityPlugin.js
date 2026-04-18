import { normalizeColumnPinning } from '../utils/columnPinning.js';

function resolveOptions(context) {
	return {
		zone: 'actions',
		order: 20,
		buttonLabel: 'Columns',
		showShowAllButton: true,
		showHideAllButton: true,
		showResetButton: false,
		resetLabel: 'Reset',
		showAllLabel: 'Show all',
		hideAllLabel: 'Hide all',
		...context.getPluginOptions('columnVisibility')
	};
}

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

function updateColumns(context, updater) {
	const columns = context.peekState().columns || [];
	const nextColumns = normalizeColumnPinning(
		columns.map((column) => {
			return updater({
				...column
			});
		})
	);

	context.setState({
		columns: nextColumns
	});

	return context.grid;
}

function renderColumnMenu(context, options) {
	const state = context.peekState();
	const columns = (state.columns || []).filter((column) => !isUtilityColumn(column));

	if (columns.length === 0) {
		return null;
	}

	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-column-visibility';

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary';
	summary.textContent = options.buttonLabel;

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu';

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list';

	columns.forEach((column) => {
		const row = document.createElement('label');
		row.className = 'mg-checkbox-row';

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = column.visible !== false;

		input.addEventListener('change', () => {
			context.execute('toggleColumnVisibility', {
				key: column.key
			});
		});

		const text = document.createElement('span');
		text.textContent = column.label || column.key;

		row.appendChild(input);
		row.appendChild(text);
		list.appendChild(row);
	});

	menu.appendChild(list);

	if (options.showShowAllButton || options.showHideAllButton || options.showResetButton) {
		const actions = document.createElement('div');
		actions.className = 'mg-inline-buttons mg-column-visibility-actions';

		if (options.showShowAllButton) {
			const showAllButton = document.createElement('button');
			showAllButton.type = 'button';
			showAllButton.className = 'mg-button';
			showAllButton.textContent = options.showAllLabel;

			showAllButton.addEventListener('click', () => {
				context.execute('showAllColumns');
			});

			actions.appendChild(showAllButton);
		}

		if (options.showHideAllButton) {
			const hideAllButton = document.createElement('button');
			hideAllButton.type = 'button';
			hideAllButton.className = 'mg-button';
			hideAllButton.textContent = options.hideAllLabel;

			hideAllButton.addEventListener('click', () => {
				context.execute('hideAllColumns');
			});

			actions.appendChild(hideAllButton);
		}

		if (options.showResetButton) {
			const resetButton = document.createElement('button');
			resetButton.type = 'button';
			resetButton.className = 'mg-button';
			resetButton.textContent = options.resetLabel;

			resetButton.addEventListener('click', () => {
				context.execute('showAllColumns');
			});

			actions.appendChild(resetButton);
		}

		menu.appendChild(actions);
	}

	details.appendChild(summary);
	details.appendChild(menu);

	return details;
}

export const ColumnVisibilityPlugin = {
	name: 'columnVisibility',

	commands: {
		toggleColumnVisibility(context, payload = {}) {
			const key = typeof payload === 'string'
				? payload
				: String(payload?.key || '');

			if (!key) {
				return context.grid;
			}

			return updateColumns(context, (column) => {
				if (column.key !== key) {
					return column;
				}

				return {
					...column,
					visible: column.visible === false
				};
			});
		},

		showAllColumns(context) {
			return updateColumns(context, (column) => {
				return {
					...column,
					visible: true
				};
			});
		},

		hideAllColumns(context) {
			return updateColumns(context, (column) => {
				if (isUtilityColumn(column)) {
					return column;
				}

				return {
					...column,
					visible: false
				};
			});
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		if (!options.zone) {
			return [];
		}

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					return renderColumnMenu(context, options);
				}
			}
		];
	}
};

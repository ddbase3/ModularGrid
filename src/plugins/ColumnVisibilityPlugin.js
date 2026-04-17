function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 100,
		buttonLabel: 'Columns',
		showShowAllButton: true,
		showHideAllButton: true,
		...context.getPluginOptions('columnVisibility')
	};
}

function updateColumns(context, mapper) {
	const state = context.grid.store.peek();
	const nextColumns = state.columns.map((column) => {
		return mapper(column);
	});

	context.grid.store.setState({
		columns: nextColumns
	});

	context.grid.events.emit('columns:changed', {
		grid: context.grid,
		columns: nextColumns
	});

	return context.grid;
}

function createButton(label, clickHandler) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'mg-button';
	button.textContent = label;
	button.addEventListener('click', clickHandler);
	return button;
}

function renderColumnMenu(context, viewModel, options) {
	const wrapper = document.createElement('details');
	wrapper.className = 'mg-dropdown mg-column-visibility';

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary';
	summary.textContent = options.buttonLabel;

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu';

	if (options.showShowAllButton || options.showHideAllButton) {
		const actions = document.createElement('div');
		actions.className = 'mg-inline-buttons';

		if (options.showShowAllButton) {
			actions.appendChild(createButton('Show all', () => {
				context.execute('showAllColumns');
			}));
		}

		if (options.showHideAllButton) {
			actions.appendChild(createButton('Hide all', () => {
				context.execute('hideAllColumns');
			}));
		}

		menu.appendChild(actions);
	}

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list';

	viewModel.columns.forEach((column) => {
		const label = document.createElement('label');
		label.className = 'mg-checkbox-row';

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = column.visible !== false;

		input.addEventListener('change', () => {
			context.execute('setColumnVisibility', {
				key: column.key,
				visible: input.checked
			});
		});

		const text = document.createElement('span');
		text.textContent = column.label;

		label.appendChild(input);
		label.appendChild(text);
		list.appendChild(label);
	});

	menu.appendChild(list);
	wrapper.appendChild(summary);
	wrapper.appendChild(menu);

	return wrapper;
}

export const ColumnVisibilityPlugin = {
	name: 'columnVisibility',

	commands: {
		setColumnVisibility(context, payload) {
			if (!payload || !payload.key) {
				return context.grid;
			}

			return updateColumns(context, (column) => {
				if (column.key !== payload.key) {
					return column;
				}

				return {
					...column,
					visible: payload.visible !== false
				};
			});
		},

		toggleColumn(context, payload) {
			if (!payload || !payload.key) {
				return context.grid;
			}

			return updateColumns(context, (column) => {
				if (column.key !== payload.key) {
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
				return {
					...column,
					visible: false
				};
			});
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					if (!viewModel.columns || viewModel.columns.length === 0) {
						return null;
					}

					return renderColumnMenu(context, viewModel, options);
				}
			}
		];
	}
};

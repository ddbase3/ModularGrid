import { hasPinnedDataColumns, normalizeColumnPinning } from '../utils/columnPinning.js';

function resolveOptions(context) {
	return {
		columnKey: '__mg_row_actions__',
		position: 'end',
		columnOrder: 1000,
		columnWidth: 64,
		buttonLabel: '⋯',
		menuClassName: '',
		items: [],
		headerMenu: {
			enabled: false,
			buttonLabel: '⋯',
			items: []
		},
		...context.getPluginOptions('rowActions')
	};
}

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

function buildActionContext(context, action, row, event = null) {
	return {
		grid: context.grid,
		context,
		action,
		row,
		event
	};
}

function evaluateActionItem(item, row, context) {
	if (!item || typeof item !== 'object') {
		return null;
	}

	const actionContext = buildActionContext(context, item, row);

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
		key: item.key || item.label || 'action',
		label: item.label || item.key || 'Action',
		disabled
	};
}

function resolveItems(row, context, options) {
	const source = typeof options.items === 'function'
		? options.items({
			row,
			grid: context.grid,
			context
		})
		: options.items;

	if (!Array.isArray(source)) {
		return [];
	}

	return source
		.map((item) => evaluateActionItem(item, row, context))
		.filter(Boolean);
}

function createMenuButton(action, row, context, details) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'mg-menu-action mg-row-action-button';
	button.textContent = action.label;
	button.disabled = action.disabled === true;

	button.addEventListener('click', (event) => {
		event.stopPropagation();

		context.execute('runRowAction', {
			action,
			row,
			event
		});

		if (details) {
			details.open = false;
		}
	});

	return button;
}

function createMenu(row, context, options) {
	const actions = resolveItems(row, context, options);

	if (actions.length === 0) {
		return null;
	}

	const details = document.createElement('details');
	details.className = `mg-dropdown mg-row-actions ${options.menuClassName || ''}`.trim();

	details.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-row-actions-trigger';
	summary.textContent = options.buttonLabel;

	summary.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-row-actions-menu';

	const list = document.createElement('div');
	list.className = 'mg-row-actions-list';

	actions.forEach((action) => {
		list.appendChild(createMenuButton(action, row, context, details));
	});

	menu.appendChild(list);
	details.appendChild(summary);
	details.appendChild(menu);

	return details;
}

function renderColumnVisibilitySection(context, item, details) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-row-actions-header-section';

	if (item.label) {
		const title = document.createElement('div');
		title.className = 'mg-row-actions-header-title';
		title.textContent = item.label;
		wrapper.appendChild(title);
	}

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list';

	(context.peekState().columns || [])
		.filter((column) => !isUtilityColumn(column))
		.forEach((column) => {
			const row = document.createElement('label');
			row.className = 'mg-checkbox-row';

			const input = document.createElement('input');
			input.type = 'checkbox';
			input.checked = column.visible !== false;

			input.addEventListener('change', () => {
				const columns = context.peekState().columns || [];
				const nextColumns = normalizeColumnPinning(
					columns.map((entry) => {
						if (entry.key !== column.key) {
							return entry;
						}

						return {
							...entry,
							visible: input.checked
						};
					})
				);

				context.setState({
					columns: nextColumns
				});
			});

			const text = document.createElement('span');
			text.textContent = column.label || column.key;

			row.appendChild(input);
			row.appendChild(text);
			list.appendChild(row);
		});

	wrapper.appendChild(list);

	if (item.showReset !== false) {
		const actions = document.createElement('div');
		actions.className = 'mg-inline-buttons mg-row-actions-header-actions';

		const resetButton = document.createElement('button');
		resetButton.type = 'button';
		resetButton.className = 'mg-button mg-row-actions-header-reset';
		resetButton.textContent = item.resetLabel || 'Reset columns';

		resetButton.addEventListener('click', () => {
			context.setState({
				columns: normalizeColumnPinning(
					(context.peekState().columns || []).map((column) => {
						if (isUtilityColumn(column)) {
							return column;
						}

						return {
							...column,
							visible: true
						};
					})
				)
			});

			if (details) {
				details.open = false;
			}
		});

		actions.appendChild(resetButton);
		wrapper.appendChild(actions);
	}

	return wrapper;
}

function renderHeaderMenuItem(context, item, details) {
	if (!item || typeof item !== 'object') {
		return null;
	}

	if (item.type === 'columnVisibility') {
		return renderColumnVisibilitySection(context, item, details);
	}

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'mg-menu-action mg-header-menu-action';
	button.textContent = item.label || item.key || 'Action';
	button.dataset.mgRowActionsHeaderAction = item.key || 'action';
	button.disabled = item.disabled === true;

	button.addEventListener('click', () => {
		if (typeof item.onClick === 'function') {
			item.onClick({
				grid: context.grid,
				context,
				item
			});
		}

		if (typeof item.command === 'string') {
			context.execute(item.command, {
				item
			});
		}

		if (details) {
			details.open = false;
		}
	});

	return button;
}

function buildHeaderMenuItems(context, options) {
	const headerMenu = options.headerMenu || {};
	const items = Array.isArray(headerMenu.items) ? [...headerMenu.items] : [];

	if (hasPinnedDataColumns(context.peekState().columns || [])) {
		items.push({
			key: 'unpin-all',
			label: 'Unpin all',
			command: 'unpinAllDataColumns'
		});
	}

	return items;
}

function createHeaderMenu(context, options) {
	const headerMenu = options.headerMenu || {};

	if (headerMenu.enabled !== true) {
		return '';
	}

	const items = buildHeaderMenuItems(context, options);

	if (items.length === 0) {
		return '';
	}

	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-row-actions';

	details.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-row-actions-trigger';
	summary.textContent = headerMenu.buttonLabel || options.buttonLabel;

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-row-actions-menu';

	const list = document.createElement('div');
	list.className = 'mg-row-actions-list';

	items.forEach((item) => {
		const element = renderHeaderMenuItem(context, item, details);

		if (element) {
			list.appendChild(element);
		}
	});

	menu.appendChild(list);
	details.appendChild(summary);
	details.appendChild(menu);

	return details;
}

export const RowActionsPlugin = {
	name: 'rowActions',

	commands: {
		runRowAction(context, payload = {}) {
			const action = payload.action;
			const row = payload.row;
			const event = payload.event || null;

			if (!action || !row) {
				return context.grid;
			}

			const actionContext = buildActionContext(context, action, row, event);

			if (typeof action.onClick === 'function') {
				action.onClick(actionContext);
			}

			if (typeof action.command === 'string') {
				context.execute(action.command, {
					row,
					action,
					event
				});
			}

			context.events.emit('rowAction:run', {
				grid: context.grid,
				action,
				row,
				event
			});

			return context.grid;
		},

		unpinAllDataColumns(context) {
			context.setState({
				columns: (context.peekState().columns || []).map((column) => {
					if (isUtilityColumn(column)) {
						return column;
					}

					return {
						...column,
						pinned: null
					};
				})
			});

			context.events.emit('columnPinning:changed', {
				grid: context.grid,
				columnKey: '*',
				pinned: null
			});

			return context.grid;
		}
	},

	columnContributions(context) {
		const options = resolveOptions(context);
		const hasStaticItems = Array.isArray(options.items) && options.items.length > 0;
		const hasDynamicItems = typeof options.items === 'function';
		const hasHeaderMenu = options.headerMenu?.enabled === true;

		if (!hasStaticItems && !hasDynamicItems && !hasHeaderMenu) {
			return [];
		}

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
					headerRender: () => {
						return createHeaderMenu(context, options);
					},
					render: (value, row) => {
						return createMenu(row, context, options);
					}
				}
			}
		];
	}
};

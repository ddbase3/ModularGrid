function resolveOptions(context) {
	return {
		columnKey: '__mg_row_actions__',
		position: 'end',
		columnOrder: 1000,
		columnWidth: 64,
		buttonLabel: '⋯',
		menuClassName: '',
		items: [],
		...context.getPluginOptions('rowActions')
	};
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
	button.className = 'mg-button mg-row-action-button';
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
		}
	},

	columnContributions(context) {
		const options = resolveOptions(context);
		const hasStaticItems = Array.isArray(options.items) && options.items.length > 0;
		const hasDynamicItems = typeof options.items === 'function';

		if (!hasStaticItems && !hasDynamicItems) {
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
					headerRender: () => '',
					render: (value, row) => {
						return createMenu(row, context, options);
					}
				}
			}
		];
	}
};

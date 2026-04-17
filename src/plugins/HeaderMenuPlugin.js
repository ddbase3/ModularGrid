import { appendContent, createElement } from '../utils/dom.js';

function resolveOptions(context) {
	return {
		showSortActions: true,
		showClearSortAction: true,
		showHideColumnAction: true,
		includeColumnKeys: null,
		excludeColumnKeys: [],
		includeCustomHeaderColumns: false,
		lockedColumnKeys: [],
		buttonLabel: '⋯',
		labels: {
			sortAsc: 'Sort ascending',
			sortDesc: 'Sort descending',
			clearSort: 'Clear sort',
			hideColumn: 'Hide column'
		},
		items: null,
		...context.getPluginOptions('headerMenu')
	};
}

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

function isIncludedColumn(column, options) {
	if (!column || !column.key || isUtilityColumn(column)) {
		return false;
	}

	if (Array.isArray(options.includeColumnKeys) && options.includeColumnKeys.length > 0) {
		return options.includeColumnKeys.includes(column.key);
	}

	if (Array.isArray(options.excludeColumnKeys) && options.excludeColumnKeys.includes(column.key)) {
		return false;
	}

	if (typeof column.headerRender === 'function' && options.includeCustomHeaderColumns !== true) {
		return false;
	}

	return true;
}

function getVisibleNonUtilityColumns(columns) {
	return (columns || []).filter((column) => {
		return column?.visible !== false && !isUtilityColumn(column);
	});
}

function clearSort(context) {
	context.setState({
		query: {
			sortKey: '',
			sortDirection: 'asc',
			page: 1
		}
	});

	context.events.emit('sorting:changed', {
		grid: context.grid,
		sortKey: '',
		sortDirection: 'asc'
	});

	return context.grid;
}

function setSort(context, key, direction) {
	context.setState({
		query: {
			sortKey: key,
			sortDirection: direction,
			page: 1
		}
	});

	context.events.emit('sorting:changed', {
		grid: context.grid,
		sortKey: key,
		sortDirection: direction
	});

	return context.grid;
}

function hideColumn(context, key) {
	const columns = context.peekState().columns || [];

	context.setState({
		columns: columns.map((column) => {
			if (column.key !== key) {
				return column;
			}

			return {
				...column,
				visible: false
			};
		})
	});

	return context.grid;
}

function buildDefaultItems(context, column, options) {
	const state = context.peekState();
	const query = state.query || {};
	const currentSortKey = query.sortKey || '';
	const currentSortDirection = query.sortDirection || 'asc';
	const originalSortable = column.__mgHeaderMenuOriginalSortable !== false;
	const visibleColumnCount = getVisibleNonUtilityColumns(state.columns || []).length;
	const isLocked = Array.isArray(options.lockedColumnKeys) && options.lockedColumnKeys.includes(column.key);
	const items = [];

	if (options.showSortActions !== false && originalSortable) {
		items.push({
			key: 'sort-asc',
			label: options.labels.sortAsc,
			disabled: currentSortKey === column.key && currentSortDirection === 'asc',
			onClick() {
				setSort(context, column.key, 'asc');
			}
		});

		items.push({
			key: 'sort-desc',
			label: options.labels.sortDesc,
			disabled: currentSortKey === column.key && currentSortDirection === 'desc',
			onClick() {
				setSort(context, column.key, 'desc');
			}
		});
	}

	if (options.showClearSortAction !== false && currentSortKey === column.key) {
		items.push({
			key: 'clear-sort',
			label: options.labels.clearSort,
			onClick() {
				clearSort(context);
			}
		});
	}

	if (options.showHideColumnAction !== false && !isLocked && visibleColumnCount > 1) {
		items.push({
			key: 'hide-column',
			label: options.labels.hideColumn,
			onClick() {
				hideColumn(context, column.key);
			}
		});
	}

	return items;
}

function resolveItems(context, column, options) {
	const defaultItems = buildDefaultItems(context, column, options);

	if (typeof options.items === 'function') {
		const customItems = options.items({
			grid: context.grid,
			context,
			column,
			defaultItems
		});

		return Array.isArray(customItems) ? customItems : defaultItems;
	}

	if (Array.isArray(options.items)) {
		return [...defaultItems, ...options.items];
	}

	return defaultItems;
}

function renderHeaderLabel(column, grid, originalHeaderRender) {
	const label = createElement('span', 'mg-header-menu-label');

	if (typeof originalHeaderRender === 'function') {
		appendContent(label, originalHeaderRender(column, grid));
	}
	else {
		label.textContent = column.label || column.key;
	}

	const query = grid.getState().query || {};

	if (query.sortKey === column.key) {
		const indicator = createElement('span', 'mg-header-menu-indicator');
		indicator.textContent = query.sortDirection === 'desc' ? '▼' : '▲';
		label.appendChild(indicator);
	}

	return label;
}

function renderHeaderMenu(column, grid, context, options, originalHeaderRender) {
	const wrapper = createElement('div', 'mg-header-menu-bar');
	const label = renderHeaderLabel(column, grid, originalHeaderRender);
	const details = createElement('details', 'mg-header-menu');
	const summary = createElement('summary', 'mg-header-menu-trigger');
	const menu = createElement('div', 'mg-header-menu-dropdown');
	const items = resolveItems(context, column, options);

	summary.textContent = options.buttonLabel;
	summary.title = 'Column menu';

	details.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	items.forEach((item) => {
		if (!item || typeof item !== 'object') {
			return;
		}

		if (typeof item.isVisible === 'function' && item.isVisible({
			grid,
			context,
			column,
			item
		}) === false) {
			return;
		}

		if (item.visible === false) {
			return;
		}

		const button = createElement('button', 'mg-header-menu-action');
		button.type = 'button';
		button.textContent = item.label || item.key || 'Action';
		button.dataset.mgHeaderMenuAction = item.key || 'action';

		const disabled = typeof item.isDisabled === 'function'
			? item.isDisabled({
				grid,
				context,
				column,
				item
			}) === true
			: item.disabled === true;

		button.disabled = disabled;

		button.addEventListener('click', () => {
			if (typeof item.onClick === 'function') {
				item.onClick({
					grid,
					context,
					column,
					item
				});
			}

			if (typeof item.command === 'string') {
				context.execute(item.command, {
					column,
					item
				});
			}

			details.open = false;
		});

		menu.appendChild(button);
	});

	details.appendChild(summary);
	details.appendChild(menu);

	wrapper.appendChild(label);
	wrapper.appendChild(details);

	return wrapper;
}

function enhanceColumns(context, options, columns) {
	return (columns || []).map((column) => {
		if (!isIncludedColumn(column, options)) {
			return column;
		}

		const originalHeaderRender = column.__mgHeaderMenuOriginalHeaderRender || column.headerRender || null;
		const originalSortable = column.__mgHeaderMenuOriginalSortable ?? (column.sortable !== false);

		return {
			...column,
			sortable: false,
			__mgHeaderMenuEnhanced: true,
			__mgHeaderMenuOriginalSortable: originalSortable,
			__mgHeaderMenuOriginalHeaderRender: originalHeaderRender,
			headerRender: (enhancedColumn, grid) => {
				return renderHeaderMenu(
					enhancedColumn,
					grid,
					context,
					options,
					originalHeaderRender
				);
			}
		};
	});
}

function needsEnhancement(columns, options) {
	return (columns || []).some((column) => {
		if (!isIncludedColumn(column, options)) {
			return false;
		}

		if (column.__mgHeaderMenuEnhanced !== true) {
			return true;
		}

		if (typeof column.headerRender !== 'function') {
			return true;
		}

		return false;
	});
}

export const HeaderMenuPlugin = {
	name: 'headerMenu',

	install(context) {
		const options = resolveOptions(context);
		const cleanup = [];
		const applyEnhancement = () => {
			const state = context.peekState();
			const columns = state.columns || [];

			if (!needsEnhancement(columns, options)) {
				return;
			}

			context.setState({
				columns: enhanceColumns(context, options, columns)
			});
		};

		applyEnhancement();

		cleanup.push(
			context.events.on('state:changed', () => {
				applyEnhancement();
			})
		);

		context._headerMenuCleanup = cleanup;
	},

	destroy(context) {
		const cleanup = context._headerMenuCleanup || [];

		cleanup.forEach((unsubscribe) => {
			if (typeof unsubscribe === 'function') {
				unsubscribe();
			}
		});

		context._headerMenuCleanup = [];
	}
};

import { createElement } from '../utils/dom.js';
import { attachFloatingDropdown, setFloatingDropdownOpenState } from '../utils/dropdown.js';

function resolveOptions(context) {
	return {
		showSortActions: true,
		showClearSortAction: true,
		showHideColumnAction: true,
		showPinActions: true,
		includeColumnKeys: null,
		excludeColumnKeys: [],
		includeCustomHeaderColumns: false,
		lockedColumnKeys: [],
		buttonLabel: '⋯',
		showSortHint: true,
		labels: {
			sortBy: 'Sort by',
			clearSort: 'Clear sort',
			hideColumn: 'Hide column',
			sortedBy: 'sorted by',
			pinLeft: 'Pin left',
			pinRight: 'Pin right',
			unpinLeft: 'Unpin left',
			unpinRight: 'Unpin right'
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

function getColumnByKey(context, columnKey) {
	return (context.peekState().columns || []).find((column) => column.key === columnKey) || null;
}

function normalizePinnedSide(column) {
	if (column?.pinned === 'left' || column?.pinned === 'right') {
		return column.pinned;
	}

	return '';
}

function getPinningContext(context) {
	const visibleColumns = getVisibleNonUtilityColumns(context.peekState().columns || []);
	const leftPinned = visibleColumns.filter((column) => normalizePinnedSide(column) === 'left');
	const rightPinned = visibleColumns.filter((column) => normalizePinnedSide(column) === 'right');
	const unpinned = visibleColumns.filter((column) => normalizePinnedSide(column) === '');

	return {
		visibleColumns,
		leftPinned,
		rightPinned,
		unpinned,
		firstUnpinned: unpinned[0] || null,
		lastUnpinned: unpinned[unpinned.length - 1] || null,
		lastLeftPinned: leftPinned[leftPinned.length - 1] || null,
		firstRightPinned: rightPinned[0] || null
	};
}

function resolveMenuAlignmentClass(context, column) {
	const pinningContext = getPinningContext(context);
	const visibleColumns = pinningContext.visibleColumns || [];
	const pinnedSide = normalizePinnedSide(column);

	if (pinnedSide === 'left') {
		return 'mg-header-menu-align-start';
	}

	if (pinnedSide === 'right') {
		return 'mg-header-menu-align-end';
	}

	const index = visibleColumns.findIndex((entry) => entry.key === column?.key);

	if (index === -1) {
		return 'mg-header-menu-align-end';
	}

	const midpoint = Math.floor((visibleColumns.length - 1) / 2);

	if (index <= midpoint) {
		return 'mg-header-menu-align-start';
	}

	return 'mg-header-menu-align-end';
}

function preserveTableScroll(context, callback) {
	const currentScroll = context.grid.viewContainer instanceof HTMLElement
		? context.grid.viewContainer.querySelector('.mg-table-scroll')
		: null;

	const scrollTop = currentScroll instanceof HTMLElement ? currentScroll.scrollTop : null;
	const scrollLeft = currentScroll instanceof HTMLElement ? currentScroll.scrollLeft : null;
	const result = callback();

	if (!(currentScroll instanceof HTMLElement)) {
		return result;
	}

	const restore = () => {
		const nextScroll = context.grid.viewContainer instanceof HTMLElement
			? context.grid.viewContainer.querySelector('.mg-table-scroll')
			: null;

		if (!(nextScroll instanceof HTMLElement)) {
			return;
		}

		if (typeof scrollTop === 'number') {
			nextScroll.scrollTop = scrollTop;
		}

		if (typeof scrollLeft === 'number') {
			nextScroll.scrollLeft = scrollLeft;
		}
	};

	window.requestAnimationFrame(() => {
		restore();
		window.requestAnimationFrame(() => {
			restore();
		});
	});

	return result;
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

function setPinnedState(context, key, pinned) {
	return preserveTableScroll(context, () => {
		const columns = context.peekState().columns || [];

		context.setState({
			columns: columns.map((column) => {
				if (column.key !== key) {
					return column;
				}

				return {
					...column,
					pinned: pinned || null
				};
			})
		});

		context.events.emit('columnPinning:changed', {
			grid: context.grid,
			columnKey: key,
			pinned: pinned || null
		});

		return context.grid;
	});
}

function hideColumn(context, key) {
	return preserveTableScroll(context, () => {
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
	});
}

function resolveSortConfig(column) {
	const headerMenu = column?.headerMenu || {};
	const configuredSortOptions = Array.isArray(headerMenu.sortOptions) ? headerMenu.sortOptions : [];
	const defaultSortKey = headerMenu.defaultSortKey || column?.key || '';
	const defaultSortDirection = headerMenu.defaultSortDirection || 'asc';

	if (configuredSortOptions.length > 0) {
		return {
			defaultSortKey,
			defaultSortDirection,
			sortOptions: configuredSortOptions
		};
	}

	return {
		defaultSortKey,
		defaultSortDirection,
		sortOptions: [
			{
				key: defaultSortKey,
				label: headerMenu.defaultSortLabel || column?.label || column?.key || ''
			}
		]
	};
}

function getSortOptionLabel(sortOptions, key) {
	const match = sortOptions.find((option) => option.key === key);

	if (match) {
		return match.label || match.key;
	}

	return key;
}

function isColumnSortActive(column, query) {
	const sortConfig = resolveSortConfig(column);
	return sortConfig.sortOptions.some((option) => option.key === query.sortKey);
}

function buildDefaultItems(context, column, options) {
	const state = context.peekState();
	const query = state.query || {};
	const currentSortKey = query.sortKey || '';
	const currentSortDirection = query.sortDirection || 'asc';
	const originalSortable = column.__mgHeaderMenuOriginalSortable !== false;
	const visibleColumnCount = getVisibleNonUtilityColumns(state.columns || []).length;
	const isLocked = Array.isArray(options.lockedColumnKeys) && options.lockedColumnKeys.includes(column.key);
	const sortConfig = resolveSortConfig(column);
	const pinningContext = getPinningContext(context);
	const pinnedSide = normalizePinnedSide(column);
	const items = [];

	if (options.showSortActions !== false && originalSortable) {
		sortConfig.sortOptions.forEach((sortOption) => {
			items.push({
				key: `sort-${sortOption.key}-asc`,
				label: `${options.labels.sortBy} ${sortOption.label || sortOption.key} asc`,
				disabled: currentSortKey === sortOption.key && currentSortDirection === 'asc',
				onClick() {
					setSort(context, sortOption.key, 'asc');
				}
			});

			items.push({
				key: `sort-${sortOption.key}-desc`,
				label: `${options.labels.sortBy} ${sortOption.label || sortOption.key} desc`,
				disabled: currentSortKey === sortOption.key && currentSortDirection === 'desc',
				onClick() {
					setSort(context, sortOption.key, 'desc');
				}
			});
		});
	}

	if (options.showPinActions !== false) {
		if (pinnedSide === 'left') {
			if (pinningContext.lastLeftPinned?.key === column.key) {
				items.push({
					key: 'unpin-left',
					label: options.labels.unpinLeft,
					onClick() {
						setPinnedState(context, column.key, null);
					}
				});
			}
		}
		else if (pinnedSide === 'right') {
			if (pinningContext.firstRightPinned?.key === column.key) {
				items.push({
					key: 'unpin-right',
					label: options.labels.unpinRight,
					onClick() {
						setPinnedState(context, column.key, null);
					}
				});
			}
		}
		else {
			if (pinningContext.firstUnpinned?.key === column.key) {
				items.push({
					key: 'pin-left',
					label: options.labels.pinLeft,
					onClick() {
						setPinnedState(context, column.key, 'left');
					}
				});
			}

			if (pinningContext.lastUnpinned?.key === column.key) {
				items.push({
					key: 'pin-right',
					label: options.labels.pinRight,
					onClick() {
						setPinnedState(context, column.key, 'right');
					}
				});
			}
		}
	}

	if (options.showClearSortAction !== false && currentSortKey !== '') {
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

function renderHeaderLabelButton(column, context) {
	const button = createElement('button', 'mg-header-label-button');
	const main = createElement('span', 'mg-header-menu-label-main');
	const sortConfig = resolveSortConfig(column);

	button.type = 'button';
	button.dataset.mgHeaderColumnKey = column.key;
	button.dataset.mgHeaderDefaultSortKey = sortConfig.defaultSortKey;
	button.dataset.mgHeaderDefaultSortDirection = sortConfig.defaultSortDirection;

	main.textContent = column.label || column.key;
	button.appendChild(main);

	if (column.__mgHeaderMenuOriginalSortable !== false) {
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			context.execute('headerMenuToggleDefaultSort', {
				columnKey: column.key
			});
		});
	}
	else {
		button.disabled = true;
	}

	return button;
}

function renderHeaderSortHint(column, grid, options) {
	const query = grid.getState().query || {};
	const sortConfig = resolveSortConfig(column);
	const active = isColumnSortActive(column, query);

	if (options.showSortHint === false || !active) {
		return null;
	}

	const hint = createElement('div', 'mg-header-menu-label-sub');
	const sortLabel = getSortOptionLabel(sortConfig.sortOptions, query.sortKey);
	const directionMarker = query.sortDirection === 'desc' ? '▼' : '▲';

	hint.textContent = `${options.labels.sortedBy} ${sortLabel} ${directionMarker}`;

	return hint;
}

function renderHeaderMenu(column, grid, context, options) {
	const stateKey = `headerMenu.${column.key}`;
	const alignmentClassName = resolveMenuAlignmentClass(context, column);
	const preferredAlign = alignmentClassName === 'mg-header-menu-align-start' ? 'start' : 'end';
	const wrapper = createElement('div', `mg-header-menu-bar ${alignmentClassName}`.trim());
	const topLine = createElement('div', 'mg-header-menu-topline');
	const labelStack = createElement('div', 'mg-header-menu-label-stack');
	const labelButton = renderHeaderLabelButton(column, context);
	const hint = renderHeaderSortHint(column, grid, options);
	const details = createElement('details', 'mg-header-menu');
	const summary = createElement('summary', 'mg-header-menu-trigger');
	const menu = createElement('div', 'mg-header-menu-dropdown');
	const items = resolveItems(context, column, options);

	summary.textContent = options.buttonLabel;
	summary.title = 'Column menu';

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

		const button = createElement('button', 'mg-menu-action mg-header-menu-action');
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
			setFloatingDropdownOpenState(context.grid, stateKey, false);
			details.open = false;

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
		});

		menu.appendChild(button);
	});

	labelStack.appendChild(labelButton);

	details.appendChild(summary);
	details.appendChild(menu);

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign,
		stateKey
	});

	topLine.appendChild(labelStack);
	topLine.appendChild(details);

	wrapper.appendChild(topLine);

	if (hint) {
		wrapper.appendChild(hint);
	}

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
			headerRender: (enhancedColumn, enhancedGrid) => {
				return renderHeaderMenu(
					enhancedColumn,
					enhancedGrid,
					context,
					options
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

	commands: {
		headerMenuToggleDefaultSort(context, payload = {}) {
			const columnKey = String(payload.columnKey || '');
			const column = getColumnByKey(context, columnKey);

			if (!column) {
				return context.grid;
			}

			const query = context.peekState().query || {};
			const sortConfig = resolveSortConfig(column);

			if (!sortConfig.defaultSortKey) {
				return context.grid;
			}

			if (query.sortKey === sortConfig.defaultSortKey) {
				const nextDirection = query.sortDirection === 'asc' ? 'desc' : 'asc';
				return setSort(context, sortConfig.defaultSortKey, nextDirection);
			}

			return setSort(context, sortConfig.defaultSortKey, sortConfig.defaultSortDirection);
		}
	},

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

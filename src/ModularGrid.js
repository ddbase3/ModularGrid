import { ArrayAdapter } from './adapters/ArrayAdapter.js';
import { GridCommandRegistry } from './core/GridCommandRegistry.js';
import { GridDataController } from './core/GridDataController.js';
import { GridEventBus } from './core/GridEventBus.js';
import { createDefaultLayout, GridLayoutEngine } from './core/GridLayoutEngine.js';
import { GridPluginManager } from './core/GridPluginManager.js';
import { GridStateStore } from './core/GridStateStore.js';
import { GridViewManager } from './core/GridViewManager.js';
import { clearElement } from './utils/dom.js';
import { cloneValue, deepMerge } from './utils/object.js';
import { TableView } from './views/TableView.js';

const defaultOptions = {
	columns: [],
	data: [],
	adapter: null,
	dataMode: 'client',
	server: {
		searchDebounceMs: 220,
		watchStateKeys: ['query']
	},
	pageSize: 10,
	pageSizeOptions: [5, 10, 20, 50],
	sort: {
		key: '',
		direction: 'asc'
	},
	view: {
		mode: 'table'
	},
	table: {
		zebraRows: true,
		resizableColumns: true,
		columnResizeMinWidth: 80
	},
	textDisplay: null,
	features: {
		paging: true
	},
	layout: createDefaultLayout(),
	renderers: {},
	onRowClick: null,
	plugins: [],
	pluginOptions: {}
};

function resolveContainer(container) {
	if (typeof container === 'string') {
		const element = document.querySelector(container);

		if (!element) {
			throw new Error(`Container "${container}" was not found.`);
		}

		return element;
	}

	if (container instanceof HTMLElement) {
		return container;
	}

	throw new Error('Container must be a selector string or an HTMLElement.');
}

function inferColumnsFromRow(row) {
	if (!row || typeof row !== 'object') {
		return [];
	}

	return Object.keys(row).map((key) => {
		return {
			key,
			label: key,
			visible: true,
			sortable: true
		};
	});
}

function normalizeColumns(columns) {
	return (columns || []).map((column, index) => {
		return {
			...column,
			key: column.key || `col_${index}`,
			label: column.label || column.key || `Column ${index + 1}`,
			visible: column.visible !== false,
			sortable: column.sortable !== false,
			resizable: column.resizable !== false,
			width: column.width ?? null,
			minWidth: column.minWidth ?? null,
			maxWidth: column.maxWidth ?? null,
			render: column.render || null,
			headerRender: column.headerRender || null,
			headerMenu: column.headerMenu || null
		};
	});
}

function compareValues(a, b) {
	if (a === b) {
		return 0;
	}

	if (a === null || a === undefined) {
		return -1;
	}

	if (b === null || b === undefined) {
		return 1;
	}

	const aNumber = Number(a);
	const bNumber = Number(b);

	if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber) && String(a).trim() !== '' && String(b).trim() !== '') {
		return aNumber - bNumber;
	}

	return String(a).localeCompare(String(b), undefined, {
		numeric: true,
		sensitivity: 'base'
	});
}

function areWatchedValuesEqual(a, b) {
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch (error) {
		return a === b;
	}
}

function getQuerySearch(state) {
	return String(state?.query?.search || '');
}

export class ModularGrid {
	constructor(container, options = {}) {
		this.container = resolveContainer(container);
		this.options = deepMerge(defaultOptions, options);

		this.events = new GridEventBus();
		this.store = new GridStateStore(this.buildInitialState());
		this.layoutEngine = new GridLayoutEngine();
		this.dataController = new GridDataController(this);
		this.commands = new GridCommandRegistry(this);
		this.pluginManager = new GridPluginManager(this);
		this.viewManager = new GridViewManager(this);

		this.viewManager.register('table', {
			name: 'table',
			label: 'Table',
			render: new TableView().render.bind(new TableView())
		});

		this.adapter = this.options.adapter || new ArrayAdapter(this.options.data || []);
		this.layoutRefs = null;
		this.zones = new Map();
		this.viewContainer = null;
		this.unsubscribeState = null;
		this.initialized = false;
		this.initialStateSnapshot = this.store.getState();
		this.serverReloadTimer = null;

		this.registerBuiltInCommands();
	}

	buildInitialState() {
		let columns = normalizeColumns(this.options.columns);

		if (columns.length === 0 && Array.isArray(this.options.data) && this.options.data.length > 0) {
			columns = inferColumnsFromRow(this.options.data[0]);
		}

		return {
			data: {
				rows: [],
				total: 0,
				loading: false,
				error: null
			},
			query: {
				page: 1,
				pageSize: this.options.pageSize,
				search: '',
				sortKey: this.options.sort?.key || '',
				sortDirection: this.options.sort?.direction || 'asc'
			},
			view: {
				mode: this.options.view?.mode || 'table'
			},
			textDisplay: {
				expanded: {}
			},
			columns
		};
	}

	registerBuiltInCommands() {
		this.commands
			.register('reload', ({ grid }) => {
				return grid.reload();
			})
			.register('render', ({ grid }) => {
				return grid.render();
			})
			.register('setSearch', ({ grid }, payload) => {
				return grid.setSearch(payload ?? '');
			})
			.register('clearSearch', ({ grid }) => {
				return grid.clearSearch();
			})
			.register('setPage', ({ grid }, payload) => {
				return grid.setPage(payload);
			})
			.register('setPageSize', ({ grid }, payload) => {
				return grid.setPageSize(payload);
			})
			.register('toggleSort', ({ grid }, payload) => {
				return grid.toggleSort(payload);
			})
			.register('setViewMode', ({ grid }, payload) => {
				return grid.setViewMode(payload);
			})
			.register('toggleTextDisplayExpanded', ({ grid }, payload) => {
				return grid.toggleTextDisplayExpanded(payload?.key || '');
			})
			.register('setColumnWidth', ({ grid }, payload) => {
				return grid.setColumnWidth(payload?.key || '', payload?.width);
			});
	}

	getInitialStateSnapshot() {
		return cloneValue(this.initialStateSnapshot);
	}

	isServerMode() {
		return this.options.dataMode === 'server';
	}

	getServerOptions() {
		return this.options.server || {};
	}

	getServerWatchStateKeys() {
		const watchStateKeys = this.getServerOptions().watchStateKeys;

		if (!Array.isArray(watchStateKeys) || watchStateKeys.length === 0) {
			return ['query'];
		}

		return watchStateKeys;
	}

	hasServerWatchedStateChange(previous, current) {
		return this.getServerWatchStateKeys().some((key) => {
			return !areWatchedValuesEqual(previous?.[key], current?.[key]);
		});
	}

	hasServerSearchChange(previous, current) {
		return getQuerySearch(previous) !== getQuerySearch(current);
	}

	clearPendingServerReload() {
		if (this.serverReloadTimer) {
			window.clearTimeout(this.serverReloadTimer);
			this.serverReloadTimer = null;
		}
	}

	requestServerReload(useDebounce = false) {
		this.clearPendingServerReload();

		if (!useDebounce) {
			this.reload();
			return;
		}

		const debounceMs = Math.max(0, Number(this.getServerOptions().searchDebounceMs) || 0);

		this.serverReloadTimer = window.setTimeout(() => {
			this.serverReloadTimer = null;
			this.reload();
		}, debounceMs);
	}

	syncServerState(previous, current) {
		if (!this.isServerMode()) {
			return;
		}

		if (!this.hasServerWatchedStateChange(previous, current)) {
			return;
		}

		this.requestServerReload(this.hasServerSearchChange(previous, current));
	}

	captureFocusState() {
		const activeElement = document.activeElement;

		if (!(activeElement instanceof HTMLElement)) {
			return null;
		}

		if (!this.container.contains(activeElement)) {
			return null;
		}

		const focusKey = activeElement.dataset.mgFocusKey;

		if (!focusKey) {
			return null;
		}

		const focusState = {
			focusKey
		};

		if (typeof activeElement.selectionStart === 'number') {
			focusState.selectionStart = activeElement.selectionStart;
			focusState.selectionEnd = activeElement.selectionEnd;
		}

		return focusState;
	}

	restoreFocusState(focusState) {
		if (!focusState || !focusState.focusKey) {
			return;
		}

		const selector = `[data-mg-focus-key="${focusState.focusKey}"]`;
		const target = this.container.querySelector(selector);

		if (!(target instanceof HTMLElement)) {
			return;
		}

		target.focus();

		if (typeof target.setSelectionRange === 'function' && typeof focusState.selectionStart === 'number') {
			try {
				target.setSelectionRange(
					focusState.selectionStart,
					typeof focusState.selectionEnd === 'number' ? focusState.selectionEnd : focusState.selectionStart
				);
			} catch (error) {
				// Ignore selection restoration errors for unsupported elements.
			}
		}
	}

	async init() {
		if (this.initialized) {
			return this;
		}

		this.layoutRefs = this.layoutEngine.render(this.container, this.options.layout);
		this.zones = this.layoutRefs.zones;
		this.viewContainer = this.layoutRefs.viewContainer;

		await this.pluginManager.installAll(this.options.plugins || []);

		this.unsubscribeState = this.store.subscribe(({ current, previous }) => {
			this.events.emit('state:changed', {
				grid: this,
				current,
				previous
			});

			this.syncServerState(previous, current);
			this.render();
		});

		this.render();
		await this.reload();

		this.initialStateSnapshot = this.store.getState();
		this.initialized = true;

		this.events.emit('grid:init', {
			grid: this
		});

		return this;
	}

	async reload() {
		this.clearPendingServerReload();

		this.store.setState({
			data: {
				loading: true,
				error: null
			}
		});

		this.events.emit('data:loading', {
			grid: this
		});

		try {
			const result = await this.dataController.load();
			let columns = result.columns ? normalizeColumns(result.columns) : this.store.peek().columns;

			if (columns.length === 0 && result.rows.length > 0) {
				columns = inferColumnsFromRow(result.rows[0]);
			}

			this.store.setState({
				columns,
				data: {
					rows: result.rows,
					total: result.total,
					loading: false,
					error: null
				}
			});

			this.events.emit('data:loaded', {
				grid: this,
				result
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			this.store.setState({
				data: {
					loading: false,
					error: errorMessage
				}
			});

			this.events.emit('data:error', {
				grid: this,
				error: errorMessage
			});
		}

		return this;
	}

	destroy() {
		this.clearPendingServerReload();

		if (this.unsubscribeState) {
			this.unsubscribeState();
			this.unsubscribeState = null;
		}

		this.pluginManager.destroyAll();
		clearElement(this.container);

		this.events.emit('grid:destroy', {
			grid: this
		});
	}

	getState() {
		return this.store.getState();
	}

	setState(patch) {
		this.store.setState(patch);
		return this;
	}

	execute(commandName, payload) {
		return this.commands.execute(commandName, payload);
	}

	on(eventName, handler) {
		return this.events.on(eventName, handler);
	}

	getPreparedRows() {
		const state = this.store.peek();
		const columns = state.columns;
		const searchTerm = String(state.query.search || '').trim().toLowerCase();
		const sortKey = state.query.sortKey;
		const sortDirection = state.query.sortDirection;
		const requestedPage = Math.max(1, Number(state.query.page) || 1);
		const requestedPageSize = Math.max(1, Number(state.query.pageSize) || 1);
		const pagingEnabled = this.options.features.paging !== false;

		if (this.isServerMode()) {
			const rows = state.data.rows.slice();
			const total = Math.max(0, Number(state.data.total) || 0);
			const totalPages = pagingEnabled ? Math.max(1, Math.ceil(total / requestedPageSize)) : 1;
			const safePage = pagingEnabled ? Math.min(requestedPage, totalPages) : 1;
			const from = total === 0 ? 0 : ((safePage - 1) * requestedPageSize) + 1;
			const to = total === 0 ? 0 : Math.min(total, from + rows.length - 1);

			return {
				rows,
				filteredTotal: total,
				totalPages,
				page: safePage,
				pageSize: pagingEnabled ? requestedPageSize : (rows.length || requestedPageSize),
				from,
				to
			};
		}

		let rows = state.data.rows.slice();

		if (searchTerm) {
			rows = rows.filter((row) => {
				return columns.some((column) => {
					const value = row[column.key];

					if (value === null || value === undefined) {
						return false;
					}

					return String(value).toLowerCase().includes(searchTerm);
				});
			});
		}

		const filteredTotal = rows.length;

		if (sortKey) {
			rows.sort((a, b) => {
				const result = compareValues(a[sortKey], b[sortKey]);
				return sortDirection === 'desc' ? result * -1 : result;
			});
		}

		if (!pagingEnabled) {
			return {
				rows,
				filteredTotal,
				totalPages: 1,
				page: 1,
				pageSize: filteredTotal || requestedPageSize,
				from: filteredTotal === 0 ? 0 : 1,
				to: filteredTotal
			};
		}

		const totalPages = Math.max(1, Math.ceil(filteredTotal / requestedPageSize));
		const safePage = Math.min(requestedPage, totalPages);
		const startIndex = (safePage - 1) * requestedPageSize;
		const pagedRows = rows.slice(startIndex, startIndex + requestedPageSize);

		return {
			rows: pagedRows,
			filteredTotal,
			totalPages,
			page: safePage,
			pageSize: requestedPageSize,
			from: filteredTotal === 0 ? 0 : startIndex + 1,
			to: startIndex + pagedRows.length
		};
	}

	buildViewModel() {
		const state = this.store.peek();
		const prepared = this.getPreparedRows();
		const renderColumns = this.pluginManager.getRenderColumns(state.columns);

		return {
			columns: state.columns,
			renderColumns,
			rows: prepared.rows,
			total: state.data.total,
			filteredTotal: prepared.filteredTotal,
			totalPages: prepared.totalPages,
			page: prepared.page,
			pageSize: prepared.pageSize,
			from: prepared.from,
			to: prepared.to,
			search: state.query.search,
			sortKey: state.query.sortKey,
			sortDirection: state.query.sortDirection,
			viewMode: state.view?.mode || 'table',
			loading: state.data.loading,
			error: state.data.error
		};
	}

	renderZoneContributions(zoneKey, container, viewModel) {
		this.pluginManager.renderZone(zoneKey, container, viewModel);
	}

	renderAllZones(viewModel) {
		this.zones.forEach((zoneElement, zoneKey) => {
			clearElement(zoneElement);
			this.renderZoneContributions(zoneKey, zoneElement, viewModel);
		});
	}

	render() {
		if (!this.viewContainer) {
			return;
		}

		const viewModel = this.buildViewModel();
		const focusState = this.captureFocusState();

		this.renderAllZones(viewModel);
		this.viewManager.render(this.viewContainer, viewModel);
		this.restoreFocusState(focusState);
	}

	setSearch(value) {
		this.store.setState({
			query: {
				search: value,
				page: 1
			}
		});

		this.events.emit('filters:changed', {
			grid: this,
			search: value
		});

		return this;
	}

	clearSearch() {
		return this.setSearch('');
	}

	setPage(page) {
		const prepared = this.getPreparedRows();
		const safePage = Math.max(1, Math.min(Number(page) || 1, prepared.totalPages));

		this.store.setState({
			query: {
				page: safePage
			}
		});

		this.events.emit('paging:changed', {
			grid: this,
			page: safePage
		});

		return this;
	}

	setPageSize(pageSize) {
		const safePageSize = Math.max(1, Number(pageSize) || this.options.pageSize);

		this.store.setState({
			query: {
				pageSize: safePageSize,
				page: 1
			}
		});

		this.events.emit('paging:changed', {
			grid: this,
			pageSize: safePageSize
		});

		return this;
	}

	toggleSort(key) {
		const state = this.store.peek();
		let nextDirection = 'asc';

		if (state.query.sortKey === key) {
			nextDirection = state.query.sortDirection === 'asc' ? 'desc' : 'asc';
		}

		this.store.setState({
			query: {
				sortKey: key,
				sortDirection: nextDirection,
				page: 1
			}
		});

		this.events.emit('sorting:changed', {
			grid: this,
			sortKey: key,
			sortDirection: nextDirection
		});

		return this;
	}

	toggleTextDisplayExpanded(key) {
		if (!key) {
			return this;
		}

		const current = this.store.peek().textDisplay?.expanded?.[key] === true;
		const nextExpanded = !current;

		this.store.setState({
			textDisplay: {
				expanded: {
					[key]: nextExpanded
				}
			}
		});

		this.events.emit('textDisplay:changed', {
			grid: this,
			key,
			expanded: nextExpanded
		});

		return this;
	}

	setColumnWidth(key, width) {
		const columnKey = String(key || '');
		const numericWidth = Math.max(1, Math.round(Number(width) || 0));

		if (!columnKey || !Number.isFinite(numericWidth) || numericWidth <= 0) {
			return this;
		}

		this.store.setState({
			columns: (this.store.peek().columns || []).map((column) => {
				if (column.key !== columnKey) {
					return column;
				}

				return {
					...column,
					width: numericWidth
				};
			})
		});

		this.events.emit('columnWidth:changed', {
			grid: this,
			columnKey,
			width: numericWidth
		});

		return this;
	}

	setViewMode(mode) {
		if (!mode || !this.viewManager.has(mode)) {
			return this;
		}

		this.store.setState({
			view: {
				mode
			}
		});

		this.events.emit('view:changed', {
			grid: this,
			mode
		});

		return this;
	}

	renderHeaderContent(column) {
		if (typeof column.headerRender === 'function') {
			return column.headerRender(column, this);
		}

		if (typeof this.options.renderers.headerCell === 'function') {
			return this.options.renderers.headerCell(column, this);
		}

		return column.label;
	}

	renderCellContent(row, column) {
		const value = row[column.key];

		if (typeof column.render === 'function') {
			return column.render(value, row, column, this);
		}

		if (typeof this.options.renderers.cell === 'function') {
			return this.options.renderers.cell(value, row, column, this);
		}

		return value ?? '';
	}
}

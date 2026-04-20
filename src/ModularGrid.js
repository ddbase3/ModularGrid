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
import { isUtilityColumn, normalizeColumnPinning, resolveEffectivePinnedSide } from './utils/columnPinning.js';
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
		reorderableColumns: true,
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
			reorderable: column.reorderable !== false,
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
		this.activeLoadSequence = 0;

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
				loadingMore: false,
				error: null,
				lastLoadedPage: 0
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
			.register('reload', ({ grid }, payload) => {
				return grid.reload(payload);
			})
			.register('loadMore', ({ grid }, payload) => {
				return grid.loadMore(payload);
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
			})
			.register('moveColumn', ({ grid }, payload) => {
				return grid.moveColumn(
					payload?.fromKey || '',
					payload?.toKey || '',
					payload?.position || 'before'
				);
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

	nextLoadSequence() {
		this.activeLoadSequence += 1;
		return this.activeLoadSequence;
	}

	isActiveLoadSequence(loadSequence) {
		return loadSequence === this.activeLoadSequence;
	}

	resolveLoadedColumns(result) {
		let columns = result.columns ? normalizeColumns(result.columns) : this.store.peek().columns;

		if (columns.length === 0 && result.rows.length > 0) {
			columns = inferColumnsFromRow(result.rows[0]);
		}

		return columns;
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

	async reload(options = {}) {
		const loadMode = options?.mode === 'append' ? 'append' : 'replace';

		if (loadMode === 'append') {
			return this.loadMore(options);
		}

		this.clearPendingServerReload();

		const requestedPage = Math.max(1, Number(options.page) || Number(this.store.peek().query.page) || 1);
		const loadSequence = this.nextLoadSequence();

		this.store.setState({
			data: {
				loading: true,
				loadingMore: false,
				error: null
			}
		});

		this.events.emit('data:loading', {
			grid: this,
			mode: 'replace',
			page: requestedPage
		});

		try {
			const result = await this.dataController.load({
				...options,
				mode: 'replace',
				page: requestedPage
			});

			if (!this.isActiveLoadSequence(loadSequence)) {
				return this;
			}

			const columns = this.resolveLoadedColumns(result);

			this.store.setState({
				columns,
				data: {
					rows: result.rows,
					total: result.total,
					loading: false,
					loadingMore: false,
					error: null,
					lastLoadedPage: requestedPage
				}
			});

			this.events.emit('data:loaded', {
				grid: this,
				result,
				mode: 'replace',
				page: requestedPage
			});
		} catch (error) {
			if (!this.isActiveLoadSequence(loadSequence)) {
				return this;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			this.store.setState({
				data: {
					loading: false,
					loadingMore: false,
					error: errorMessage
				}
			});

			this.events.emit('data:error', {
				grid: this,
				error: errorMessage,
				mode: 'replace',
				page: requestedPage
			});
		}

		return this;
	}

	async loadMore(options = {}) {
		if (!this.isServerMode()) {
			return this;
		}

		const state = this.store.peek();

		if (state.data.loading || state.data.loadingMore) {
			return this;
		}

		const existingRows = Array.isArray(state.data.rows) ? state.data.rows.slice() : [];
		const currentTotal = Math.max(0, Number(state.data.total) || 0);

		if (currentTotal === 0 && existingRows.length === 0) {
			return this;
		}

		if (currentTotal > 0 && existingRows.length >= currentTotal) {
			return this;
		}

		const pageSize = Math.max(1, Number(options.pageSize) || Number(state.query.pageSize) || 1);
		const lastLoadedPage = Math.max(0, Number(state.data.lastLoadedPage) || 0);
		const nextPage = Math.max(1, Number(options.page) || (lastLoadedPage > 0 ? lastLoadedPage + 1 : 1));
		const loadSequence = this.nextLoadSequence();

		this.store.setState({
			data: {
				loadingMore: true,
				error: null
			}
		});

		this.events.emit('data:loading', {
			grid: this,
			mode: 'append',
			page: nextPage
		});

		try {
			const result = await this.dataController.load({
				...options,
				mode: 'append',
				page: nextPage,
				pageSize
			});

			if (!this.isActiveLoadSequence(loadSequence)) {
				return this;
			}

			const columns = this.resolveLoadedColumns(result);
			const combinedRows = existingRows.concat(result.rows);
			const combinedTotal = Math.max(currentTotal, Number(result.total) || 0, combinedRows.length);

			this.store.setState({
				columns,
				data: {
					rows: combinedRows,
					total: combinedTotal,
					loading: false,
					loadingMore: false,
					error: null,
					lastLoadedPage: nextPage
				}
			});

			this.events.emit('data:loaded', {
				grid: this,
				result,
				mode: 'append',
				page: nextPage,
				appendedCount: result.rows.length,
				totalLoaded: combinedRows.length
			});

			this.events.emit('data:appended', {
				grid: this,
				result,
				page: nextPage,
				appendedCount: result.rows.length,
				totalLoaded: combinedRows.length
			});
		} catch (error) {
			if (!this.isActiveLoadSequence(loadSequence)) {
				return this;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			this.store.setState({
				data: {
					loading: false,
					loadingMore: false,
					error: errorMessage
				}
			});

			this.events.emit('data:error', {
				grid: this,
				error: errorMessage,
				mode: 'append',
				page: nextPage
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
			loadingMore: state.data.loadingMore === true,
			loadedRowCount: Array.isArray(state.data.rows) ? state.data.rows.length : 0,
			lastLoadedPage: Math.max(0, Number(state.data.lastLoadedPage) || 0),
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

	moveColumn(fromKey, toKey, position = 'before') {
		const sourceKey = String(fromKey || '');
		const targetKey = String(toKey || '');
		const targetPosition = position === 'after' ? 'after' : 'before';

		if (!sourceKey || !targetKey || sourceKey === targetKey) {
			return this;
		}

		const currentColumns = this.store.peek().columns || [];
		const beforeOrderSignature = currentColumns.map((column) => column.key).join('|');
		const columns = currentColumns.map((column) => {
			return {
				...column
			};
		});

		const fromIndex = columns.findIndex((column) => column.key === sourceKey);
		const toIndex = columns.findIndex((column) => column.key === targetKey);

		if (fromIndex === -1 || toIndex === -1) {
			return this;
		}

		const fromColumn = columns[fromIndex];
		const toColumn = columns[toIndex];

		if (isUtilityColumn(fromColumn) || isUtilityColumn(toColumn)) {
			return this;
		}

		if (resolveEffectivePinnedSide(fromColumn) !== resolveEffectivePinnedSide(toColumn)) {
			return this;
		}

		const [movedColumn] = columns.splice(fromIndex, 1);
		const adjustedTargetIndex = columns.findIndex((column) => column.key === targetKey);

		if (adjustedTargetIndex === -1) {
			return this;
		}

		const insertIndex = targetPosition === 'after'
			? adjustedTargetIndex + 1
			: adjustedTargetIndex;

		columns.splice(insertIndex, 0, movedColumn);

		const normalizedColumns = normalizeColumnPinning(columns);
		const afterOrderSignature = normalizedColumns.map((column) => column.key).join('|');

		if (beforeOrderSignature === afterOrderSignature) {
			return this;
		}

		this.store.setState({
			columns: normalizedColumns
		});

		this.events.emit('columnOrder:changed', {
			grid: this,
			fromKey: sourceKey,
			toKey: targetKey,
			position: targetPosition
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


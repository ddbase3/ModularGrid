import {
	AjaxAdapter,
	BulkActionsPlugin,
	CardViewPlugin,
	ColumnVisibilityPlugin,
	ExportPlugin,
	FiltersPlugin,
	HeaderMenuPlugin,
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	ResponsiveViewPlugin,
	RowActionsPlugin,
	RowDetailPlugin,
	SearchPlugin,
	SelectionPlugin,
	SessionStoragePlugin,
	SplitDetailViewPlugin,
	SummaryPlugin,
	ViewSwitcherPlugin
} from '../../src/index.js';

const ENDPOINT_URL = 'https://base3.de/modulargriddemoservice.json';

const SORT_TYPES = {
	id: 'int',
	firstname: 'string',
	lastname: 'string',
	city: 'string',
	status: 'string',
	category: 'string',
	score: 'int',
	amount: 'decimal',
	rating: 'float',
	created: 'datetime',
	changed: 'datetime',
	last_login: 'datetime'
};

const layout = {
	type: 'stack',
	className: 'mg-layout-root',
	children: [
		{
			type: 'row',
			className: 'workspace-top-row',
			children: [
				{
					type: 'zone',
					key: 'controlsZone',
					className: 'workspace-panel workspace-panel--controls'
				},
				{
					type: 'zone',
					key: 'viewZone',
					className: 'workspace-panel workspace-panel--views'
				},
				{
					type: 'zone',
					key: 'actionsZone',
					className: 'workspace-panel workspace-panel--actions'
				}
			]
		},
		{
			type: 'view',
			key: 'main',
			className: 'workspace-main'
		},
		{
			type: 'row',
			className: 'workspace-bottom-row',
			children: [
				{
					type: 'zone',
					key: 'statusZone',
					className: 'workspace-panel workspace-panel--status'
				},
				{
					type: 'zone',
					key: 'footerPaging',
					className: 'workspace-panel workspace-panel--paging'
				}
			]
		}
	]
};

const logElement = document.querySelector('#extended-ajax-log');

function setLog(message) {
	logElement.innerHTML = `<strong>Last action:</strong> ${message}`;
}

function isEmptyValue(value) {
	return value === null || value === undefined || value === '';
}

function getText(value, placeholder = '—') {
	if (isEmptyValue(value)) {
		return placeholder;
	}

	return String(value);
}

function getFullName(row) {
	return [row.firstname, row.lastname].filter(Boolean).join(' ').trim() || `#${row.id}`;
}

function formatDateTime(value) {
	if (!value) {
		return '—';
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return String(value);
	}

	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

function formatCurrency(value) {
	if (value === null || value === undefined || value === '') {
		return '—';
	}

	const number = Number(value);

	if (Number.isNaN(number)) {
		return String(value);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'EUR'
	}).format(number);
}

function renderStatus(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-pill-row';

	const status = document.createElement('span');
	status.className = 'demo-pill demo-pill-strong';
	status.textContent = getText(value);

	const category = document.createElement('span');
	category.className = 'demo-pill';
	category.textContent = getText(row.category);

	const verified = document.createElement('span');
	verified.className = 'demo-pill';
	verified.textContent = row.is_verified ? 'Verified' : 'Unverified';

	wrapper.appendChild(status);
	wrapper.appendChild(category);
	wrapper.appendChild(verified);

	return wrapper;
}

function renderPerson(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const main = document.createElement('div');
	main.className = 'demo-cell-main';
	main.textContent = getFullName(row);

	const sub = document.createElement('div');
	sub.className = 'demo-cell-sub';
	sub.textContent = getText(row.email);

	wrapper.appendChild(main);
	wrapper.appendChild(sub);

	return wrapper;
}

function renderActivity(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const main = document.createElement('div');
	main.className = 'demo-cell-main';
	main.textContent = formatDateTime(row.changed);

	const sub = document.createElement('div');
	sub.className = 'demo-cell-sub';
	sub.textContent = `Login ${formatDateTime(row.last_login)}`;

	wrapper.appendChild(main);
	wrapper.appendChild(sub);

	return wrapper;
}

function buildFilterPayload(filters) {
	const result = {};

	Object.entries(filters || {}).forEach(([key, value]) => {
		if (value === '' || value === null || value === undefined) {
			return;
		}

		result[key] = value;
	});

	return result;
}

let grid = null;

const adapter = new AjaxAdapter({
	url: ENDPOINT_URL,
	method: 'POST',
	rowsPath: 'data',
	totalPath: 'total',
	mapRequest(request) {
		const state = grid ? grid.getState() : {};
		const filters = buildFilterPayload(state.filters || {});
		const sortKey = request.sortKey || 'lastname';
		const sortDirection = request.sortDirection || 'asc';

		return {
			mode: 'page',
			page: request.page || 1,
			pageSize: request.pageSize || 10,
			search: request.search || '',
			sort: [
				{
					key: sortKey,
					dir: sortDirection,
					type: SORT_TYPES[sortKey] || 'string'
				}
			],
			filters,
			group: []
		};
	}
});

grid = new ModularGrid('#extended-ajax-grid', {
	layout,
	adapter,
	dataMode: 'server',
	server: {
		searchDebounceMs: 220,
		watchStateKeys: ['query', 'filters']
	},
	view: {
		mode: 'table'
	},
	pageSize: 10,
	pageSizeOptions: [5, 10, 20, 50],
	sort: {
		key: 'lastname',
		direction: 'asc'
	},
	plugins: [
		SearchPlugin,
		FiltersPlugin,
		HeaderMenuPlugin,
		PageSizePlugin,
		InfoPlugin,
		SummaryPlugin,
		PagingPlugin,
		SelectionPlugin,
		RowActionsPlugin,
		BulkActionsPlugin,
		ExportPlugin,
		ColumnVisibilityPlugin,
		ResetPlugin,
		SessionStoragePlugin,
		CardViewPlugin,
		SplitDetailViewPlugin,
		ViewSwitcherPlugin,
		ResponsiveViewPlugin,
		RowDetailPlugin
	],
	pluginOptions: {
		search: {
			zone: 'controlsZone',
			order: 10,
			label: 'Search',
			placeholder: 'Search all server fields'
		},
		filters: {
			zone: 'controlsZone',
			order: 20,
			stateKey: 'filters',
			showClearButton: true,
			clearLabel: 'Clear filters',
			fields: [
				{
					key: 'status',
					label: 'Status',
					type: 'select',
					options: [
						{ value: '', label: 'All statuses' },
						{ value: 'active', label: 'Active' },
						{ value: 'pending', label: 'Pending' },
						{ value: 'new', label: 'New' }
					]
				},
				{
					key: 'category',
					label: 'Category',
					type: 'select',
					options: [
						{ value: '', label: 'All categories' },
						{ value: 'standard', label: 'Standard' },
						{ value: 'premium', label: 'Premium' }
					]
				},
				{
					key: 'is_verified',
					label: 'Verified',
					type: 'select',
					options: [
						{ value: '', label: 'All' },
						{ value: '1', label: 'Yes' },
						{ value: '0', label: 'No' }
					]
				},
				{
					key: 'city',
					label: 'City',
					type: 'text',
					placeholder: 'City',
					width: 120
				}
			]
		},
		headerMenu: {
			showSortActions: true,
			showClearSortAction: true,
			showHideColumnAction: true
		},
		viewSwitcher: {
			zone: 'viewZone',
			order: 10,
			include: ['table', 'cards', 'split'],
			labels: {
				table: 'Table',
				cards: 'Cards',
				split: 'Split'
			}
		},
		bulkActions: {
			zone: 'actionsZone',
			order: 5,
			items: [
				{
					key: 'inspect-selection',
					label: 'Inspect selected',
					onClick({ selectedRowIds }) {
						setLog(`Selected IDs: ${selectedRowIds.join(', ') || 'none'}`);
					}
				},
				{
					key: 'clear-selection',
					label: 'Clear selection',
					command: 'clearSelection'
				}
			]
		},
		pageSize: {
			zone: 'actionsZone',
			order: 10,
			label: 'Rows'
		},
		export: {
			zone: 'actionsZone',
			order: 20,
			fileName: 'modulargrid-multifunction',
			actions: [
				{
					key: 'csv-current',
					label: 'CSV page',
					format: 'csv',
					scope: 'current'
				},
				{
					key: 'json-selected',
					label: 'JSON selected',
					format: 'json',
					scope: 'selected'
				}
			]
		},
		columnVisibility: {
			zone: 'actionsZone',
			order: 30,
			buttonLabel: 'Columns'
		},
		reset: {
			zone: 'actionsZone',
			order: 40,
			label: 'Reset',
			sections: ['query', 'filters', 'columns', 'selection', 'view', 'detailView', 'splitDetailView']
		},
		sessionStorage: {
			key: 'modulargrid-demo-multifunction-ajax',
			sections: ['query', 'filters', 'columns', 'selection', 'view', 'detailView', 'splitDetailView']
		},
		info: {
			zone: 'statusZone',
			order: 10
		},
		summary: {
			zone: 'statusZone',
			order: 20,
			scope: 'page',
			metrics: [
				{
					type: 'count',
					label: 'Rows'
				},
				{
					key: 'amount',
					type: 'sum',
					label: 'Amount',
					format: 'currency',
					decimals: 2
				},
				{
					key: 'score',
					type: 'avg',
					label: 'Avg score',
					decimals: 1
				}
			]
		},
		rowActions: {
			items: [
				{
					key: 'open',
					label: 'Open',
					onClick({ row }) {
						setLog(`Open ${getFullName(row)}`);
					}
				},
				{
					key: 'message',
					label: 'Message',
					onClick({ row }) {
						setLog(`Message ${row.email || getFullName(row)}`);
					}
				}
			]
		},
		cardView: {
			titleKey: 'firstname',
			subtitleKey: 'lastname'
		},
		splitDetailView: {
			rowIdKey: 'id',
			titleKey: 'firstname',
			subtitleKey: 'lastname',
			previewKeys: ['city', 'status']
		},
		rowDetail: {
			rowIdKey: 'id',
			clearOnDataReload: true
		},
		responsiveView: {
			breakpoint: 980,
			narrowMode: 'cards',
			wideModeFallback: 'table'
		}
	},
	columns: [
		{
			key: 'firstname',
			label: 'Person',
			render(value, row) {
				return renderPerson(value, row);
			}
		},
		{ key: 'lastname', label: 'Last name', visible: false },
		{ key: 'city', label: 'City' },
		{
			key: 'status',
			label: 'Status',
			render(value, row) {
				return renderStatus(value, row);
			}
		},
		{ key: 'category', label: 'Category', visible: false },
		{ key: 'score', label: 'Score' },
		{
			key: 'amount',
			label: 'Amount',
			render(value) {
				return formatCurrency(value);
			}
		},
		{
			key: 'changed',
			label: 'Changed',
			render(value, row) {
				return renderActivity(value, row);
			}
		},
		{
			key: 'is_verified',
			label: 'Verified',
			render(value) {
				return value ? 'Yes' : 'No';
			}
		},
		{ key: 'email', label: 'Email', visible: false },
		{ key: 'phone', label: 'Phone', visible: false }
	]
});

grid.on('export:created', ({ format, scope, rowCount, fileName }) => {
	setLog(`Exported ${rowCount} rows as ${format.toUpperCase()} from "${scope}" into ${fileName}`);
});

grid.on('bulkAction:run', ({ selectedRowIds }) => {
	setLog(`Bulk action on IDs: ${selectedRowIds.join(', ') || 'none'}`);
});

await grid.init();

window.extendedAjaxGrid = grid;

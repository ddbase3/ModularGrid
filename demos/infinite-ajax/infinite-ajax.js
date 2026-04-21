import {
	AjaxAdapter,
	BulkActionsPlugin,
	ColumnVisibilityPlugin,
	ExportPlugin,
	FiltersPlugin,
	HeaderMenuPlugin,
	InfoPlugin,
	InfiniteScrollPlugin,
	ModularGrid,
	ResetPlugin,
	RowActionsPlugin,
	RowDetailPlugin,
	SearchPlugin,
	SelectionPlugin,
	SessionStoragePlugin
} from '../../src/index.js';

const ENDPOINT_URL = 'https://base3.de/modulargriddemoservice.json';
const BATCH_SIZE = 50;

const SORT_TYPES = {
	id: 'int',
	firstname: 'string',
	lastname: 'string',
	email: 'string',
	street: 'string',
	housenumber: 'string',
	zipcode: 'string',
	city: 'string',
	country: 'string',
	birthday: 'date',
	is_active: 'bool',
	is_verified: 'bool',
	children_count: 'int',
	score: 'int',
	amount: 'decimal',
	rating: 'float',
	latitude: 'float',
	longitude: 'float',
	phone: 'string',
	website: 'string',
	status: 'string',
	category: 'string',
	free_text: 'string',
	notes: 'string',
	created: 'datetime',
	changed: 'datetime',
	last_login: 'datetime',
	deleted_at: 'datetime'
};

const layout = {
	type: 'stack',
	className: 'mg-layout-root',
	children: [
		{
			type: 'zone',
			key: 'topLine1',
			className: 'infinite-panel infinite-panel--top-line-1'
		},
		{
			type: 'zone',
			key: 'topLine2',
			className: 'infinite-panel infinite-panel--top-line-2'
		},
		{
			type: 'view',
			key: 'main',
			className: 'infinite-main'
		},
		{
			type: 'zone',
			key: 'statusZone',
			className: 'infinite-panel infinite-panel--status'
		}
	]
};

const logElement = document.querySelector('#infinite-ajax-log');

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

function formatDate(value) {
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
		day: '2-digit'
	}).format(date);
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

function formatNumber(value, maximumFractionDigits = 0) {
	if (value === null || value === undefined || value === '') {
		return '—';
	}

	const number = Number(value);

	if (Number.isNaN(number)) {
		return String(value);
	}

	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits
	}).format(number);
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

function renderAddress(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const main = document.createElement('div');
	main.className = 'demo-cell-main';
	main.textContent = `${getText(row.street)} ${getText(row.housenumber, '')}`.trim();

	const sub = document.createElement('div');
	sub.className = 'demo-cell-sub';
	sub.textContent = `${getText(row.zipcode)} ${getText(row.city)} · ${getText(row.country)}`;

	wrapper.appendChild(main);
	wrapper.appendChild(sub);

	return wrapper;
}

function renderStatus(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const pills = document.createElement('div');
	pills.className = 'demo-pill-row';

	const status = document.createElement('span');
	status.className = 'demo-pill demo-pill-strong';
	status.textContent = getText(row.status);

	const category = document.createElement('span');
	category.className = 'demo-pill';
	category.textContent = getText(row.category);

	const verified = document.createElement('span');
	verified.className = 'demo-pill';
	verified.textContent = row.is_verified ? 'Verified' : 'Unverified';

	pills.appendChild(status);
	pills.appendChild(category);
	pills.appendChild(verified);

	wrapper.appendChild(pills);
	return wrapper;
}

function renderMetrics(value, row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const main = document.createElement('div');
	main.className = 'demo-cell-main';
	main.textContent = formatCurrency(row.amount);

	const sub = document.createElement('div');
	sub.className = 'demo-cell-sub';
	sub.textContent = `Score ${formatNumber(row.score)} · Rating ${formatNumber(row.rating, 1)}`;

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
	sub.textContent = `Created ${formatDateTime(row.created)} · Login ${formatDateTime(row.last_login)}`;

	wrapper.appendChild(main);
	wrapper.appendChild(sub);

	return wrapper;
}

function renderBirthday(value, row) {
	return formatDate(row.birthday);
}

function buildTextOverview(row) {
	return [getText(row.free_text, ''), getText(row.notes, '')].filter(Boolean).join(' ');
}

function renderTextOverview(value, row) {
	return buildTextOverview(row) || '—';
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

async function postJson(url, payload) {
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	return response.json();
}

async function loadRemoteDetail(row) {
	const response = await postJson(ENDPOINT_URL, {
		mode: 'detail',
		id: row.id
	});

	if (!response?.found || !response.detail) {
		throw new Error(`No detail data returned for row ${row.id}`);
	}

	return response.detail;
}

function createDetailLoadingPlaceholder(row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-remote-detail-status';
	wrapper.textContent = `Loading server detail for ${getFullName(row)}...`;

	return wrapper;
}

function createDetailErrorPlaceholder(row, error) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-remote-detail-status demo-remote-detail-status-error';
	wrapper.textContent = `Failed to load server detail for ${getFullName(row)}: ${error || 'Unknown error'}`;

	return wrapper;
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
			pageSize: request.pageSize || BATCH_SIZE,
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

grid = new ModularGrid('#infinite-ajax-grid', {
	layout,
	adapter,
	dataMode: 'server',
	server: {
		searchDebounceMs: 220,
		watchStateKeys: ['query', 'filters']
	},
	features: {
		paging: false
	},
	pageSize: BATCH_SIZE,
	sort: {
		key: 'lastname',
		direction: 'asc'
	},
	plugins: [
		SearchPlugin,
		FiltersPlugin,
		HeaderMenuPlugin,
		InfoPlugin,
		SelectionPlugin,
		RowActionsPlugin,
		BulkActionsPlugin,
		ExportPlugin,
		ColumnVisibilityPlugin,
		ResetPlugin,
		SessionStoragePlugin,
		RowDetailPlugin,
		InfiniteScrollPlugin
	],
	pluginOptions: {
		search: {
			zone: 'topLine1',
			order: 10,
			label: 'Search',
			placeholder: 'Search all server fields'
		},
		filters: {
			zone: 'topLine1',
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
		bulkActions: {
			zone: 'topLine2',
			order: 10,
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
		export: {
			zone: 'topLine2',
			order: 20,
			fileName: 'modulargrid-infinite-ajax',
			actions: [
				{
					key: 'csv-loaded',
					label: 'CSV loaded',
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
			zone: ''
		},
		reset: {
			zone: 'topLine2',
			order: 30,
			label: 'Reset',
			sections: ['query', 'filters', 'columns', 'selection', 'detailView']
		},
		sessionStorage: {
			key: 'modulargrid-demo-infinite-ajax',
			sections: ['query', 'filters', 'columns', 'selection', 'detailView']
		},
		info: {
			zone: 'statusZone',
			order: 10,
			displayMode: 'loaded'
		},
		rowActions: {
			headerMenu: {
				enabled: true,
				buttonLabel: '⋯',
				items: [
					{
						type: 'columnVisibility',
						label: 'Columns',
						showReset: true,
						resetLabel: 'Reset columns'
					}
				]
			},
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
		rowDetail: {
			rowIdKey: 'id',
			clearOnDataReload: true,
			asyncDetail: {
				load({ row }) {
					return loadRemoteDetail(row);
				},
				renderLoading({ row }) {
					return createDetailLoadingPlaceholder(row);
				},
				renderError({ row, error }) {
					return createDetailErrorPlaceholder(row, error);
				}
			}
		},
		infiniteScroll: {
			threshold: 180,
			pageSize: BATCH_SIZE,
			containerSelector: '.mg-table-scroll'
		}
	},
	columns: [
		{
			key: 'person',
			label: 'Person',
			width: 260,
			headerMenu: {
				defaultSortKey: 'lastname',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'lastname', label: 'Last name' },
					{ key: 'firstname', label: 'First name' },
					{ key: 'email', label: 'Email' }
				]
			},
			render(value, row) {
				return renderPerson(value, row);
			}
		},
		{
			key: 'address',
			label: 'Address',
			width: 260,
			headerMenu: {
				defaultSortKey: 'city',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'street', label: 'Street' },
					{ key: 'zipcode', label: 'Zip code' },
					{ key: 'city', label: 'City' },
					{ key: 'country', label: 'Country' }
				]
			},
			render(value, row) {
				return renderAddress(value, row);
			}
		},
		{
			key: 'status_display',
			label: 'Status',
			width: 180,
			headerMenu: {
				defaultSortKey: 'status',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'status', label: 'Status' },
					{ key: 'category', label: 'Category' },
					{ key: 'is_verified', label: 'Verified' }
				]
			},
			render(value, row) {
				return renderStatus(value, row);
			}
		},
		{
			key: 'metrics',
			label: 'Metrics',
			width: 190,
			headerMenu: {
				defaultSortKey: 'amount',
				defaultSortDirection: 'desc',
				sortOptions: [
					{ key: 'amount', label: 'Amount' },
					{ key: 'score', label: 'Score' },
					{ key: 'rating', label: 'Rating' }
				]
			},
			render(value, row) {
				return renderMetrics(value, row);
			}
		},
		{
			key: 'activity',
			label: 'Activity',
			width: 220,
			headerMenu: {
				defaultSortKey: 'changed',
				defaultSortDirection: 'desc',
				sortOptions: [
					{ key: 'changed', label: 'Changed' },
					{ key: 'created', label: 'Created' },
					{ key: 'last_login', label: 'Last login' }
				]
			},
			render(value, row) {
				return renderActivity(value, row);
			}
		},
		{
			key: 'text_overview',
			label: 'Text overview',
			width: 360,
			textDisplay: {
				strategy: 'clamp',
				lines: 3,
				expandable: true
			},
			headerMenu: {
				defaultSortKey: 'notes',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'free_text', label: 'Free text' },
					{ key: 'notes', label: 'Notes' }
				]
			},
			render(value, row) {
				return renderTextOverview(value, row);
			}
		},
		{
			key: 'city',
			label: 'City',
			width: 150,
			visible: false,
			headerMenu: {
				defaultSortKey: 'city',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'city', label: 'City' }
				]
			}
		},
		{
			key: 'country',
			label: 'Country',
			width: 150,
			visible: false,
			headerMenu: {
				defaultSortKey: 'country',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'country', label: 'Country' }
				]
			}
		},
		{
			key: 'birthday_display',
			label: 'Birthday',
			width: 130,
			visible: false,
			headerMenu: {
				defaultSortKey: 'birthday',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'birthday', label: 'Birthday' }
				]
			},
			render(value, row) {
				return renderBirthday(value, row);
			}
		},
		{
			key: 'free_text',
			label: 'Free text',
			width: 320,
			visible: false,
			textDisplay: {
				strategy: 'clamp',
				lines: 3,
				expandable: true
			},
			headerMenu: {
				defaultSortKey: 'free_text',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'free_text', label: 'Free text' }
				]
			}
		},
		{
			key: 'notes',
			label: 'Notes',
			width: 360,
			visible: false,
			textDisplay: {
				strategy: 'clamp',
				lines: 4,
				expandable: true
			},
			headerMenu: {
				defaultSortKey: 'notes',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'notes', label: 'Notes' }
				]
			}
		}
	]
});

grid.on('export:created', ({ format, scope, rowCount, fileName }) => {
	setLog(`Exported ${rowCount} rows as ${format.toUpperCase()} from "${scope}" into ${fileName}`);
});

grid.on('bulkAction:run', ({ selectedRowIds }) => {
	setLog(`Bulk action on IDs: ${selectedRowIds.join(', ') || 'none'}`);
});

grid.on('data:appended', ({ appendedCount, totalLoaded }) => {
	setLog(`Loaded ${appendedCount} more records. ${totalLoaded} records are currently loaded.`);
});

grid.on('detail:loaded', ({ rowId, payload }) => {
	const childCount = Array.isArray(payload?.children) ? payload.children.length : 0;
	setLog(`Loaded server detail for row ${rowId} with ${childCount} nested child item${childCount === 1 ? '' : 's'}.`);
});

grid.on('detail:error', ({ rowId, error }) => {
	setLog(`Failed to load server detail for row ${rowId}: ${error}`);
});

grid.on('detail:loaded', ({ rowId }) => {
	setLog(`Loaded server detail for row ${rowId}.`);
});

await grid.init();
setLog(`Initial batch loaded. Scroll to append the next ${BATCH_SIZE} records automatically.`);

window.infiniteAjaxGrid = grid;


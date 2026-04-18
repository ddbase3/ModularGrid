import {
	AjaxAdapter,
	BulkActionsPlugin,
	CardViewPlugin,
	ColumnVisibilityPlugin,
	ExportPlugin,
	FiltersPlugin,
	GroupingPlugin,
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
	email: 'string',
	street: 'string',
	housenumber: 'string',
	zipcode: 'string',
	city: 'string',
	country: 'string',
	status: 'string',
	category: 'string',
	is_verified: 'bool',
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
			type: 'zone',
			key: 'topLine1',
			className: 'workspace-panel workspace-panel--top-line-1'
		},
		{
			type: 'zone',
			key: 'topLine2',
			className: 'workspace-panel workspace-panel--top-line-2'
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
		GroupingPlugin,
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
		grouping: {
			zone: 'topLine1',
			order: 30,
			label: 'Group by',
			clearLabel: 'No grouping',
			fields: [
				{ key: 'status', label: 'Status' },
				{ key: 'category', label: 'Category' },
				{ key: 'city', label: 'City' },
				{
					key: 'is_verified',
					label: 'Verified',
					valueFormatter(value) {
						return value ? 'Yes' : 'No';
					}
				}
			],
			summary: {
				enabled: true,
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
			}
		},
		headerMenu: {
			showSortActions: true,
			showClearSortAction: true,
			showHideColumnAction: true
		},
		viewSwitcher: {
			zone: 'topLine2',
			order: 10,
			include: ['table', 'cards', 'split'],
			labels: {
				table: 'Table',
				cards: 'Cards',
				split: 'Split'
			}
		},
		bulkActions: {
			zone: 'topLine2',
			order: 20,
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
			zone: 'topLine2',
			order: 30,
			label: 'Rows'
		},
		export: {
			zone: 'topLine2',
			order: 40,
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
			zone: ''
		},
		reset: {
			zone: 'topLine2',
			order: 50,
			label: 'Reset',
			sections: ['query', 'filters', 'grouping', 'columns', 'selection', 'view', 'detailView', 'splitDetailView']
		},
		sessionStorage: {
			key: 'modulargrid-demo-multifunction-ajax',
			sections: ['query', 'filters', 'grouping', 'columns', 'selection', 'view', 'detailView', 'splitDetailView']
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
			key: 'person',
			label: 'Person',
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
			key: 'city',
			label: 'City',
			headerMenu: {
				defaultSortKey: 'city',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'city', label: 'City' }
				]
			}
		},
		{
			key: 'status_display',
			label: 'Status',
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
		}
	]
});

grid.on('export:created', ({ format, scope, rowCount, fileName }) => {
	setLog(`Exported ${rowCount} rows as ${format.toUpperCase()} from "${scope}" into ${fileName}`);
});

grid.on('bulkAction:run', ({ selectedRowIds }) => {
	setLog(`Bulk action on IDs: ${selectedRowIds.join(', ') || 'none'}`);
});

grid.on('grouping:changed', ({ key }) => {
	setLog(`Grouping changed to ${key || 'none'}`);
});

await grid.init();

window.extendedAjaxGrid = grid;

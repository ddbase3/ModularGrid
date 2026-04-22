import {
	AjaxAdapter,
	BulkActionsPlugin,
	ColumnVisibilityPlugin,
	ExportPlugin,
	FiltersPlugin,
	GroupingPlugin,
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

const ENDPOINT_URL = 'https://base3.de/modulargridgroupeddemoservice.json';
const BATCH_SIZE = 50;
const GROUP_FIELD_OPTIONS = [
	{ key: 'city', label: 'City' },
	{ key: 'status', label: 'Status' },
	{ key: 'country', label: 'Country' },
	{ key: 'category', label: 'Category' },
	{ key: 'is_verified', label: 'Verified' }
];
const GROUP_METRIC_SORT_KEYS = new Set([
	'group_count',
	'group_amount_sum',
	'group_rating_avg',
	'group_last_changed',
	'group_members_preview',
	'group_anchor_id'
]);
const NORMAL_SORT_FALLBACK = {
	key: 'lastname',
	direction: 'asc',
	type: 'string'
};
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
	deleted_at: 'datetime',
	group_count: 'int',
	group_amount_sum: 'decimal',
	group_rating_avg: 'float',
	group_last_changed: 'datetime',
	group_members_preview: 'string',
	group_anchor_id: 'int'
};

const layout = {
	type: 'stack',
	className: 'mg-layout-root',
	children: [
		{
			type: 'zone',
			key: 'topLine1',
			className: 'grouping-panel grouping-panel--top-line-1'
		},
		{
			type: 'zone',
			key: 'topLine2',
			className: 'grouping-panel grouping-panel--top-line-2'
		},
		{
			type: 'view',
			key: 'main',
			className: 'grouping-main'
		},
		{
			type: 'zone',
			key: 'statusZone',
			className: 'grouping-panel grouping-panel--status'
		}
	]
};

const logElement = document.querySelector('#grouping-infinite-ajax-log');

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

function getFieldLabel(key) {
	return GROUP_FIELD_OPTIONS.find((option) => option.key === key)?.label || key;
}

function formatBoolean(value) {
	if (value === true) {
		return 'Yes';
	}

	if (value === false) {
		return 'No';
	}

	return getText(value);
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

function getFullName(row) {
	return [row.firstname, row.lastname].filter(Boolean).join(' ').trim() || `#${row.id}`;
}

function normalizeGroupFields(fields) {
	const allowedKeys = new Set(GROUP_FIELD_OPTIONS.map((option) => option.key));
	const normalized = [];
	const used = new Set();

	(fields || []).forEach((field) => {
		const key = String(field || '').trim();

		if (!key || !allowedKeys.has(key) || used.has(key)) {
			return;
		}

		used.add(key);
		normalized.push(key);
	});

	return normalized;
}

function getGroupFields() {
	if (!grid) {
		return [];
	}

	return normalizeGroupFields(grid.getState().grouping?.keys || []);
}

function buildGroupPayload(fields) {
	return normalizeGroupFields(fields).map((key) => {
		return {
			key,
			dir: 'asc'
		};
	});
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

function resolveSortForRequest(request) {
	const activeGroupFields = getGroupFields();
	const hasGrouping = activeGroupFields.length > 0;
	let sortKey = request.sortKey || NORMAL_SORT_FALLBACK.key;
	let sortDirection = request.sortDirection || NORMAL_SORT_FALLBACK.direction;

	if (hasGrouping) {
		const allowedGroupedSorts = new Set([...activeGroupFields, ...GROUP_METRIC_SORT_KEYS]);

		if (!allowedGroupedSorts.has(sortKey)) {
			sortKey = activeGroupFields[0];
			sortDirection = 'asc';
		}
	}
	else if (GROUP_METRIC_SORT_KEYS.has(sortKey)) {
		sortKey = NORMAL_SORT_FALLBACK.key;
		sortDirection = NORMAL_SORT_FALLBACK.direction;
	}

	return {
		key: sortKey,
		direction: sortDirection,
		type: SORT_TYPES[sortKey] || 'string'
	};
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
	if (row.is_group_row === true) {
		const response = await postJson(ENDPOINT_URL, {
			mode: 'grouped-detail',
			search: grid.getState().query?.search || '',
			filters: buildFilterPayload(grid.getState().filters || {}),
			group: buildGroupPayload(getGroupFields()),
			groupValues: row.group_values || {}
		});

		if (!response?.found || !response.detail) {
			throw new Error(`No grouped detail data returned for ${getText(row.group_title, row.id)}`);
		}

		return response.detail;
	}

	const response = await postJson(ENDPOINT_URL, {
		mode: 'detail',
		id: row.id
	});

	if (!response?.found || !response.detail) {
		throw new Error(`No detail data returned for row ${row.id}`);
	}

	return response.detail;
}

function createCellStack(mainText, subText = '') {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-cell-stack';

	const main = document.createElement('div');
	main.className = 'demo-cell-main';
	main.textContent = mainText;
	wrapper.appendChild(main);

	if (subText) {
		const sub = document.createElement('div');
		sub.className = 'demo-cell-sub';
		sub.textContent = subText;
		wrapper.appendChild(sub);
	}

	return wrapper;
}

function createPillRow(values, strongIndex = 0) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-pill-row';

	values.forEach((value, index) => {
		if (!value) {
			return;
		}

		const pill = document.createElement('span');
		pill.className = `demo-pill${index === strongIndex ? ' demo-pill-strong' : ''}`;
		pill.textContent = value;
		wrapper.appendChild(pill);
	});

	return wrapper;
}

function renderPrimary(value, row) {
	if (row.is_group_row === true) {
		const rowLabel = row.group_count === 1 ? 'entry' : 'entries';
		const levelLabel = getGroupFields().map(getFieldLabel).join(' → ') || 'Grouped rows';

		return createCellStack(
			getText(row.group_title, 'Grouped rows'),
			`${formatNumber(row.group_count)} ${rowLabel} · ${levelLabel}`
		);
	}

	return createCellStack(getFullName(row), getText(row.email));
}

function renderContext(value, row) {
	if (row.is_group_row === true) {
		const groupLabels = Array.isArray(row.group_labels) ? row.group_labels.join(' · ') : '';
		const anchorLabel = row.group_anchor_id ? `Anchor row ${formatNumber(row.group_anchor_id)}` : '';
		return createCellStack(groupLabels || 'Grouped values', anchorLabel);
	}

	return createCellStack(
		`${getText(row.street)} ${getText(row.housenumber, '')}`.trim(),
		`${getText(row.zipcode)} ${getText(row.city)} · ${getText(row.country)}`
	);
}

function renderStatus(value, row) {
	if (row.is_group_row === true) {
		const pillValues = getGroupFields().map((key) => {
			const rawValue = row.group_values?.[key];
			const displayValue = key === 'is_verified' ? formatBoolean(rawValue) : getText(rawValue);

			return `${getFieldLabel(key)}: ${displayValue}`;
		});

		return createPillRow(pillValues, 0);
	}

	return createPillRow([
		getText(row.status),
		getText(row.category),
		row.is_verified ? 'Verified' : 'Unverified'
	], 0);
}

function renderMetrics(value, row) {
	if (row.is_group_row === true) {
		return createCellStack(
			formatCurrency(row.group_amount_sum),
			`Average rating ${formatNumber(row.group_rating_avg, 1)}`
		);
	}

	return createCellStack(
		formatCurrency(row.amount),
		`Score ${formatNumber(row.score)} · Rating ${formatNumber(row.rating, 1)}`
	);
}

function renderActivity(value, row) {
	if (row.is_group_row === true) {
		return createCellStack(
			formatDateTime(row.group_last_changed),
			`${formatNumber(row.group_count)} row${row.group_count === 1 ? '' : 's'} in current group`
		);
	}

	return createCellStack(
		formatDateTime(row.changed),
		`Created ${formatDateTime(row.created)} · Login ${formatDateTime(row.last_login)}`
	);
}

function buildTextOverview(row) {
	return [getText(row.free_text, ''), getText(row.notes, '')].filter(Boolean).join(' ');
}

function renderTextOverview(value, row) {
	if (row.is_group_row === true) {
		return getText(row.group_members_preview);
	}

	return buildTextOverview(row) || '—';
}

function renderBirthday(value, row) {
	if (row.is_group_row === true) {
		return '—';
	}

	return formatDate(row.birthday);
}

function createDetailLoadingPlaceholder(row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-remote-detail-status';

	if (row.is_group_row === true) {
		wrapper.textContent = `Loading grouped child table for ${getText(row.group_title, row.id)}...`;
	}
	else {
		wrapper.textContent = `Loading server detail for ${getFullName(row)}...`;
	}

	return wrapper;
}

function createDetailErrorPlaceholder(row, error) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-remote-detail-status demo-remote-detail-status-error';

	if (row.is_group_row === true) {
		wrapper.textContent = `Failed to load grouped child table for ${getText(row.group_title, row.id)}: ${error || 'Unknown error'}`;
	}
	else {
		wrapper.textContent = `Failed to load server detail for ${getFullName(row)}: ${error || 'Unknown error'}`;
	}

	return wrapper;
}

function createGroupChildTable(payload) {
	const wrapper = document.createElement('div');
	wrapper.className = 'demo-group-detail';

	const header = document.createElement('div');
	header.className = 'demo-group-detail-header';

	const title = document.createElement('div');
	title.className = 'demo-group-detail-title';
	title.textContent = getText(payload.headline, 'Grouped child rows');
	header.appendChild(title);

	const subtitle = document.createElement('div');
	subtitle.className = 'demo-group-detail-subtitle';
	subtitle.textContent = getText(payload.summary, 'Matching rows');
	header.appendChild(subtitle);

	wrapper.appendChild(header);

	const tableScroll = document.createElement('div');
	tableScroll.className = 'demo-group-child-table-scroll';

	const table = document.createElement('table');
	table.className = 'demo-group-child-table';

	const thead = document.createElement('thead');
	const headRow = document.createElement('tr');

	(payload.columns || []).forEach((column) => {
		const th = document.createElement('th');
		th.textContent = column.label || column.key;
		headRow.appendChild(th);
	});

	thead.appendChild(headRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	const rows = Array.isArray(payload.rows) ? payload.rows : [];

	if (rows.length === 0) {
		const emptyRow = document.createElement('tr');
		const emptyCell = document.createElement('td');
		emptyCell.colSpan = Math.max((payload.columns || []).length, 1);
		emptyCell.className = 'demo-group-child-table-empty';
		emptyCell.textContent = 'No rows found for this group.';
		emptyRow.appendChild(emptyCell);
		tbody.appendChild(emptyRow);
	}
	else {
		rows.forEach((row) => {
			const tr = document.createElement('tr');

			(payload.columns || []).forEach((column) => {
				const td = document.createElement('td');
				td.textContent = getText(row[column.key]);
				tr.appendChild(td);
			});

			tbody.appendChild(tr);
		});
	}

	table.appendChild(tbody);
	tableScroll.appendChild(table);
	wrapper.appendChild(tableScroll);

	return wrapper;
}

function buildRowActionLabel(row) {
	if (row.is_group_row === true) {
		return getText(row.group_title, row.id);
	}

	return getFullName(row);
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
		const groupFields = getGroupFields();
		const sort = resolveSortForRequest(request);

		return {
			mode: groupFields.length > 0 ? 'grouped-page' : 'page',
			page: request.page || 1,
			pageSize: request.pageSize || BATCH_SIZE,
			search: request.search || '',
			sort: [
				{
					key: sort.key,
					dir: sort.direction,
					type: sort.type
				}
			],
			filters,
			group: buildGroupPayload(groupFields)
		};
	}
});

grid = new ModularGrid('#grouping-infinite-ajax-grid', {
	layout,
	adapter,
	dataMode: 'server',
	server: {
		searchDebounceMs: 220,
		watchStateKeys: ['query', 'filters', 'grouping']
	},
	features: {
		paging: false
	},
	pageSize: BATCH_SIZE,
	sort: {
		key: NORMAL_SORT_FALLBACK.key,
		direction: NORMAL_SORT_FALLBACK.direction
	},
	plugins: [
		SearchPlugin,
		FiltersPlugin,
		GroupingPlugin,
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
		grouping: {
			zone: 'topLine2',
			order: 5,
			stateKey: 'grouping',
			label: 'Grouping',
			clearLabel: 'No grouping',
			clearButtonLabel: 'Clear grouping',
			description: 'Toggle fields on or off. The checked order defines the grouping path.',
			fields: GROUP_FIELD_OPTIONS,
			multiple: true,
			control: 'dropdown'
		},
		headerMenu: {
			showSortActions: true,
			showClearSortAction: true,
			showHideColumnAction: true
		},
		selection: {
			isRowSelectable(row) {
				return row?.is_group_row !== true;
			}
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
			fileName: 'modulargrid-grouping-infinite-ajax',
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
			sections: ['query', 'filters', 'columns', 'selection', 'detailView', 'grouping']
		},
		sessionStorage: {
			key: 'modulargrid-demo-grouping-infinite-ajax',
			sections: ['query', 'filters', 'columns', 'selection', 'detailView', 'grouping']
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
						setLog(`Open ${buildRowActionLabel(row)}`);
					}
				},
				{
					key: 'message',
					label: 'Message',
					onClick({ row }) {
						setLog(`Message about ${buildRowActionLabel(row)}`);
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
				render({ payload }) {
					if (payload?.kind === 'grouped-child-table') {
						return createGroupChildTable(payload);
					}

					return null;
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
			key: 'primary',
			label: 'Primary',
			width: 280,
			headerMenu: {
				defaultSortKey: 'lastname',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'lastname', label: 'Last name' },
					{ key: 'firstname', label: 'First name' },
					{ key: 'city', label: 'City' },
					{ key: 'status', label: 'Status' },
					{ key: 'group_count', label: 'Group count' }
				]
			},
			render(value, row) {
				return renderPrimary(value, row);
			}
		},
		{
			key: 'context',
			label: 'Context',
			width: 260,
			headerMenu: {
				defaultSortKey: 'city',
				defaultSortDirection: 'asc',
				sortOptions: [
					{ key: 'city', label: 'City' },
					{ key: 'country', label: 'Country' },
					{ key: 'category', label: 'Category' }
				]
			},
			render(value, row) {
				return renderContext(value, row);
			}
		},
		{
			key: 'status_display',
			label: 'Status',
			width: 190,
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
					{ key: 'rating', label: 'Rating' },
					{ key: 'group_amount_sum', label: 'Group amount sum' },
					{ key: 'group_rating_avg', label: 'Group rating average' }
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
					{ key: 'last_login', label: 'Last login' },
					{ key: 'group_last_changed', label: 'Group last changed' }
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
					{ key: 'notes', label: 'Notes' },
					{ key: 'group_members_preview', label: 'Group members preview' }
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

grid.on('grouping:changed', ({ keys }) => {
	setLog(
		Array.isArray(keys) && keys.length > 0
			? `Grouping active: ${keys.map(getFieldLabel).join(' → ')}`
			: 'Grouping cleared. Back to the normal infinite table.'
	);
});

grid.on('data:appended', ({ appendedCount, totalLoaded }) => {
	setLog(`Loaded ${appendedCount} more rows. ${totalLoaded} rows are currently loaded.`);
});

grid.on('detail:loaded', ({ rowId, row, payload }) => {
	if (row?.is_group_row === true && payload?.kind === 'grouped-child-table') {
		setLog(`Loaded grouped child table for ${getText(row.group_title, rowId)} with ${payload.rows?.length || 0} child rows.`);
		return;
	}

	setLog(`Loaded server detail for row ${rowId}.`);
});

grid.on('detail:error', ({ rowId, error }) => {
	setLog(`Failed to load detail for ${rowId}: ${error}`);
});

await grid.init();
setLog('Initial batch loaded. Start with the normal infinite table or toggle grouping from the toolbar.');

window.groupingInfiniteAjaxGrid = grid;


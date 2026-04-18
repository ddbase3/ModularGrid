import {
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
	SplitDetailViewPlugin,
	SummaryPlugin,
	ViewSwitcherPlugin,
	createClassicLayout
} from '../../src/index.js';

const logElement = document.querySelector('#log');

function log(message, className = '') {
	const line = document.createElement('div');

	if (className) {
		line.className = className;
	}

	line.textContent = message;
	logElement.appendChild(line);
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}

	log(`PASS: ${message}`, 'pass');
}

function nextFrame() {
	return new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});
}

async function settleFrames(count = 1) {
	for (let index = 0; index < count; index++) {
		await nextFrame();
	}
}

function dispatchClick(element) {
	element.dispatchEvent(new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		view: window
	}));
}

function findHeaderLabelButtonByColumnKey(container, columnKey) {
	return container.querySelector(`.mg-header-label-button[data-mg-header-column-key="${columnKey}"]`);
}

function findActionByKey(container, key) {
	return container.querySelector(`[data-mg-header-menu-action="${key}"]`);
}

function findCheckboxRowByText(container, text) {
	return Array.from(container.querySelectorAll('.mg-checkbox-row')).find((row) => {
		return row.textContent.includes(text);
	}) || null;
}

const data = [
	{ id: 1, firstname: 'Alice', lastname: 'Alpha', email: 'alice@example.com', age: 31, city: 'Berlin', status: 'active', amount: 1200 },
	{ id: 2, firstname: 'Bob', lastname: 'Bravo', email: 'bob@example.com', age: 28, city: 'Hamburg', status: 'pending', amount: 850 },
	{ id: 3, firstname: 'Charlie', lastname: 'Charlie', email: 'charlie@example.com', age: 35, city: 'Berlin', status: 'active', amount: 930 },
	{ id: 4, firstname: 'Diana', lastname: 'Delta', email: 'diana@example.com', age: 22, city: 'Cologne', status: 'new', amount: 410 },
	{ id: 5, firstname: 'Eli', lastname: 'Echo', email: 'eli@example.com', age: 29, city: 'Bremen', status: 'pending', amount: 760 }
];

try {
	const actionCalls = [];
	const bulkActionCalls = [];
	const exportEvents = [];
	const layout = createClassicLayout({
		top: ['toolbar', 'filtersZone', 'bulkZone', 'viewZone', 'actions'],
		bottom: ['footerInfo', 'footerPaging']
	});

	const grid = new ModularGrid('#test-grid', {
		layout,
		data,
		pageSize: 2,
		view: {
			mode: 'table'
		},
		plugins: [
			SearchPlugin,
			FiltersPlugin,
			GroupingPlugin,
			HeaderMenuPlugin,
			PageSizePlugin,
			InfoPlugin,
			PagingPlugin,
			SelectionPlugin,
			RowActionsPlugin,
			BulkActionsPlugin,
			ExportPlugin,
			SummaryPlugin,
			ColumnVisibilityPlugin,
			ResetPlugin,
			CardViewPlugin,
			SplitDetailViewPlugin,
			ViewSwitcherPlugin,
			ResponsiveViewPlugin,
			RowDetailPlugin
		],
		pluginOptions: {
			search: {
				zone: 'toolbar'
			},
			filters: {
				zone: 'filtersZone',
				stateKey: 'filters',
				fields: [
					{
						key: 'status',
						label: 'Status',
						type: 'select',
						options: [
							{ value: '', label: 'All' },
							{ value: 'active', label: 'Active' },
							{ value: 'pending', label: 'Pending' }
						]
					}
				]
			},
			grouping: {
				zone: 'filtersZone',
				fields: [
					{ key: 'city', label: 'City' },
					{ key: 'status', label: 'Status' }
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
							label: 'Amount sum'
						}
					]
				}
			},
			viewSwitcher: {
				zone: 'viewZone',
				include: ['table', 'cards', 'split']
			},
			rowActions: {
				headerMenu: {
					enabled: true,
					items: [
						{
							type: 'columnVisibility',
							label: 'Columns',
							showReset: true
						}
					]
				},
				items: [
					{
						key: 'inspect',
						label: 'Inspect',
						onClick({ row }) {
							actionCalls.push(row.id);
						}
					}
				]
			},
			bulkActions: {
				zone: 'bulkZone',
				items: [
					{
						key: 'bulk-inspect',
						label: 'Bulk inspect',
						onClick({ selectedRowIds }) {
							bulkActionCalls.push(selectedRowIds.slice());
						}
					}
				]
			},
			export: {
				zone: 'actions',
				actions: [
					{
						key: 'json-current',
						label: 'JSON page',
						format: 'json',
						scope: 'current'
					}
				]
			},
			summary: {
				zone: 'footerInfo',
				scope: 'page',
				metrics: [
					{
						type: 'count',
						label: 'Rows'
					},
					{
						key: 'amount',
						type: 'sum',
						label: 'Amount sum'
					}
				]
			},
			rowDetail: {
				rowIdKey: 'id',
				detailRenderer(row) {
					const detail = document.createElement('div');
					detail.textContent = `Detail for ${row.firstname}`;
					return detail;
				}
			},
			splitDetailView: {
				rowIdKey: 'id',
				titleKey: 'person',
				subtitleKey: 'city'
			},
			responsiveView: {
				breakpoint: 10,
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
					const wrapper = document.createElement('div');
					wrapper.textContent = `${row.firstname} ${row.lastname}`;
					return wrapper;
				}
			},
			{
				key: 'city',
				label: 'City',
				headerMenu: {
					defaultSortKey: 'city',
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
					sortOptions: [
						{ key: 'status', label: 'Status' }
					]
				},
				render(value, row) {
					const wrapper = document.createElement('div');
					wrapper.textContent = row.status;
					return wrapper;
				}
			},
			{
				key: 'amount_display',
				label: 'Amount',
				headerMenu: {
					defaultSortKey: 'amount',
					sortOptions: [
						{ key: 'amount', label: 'Amount' }
					]
				},
				render(value, row) {
					const wrapper = document.createElement('div');
					wrapper.textContent = String(row.amount);
					return wrapper;
				}
			}
		]
	});

	grid.on('export:created', (event) => {
		exportEvents.push(event);
	});

	await grid.init();
	await settleFrames(2);

	const initialRows = Array.from(document.querySelectorAll('#test-grid tbody tr.mg-row'));

	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length === 2, 'First grid renders first page with 2 data rows');
	assert(initialRows[0]?.classList.contains('mg-row-odd') === true, 'First visible table row gets the odd zebra class');
	assert(initialRows[1]?.classList.contains('mg-row-even') === true, 'Second visible table row gets the even zebra class');
	assert(document.querySelectorAll('#test-grid input[type="search"]').length === 1, 'Search plugin renders into the layout');
	assert(document.querySelectorAll('#test-grid thead .mg-selection-toggle input[type="checkbox"]').length === 1, 'Selection plugin renders a header checkbox');
	assert(document.querySelectorAll('#test-grid .mg-row-actions').length > 0, 'Row actions plugin renders action menus');
	assert(document.querySelectorAll('#test-grid .mg-view-switcher button').length >= 3, 'View switcher renders available views');
	assert(document.querySelectorAll('#test-grid .mg-summary-item').length === 2, 'Summary plugin renders configured metrics');
	assert(document.querySelectorAll('#test-grid .mg-export-button').length === 1, 'Export plugin renders configured export button');
	assert(document.querySelectorAll('#test-grid .mg-header-menu-trigger').length >= 1, 'Header menu renders in data headers');
	assert(document.querySelectorAll('#test-grid .mg-filter-group').length === 1, 'Filters plugin renders configured filter control');

	grid.setState({
		query: {
			sortKey: '',
			sortDirection: 'asc',
			page: 1
		}
	});
	await settleFrames(2);

	assert(grid.getState().query.sortKey === '', 'Sort baseline is reset before header-label sorting test');

	const personHeaderButton = findHeaderLabelButtonByColumnKey(document.querySelector('#test-grid'), 'person');
	assert(!!personHeaderButton, 'Person header label button exists');

	dispatchClick(personHeaderButton);
	await settleFrames(2);

	assert(grid.getState().query.sortKey === 'lastname' && grid.getState().query.sortDirection === 'asc', 'Header label click sorts by configured default field');
	assert(document.querySelectorAll('#test-grid .mg-header-menu-label-sub').length === 1, 'Only the active sorted header shows a sort hint');
	assert(document.querySelector('#test-grid .mg-header-menu-label-sub').textContent.includes('Last name'), 'Active header sort hint shows the configured database field');

	const personHeaderCell = personHeaderButton.closest('th');
	const personHeaderMenuTrigger = personHeaderCell.querySelector('.mg-header-menu-trigger');
	assert(!!personHeaderMenuTrigger, 'Person header menu trigger exists');

	dispatchClick(personHeaderMenuTrigger);
	await settleFrames(1);

	const personSortActions = Array.from(personHeaderCell.querySelectorAll('[data-mg-header-menu-action^="sort-"]'));
	assert(personSortActions.length === 6, 'Person header menu exposes 6 sort actions for lastname, firstname and email');

	const emailDescAction = findActionByKey(personHeaderCell, 'sort-email-desc');
	assert(!!emailDescAction, 'Configured email descending sort action exists');

	dispatchClick(emailDescAction);
	await settleFrames(2);

	assert(grid.getState().query.sortKey === 'email' && grid.getState().query.sortDirection === 'desc', 'Header menu can sort by configured secondary field');
	assert(document.querySelector('#test-grid .mg-header-menu-label-sub').textContent.includes('Email'), 'Active header sort hint switches to the selected database field');

	const rowActionsHeaderTrigger = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger');
	assert(!!rowActionsHeaderTrigger, 'Row actions header trigger exists');

	dispatchClick(rowActionsHeaderTrigger);
	await settleFrames(1);

	const cityVisibilityRow = findCheckboxRowByText(document.querySelector('#test-grid'), 'City');
	assert(!!cityVisibilityRow, 'City visibility row exists in row-actions header menu');

	const cityVisibilityCheckbox = cityVisibilityRow.querySelector('input');
	dispatchClick(cityVisibilityCheckbox);
	await settleFrames(2);

	assert(grid.getState().columns.find((column) => column.key === 'city').visible === false, 'Row actions header menu can toggle column visibility');

	const firstDataRow = document.querySelector('#test-grid tbody tr.mg-row');
	dispatchClick(firstDataRow);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-row-detail').length === 1, 'Row detail renders inline in table view');
	assert(document.querySelector('#test-grid tbody tr.mg-detail-row')?.classList.contains('mg-detail-row-odd') === true, 'Detail row keeps the zebra parity class of its owning row');

	dispatchClick(firstDataRow);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-row-detail').length === 0, 'Row detail can be toggled closed again');

	const searchInput = document.querySelector('#test-grid input[type="search"]');
	searchInput.focus();
	searchInput.value = 'Berlin';
	searchInput.dispatchEvent(new Event('input', { bubbles: true }));
	await settleFrames(2);

	assert(document.activeElement === document.querySelector('#test-grid input[type="search"]'), 'Search input keeps focus after rerender');

	grid.clearSearch();
	await settleFrames(2);

	const filterSelect = document.querySelector('#test-grid .mg-filter-group .mg-select');
	filterSelect.value = 'active';
	filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
	await settleFrames(2);

	assert(grid.getState().filters.status === 'active', 'Filters plugin updates configured filter state');

	const groupingSelects = document.querySelectorAll('#test-grid .mg-grouping-control .mg-select');
	const groupingSelect = groupingSelects[groupingSelects.length - 1];
	groupingSelect.value = 'city';
	groupingSelect.dispatchEvent(new Event('change', { bubbles: true }));
	await settleFrames(2);

	assert(grid.getState().grouping.key === 'city', 'Grouping plugin updates grouping state');
	assert(document.querySelectorAll('#test-grid .mg-group-row').length >= 1, 'Table view renders group header rows');
	assert(document.querySelectorAll('#test-grid .mg-group-summary-row').length >= 1, 'Table view renders group summary rows');

	const groupedRows = Array.from(document.querySelectorAll('#test-grid tbody tr.mg-row'));
	assert(groupedRows[0]?.classList.contains('mg-row-odd') === true, 'Grouped table rows keep zebra classes on the first visible data row');
	assert(groupedRows[1]?.classList.contains('mg-row-even') === true, 'Grouped table rows keep zebra classes on the second visible data row');

	const firstRowCheckbox = document.querySelector('#test-grid tbody tr.mg-row td:first-child input[type="checkbox"]');
	dispatchClick(firstRowCheckbox);
	await settleFrames(2);

	const selectedLabel = document.querySelector('#test-grid .mg-selection-label');
	assert(selectedLabel && selectedLabel.textContent.includes('1'), 'Selection summary updates after selecting a row');

	const bulkActionButton = document.querySelector('#test-grid .mg-bulk-action-button');
	dispatchClick(bulkActionButton);
	await settleFrames(2);

	assert(bulkActionCalls.length === 1 && bulkActionCalls[0].length === 1, 'Bulk action plugin runs configured action for selected rows');

	const exportButton = document.querySelector('#test-grid .mg-export-button');
	dispatchClick(exportButton);
	await settleFrames(2);

	assert(exportEvents.length === 1 && exportEvents[0].format === 'json', 'Export plugin emits export event');

	const firstActionButton = document.querySelector('#test-grid tbody tr.mg-row .mg-row-action-button');
	dispatchClick(firstActionButton);
	await settleFrames(2);

	assert(actionCalls.length === 1, 'Row action callback runs for the visible first row');

	grid.execute('setViewMode', 'cards');
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-card').length >= 1, 'Card view renders card items after manual view switch');
	assert(grid.getState().view.mode === 'cards', 'Manual card view remains active on wide layout with responsive plugin enabled');

	const firstCard = document.querySelector('#test-grid .mg-card');
	dispatchClick(firstCard);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-card-detail').length === 1, 'Row detail renders inside card view');

	grid.execute('setViewMode', 'split');
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-split-view').length === 1, 'Split view renders after view switch');

	const firstSplitItem = document.querySelector('#test-grid .mg-split-item');
	dispatchClick(firstSplitItem);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-split-detail').length === 1, 'Split detail pane renders detail content');

	grid.execute('setViewMode', 'table');
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length >= 1, 'Switching back to table view works');

	const secondGrid = new ModularGrid('#second-grid', {
		data: [
			{ id: 10, title: 'Project A' },
			{ id: 11, title: 'Project B' }
		],
		pageSize: 1,
		table: {
			zebraRows: false
		},
		columns: [
			{ key: 'id', label: 'ID' },
			{ key: 'title', label: 'Title' }
		]
	});

	await secondGrid.init();
	await settleFrames(2);

	const secondGridRow = document.querySelector('#second-grid tbody tr.mg-row');

	assert(document.querySelectorAll('.mg-table').length >= 2, 'Two independent grid instances can exist on one page');
	assert(
		secondGridRow &&
		!secondGridRow.classList.contains('mg-row-odd') &&
		!secondGridRow.classList.contains('mg-row-even'),
		'Table zebra rows can be disabled per grid instance'
	);

	log('Smoke test completed successfully.', 'pass');
} catch (error) {
	log(`FAIL: ${error.message}`, 'fail');
	throw error;
}

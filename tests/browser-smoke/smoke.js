import {
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

const data = [
	{ id: 1, name: 'Alice', age: 31, city: 'Berlin', status: 'active', amount: 1200 },
	{ id: 2, name: 'Bob', age: 28, city: 'Hamburg', status: 'pending', amount: 850 },
	{ id: 3, name: 'Charlie', age: 35, city: 'Berlin', status: 'active', amount: 930 },
	{ id: 4, name: 'Diana', age: 22, city: 'Cologne', status: 'new', amount: 410 },
	{ id: 5, name: 'Eli', age: 29, city: 'Bremen', status: 'pending', amount: 760 }
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
			viewSwitcher: {
				zone: 'viewZone',
				include: ['table', 'cards', 'split']
			},
			rowActions: {
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
					detail.textContent = `Detail for ${row.name}`;
					return detail;
				}
			},
			splitDetailView: {
				rowIdKey: 'id',
				titleKey: 'name',
				subtitleKey: 'city'
			},
			responsiveView: {
				breakpoint: 10,
				narrowMode: 'cards',
				wideModeFallback: 'table'
			}
		},
		columns: [
			{ key: 'id', label: 'ID' },
			{ key: 'name', label: 'Name' },
			{ key: 'age', label: 'Age' },
			{ key: 'city', label: 'City' },
			{ key: 'status', label: 'Status' },
			{ key: 'amount', label: 'Amount' }
		]
	});

	grid.on('export:created', (event) => {
		exportEvents.push(event);
	});

	await grid.init();

	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length === 2, 'First grid renders first page with 2 data rows');
	assert(document.querySelectorAll('#test-grid input[type="search"]').length === 1, 'Search plugin renders into the layout');
	assert(document.querySelectorAll('#test-grid thead input[type="checkbox"]').length === 1, 'Selection plugin renders a header checkbox');
	assert(document.querySelectorAll('#test-grid .mg-row-actions').length > 0, 'Row actions plugin renders action menus');
	assert(document.querySelectorAll('#test-grid .mg-view-switcher button').length >= 3, 'View switcher renders available views');
	assert(document.querySelectorAll('#test-grid .mg-summary-item').length === 2, 'Summary plugin renders configured metrics');
	assert(document.querySelectorAll('#test-grid .mg-export-button').length === 1, 'Export plugin renders configured export button');
	assert(document.querySelectorAll('#test-grid .mg-header-menu-trigger').length >= 4, 'Header menu renders on regular data columns');
	assert(document.querySelectorAll('#test-grid .mg-filter-group').length === 1, 'Filters plugin renders configured filter control');

	const firstHeaderMenuTrigger = document.querySelector('#test-grid .mg-header-menu-trigger');
	firstHeaderMenuTrigger.click();

	const sortDescAction = document.querySelector('#test-grid [data-mg-header-menu-action="sort-desc"]');
	sortDescAction.click();

	assert(grid.getState().query.sortKey === 'id' && grid.getState().query.sortDirection === 'desc', 'Header menu sort action updates sort state');

	const firstDataRow = document.querySelector('#test-grid tbody tr.mg-row');
	firstDataRow.click();
	assert(document.querySelectorAll('#test-grid .mg-row-detail').length === 1, 'Row detail renders inline in table view');

	firstDataRow.click();
	assert(document.querySelectorAll('#test-grid .mg-row-detail').length === 0, 'Row detail can be toggled closed again');

	const searchInput = document.querySelector('#test-grid input[type="search"]');
	searchInput.focus();
	searchInput.value = 'Berlin';
	searchInput.dispatchEvent(new Event('input', { bubbles: true }));

	assert(document.activeElement === document.querySelector('#test-grid input[type="search"]'), 'Search input keeps focus after rerender');
	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length === 2, 'Search filters rows correctly');

	grid.clearSearch();

	const filterSelect = document.querySelector('#test-grid .mg-filter-group .mg-select');
	filterSelect.value = 'active';
	filterSelect.dispatchEvent(new Event('change', { bubbles: true }));

	assert(grid.getState().filters.status === 'active', 'Filters plugin updates configured filter state');

	const firstRowCheckbox = document.querySelector('#test-grid tbody tr.mg-row td:first-child input[type="checkbox"]');
	firstRowCheckbox.click();

	const selectedLabel = document.querySelector('#test-grid .mg-selection-label');
	assert(selectedLabel && selectedLabel.textContent.includes('1'), 'Selection summary updates after selecting a row');

	const bulkActionButton = document.querySelector('#test-grid .mg-bulk-action-button');
	bulkActionButton.click();
	assert(bulkActionCalls.length === 1 && bulkActionCalls[0].length === 1, 'Bulk action plugin runs configured action for selected rows');

	const exportButton = document.querySelector('#test-grid .mg-export-button');
	exportButton.click();
	assert(exportEvents.length === 1 && exportEvents[0].format === 'json', 'Export plugin emits export event');

	const firstActionButton = document.querySelector('#test-grid tbody tr.mg-row .mg-row-action-button');
	firstActionButton.click();
	assert(actionCalls.length === 1, 'Row action callback runs for the visible first row');

	grid.execute('setViewMode', 'cards');
	await nextFrame();
	assert(document.querySelectorAll('#test-grid .mg-card').length === 2, 'Card view renders card items after manual view switch');
	assert(grid.getState().view.mode === 'cards', 'Manual card view remains active on wide layout with responsive plugin enabled');

	const firstCard = document.querySelector('#test-grid .mg-card');
	firstCard.click();
	assert(document.querySelectorAll('#test-grid .mg-card-detail').length === 1, 'Row detail renders inside card view');

	grid.execute('setViewMode', 'split');
	assert(document.querySelectorAll('#test-grid .mg-split-view').length === 1, 'Split view renders after view switch');

	const firstSplitItem = document.querySelector('#test-grid .mg-split-item');
	firstSplitItem.click();
	assert(document.querySelectorAll('#test-grid .mg-split-detail').length === 1, 'Split detail pane renders detail content');

	grid.execute('setViewMode', 'table');
	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length === 2, 'Switching back to table view works');

	grid.setPage(2);
	const firstCellPage2 = document.querySelector('#test-grid tbody tr.mg-row td:nth-child(2)');
	assert(firstCellPage2.textContent !== '', 'Paging moves to another page');

	const secondGrid = new ModularGrid('#second-grid', {
		data: [
			{ id: 10, title: 'Project A' },
			{ id: 11, title: 'Project B' }
		],
		pageSize: 1,
		columns: [
			{ key: 'id', label: 'ID' },
			{ key: 'title', label: 'Title' }
		]
	});

	await secondGrid.init();

	assert(document.querySelectorAll('.mg-table').length >= 2, 'Two independent grid instances can exist on one page');

	log('Smoke test completed successfully.', 'pass');
} catch (error) {
	log(`FAIL: ${error.message}`, 'fail');
	throw error;
}

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

function dispatchMouseEvent(target, type, clientX = 0, clientY = 0) {
	target.dispatchEvent(new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		view: window,
		clientX,
		clientY
	}));
}

function createDataTransferStub() {
	const data = new Map();

	return {
		effectAllowed: 'all',
		dropEffect: 'move',
		setData(type, value) {
			data.set(type, String(value));
		},
		getData(type) {
			return data.get(type) || '';
		},
		clearData(type) {
			if (!type) {
				data.clear();
				return;
			}

			data.delete(type);
		}
	};
}

function dispatchDragEvent(target, type, {
	dataTransfer = null,
	clientX = 0,
	clientY = 0
} = {}) {
	const event = new Event(type, {
		bubbles: true,
		cancelable: true
	});

	Object.defineProperty(event, 'dataTransfer', {
		value: dataTransfer || createDataTransferStub()
	});

	Object.defineProperty(event, 'clientX', {
		value: clientX
	});

	Object.defineProperty(event, 'clientY', {
		value: clientY
	});

	target.dispatchEvent(event);

	return event;
}

async function openDetailsMenu(summaryElement, settleCount = 2) {
	if (!(summaryElement instanceof HTMLElement)) {
		return null;
	}

	const details = summaryElement.closest('details');

	if (!(details instanceof HTMLDetailsElement)) {
		return null;
	}

	if (!details.open) {
		summaryElement.click();
		await settleFrames(settleCount);
	}

	if (!details.open) {
		dispatchClick(summaryElement);
		await settleFrames(settleCount);
	}

	return details;
}

function findHeaderLabelButtonByColumnKey(container, columnKey) {
	return container.querySelector(`.mg-header-label-button[data-mg-header-column-key="${columnKey}"]`);
}

function findActionByKey(container, key) {
	return container.querySelector(`[data-mg-header-menu-action="${key}"]`);
}

function findRowActionsHeaderActionByKey(container, key) {
	return container.querySelector(`[data-mg-row-actions-header-action="${key}"]`);
}

function findCheckboxRowByText(container, text) {
	return Array.from(container.querySelectorAll('.mg-checkbox-row')).find((row) => {
		return row.textContent.includes(text);
	}) || null;
}

function getHeaderCell(columnKey) {
	const gridRoot = document.querySelector('#test-grid');
	return gridRoot.querySelector(`thead [data-mg-column-key="${columnKey}"]`) || null;
}

function getVisibleHeaderColumnKeys() {
	return Array.from(document.querySelectorAll('#test-grid thead [data-mg-column-key]')).map((cell) => {
		return cell.dataset.mgColumnKey;
	});
}

const data = [
	{
		id: 1,
		firstname: 'Alice',
		lastname: 'Alpha',
		email: 'alice@example.com',
		age: 31,
		city: 'Berlin',
		status: 'active',
		amount: 1200,
		notes: 'Alice note content that is intentionally very long so the ellipsis strategy can be verified in the browser smoke test.',
		description: 'Alice description content that is intentionally long enough to verify the clamp strategy and the expand collapse behaviour in the browser smoke test.',
		trailing_note: 'Alice trailing note is initially hidden and later revealed to verify automatic right-side repinning.'
	},
	{
		id: 2,
		firstname: 'Bob',
		lastname: 'Bravo',
		email: 'bob@example.com',
		age: 28,
		city: 'Hamburg',
		status: 'pending',
		amount: 850,
		notes: 'Bob note content that is also intentionally long to keep the configured text display strategy consistent across views.',
		description: 'Bob description content is also long enough to verify multi line clamp rendering and state driven expansion in different views.',
		trailing_note: 'Bob trailing note stays hidden first so the visibility selector can reveal it after right-side pinning already exists.'
	},
	{
		id: 3,
		firstname: 'Charlie',
		lastname: 'Charlie',
		email: 'charlie@example.com',
		age: 35,
		city: 'Berlin',
		status: 'active',
		amount: 930,
		notes: 'Charlie note content used for grouped rendering coverage with ellipsis and wrapping behaviour checks.',
		description: 'Charlie description text is present to keep grouped view behaviour stable while clamp and expand remain available.',
		trailing_note: 'Charlie trailing note helps keep the hidden column data shape stable across the smoke test.'
	},
	{
		id: 4,
		firstname: 'Diana',
		lastname: 'Delta',
		email: 'diana@example.com',
		age: 22,
		city: 'Cologne',
		status: 'new',
		amount: 410,
		notes: 'Diana note content for additional long-text display coverage in alternate layouts.',
		description: 'Diana description is available to verify the same text display contract in card and split rendering.',
		trailing_note: 'Diana trailing note exists for the same reason and stays optional.'
	},
	{
		id: 5,
		firstname: 'Eli',
		lastname: 'Echo',
		email: 'eli@example.com',
		age: 29,
		city: 'Bremen',
		status: 'pending',
		amount: 760,
		notes: 'Eli note content with a long value to exercise table, card and split preview rendering.',
		description: 'Eli description remains long enough for clamp and expand checks across multiple rendered views.',
		trailing_note: 'Eli trailing note keeps the hidden trailing column populated.'
	}
];

try {
	const actionCalls = [];
	const bulkActionCalls = [];
	const exportEvents = [];
	const layout = createClassicLayout({
		top: ['toolbar', 'filtersZone', 'bulkZone', 'viewZone', 'actions'],
		bottom: ['footerInfo', 'footerPaging']
	});

	document.querySelector('#test-grid').style.width = '760px';
	document.querySelector('#test-grid').style.maxWidth = '760px';

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
				subtitleKey: 'city',
				previewKeys: ['notes', 'description']
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
				width: 240,
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
				width: '12rem',
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
				width: 170,
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
				width: 150,
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
			},
			{
				key: 'notes',
				label: 'Notes',
				minWidth: 280,
				maxWidth: 320,
				textDisplay: 'ellipsis',
				headerMenu: {
					defaultSortKey: 'notes',
					sortOptions: [
						{ key: 'notes', label: 'Notes' }
					]
				}
			},
			{
				key: 'description',
				label: 'Description',
				width: 320,
				textDisplay: {
					strategy: 'clamp',
					lines: 2,
					expandable: true
				},
				headerMenu: {
					defaultSortKey: 'description',
					sortOptions: [
						{ key: 'description', label: 'Description' }
					]
				}
			},
			{
				key: 'trailing_note',
				label: 'Trailing note',
				width: '18rem',
				visible: false,
				textDisplay: 'ellipsis',
				headerMenu: {
					defaultSortKey: 'trailing_note',
					sortOptions: [
						{ key: 'trailing_note', label: 'Trailing note' }
					]
				}
			}
		]
	});

	grid.on('export:created', (event) => {
		exportEvents.push(event);
	});

	await grid.init();
	await settleFrames(2);

	const tableScroll = document.querySelector('#test-grid .mg-table-scroll');
	const initialRows = Array.from(document.querySelectorAll('#test-grid tbody tr.mg-row'));
	const selectionHeaderCell = document.querySelector('#test-grid thead .mg-selection-toggle')?.closest('th');
	const rowActionsHeaderCellInitial = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger')?.closest('th');
	const personHeaderCellInitial = getHeaderCell('person');
	const cityHeaderCellInitial = getHeaderCell('city');
	const amountHeaderCellInitial = getHeaderCell('amount_display');
	const notesHeaderCellInitial = getHeaderCell('notes');
	const firstPersonBodyCell = document.querySelector('#test-grid tbody [data-mg-column-key="person"]');
	const firstNotesBodyCell = document.querySelector('#test-grid tbody [data-mg-column-key="notes"]');
	const selectionResizeHandle = selectionHeaderCell?.querySelector('.mg-column-resize-handle');
	const rowActionsResizeHandle = rowActionsHeaderCellInitial?.querySelector('.mg-column-resize-handle');
	const personResizeHandle = personHeaderCellInitial?.querySelector('.mg-column-resize-handle');
	const amountReorderHandleInitial = amountHeaderCellInitial?.querySelector('.mg-column-reorder-handle');
	const personWidthBeforeResize = personHeaderCellInitial?.getBoundingClientRect().width || 0;

	assert(!!tableScroll, 'Table view renders a horizontal scroll container');
	assert(tableScroll.scrollWidth > tableScroll.clientWidth, 'Wide table content can overflow horizontally inside the scroll container');
	assert(selectionHeaderCell?.classList.contains('mg-cell-pinned-left') === true, 'Selection header column is pinned left by default');
	assert(rowActionsHeaderCellInitial?.classList.contains('mg-cell-pinned-right') === true, 'Row actions header column is pinned right by default');

	const pinnedLeftHeaderRectBeforeScroll = selectionHeaderCell?.getBoundingClientRect();
	const pinnedRightHeaderRectBeforeScroll = rowActionsHeaderCellInitial?.getBoundingClientRect();
	const unpinnedHeaderRectBeforeScroll = cityHeaderCellInitial?.getBoundingClientRect();

	tableScroll.scrollLeft = 180;
	await settleFrames(2);

	const pinnedLeftHeaderRectAfterScroll = selectionHeaderCell?.getBoundingClientRect();
	const pinnedRightHeaderRectAfterScroll = rowActionsHeaderCellInitial?.getBoundingClientRect();
	const unpinnedHeaderRectAfterScroll = cityHeaderCellInitial?.getBoundingClientRect();

	assert(
		Math.abs((pinnedLeftHeaderRectAfterScroll?.left || 0) - (pinnedLeftHeaderRectBeforeScroll?.left || 0)) < 2,
		'Pinned left header cell stays fixed during horizontal scroll'
	);
	assert(
		Math.abs((pinnedRightHeaderRectAfterScroll?.right || 0) - (pinnedRightHeaderRectBeforeScroll?.right || 0)) < 2,
		'Pinned right header cell stays fixed during horizontal scroll'
	);
	assert(
		(unpinnedHeaderRectAfterScroll?.left || 0) < (unpinnedHeaderRectBeforeScroll?.left || 0) - 40,
		'Unpinned header cells continue to scroll horizontally'
	);

	tableScroll.scrollLeft = 0;
	await settleFrames(2);

	assert(personHeaderCellInitial?.style.width === '240px', 'Numeric column width configuration is applied to the header cell');
	assert(personHeaderCellInitial?.style.minWidth === '240px', 'Numeric column width configuration also applies a matching header min-width');
	assert(cityHeaderCellInitial?.style.width === '12rem', 'String based column width configuration is applied to the header cell');
	assert(notesHeaderCellInitial?.style.minWidth === '280px', 'Column minWidth configuration is applied to the header cell');
	assert(notesHeaderCellInitial?.style.maxWidth === '320px', 'Column maxWidth configuration is applied to the header cell');
	assert(firstPersonBodyCell?.style.width === '240px', 'Numeric column width configuration is also applied to body cells');
	assert(firstNotesBodyCell?.style.minWidth === '280px', 'Column minWidth configuration is also applied to body cells');
	assert(firstNotesBodyCell?.style.maxWidth === '320px', 'Column maxWidth configuration is also applied to body cells');
	assert(!selectionResizeHandle, 'Selection utility column does not render a resize handle');
	assert(!rowActionsResizeHandle, 'Row actions utility column does not render a resize handle');
	assert(!!personResizeHandle, 'Regular data columns render a resize handle');
	assert(!!amountReorderHandleInitial, 'Regular data columns render a reorder handle');

	dispatchMouseEvent(personResizeHandle, 'mousedown', 400, 10);
	dispatchMouseEvent(window, 'mousemove', 460, 10);
	dispatchMouseEvent(window, 'mouseup', 460, 10);
	await settleFrames(2);

	const resizedPersonWidth = grid.getState().columns.find((column) => column.key === 'person').width;
	assert(resizedPersonWidth > personWidthBeforeResize, 'Dragging the resize handle updates the stored column width');
	assert(getHeaderCell('person')?.style.width === `${resizedPersonWidth}px`, 'Resized column width is applied again after rerender');

	const reorderDataTransfer = createDataTransferStub();
	const currentPersonHeaderCell = getHeaderCell('person');
	const personHeaderRect = currentPersonHeaderCell.getBoundingClientRect();
	const visibleHeaderOrderBeforeReorder = getVisibleHeaderColumnKeys();
	const amountReorderHandle = getHeaderCell('amount_display')?.querySelector('.mg-column-reorder-handle');

	assert(!!amountReorderHandle, 'Reorder handle is still available after rerender');

	dispatchDragEvent(amountReorderHandle, 'dragstart', {
		dataTransfer: reorderDataTransfer,
		clientX: 0,
		clientY: 0
	});
	dispatchDragEvent(currentPersonHeaderCell, 'dragover', {
		dataTransfer: reorderDataTransfer,
		clientX: personHeaderRect.left + 4,
		clientY: personHeaderRect.top + 4
	});
	dispatchDragEvent(currentPersonHeaderCell, 'drop', {
		dataTransfer: reorderDataTransfer,
		clientX: personHeaderRect.left + 4,
		clientY: personHeaderRect.top + 4
	});
	await settleFrames(2);

	const visibleHeaderOrderAfterReorder = getVisibleHeaderColumnKeys();

	assert(
		visibleHeaderOrderAfterReorder.indexOf('amount_display') < visibleHeaderOrderAfterReorder.indexOf('person'),
		'Drag and drop can move a visible data column before another visible data column'
	);
	assert(
		grid.getState().columns.findIndex((column) => column.key === 'amount_display') < grid.getState().columns.findIndex((column) => column.key === 'person'),
		'Column reorder updates the shared column state order'
	);

	const rowActionsHeaderTriggerForOrderCheck = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger');
	await openDetailsMenu(rowActionsHeaderTriggerForOrderCheck, 1);

	const selectorLabelsAfterReorder = Array.from(document.querySelectorAll('#test-grid thead details.mg-row-actions .mg-checkbox-row span')).map((node) => {
		return node.textContent.trim();
	});

	assert(
		selectorLabelsAfterReorder.indexOf('Amount') < selectorLabelsAfterReorder.indexOf('Person'),
		'Column selector order stays synchronized with the reordered columns'
	);

	grid.execute('moveColumn', {
		fromKey: 'amount_display',
		toKey: 'person',
		position: 'after'
	});
	await settleFrames(2);

	const visibleHeaderOrderAfterRestore = getVisibleHeaderColumnKeys();

	assert(
		visibleHeaderOrderAfterRestore.indexOf('person') < visibleHeaderOrderAfterRestore.indexOf('amount_display'),
		'Column order can be restored for the remaining smoke assertions'
	);

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

	const firstEllipsisCell = document.querySelector('#test-grid tbody tr.mg-row .mg-text-display-ellipsis');
	assert(!!firstEllipsisCell, 'Table view renders ellipsis wrapper for configured long-text columns');
	assert(firstEllipsisCell.title.includes('Alice note content'), 'Ellipsis wrapper exposes the full value as title text');

	const firstClampCell = document.querySelector('#test-grid tbody tr.mg-row .mg-text-display-clamp');
	assert(!!firstClampCell, 'Table view renders clamp wrapper for configured long-text columns');

	const firstClampToggle = document.querySelector('#test-grid tbody tr.mg-row .mg-text-display-toggle');
	assert(!!firstClampToggle, 'Clamp strategy renders an expand toggle button when configured');
	assert(firstClampToggle.textContent === 'More', 'Clamp strategy starts in collapsed mode');

	const clampStateKey = firstClampToggle.dataset.mgTextDisplayToggleKey;
	dispatchClick(firstClampToggle);
	await settleFrames(2);

	assert(grid.getState().textDisplay.expanded[clampStateKey] === true, 'Clamp toggle stores expanded state in the grid state');
	assert(document.querySelector(`#test-grid [data-mg-text-display-key="${clampStateKey}"]`)?.classList.contains('mg-text-display-expanded') === true, 'Expanded clamp cell receives the expanded class');
	assert(document.querySelector(`#test-grid [data-mg-text-display-toggle-key="${clampStateKey}"]`)?.textContent === 'Less', 'Clamp toggle button switches to collapse label');

	dispatchClick(document.querySelector(`#test-grid [data-mg-text-display-toggle-key="${clampStateKey}"]`));
	await settleFrames(2);

	assert(grid.getState().textDisplay.expanded[clampStateKey] === false, 'Clamp toggle can collapse the state again');

	const firstRowActionMenuButton = document.querySelector('#test-grid tbody tr.mg-row .mg-row-action-button');
	assert(
		firstRowActionMenuButton &&
		firstRowActionMenuButton.classList.contains('mg-menu-action') &&
		!firstRowActionMenuButton.classList.contains('mg-button'),
		'Row action menu items use the unified lightweight menu style'
	);

	grid.setState({
		query: {
			sortKey: '',
			sortDirection: 'asc',
			page: 1
		}
	});
	await settleFrames(2);

	assert(grid.getState().query.sortKey === '', 'Sort baseline is reset before header-label sorting test');

	let personHeaderCell = getHeaderCell('person');
	assert(!!personHeaderCell, 'Person header cell exists');

	const personHeaderButton = personHeaderCell.querySelector('.mg-header-label-button');
	assert(!!personHeaderButton, 'Person header label button exists');

	dispatchClick(personHeaderButton);
	await settleFrames(2);

	assert(grid.getState().query.sortKey === 'lastname' && grid.getState().query.sortDirection === 'asc', 'Header label click sorts by configured default field');
	assert(document.querySelectorAll('#test-grid .mg-header-menu-label-sub').length === 1, 'Only the active sorted header shows a sort hint');
	assert(document.querySelector('#test-grid .mg-header-menu-label-sub').textContent.includes('Last name'), 'Active header sort hint shows the configured database field');

	personHeaderCell = getHeaderCell('person');
	const personHeaderMenuTrigger = personHeaderCell.querySelector('.mg-header-menu-trigger');
	assert(!!personHeaderMenuTrigger, 'Person header menu trigger exists');

	await openDetailsMenu(personHeaderMenuTrigger, 2);

	const personHeaderMenu = personHeaderCell.querySelector('.mg-header-menu-dropdown');
	const personHeaderMenuRect = personHeaderMenu?.getBoundingClientRect();

	assert(personHeaderMenu?.classList.contains('mg-dropdown-menu-floating') === true, 'Header dropdown is promoted to floating positioning');
	assert(window.getComputedStyle(personHeaderMenu).position === 'fixed', 'Header dropdown uses fixed positioning to escape clipping containers');
	assert((personHeaderMenuRect?.left || 0) >= 0 && (personHeaderMenuRect?.right || 0) <= window.innerWidth, 'Header dropdown stays inside the viewport horizontally');
	assert((personHeaderMenuRect?.bottom || 0) <= window.innerHeight, 'Header dropdown stays inside the viewport vertically');

	const personSortActions = Array.from(personHeaderCell.querySelectorAll('[data-mg-header-menu-action^="sort-"]'));
	assert(personSortActions.length === 6, 'Person header menu exposes 6 sort actions for lastname, firstname and email');
	assert(
		personSortActions.every((button) => {
			return button.classList.contains('mg-menu-action') && !button.classList.contains('mg-button');
		}),
		'Header menu sort actions use the unified lightweight menu style'
	);

	const pinLeftAction = findActionByKey(personHeaderCell, 'pin-left');
	assert(!!pinLeftAction, 'Leftmost unpinned visible column exposes the pin-left action');
	assert(!findActionByKey(personHeaderCell, 'pin-right'), 'Non-rightmost visible column does not expose the pin-right action');

	const emailDescAction = findActionByKey(personHeaderCell, 'sort-email-desc');
	assert(!!emailDescAction, 'Configured email descending sort action exists');

	dispatchClick(emailDescAction);
	await settleFrames(2);

	assert(grid.getState().query.sortKey === 'email' && grid.getState().query.sortDirection === 'desc', 'Header menu can sort by configured secondary field');
	assert(document.querySelector('#test-grid .mg-header-menu-label-sub').textContent.includes('Email'), 'Active header sort hint switches to the selected database field');

	personHeaderCell = getHeaderCell('person');
	await openDetailsMenu(personHeaderCell.querySelector('.mg-header-menu-trigger'), 1);
	dispatchClick(findActionByKey(personHeaderCell, 'pin-left'));
	await settleFrames(2);

	assert(grid.getState().columns.find((column) => column.key === 'person').pinned === 'left', 'Header menu can pin the current left boundary column to the left side');
	assert(document.querySelector('#test-grid thead [data-mg-column-key="person"]')?.classList.contains('mg-cell-pinned-left') === true, 'Pinned left header cell receives the sticky left class');
	assert(document.querySelector('#test-grid tbody [data-mg-column-key="person"]')?.classList.contains('mg-cell-pinned-left') === true, 'Pinned left body cells receive the sticky left class');

	let descriptionHeaderCell = getHeaderCell('description');
	await openDetailsMenu(descriptionHeaderCell.querySelector('.mg-header-menu-trigger'), 1);

	const pinRightAction = findActionByKey(descriptionHeaderCell, 'pin-right');
	assert(!!pinRightAction, 'Rightmost unpinned visible column exposes the pin-right action');

	dispatchClick(pinRightAction);
	await settleFrames(2);

	assert(grid.getState().columns.find((column) => column.key === 'description').pinned === 'right', 'Header menu can pin the current right boundary column to the right side');
	assert(document.querySelector('#test-grid thead [data-mg-column-key="description"]')?.classList.contains('mg-cell-pinned-right') === true, 'Pinned right header cell receives the sticky right class');
	assert(document.querySelector('#test-grid tbody [data-mg-column-key="description"]')?.classList.contains('mg-cell-pinned-right') === true, 'Pinned right body cells receive the sticky right class');

	personHeaderCell = getHeaderCell('person');
	await openDetailsMenu(personHeaderCell.querySelector('.mg-header-menu-trigger'), 1);

	assert(!!findActionByKey(personHeaderCell, 'unpin-left'), 'The outermost pinned-left column exposes the unpin-left action');

	descriptionHeaderCell = getHeaderCell('description');
	await openDetailsMenu(descriptionHeaderCell.querySelector('.mg-header-menu-trigger'), 1);

	assert(!!findActionByKey(descriptionHeaderCell, 'unpin-right'), 'The outermost pinned-right column exposes the unpin-right action');

	let rowActionsHeaderTrigger = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger');
	let rowActionsHeaderMenu = await openDetailsMenu(rowActionsHeaderTrigger, 2);
	let rowActionsDropdown = rowActionsHeaderMenu?.querySelector('.mg-dropdown-menu');
	const rowActionsDropdownRect = rowActionsDropdown?.getBoundingClientRect();

	assert(rowActionsHeaderMenu?.open === true, 'Row-actions header menu opens successfully');
	assert(rowActionsDropdown?.classList.contains('mg-dropdown-menu-floating') === true, 'Row-actions header menu also uses floating positioning');
	assert(window.getComputedStyle(rowActionsDropdown).position === 'fixed', 'Row-actions header menu uses fixed positioning');
	assert(window.getComputedStyle(rowActionsDropdown).overflowY === 'auto', 'Floating row-actions dropdown is vertically scrollable');
	assert(parseFloat(rowActionsDropdown?.style.maxHeight || '0') > 0, 'Floating row-actions dropdown receives a computed max height');
	assert((rowActionsDropdownRect?.right || 0) <= window.innerWidth, 'Row-actions dropdown stays inside the viewport horizontally');

	const trailingNoteVisibilityRow = findCheckboxRowByText(document.querySelector('#test-grid'), 'Trailing note');
	assert(!!trailingNoteVisibilityRow, 'Hidden trailing column exists in the row-actions header column selector');

	const trailingNoteCheckbox = trailingNoteVisibilityRow.querySelector('input');
	dispatchClick(trailingNoteCheckbox);
	await settleFrames(2);

	rowActionsHeaderMenu = document.querySelector('#test-grid thead details.mg-row-actions');
	assert(rowActionsHeaderMenu?.open === true, 'Row-actions header menu stays open after toggling a column checkbox');

	assert(grid.getState().columns.find((column) => column.key === 'trailing_note').visible === true, 'Row-actions header menu can reveal a hidden trailing column');
	assert(grid.getState().columns.find((column) => column.key === 'trailing_note').pinned === 'right', 'A newly visible column further right than the current pinned-right boundary is auto-pinned right');
	assert(document.querySelector('#test-grid thead [data-mg-column-key="trailing_note"]')?.classList.contains('mg-cell-pinned-right') === true, 'Auto-pinned trailing header cell receives the sticky right class');
	assert(getHeaderCell('trailing_note')?.style.width === '18rem', 'String based width configuration also works for newly shown columns');

	rowActionsHeaderTrigger = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger');
	await openDetailsMenu(rowActionsHeaderTrigger, 1);

	const unpinAllAction = findRowActionsHeaderActionByKey(document.querySelector('#test-grid'), 'unpin-all');
	assert(!!unpinAllAction, 'Row-actions header menu exposes the unpin-all action when pinned data columns exist');

	dispatchClick(unpinAllAction);
	await settleFrames(2);

	assert(!grid.getState().columns.find((column) => column.key === 'person').pinned, 'Unpin all clears left-side data pinning');
	assert(!grid.getState().columns.find((column) => column.key === 'description').pinned, 'Unpin all clears right-side data pinning');
	assert(!grid.getState().columns.find((column) => column.key === 'trailing_note').pinned, 'Unpin all also clears auto-added right-side pinning');
	assert(document.querySelector('#test-grid thead .mg-selection-toggle')?.closest('th')?.classList.contains('mg-cell-pinned-left') === true, 'Unpin all does not remove the default pinned selection column');
	assert(document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger')?.closest('th')?.classList.contains('mg-cell-pinned-right') === true, 'Unpin all does not remove the default pinned row-actions column');

	rowActionsHeaderTrigger = document.querySelector('#test-grid thead .mg-row-actions .mg-row-actions-trigger');
	assert(!!rowActionsHeaderTrigger, 'Row actions header trigger exists');

	rowActionsHeaderMenu = await openDetailsMenu(rowActionsHeaderTrigger, 1);

	const cityVisibilityRow = findCheckboxRowByText(document.querySelector('#test-grid'), 'City');
	assert(!!cityVisibilityRow, 'City visibility row exists in row-actions header menu');

	const cityVisibilityCheckbox = cityVisibilityRow.querySelector('input');
	dispatchClick(cityVisibilityCheckbox);
	await settleFrames(2);

	assert(document.querySelector('#test-grid thead details.mg-row-actions')?.open === true, 'Row-actions header menu also stays open after toggling another visible column');
	assert(grid.getState().columns.find((column) => column.key === 'city').visible === false, 'Row actions header menu can toggle column visibility');

	const toolbarColumnVisibilityTrigger = document.querySelector('#test-grid .mg-column-visibility summary');
	const toolbarColumnVisibilityMenu = await openDetailsMenu(toolbarColumnVisibilityTrigger, 2);
	const toolbarColumnVisibilityDropdown = toolbarColumnVisibilityMenu?.querySelector('.mg-dropdown-menu');

	assert(toolbarColumnVisibilityMenu?.open === true, 'Toolbar column-visibility menu opens successfully');
	assert(toolbarColumnVisibilityDropdown?.classList.contains('mg-dropdown-menu-floating') === true, 'Toolbar column-visibility menu also uses floating positioning');

	const toolbarCityRow = findCheckboxRowByText(toolbarColumnVisibilityMenu, 'City');
	dispatchClick(toolbarCityRow.querySelector('input'));
	await settleFrames(2);

	assert(document.querySelector('#test-grid details.mg-column-visibility')?.open === true, 'Toolbar column-visibility menu stays open after toggling a checkbox');

	const hoveredStatusHeader = getHeaderCell('status_display');
	dispatchMouseEvent(hoveredStatusHeader, 'mouseenter', 0, 0);
	await settleFrames(1);

	assert(hoveredStatusHeader?.classList.contains('mg-column-hover') === true, 'Hovered header cell receives the column-hover class');
	assert(document.querySelector('#test-grid tbody [data-mg-column-key="status_display"]')?.classList.contains('mg-column-hover') === true, 'Hovered header also highlights body cells in the same column');

	dispatchMouseEvent(hoveredStatusHeader, 'mouseleave', 0, 0);
	await settleFrames(1);

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
	assert(document.querySelector('#test-grid .mg-card .mg-text-display-ellipsis'), 'Card view reuses the configured ellipsis strategy for long-text columns');
	assert(document.querySelector('#test-grid .mg-card .mg-text-display-clamp'), 'Card view reuses the configured clamp strategy for long-text columns');
	assert(document.querySelector('#test-grid .mg-card .mg-text-display-toggle'), 'Card view renders the clamp toggle button');

	const firstCard = document.querySelector('#test-grid .mg-card');
	dispatchClick(firstCard);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-card-detail').length === 1, 'Row detail renders inside card view');

	grid.execute('setViewMode', 'split');
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-split-view').length === 1, 'Split view renders after view switch');
	assert(document.querySelector('#test-grid .mg-split-item .mg-text-display-ellipsis'), 'Split view reuses the configured ellipsis strategy in preview content');
	assert(document.querySelector('#test-grid .mg-split-item .mg-text-display-clamp'), 'Split view reuses the configured clamp strategy in preview content');
	assert(document.querySelector('#test-grid .mg-split-item .mg-text-display-toggle'), 'Split view renders the clamp toggle button');

	const firstSplitItem = document.querySelector('#test-grid .mg-split-item');
	dispatchClick(firstSplitItem);
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid .mg-split-detail').length === 1, 'Split detail pane renders detail content');

	grid.execute('setViewMode', 'table');
	await settleFrames(2);

	assert(document.querySelectorAll('#test-grid tbody tr.mg-row').length >= 1, 'Switching back to table view works');
	assert(document.querySelectorAll('#test-grid .mg-table-scroll').length === 1, 'Switching back to table view keeps the horizontal scroll wrapper');

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
			{ key: 'id', label: 'ID', width: 80 },
			{ key: 'title', label: 'Title', minWidth: 180 }
		]
	});

	await secondGrid.init();
	await settleFrames(2);

	const secondGridRow = document.querySelector('#second-grid tbody tr.mg-row');
	const secondGridIdHeaderCell = document.querySelector('#second-grid thead [data-mg-column-key="id"]');
	const secondGridTitleHeaderCell = document.querySelector('#second-grid thead [data-mg-column-key="title"]');
	const secondGridIdResizeHandle = secondGridIdHeaderCell?.querySelector('.mg-column-resize-handle');

	assert(document.querySelectorAll('.mg-table').length >= 2, 'Two independent grid instances can exist on one page');
	assert(secondGridIdHeaderCell?.style.width === '80px', 'Column width configuration also works on a second independent grid instance');
	assert(secondGridTitleHeaderCell?.style.minWidth === '180px', 'Column minWidth configuration also works on a second independent grid instance');
	assert(!!secondGridIdResizeHandle, 'Resize handles also render on a second independent grid instance');
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

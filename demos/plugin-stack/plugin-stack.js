import {
	BulkActionsPlugin,
	CardViewPlugin,
	ColumnVisibilityPlugin,
	ExportPlugin,
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	ResponsiveViewPlugin,
	RowDetailPlugin,
	SearchPlugin,
	SelectionPlugin,
	SplitDetailViewPlugin,
	SummaryPlugin,
	ViewSwitcherPlugin
} from '../../src/index.js';

const data = [
	{ id: 1, firstname: 'Anna', lastname: 'Schmidt', city: 'Berlin', status: 'active', score: 87, amount: 1543.25, is_verified: true },
	{ id: 2, firstname: 'Ben', lastname: 'Mueller', city: 'Hamburg', status: 'pending', score: 73, amount: 845.90, is_verified: false },
	{ id: 3, firstname: 'Clara', lastname: 'Weber', city: 'Munich', status: 'active', score: 91, amount: 2240.00, is_verified: true },
	{ id: 4, firstname: 'David', lastname: 'Klein', city: 'Cologne', status: 'new', score: 65, amount: 410.30, is_verified: false },
	{ id: 5, firstname: 'Eva', lastname: 'Becker', city: 'Leipzig', status: 'active', score: 78, amount: 1320.10, is_verified: true },
	{ id: 6, firstname: 'Felix', lastname: 'Wagner', city: 'Frankfurt', status: 'pending', score: 84, amount: 980.00, is_verified: false }
];

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
					key: 'toolbar',
					className: 'workspace-zone'
				},
				{
					type: 'zone',
					key: 'bulkZone',
					className: 'workspace-zone workspace-zone--inline'
				},
				{
					type: 'zone',
					key: 'viewZone',
					className: 'workspace-zone workspace-zone--inline'
				},
				{
					type: 'zone',
					key: 'actions',
					className: 'workspace-zone workspace-zone--inline'
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
					key: 'footerInfo',
					className: 'workspace-zone'
				},
				{
					type: 'zone',
					key: 'footerPaging',
					className: 'workspace-zone workspace-zone--inline'
				}
			]
		}
	]
};

const logElement = document.querySelector('#plugin-stack-log');

function setLog(message) {
	logElement.innerHTML = `<strong>Last action:</strong> ${message}`;
}

const grid = new ModularGrid('#plugin-stack-grid', {
	layout,
	data,
	pageSize: 4,
	pageSizeOptions: [4, 6, 10],
	view: {
		mode: 'table'
	},
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		SelectionPlugin,
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
			zone: 'toolbar',
			label: 'Search',
			placeholder: 'Search all columns'
		},
		pageSize: {
			zone: 'actions',
			order: 10
		},
		columnVisibility: {
			zone: 'actions',
			order: 20,
			buttonLabel: 'Columns'
		},
		export: {
			zone: 'actions',
			order: 30,
			fileName: 'plugin-stack-demo',
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
		reset: {
			zone: 'actions',
			order: 40,
			sections: ['query', 'columns', 'selection', 'detailView', 'view']
		},
		bulkActions: {
			zone: 'bulkZone',
			order: 10,
			items: [
				{
					key: 'verify',
					label: 'Mark verified',
					onClick({ selectedRows }) {
						setLog(`Bulk action on ${selectedRows.length} selected rows`);
					}
				},
				{
					key: 'message',
					label: 'Message',
					onClick({ selectedRowIds }) {
						setLog(`Message selected IDs: ${selectedRowIds.join(', ')}`);
					}
				}
			]
		},
		summary: {
			zone: 'footerInfo',
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
					label: 'Sum amount',
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
		viewSwitcher: {
			zone: 'viewZone',
			include: ['table', 'cards', 'split']
		},
		splitDetailView: {
			rowIdKey: 'id',
			titleKey: 'lastname',
			subtitleKey: 'city'
		},
		cardView: {
			titleRenderer(row) {
				return `${row.firstname} ${row.lastname}`;
			},
			subtitleRenderer(row) {
				return `${row.city} · ${row.status}`;
			}
		},
		rowDetail: {
			rowIdKey: 'id'
		},
		responsiveView: {
			breakpoint: 920,
			narrowMode: 'cards',
			wideModeFallback: 'table'
		}
	},
	columns: [
		{ key: 'firstname', label: 'First name' },
		{ key: 'lastname', label: 'Last name' },
		{ key: 'city', label: 'City' },
		{ key: 'status', label: 'Status' },
		{ key: 'score', label: 'Score' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'is_verified', label: 'Verified' }
	]
});

grid.on('export:created', ({ format, scope, rowCount, fileName }) => {
	setLog(`Exported ${rowCount} rows as ${format.toUpperCase()} from scope "${scope}" into ${fileName}`);
});

await grid.init();

window.pluginStackGrid = grid;

import {
	ColumnVisibilityPlugin,
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	RowActionsPlugin,
	SearchPlugin,
	SelectionPlugin,
	SessionStoragePlugin
} from '../../src/index.js';

const data = [
	{ id: 1, name: 'Alice', department: 'Sales', city: 'Berlin', status: 'Active' },
	{ id: 2, name: 'Bob', department: 'Support', city: 'Hamburg', status: 'Pending' },
	{ id: 3, name: 'Charlie', department: 'Engineering', city: 'Munich', status: 'Blocked' },
	{ id: 4, name: 'Diana', department: 'Engineering', city: 'Cologne', status: 'Active' },
	{ id: 5, name: 'Eli', department: 'Marketing', city: 'Leipzig', status: 'Pending' },
	{ id: 6, name: 'Finn', department: 'Sales', city: 'Stuttgart', status: 'Active' },
	{ id: 7, name: 'Grace', department: 'HR', city: 'Frankfurt', status: 'Blocked' },
	{ id: 8, name: 'Hank', department: 'Support', city: 'Bremen', status: 'Pending' },
	{ id: 9, name: 'Ivy', department: 'Engineering', city: 'Dresden', status: 'Active' },
	{ id: 10, name: 'John', department: 'Marketing', city: 'Hanover', status: 'Blocked' }
];

const layout = {
	type: 'stack',
	className: 'mg-layout-root',
	children: [
		{
			type: 'row',
			className: 'modern-top-row',
			children: [
				{
					type: 'zone',
					key: 'searchZone',
					className: 'modern-zone modern-panel modern-panel--search'
				},
				{
					type: 'zone',
					key: 'metaZone',
					className: 'modern-zone modern-panel modern-panel--meta'
				},
				{
					type: 'zone',
					key: 'actionsZone',
					className: 'modern-zone modern-panel modern-panel--actions'
				}
			]
		},
		{
			type: 'zone',
			key: 'selectionZone',
			className: 'modern-zone modern-panel modern-panel--selection'
		},
		{
			type: 'view',
			key: 'main',
			className: 'modern-table-shell'
		},
		{
			type: 'row',
			className: 'modern-bottom-row',
			children: [
				{
					type: 'zone',
					key: 'footerInfo',
					className: 'modern-zone modern-panel'
				},
				{
					type: 'zone',
					key: 'footerPaging',
					className: 'modern-zone modern-panel'
				}
			]
		}
	]
};

const grid = new ModularGrid('#modern-grid', {
	layout,
	data,
	pageSize: 5,
	pageSizeOptions: [5, 10, 20],
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		SelectionPlugin,
		ColumnVisibilityPlugin,
		RowActionsPlugin,
		ResetPlugin,
		SessionStoragePlugin
	],
	pluginOptions: {
		search: {
			zone: 'searchZone'
		},
		pageSize: {
			zone: 'metaZone'
		},
		selection: {
			zone: 'selectionZone',
			rowIdKey: 'id'
		},
		columnVisibility: {
			zone: 'actionsZone',
			buttonLabel: 'Columns',
			order: 20
		},
		reset: {
			zone: 'actionsZone',
			label: 'Reset',
			order: 10,
			sections: ['query', 'columns', 'selection']
		},
		rowActions: {
			items: ({ row }) => {
				return [
					{
						key: 'open',
						label: 'Open profile',
						onClick({ row }) {
							console.log('Open profile', row);
						}
					},
					{
						key: 'mail',
						label: 'Send message',
						onClick({ row }) {
							console.log('Send message', row);
						}
					}
				];
			}
		},
		sessionStorage: {
			key: 'modulargrid-demo-modern-layout',
			sections: ['query', 'columns', 'selection']
		}
	},
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'department', label: 'Department' },
		{ key: 'city', label: 'City' },
		{ key: 'status', label: 'Status' }
	]
});

await grid.init();

window.modernLayoutGrid = grid;

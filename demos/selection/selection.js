import {
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	SearchPlugin,
	SelectionPlugin,
	createClassicLayout
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
	{ id: 9, name: 'Ivy', department: 'Engineering', city: 'Dresden', status: 'Active' }
];

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#selection-grid', {
	layout,
	data,
	pageSize: 5,
	pageSizeOptions: [5, 10],
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		SelectionPlugin,
		ResetPlugin
	],
	pluginOptions: {
		selection: {
			zone: 'actions',
			zoneOrder: 10,
			rowIdKey: 'id'
		},
		reset: {
			zone: 'actions',
			order: 20,
			sections: ['query']
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

window.selectionGrid = grid;

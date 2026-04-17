import {
	ColumnVisibilityPlugin,
	InfoPlugin,
	LocalStoragePlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	SearchPlugin,
	createClassicLayout
} from '../../src/index.js';

const data = [
	{ id: 1, name: 'Alice', age: 24, city: 'Berlin', status: 'Active', team: 'Blue' },
	{ id: 2, name: 'Bob', age: 30, city: 'Hamburg', status: 'Pending', team: 'Red' },
	{ id: 3, name: 'Charlie', age: 22, city: 'Munich', status: 'Blocked', team: 'Green' },
	{ id: 4, name: 'Diana', age: 29, city: 'Cologne', status: 'Active', team: 'Blue' },
	{ id: 5, name: 'Eli', age: 35, city: 'Leipzig', status: 'Blocked', team: 'Red' },
	{ id: 6, name: 'Finn', age: 27, city: 'Stuttgart', status: 'Pending', team: 'Green' },
	{ id: 7, name: 'Grace', age: 26, city: 'Frankfurt', status: 'Active', team: 'Blue' },
	{ id: 8, name: 'Hank', age: 33, city: 'Bremen', status: 'Pending', team: 'Red' }
];

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#columns-grid', {
	layout,
	data,
	pageSize: 5,
	pageSizeOptions: [5, 10],
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		ColumnVisibilityPlugin,
		ResetPlugin,
		LocalStoragePlugin
	],
	pluginOptions: {
		columnVisibility: {
			zone: 'actions',
			buttonLabel: 'Choose columns',
			order: 20
		},
		reset: {
			zone: 'actions',
			order: 10,
			sections: ['query', 'columns']
		},
		localStorage: {
			key: 'modulargrid-demo-column-visibility',
			sections: ['query', 'columns']
		}
	},
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'age', label: 'Age' },
		{ key: 'city', label: 'City' },
		{ key: 'status', label: 'Status' },
		{ key: 'team', label: 'Team' }
	]
});

await grid.init();

window.columnsGrid = grid;

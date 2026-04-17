import {
	ModularGrid,
	SearchPlugin,
	PageSizePlugin,
	InfoPlugin,
	PagingPlugin,
	ResetPlugin,
	createClassicLayout
} from '../../src/index.js';

const demoData = [
	{ id: 1, name: 'Alice', age: 24, city: 'Berlin', status: 'active' },
	{ id: 2, name: 'Bob', age: 30, city: 'Hamburg', status: 'pending' },
	{ id: 3, name: 'Charlie', age: 22, city: 'Munich', status: 'blocked' },
	{ id: 4, name: 'Diana', age: 29, city: 'Cologne', status: 'active' },
	{ id: 5, name: 'Eli', age: 35, city: 'Leipzig', status: 'blocked' },
	{ id: 6, name: 'Finn', age: 27, city: 'Stuttgart', status: 'pending' },
	{ id: 7, name: 'Grace', age: 26, city: 'Frankfurt', status: 'active' },
	{ id: 8, name: 'Hank', age: 33, city: 'Bremen', status: 'pending' },
	{ id: 9, name: 'Ivy', age: 28, city: 'Dresden', status: 'active' },
	{ id: 10, name: 'John', age: 31, city: 'Hanover', status: 'blocked' },
	{ id: 11, name: 'Kira', age: 25, city: 'Bonn', status: 'active' },
	{ id: 12, name: 'Liam', age: 37, city: 'Dortmund', status: 'pending' },
	{ id: 13, name: 'Mia', age: 23, city: 'Essen', status: 'active' },
	{ id: 14, name: 'Noah', age: 41, city: 'Nuremberg', status: 'blocked' },
	{ id: 15, name: 'Olivia', age: 32, city: 'Mannheim', status: 'pending' }
];

function renderStatusBadge(value) {
	const badge = document.createElement('span');
	badge.className = `badge badge--${value}`;
	badge.textContent = value;
	return badge;
}

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#demo-grid', {
	layout,
	data: demoData,
	pageSize: 5,
	pageSizeOptions: [5, 10, 15],
	sort: {
		key: 'name',
		direction: 'asc'
	},
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		ResetPlugin
	],
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'age', label: 'Age' },
		{ key: 'city', label: 'City' },
		{
			key: 'status',
			label: 'Status',
			render: (value) => renderStatusBadge(value)
		}
	]
});

await grid.init();

window.demoGrid = grid;

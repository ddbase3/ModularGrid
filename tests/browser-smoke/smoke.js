import {
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	SearchPlugin,
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

const data = [
	{ id: 1, name: 'Alice', age: 31, city: 'Berlin' },
	{ id: 2, name: 'Bob', age: 28, city: 'Hamburg' },
	{ id: 3, name: 'Charlie', age: 35, city: 'Berlin' },
	{ id: 4, name: 'Diana', age: 22, city: 'Cologne' },
	{ id: 5, name: 'Eli', age: 29, city: 'Bremen' }
];

try {
	const layout = createClassicLayout({
		top: ['toolbar'],
		bottom: ['footerInfo', 'footerPaging']
	});

	const grid = new ModularGrid('#test-grid', {
		layout,
		data,
		pageSize: 2,
		plugins: [
			SearchPlugin,
			PageSizePlugin,
			InfoPlugin,
			PagingPlugin
		],
		columns: [
			{ key: 'id', label: 'ID' },
			{ key: 'name', label: 'Name' },
			{ key: 'age', label: 'Age' },
			{ key: 'city', label: 'City' }
		]
	});

	await grid.init();

	assert(document.querySelectorAll('#test-grid tbody tr').length === 2, 'First grid renders first page with 2 rows');
	assert(document.querySelectorAll('#test-grid input[type="search"]').length === 1, 'Search plugin renders into the layout');

	grid.setSearch('Berlin');
	assert(document.querySelectorAll('#test-grid tbody tr').length === 2, 'Search filters rows correctly');

	grid.clearSearch();
	grid.toggleSort('age');

	const firstAgeCell = document.querySelector('#test-grid tbody tr td:nth-child(3)');
	assert(firstAgeCell.textContent === '22', 'Sorting by age ascending works');

	grid.toggleSort('age');

	const firstAgeCellDesc = document.querySelector('#test-grid tbody tr td:nth-child(3)');
	assert(firstAgeCellDesc.textContent === '35', 'Sorting by age descending works');

	grid.setPage(2);
	const firstCellPage2 = document.querySelector('#test-grid tbody tr td:first-child');
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

	assert(document.querySelectorAll('.mg-table').length === 2, 'Two independent grid instances can exist on one page');

	log('Smoke test completed successfully.', 'pass');
} catch (error) {
	log(`FAIL: ${error.message}`, 'fail');
	throw error;
}

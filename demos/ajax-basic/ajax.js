import {
	AjaxAdapter,
	ModularGrid,
	SearchPlugin,
	PageSizePlugin,
	InfoPlugin,
	PagingPlugin,
	ResetPlugin,
	createClassicLayout
} from '../../src/index.js';

const adapter = new AjaxAdapter({
	url: './data.json'
});

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#ajax-grid', {
	layout,
	adapter,
	pageSize: 5,
	pageSizeOptions: [5, 10, 20],
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
		{ key: 'department', label: 'Department' },
		{ key: 'city', label: 'City' },
		{ key: 'status', label: 'Status' }
	]
});

await grid.init();

window.ajaxGrid = grid;

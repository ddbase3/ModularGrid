import {
	HtmlTableAdapter,
	ModularGrid,
	SearchPlugin,
	PageSizePlugin,
	InfoPlugin,
	PagingPlugin,
	ResetPlugin,
	createClassicLayout
} from '../../src/index.js';

const adapter = new HtmlTableAdapter('#source-table', {
	hideSource: true
});

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#html-grid', {
	layout,
	adapter,
	pageSize: 4,
	pageSizeOptions: [4, 7, 10],
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		ResetPlugin
	]
});

await grid.init();

window.htmlGrid = grid;

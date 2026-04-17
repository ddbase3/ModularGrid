import {
	ModularGrid,
	SearchPlugin,
	PageSizePlugin,
	InfoPlugin,
	PagingPlugin,
	createClassicLayout
} from '../../src/index.js';

const users = [
	{ id: 1, name: 'Alice', role: 'Admin', city: 'Berlin' },
	{ id: 2, name: 'Bob', role: 'Editor', city: 'Hamburg' },
	{ id: 3, name: 'Charlie', role: 'Viewer', city: 'Munich' },
	{ id: 4, name: 'Diana', role: 'Admin', city: 'Cologne' },
	{ id: 5, name: 'Eli', role: 'Editor', city: 'Bremen' },
	{ id: 6, name: 'Finn', role: 'Viewer', city: 'Leipzig' }
];

const projects = [
	{ id: 100, title: 'ModularGrid', status: 'Active', budget: 12000 },
	{ id: 101, title: 'Data Import', status: 'Planned', budget: 4500 },
	{ id: 102, title: 'Dashboard Redesign', status: 'Active', budget: 8000 },
	{ id: 103, title: 'Legacy Cleanup', status: 'Paused', budget: 2000 },
	{ id: 104, title: 'Export Engine', status: 'Active', budget: 6200 },
	{ id: 105, title: 'Charts', status: 'Planned', budget: 3100 }
];

const layout = createClassicLayout({
	top: ['toolbar'],
	bottom: ['footerInfo', 'footerPaging']
});

const sharedPlugins = [
	SearchPlugin,
	PageSizePlugin,
	InfoPlugin,
	PagingPlugin
];

const usersGrid = new ModularGrid('#users-grid', {
	layout,
	data: users,
	pageSize: 3,
	plugins: sharedPlugins,
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'role', label: 'Role' },
		{ key: 'city', label: 'City' }
	]
});

const projectsGrid = new ModularGrid('#projects-grid', {
	layout,
	data: projects,
	pageSize: 4,
	plugins: sharedPlugins,
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'title', label: 'Title' },
		{ key: 'status', label: 'Status' },
		{ key: 'budget', label: 'Budget' }
	]
});

await usersGrid.init();
await projectsGrid.init();

window.usersGrid = usersGrid;
window.projectsGrid = projectsGrid;

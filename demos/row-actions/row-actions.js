import {
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	RowActionsPlugin,
	SearchPlugin,
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
	{ id: 8, name: 'Hank', department: 'Support', city: 'Bremen', status: 'Pending' }
];

const logElement = document.querySelector('#action-log');

function addLog(message) {
	const entry = document.createElement('div');
	entry.className = 'log-entry';
	entry.textContent = message;
	logElement.prepend(entry);
}

const layout = createClassicLayout({
	top: ['toolbar', 'actions'],
	bottom: ['footerInfo', 'footerPaging']
});

const grid = new ModularGrid('#row-actions-grid', {
	layout,
	data,
	pageSize: 5,
	pageSizeOptions: [5, 10],
	onRowClick(row) {
		addLog(`Row clicked: ${row.name}`);
	},
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		RowActionsPlugin,
		ResetPlugin
	],
	pluginOptions: {
		rowActions: {
			items: ({ row }) => {
				return [
					{
						key: 'view',
						label: 'View details',
						onClick({ row }) {
							addLog(`Action "View details" on ${row.name}`);
						}
					},
					{
						key: 'duplicate',
						label: 'Duplicate',
						onClick({ row }) {
							addLog(`Action "Duplicate" on ${row.name}`);
						}
					},
					{
						key: 'remove',
						label: 'Remove',
						onClick({ row }) {
							addLog(`Action "Remove" on ${row.name}`);
						}
					}
				];
			}
		},
		reset: {
			zone: 'actions',
			order: 10,
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

window.rowActionsGrid = grid;

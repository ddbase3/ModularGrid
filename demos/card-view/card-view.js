import {
	CardViewPlugin,
	ColumnVisibilityPlugin,
	InfoPlugin,
	ModularGrid,
	PageSizePlugin,
	PagingPlugin,
	ResetPlugin,
	ResponsiveViewPlugin,
	RowActionsPlugin,
	SearchPlugin,
	SessionStoragePlugin,
	SplitDetailViewPlugin,
	ViewSwitcherPlugin
} from '../../src/index.js';

const data = [
	{ id: 1, name: 'Alice', department: 'Sales', city: 'Berlin', status: 'Active', email: 'alice@example.com' },
	{ id: 2, name: 'Bob', department: 'Support', city: 'Hamburg', status: 'Pending', email: 'bob@example.com' },
	{ id: 3, name: 'Charlie', department: 'Engineering', city: 'Munich', status: 'Blocked', email: 'charlie@example.com' },
	{ id: 4, name: 'Diana', department: 'Engineering', city: 'Cologne', status: 'Active', email: 'diana@example.com' },
	{ id: 5, name: 'Eli', department: 'Marketing', city: 'Leipzig', status: 'Pending', email: 'eli@example.com' },
	{ id: 6, name: 'Finn', department: 'Sales', city: 'Stuttgart', status: 'Active', email: 'finn@example.com' },
	{ id: 7, name: 'Grace', department: 'HR', city: 'Frankfurt', status: 'Blocked', email: 'grace@example.com' },
	{ id: 8, name: 'Hank', department: 'Support', city: 'Bremen', status: 'Pending', email: 'hank@example.com' },
	{ id: 9, name: 'Ivy', department: 'Engineering', city: 'Dresden', status: 'Active', email: 'ivy@example.com' },
	{ id: 10, name: 'John', department: 'Marketing', city: 'Hanover', status: 'Blocked', email: 'john@example.com' }
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
					key: 'searchZone',
					className: 'workspace-zone'
				},
				{
					type: 'zone',
					key: 'viewZone',
					className: 'workspace-zone workspace-zone--inline'
				},
				{
					type: 'zone',
					key: 'actionsZone',
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

function renderMailLikeDetail(row) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mail-content';

	const summary = document.createElement('div');
	summary.className = 'mail-block';
	summary.innerHTML = `
		<h3>Overview</h3>
		<p>
			${row.name} is currently assigned to <strong>${row.department}</strong> in ${row.city}.
			Status is <strong>${row.status}</strong>.
		</p>
	`;

	const message = document.createElement('div');
	message.className = 'mail-block';
	message.innerHTML = `
		<h3>Message Preview</h3>
		<p>
			Hello ${row.name}, this is a fictional detail area intended to represent a larger content
			panel similar to an email reader or issue detail page. The left side stays focused on fast
			browsing, while the right side can show much richer content.
		</p>
	`;

	const metadata = document.createElement('div');
	metadata.className = 'mail-block';
	metadata.innerHTML = `
		<h3>Metadata</h3>
		<p>Email: ${row.email}</p>
	`;

	wrapper.appendChild(summary);
	wrapper.appendChild(message);
	wrapper.appendChild(metadata);

	return wrapper;
}

const grid = new ModularGrid('#card-view-grid', {
	layout,
	data,
	view: {
		mode: 'split'
	},
	pageSize: 5,
	pageSizeOptions: [5, 10, 20],
	plugins: [
		SearchPlugin,
		PageSizePlugin,
		InfoPlugin,
		PagingPlugin,
		ColumnVisibilityPlugin,
		RowActionsPlugin,
		ResetPlugin,
		SessionStoragePlugin,
		CardViewPlugin,
		SplitDetailViewPlugin,
		ViewSwitcherPlugin,
		ResponsiveViewPlugin
	],
	pluginOptions: {
		search: {
			zone: 'searchZone'
		},
		viewSwitcher: {
			zone: 'viewZone',
			include: ['table', 'split'],
			labels: {
				table: 'Table',
				split: 'Split'
			}
		},
		pageSize: {
			zone: 'actionsZone',
			order: 10
		},
		columnVisibility: {
			zone: 'actionsZone',
			buttonLabel: 'Columns',
			order: 20
		},
		reset: {
			zone: 'actionsZone',
			label: 'Reset',
			order: 30,
			sections: ['query', 'columns', 'view', 'splitDetailView']
		},
		sessionStorage: {
			key: 'modulargrid-demo-responsive-split',
			sections: ['query', 'columns', 'view', 'splitDetailView']
		},
		cardView: {
			titleKey: 'name',
			subtitleKey: 'department'
		},
		splitDetailView: {
			rowIdKey: 'id',
			titleKey: 'name',
			subtitleKey: 'department',
			previewKeys: ['city', 'status'],
			detailRenderer: renderMailLikeDetail
		},
		rowActions: {
			items: ({ row }) => {
				return [
					{
						key: 'open',
						label: 'Open',
						onClick({ row }) {
							console.log('Open', row);
						}
					},
					{
						key: 'message',
						label: 'Message',
						onClick({ row }) {
							console.log('Message', row);
						}
					}
				];
			}
		},
		responsiveView: {
			breakpoint: 920,
			narrowMode: 'cards',
			wideModeFallback: 'split'
		}
	},
	columns: [
		{ key: 'id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'department', label: 'Department' },
		{ key: 'city', label: 'City' },
		{ key: 'status', label: 'Status' },
		{ key: 'email', label: 'Email' }
	]
});

await grid.init();

window.cardViewGrid = grid;

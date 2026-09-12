import { attachFloatingDropdown, setFloatingDropdownOpenState } from '../utils/dropdown.js';

function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 10,
		stateKey: 'treeFilters',
		showClearButton: true,
		fields: [],
		...context.getPluginOptions('treeFilters')
	};
}

function normalizeValue(value) {
	if (value === null || value === undefined) {
		return '';
	}

	return String(value).trim();
}

function getDefaultValue(field) {
	return normalizeValue(field?.defaultValue ?? '');
}

function getInitialValue(field) {
	if (Object.prototype.hasOwnProperty.call(field || {}, 'initialValue')) {
		return normalizeValue(field.initialValue);
	}

	return getDefaultValue(field);
}

function buildInitialState(options, currentState = {}) {
	const nextState = {};

	(options.fields || []).forEach((field) => {
		if (!field?.key) {
			return;
		}

		const key = String(field.key);
		const currentValue = Object.prototype.hasOwnProperty.call(currentState, key)
			? currentState[key]
			: getInitialValue(field);

		nextState[key] = normalizeValue(currentValue);
	});

	return nextState;
}

function getTreeFilterState(context, options) {
	return context.peekState()[options.stateKey] || {};
}

function getFieldByKey(options, key) {
	return (options.fields || []).find((field) => String(field?.key || '') === key) || null;
}

function getRuntime(context, key) {
	context._treeFiltersPluginRuntime = context._treeFiltersPluginRuntime || new Map();

	if (!context._treeFiltersPluginRuntime.has(key)) {
		context._treeFiltersPluginRuntime.set(key, {
			nodes: null,
			loading: false,
			loadPromise: null,
			error: '',
			expanded: new Set(),
			search: ''
		});
	}

	return context._treeFiltersPluginRuntime.get(key);
}

function normalizeNode(node) {
	if (!node || typeof node !== 'object') {
		return null;
	}

	const id = normalizeValue(node.id);
	if (id === '') {
		return null;
	}

	return {
		id,
		parentId: normalizeValue(node.parentId),
		label: String(node.label ?? id),
		depth: Number.isFinite(Number(node.depth)) ? Number(node.depth) : null
	};
}

function normalizeNodes(value) {
	const nodes = Array.isArray(value)
		? value
		: Array.isArray(value?.nodes)
			? value.nodes
			: [];

	const seen = new Set();
	const result = [];

	nodes.forEach((node) => {
		const normalized = normalizeNode(node);

		if (!normalized || seen.has(normalized.id)) {
			return;
		}

		seen.add(normalized.id);
		result.push(normalized);
	});

	return result;
}

function createIndex(nodes) {
	const byId = new Map();
	const childrenByParent = new Map();

	(nodes || []).forEach((node) => {
		byId.set(node.id, node);
	});

	(nodes || []).forEach((node) => {
		const parentId = byId.has(node.parentId) && node.parentId !== node.id
			? node.parentId
			: '';

		if (!childrenByParent.has(parentId)) {
			childrenByParent.set(parentId, []);
		}

		childrenByParent.get(parentId).push(node);
	});

	return {
		byId,
		childrenByParent,
		roots: childrenByParent.get('') || []
	};
}

function getPath(index, id) {
	const path = [];
	const visited = new Set();
	let current = index.byId.get(normalizeValue(id)) || null;

	while (current && !visited.has(current.id)) {
		path.unshift(current);
		visited.add(current.id);
		current = index.byId.get(current.parentId) || null;
	}

	return path;
}

function expandSelectionPath(runtime, index, selectedId) {
	const path = getPath(index, selectedId);

	path.slice(0, -1).forEach((node) => {
		runtime.expanded.add(node.id);
	});

	if (path.length === 0 && index.roots.length === 1) {
		runtime.expanded.add(index.roots[0].id);
	}
}

function normalizeSearchText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();
}

function matchesSearch(node, index, search) {
	const tokens = normalizeSearchText(search)
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (tokens.length === 0) {
		return true;
	}

	const path = getPath(index, node.id)
		.map((entry) => entry.label)
		.join(' ');
	const haystack = normalizeSearchText(`${node.label} ${path}`);

	return tokens.every((token) => haystack.includes(token));
}

function getPathLabel(index, id) {
	return getPath(index, id).map((node) => node.label).join(' › ');
}

function appendDimensions(element, field) {
	if (field.width) {
		element.style.width = `${field.width}px`;
	}

	if (field.minWidth) {
		element.style.minWidth = `${field.minWidth}px`;
	}

	if (field.maxWidth) {
		element.style.maxWidth = `${field.maxWidth}px`;
	}
}

function applyAppearance(element, field) {
	const accentColor = String(field?.accentColor || '').trim();

	if (accentColor !== '') {
		element.style.setProperty('--mg-tree-filter-accent', accentColor);
	}
}

function closeDropdown(context, options, field, details) {
	setFloatingDropdownOpenState(context.grid, `tree-filter-${options.stateKey}-${field.key}`, false);
	details.open = false;
}

function setSelection(context, options, field, value, details = null) {
	getRuntime(context, String(field.key)).search = '';

	if (details) {
		closeDropdown(context, options, field, details);
	}

	context.execute('setTreeFilterValue', {
		key: field.key,
		value
	});
}

function createBreadcrumb(context, options, field, runtime, selectedId, details) {
	const breadcrumb = document.createElement('div');
	breadcrumb.className = 'mg-tree-filter-breadcrumb';

	if (!selectedId) {
		const empty = document.createElement('span');
		empty.className = 'mg-tree-filter-breadcrumb-empty';
		empty.textContent = field.emptyLabel || field.label || field.key;
		breadcrumb.appendChild(empty);
		return breadcrumb;
	}

	if (!Array.isArray(runtime.nodes)) {
		const loading = document.createElement('span');
		loading.className = 'mg-tree-filter-breadcrumb-empty';
		loading.textContent = context.getString('loading');
		breadcrumb.appendChild(loading);
		return breadcrumb;
	}

	const index = createIndex(runtime.nodes);
	const path = getPath(index, selectedId);

	if (path.length === 0) {
		const missing = document.createElement('span');
		missing.className = 'mg-tree-filter-breadcrumb-empty';
		missing.textContent = field.emptyLabel || field.label || field.key;
		breadcrumb.appendChild(missing);
		return breadcrumb;
	}

	path.forEach((node, pathIndex) => {
		if (pathIndex > 0) {
			const separator = document.createElement('span');
			separator.className = 'mg-tree-filter-breadcrumb-separator';
			separator.textContent = '›';
			breadcrumb.appendChild(separator);
		}

		const item = document.createElement('button');
		item.type = 'button';
		item.className = 'mg-tree-filter-breadcrumb-item';
		item.textContent = node.label;
		item.title = getPathLabel(index, node.id);
		item.dataset.mgFocusKey = `tree-filter-breadcrumb-${field.key}-${node.id}`;
		item.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			setSelection(context, options, field, node.id, details);
		});
		breadcrumb.appendChild(item);
	});

	return breadcrumb;
}

function createMessage(text, className = '') {
	const message = document.createElement('div');
	message.className = `mg-tree-filter-message ${className}`.trim();
	message.textContent = text;
	return message;
}

function createNoSelectionRow(context, options, field, selectedId, details) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'mg-tree-filter-no-selection';
	button.textContent = field.clearLabel || field.emptyLabel || context.getString('clear');

	if (selectedId === '') {
		button.classList.add('mg-tree-filter-no-selection-selected');
		button.setAttribute('aria-current', 'true');
	}

	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		setSelection(context, options, field, '', details);
	});

	return button;
}

function createNodeRow(context, options, field, runtime, index, node, selectedId, depth, details, menu) {
	const children = index.childrenByParent.get(node.id) || [];
	const hasChildren = children.length > 0;
	const row = document.createElement('div');
	row.className = 'mg-tree-filter-node';
	row.style.setProperty('--mg-tree-depth', String(Math.max(0, depth)));

	const fold = document.createElement('button');
	fold.type = 'button';
	fold.className = 'mg-tree-filter-fold';
	fold.disabled = !hasChildren;
	fold.setAttribute('aria-label', hasChildren ? context.getString('toggleTreeNode') : '');
	fold.textContent = hasChildren ? (runtime.expanded.has(node.id) ? '▾' : '▸') : '';
	fold.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();

		if (!hasChildren) {
			return;
		}

		if (runtime.expanded.has(node.id)) {
			runtime.expanded.delete(node.id);
		}
		else {
			runtime.expanded.add(node.id);
		}

		renderMenuBody(context, options, field, runtime, details, menu);
	});

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'mg-tree-filter-node-select';
	button.textContent = node.label;
	button.title = getPathLabel(index, node.id);
	button.dataset.mgFocusKey = `tree-filter-node-${field.key}-${node.id}`;

	if (node.id === selectedId) {
		button.classList.add('mg-tree-filter-node-selected');
		button.setAttribute('aria-current', 'true');
	}

	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		setSelection(context, options, field, node.id, details);
	});

	row.appendChild(fold);
	row.appendChild(button);
	return row;
}

function appendTreeNodes(container, context, options, field, runtime, index, nodes, selectedId, depth, details, menu) {
	(nodes || []).forEach((node) => {
		container.appendChild(createNodeRow(context, options, field, runtime, index, node, selectedId, depth, details, menu));

		if (!runtime.expanded.has(node.id)) {
			return;
		}

		appendTreeNodes(
			container,
			context,
			options,
			field,
			runtime,
			index,
			index.childrenByParent.get(node.id) || [],
			selectedId,
			depth + 1,
			details,
			menu
		);
	});
}

function renderSearchResults(container, context, options, field, runtime, index, selectedId, details) {
	const matches = runtime.nodes.filter((node) => matchesSearch(node, index, runtime.search));

	if (matches.length === 0) {
		container.appendChild(createMessage(context.getString('noTreeMatches')));
		return;
	}

	matches.forEach((node) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'mg-tree-filter-search-result';

		if (node.id === selectedId) {
			button.classList.add('mg-tree-filter-node-selected');
		}

		const label = document.createElement('span');
		label.className = 'mg-tree-filter-search-result-label';
		label.textContent = node.label;

		const path = document.createElement('span');
		path.className = 'mg-tree-filter-search-result-path';
		path.textContent = getPathLabel(index, node.id);

		button.appendChild(label);
		button.appendChild(path);
		button.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			setSelection(context, options, field, node.id, details);
		});
		container.appendChild(button);
	});
}

function renderMenuBody(context, options, field, runtime, details, menu) {
	const body = menu.querySelector('.mg-tree-filter-menu-body');
	if (!(body instanceof HTMLElement)) {
		return;
	}

	body.replaceChildren();

	const selectedId = normalizeValue(getTreeFilterState(context, options)[field.key]);
	if (options.showClearButton !== false) {
		body.appendChild(createNoSelectionRow(context, options, field, selectedId, details));
	}

	if (runtime.loading) {
		body.appendChild(createMessage(context.getString('loading')));
		return;
	}

	if (runtime.error) {
		body.appendChild(createMessage(runtime.error, 'mg-tree-filter-message-error'));
		return;
	}

	if (!Array.isArray(runtime.nodes) || runtime.nodes.length === 0) {
		body.appendChild(createMessage(context.getString('noTreeNodes')));
		return;
	}

	const index = createIndex(runtime.nodes);

	if (runtime.search.trim() !== '') {
		renderSearchResults(body, context, options, field, runtime, index, selectedId, details);
		return;
	}

	const tree = document.createElement('div');
	tree.className = 'mg-tree-filter-tree';
	appendTreeNodes(tree, context, options, field, runtime, index, index.roots, selectedId, 0, details, menu);
	body.appendChild(tree);
}

async function ensureNodes(context, options, field, runtime) {
	if (Array.isArray(runtime.nodes)) {
		return runtime.nodes;
	}

	if (runtime.loadPromise) {
		return runtime.loadPromise;
	}

	if (Array.isArray(field.nodes)) {
		runtime.nodes = normalizeNodes(field.nodes);
		const index = createIndex(runtime.nodes);
		expandSelectionPath(runtime, index, getTreeFilterState(context, options)[field.key]);
		return runtime.nodes;
	}

	if (typeof field.loadNodes !== 'function') {
		runtime.nodes = [];
		return runtime.nodes;
	}

	runtime.loading = true;
	runtime.error = '';

	runtime.loadPromise = Promise.resolve(field.loadNodes(field, context.grid))
		.then((value) => {
			runtime.nodes = normalizeNodes(value);
			const index = createIndex(runtime.nodes);
			expandSelectionPath(runtime, index, getTreeFilterState(context, options)[field.key]);
			return runtime.nodes;
		})
		.catch((error) => {
			runtime.error = String(error?.message || error || context.getString('treeLoadFailed'));
			runtime.nodes = null;
			return [];
		})
		.finally(() => {
			runtime.loading = false;
			runtime.loadPromise = null;
			context.requestRender();
		});

	return runtime.loadPromise;
}

function createMenu(context, options, field, runtime, details) {
	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-tree-filter-menu';

	const header = document.createElement('div');
	header.className = 'mg-tree-filter-menu-header';

	const search = document.createElement('input');
	search.type = 'search';
	search.className = 'mg-input mg-tree-filter-search';
	search.placeholder = field.searchPlaceholder || context.getString('treeSearchPlaceholder');
	search.value = runtime.search;
	search.autocomplete = 'off';
	search.dataset.mgFocusKey = `tree-filter-search-${field.key}`;
	search.addEventListener('input', () => {
		runtime.search = search.value;
		renderMenuBody(context, options, field, runtime, details, menu);
	});
	header.appendChild(search);


	const body = document.createElement('div');
	body.className = 'mg-tree-filter-menu-body';

	menu.appendChild(header);
	menu.appendChild(body);
	return menu;
}

function createControl(context, options, field) {
	const key = String(field.key);
	const runtime = getRuntime(context, key);
	const selectedId = normalizeValue(getTreeFilterState(context, options)[key]);
	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-tree-filter-control';
	details.dataset.treeFilterKey = key;
	details.title = field.label || key;
	appendDimensions(details, field);
	applyAppearance(details, field);

	if (selectedId !== '') {
		details.classList.add('mg-tree-filter-control-active');
	}

	const summary = document.createElement('summary');
	summary.className = 'mg-tree-filter-summary';
	summary.dataset.mgFocusKey = `tree-filter-summary-${key}`;

	const label = document.createElement('span');
	label.className = 'mg-tree-filter-label';
	label.textContent = field.shortLabel || field.label || key;

	summary.appendChild(label);
	summary.appendChild(createBreadcrumb(context, options, field, runtime, selectedId, details));

	const indicator = document.createElement('span');
	indicator.className = 'mg-tree-filter-indicator';
	indicator.setAttribute('aria-hidden', 'true');
	indicator.textContent = '▾';
	summary.appendChild(indicator);

	const menu = createMenu(context, options, field, runtime, details);
	details.appendChild(summary);
	details.appendChild(menu);

	details.addEventListener('toggle', () => {
		if (!details.open) {
			return;
		}

		ensureNodes(context, options, field, runtime).then(() => {
			if (details.open && details.isConnected) {
				renderMenuBody(context, options, field, runtime, details, menu);
			}
		});
	});

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign: 'start',
		stateKey: `tree-filter-${options.stateKey}-${key}`
	});

	renderMenuBody(context, options, field, runtime, details, menu);

	if (selectedId !== '' && !Array.isArray(runtime.nodes) && !runtime.loading) {
		ensureNodes(context, options, field, runtime);
	}

	return details;
}

function renderTreeFilters(context, options) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-tree-filters';

	(options.fields || []).forEach((field) => {
		if (!field?.key) {
			return;
		}

		wrapper.appendChild(createControl(context, options, field));
	});

	return wrapper;
}

function emitChanged(context, options, treeFilters) {
	context.events.emit('treeFilters:changed', {
		grid: context.grid,
		stateKey: options.stateKey,
		treeFilters
	});
}

function setState(context, options, treeFilters) {
	context.setState({
		[options.stateKey]: treeFilters,
		query: {
			page: 1
		}
	});

	emitChanged(context, options, treeFilters);
	return context.grid;
}

export const TreeFiltersPlugin = {
	name: 'treeFilters',

	install(context) {
		const options = resolveOptions(context);
		const currentState = context.peekState()[options.stateKey] || {};
		context._treeFiltersPluginRuntime = new Map();
		context.setState({
			[options.stateKey]: buildInitialState(options, currentState)
		});
	},

	destroy(context) {
		context._treeFiltersPluginRuntime = null;
	},

	commands: {
		setTreeFilterValue(context, payload = {}) {
			const options = resolveOptions(context);
			const key = normalizeValue(payload.key);
			const field = getFieldByKey(options, key);

			if (!field) {
				return context.grid;
			}

			const currentState = getTreeFilterState(context, options);
			const value = normalizeValue(payload.value);
			if (normalizeValue(currentState[key]) === value) {
				return context.grid;
			}

			const nextState = {
				...currentState,
				[key]: value
			};

			const runtime = getRuntime(context, key);
			if (Array.isArray(runtime.nodes)) {
				expandSelectionPath(runtime, createIndex(runtime.nodes), nextState[key]);
			}

			return setState(context, options, nextState);
		},

		clearTreeFilters(context) {
			const options = resolveOptions(context);
			const nextState = {};

			(options.fields || []).forEach((field) => {
				if (field?.key) {
					nextState[String(field.key)] = getDefaultValue(field);
				}
			});

			return setState(context, options, nextState);
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		if (!Array.isArray(options.fields) || options.fields.length === 0) {
			return [];
		}

		return [{
			zone: options.zone,
			order: options.order,
			render() {
				return renderTreeFilters(context, options);
			}
		}];
	}
};

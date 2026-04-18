import { appendContent, createElement } from './dom.js';

function normalizeTextDisplayConfig(config) {
	if (!config) {
		return null;
	}

	if (typeof config === 'string') {
		return {
			strategy: config
		};
	}

	if (typeof config === 'object') {
		return {
			...config
		};
	}

	return null;
}

function isSupportedStrategy(strategy) {
	return strategy === 'wrap' || strategy === 'ellipsis' || strategy === 'nowrap' || strategy === 'clamp';
}

function resolveTextDisplayOptions(grid, column = null) {
	const gridConfig = normalizeTextDisplayConfig(grid?.options?.textDisplay);
	const columnConfig = normalizeTextDisplayConfig(column?.textDisplay);

	if (!gridConfig && !columnConfig) {
		return null;
	}

	const options = {
		rowIdKey: 'id',
		strategy: 'wrap',
		title: true,
		lines: 2,
		expandable: true,
		expandLabel: 'More',
		collapseLabel: 'Less',
		...(gridConfig || {}),
		...(columnConfig || {})
	};

	if (!isSupportedStrategy(options.strategy)) {
		options.strategy = 'wrap';
	}

	if (options.strategy !== 'clamp') {
		options.expandable = false;
	}

	options.lines = Math.max(1, Number(options.lines) || 2);

	return options;
}

function extractTextContent(content) {
	if (content === null || content === undefined) {
		return '';
	}

	if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
		return String(content);
	}

	if (content instanceof Node) {
		return String(content.textContent || '').trim();
	}

	return String(content).trim();
}

function getRowIdentifier(row, options) {
	if (!row || typeof row !== 'object') {
		return null;
	}

	const rowIdKey = options?.rowIdKey || 'id';
	const rowId = row[rowIdKey];

	if (rowId === null || rowId === undefined || rowId === '') {
		return null;
	}

	return rowId;
}

function getExpandedStateKey(row, column, options) {
	if (!column?.key) {
		return null;
	}

	const rowId = getRowIdentifier(row, options);

	if (rowId === null) {
		return null;
	}

	return `${column.key}::${rowId}`;
}

function isExpanded(grid, key) {
	if (!key) {
		return false;
	}

	return grid?.store?.peek()?.textDisplay?.expanded?.[key] === true;
}

function shouldAddTitle(options) {
	return options?.title !== false;
}

export function getDisplayValue(value, placeholder = '—') {
	if (value === null || value === undefined || value === '') {
		return placeholder;
	}

	return value;
}

export function wrapTextDisplayContent(content, grid, column = null, row = null, extraClassName = '') {
	const options = resolveTextDisplayOptions(grid, column);

	if (!options) {
		return content;
	}

	const title = extractTextContent(content);
	const classNames = [
		'mg-text-display',
		`mg-text-display-${options.strategy}`
	];

	if (extraClassName) {
		classNames.push(extraClassName);
	}

	if (options.strategy === 'clamp') {
		const block = createElement('div', 'mg-text-display-block');
		const wrapper = createElement('div', classNames.join(' '));
		const expandedStateKey = getExpandedStateKey(row, column, options);
		const expanded = isExpanded(grid, expandedStateKey);
		const canToggle = options.expandable !== false && !!expandedStateKey;

		wrapper.style.setProperty('--mg-text-clamp-lines', String(options.lines));

		if (expanded) {
			wrapper.classList.add('mg-text-display-expanded');
		}

		if (expandedStateKey) {
			wrapper.dataset.mgTextDisplayKey = expandedStateKey;
		}

		if (shouldAddTitle(options) && title) {
			wrapper.title = title;
		}

		appendContent(wrapper, content);
		block.appendChild(wrapper);

		if (canToggle) {
			const toggle = createElement('button', 'mg-text-display-toggle');
			toggle.type = 'button';
			toggle.dataset.mgTextDisplayToggleKey = expandedStateKey;
			toggle.textContent = expanded ? options.collapseLabel : options.expandLabel;

			toggle.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				grid.execute('toggleTextDisplayExpanded', {
					key: expandedStateKey
				});
			});

			block.appendChild(toggle);
		}

		return block;
	}

	const wrapper = createElement('div', classNames.join(' '));

	if ((options.strategy === 'ellipsis' || options.strategy === 'nowrap') && shouldAddTitle(options) && title) {
		wrapper.title = title;
	}

	appendContent(wrapper, content);

	return wrapper;
}

export function getTextDisplayContent(value, placeholder, grid, column = null, row = null, extraClassName = '') {
	return wrapTextDisplayContent(
		getDisplayValue(value, placeholder),
		grid,
		column,
		row,
		extraClassName
	);
}

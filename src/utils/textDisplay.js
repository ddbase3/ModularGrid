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
	return strategy === 'wrap' || strategy === 'ellipsis' || strategy === 'nowrap';
}

function resolveTextDisplayOptions(grid, column = null) {
	const gridConfig = normalizeTextDisplayConfig(grid?.options?.textDisplay);
	const columnConfig = normalizeTextDisplayConfig(column?.textDisplay);

	if (!gridConfig && !columnConfig) {
		return null;
	}

	const options = {
		strategy: 'wrap',
		title: true,
		...(gridConfig || {}),
		...(columnConfig || {})
	};

	if (!isSupportedStrategy(options.strategy)) {
		options.strategy = 'wrap';
	}

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

export function getDisplayValue(value, placeholder = '—') {
	if (value === null || value === undefined || value === '') {
		return placeholder;
	}

	return value;
}

export function wrapTextDisplayContent(content, grid, column = null, extraClassName = '') {
	const options = resolveTextDisplayOptions(grid, column);

	if (!options) {
		return content;
	}

	const classNames = [
		'mg-text-display',
		`mg-text-display-${options.strategy}`
	];

	if (extraClassName) {
		classNames.push(extraClassName);
	}

	const wrapper = createElement('div', classNames.join(' '));

	if (options.strategy === 'ellipsis' && options.title !== false) {
		const title = extractTextContent(content);

		if (title) {
			wrapper.title = title;
		}
	}

	appendContent(wrapper, content);

	return wrapper;
}

export function getTextDisplayContent(value, placeholder, grid, column = null, extraClassName = '') {
	return wrapTextDisplayContent(
		getDisplayValue(value, placeholder),
		grid,
		column,
		extraClassName
	);
}

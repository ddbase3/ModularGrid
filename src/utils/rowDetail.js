import { appendContent, createElement } from './dom.js';

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEntry(rawEntry) {
	const entry = isPlainObject(rawEntry) ? rawEntry : {};

	return {
		status: entry.status || 'idle',
		payload: entry.payload ?? null,
		error: entry.error ?? null,
		requestId: entry.requestId ?? null,
		version: Number(entry.version) || 0
	};
}

function resolveAsyncDetailOptions(configured) {
	const configuredAsyncDetail = isPlainObject(configured.asyncDetail)
		? configured.asyncDetail
		: {};
	const load = typeof configuredAsyncDetail.load === 'function'
		? configuredAsyncDetail.load
		: null;

	return {
		enabled: load !== null,
		cache: true,
		load,
		render: null,
		renderLoading: null,
		renderError: null,
		...configuredAsyncDetail,
		load
	};
}

function getRowDetailState(grid, options) {
	const state = typeof grid.store?.peek === 'function' ? grid.store.peek() : {};
	const rawState = isPlainObject(state[options.stateKey]) ? state[options.stateKey] : {};

	return {
		rowId: rawState.rowId ?? null,
		entries: isPlainObject(rawState.entries) ? rawState.entries : {}
	};
}

function createStatusBox(className, text) {
	const statusBox = createElement('div', `mg-row-detail-status ${className}`);
	statusBox.textContent = text;

	return statusBox;
}

function formatObjectLabel(key) {
	return String(key)
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatObjectValue(value) {
	if (value === null || value === undefined || value === '') {
		return '—';
	}

	if (Array.isArray(value)) {
		return value.join(', ');
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

function renderGenericObjectPayload(payload) {
	const fields = createElement('div', 'mg-row-detail-fields');

	Object.entries(payload).forEach(([key, value]) => {
		const field = createElement('div', 'mg-row-detail-field');
		const label = createElement('div', 'mg-row-detail-label');
		const content = createElement('div', 'mg-row-detail-value');

		label.textContent = formatObjectLabel(key);
		content.textContent = formatObjectValue(value);

		field.appendChild(label);
		field.appendChild(content);
		fields.appendChild(field);
	});

	return fields;
}

function renderAsyncPayload(payload, row, rowId, grid, viewModel, options) {
	if (typeof options.asyncDetail.render === 'function') {
		return options.asyncDetail.render({
			payload,
			row,
			rowId,
			grid,
			viewModel,
			level: Number(options.level) || 1,
			options
		});
	}

	if (payload instanceof Node) {
		return payload;
	}

	if (isPlainObject(payload) && typeof payload.html === 'string') {
		const wrapper = createElement('div', 'mg-row-detail-html');
		wrapper.innerHTML = payload.html;
		return wrapper;
	}

	if (isPlainObject(payload)) {
		return renderGenericObjectPayload(payload);
	}

	const wrapper = createElement('div', 'mg-row-detail-value');
	appendContent(wrapper, payload ?? options.emptyPlaceholder);

	return wrapper;
}

function renderLoadingState(row, rowId, grid, viewModel, options) {
	if (typeof options.asyncDetail.renderLoading === 'function') {
		return options.asyncDetail.renderLoading({
			row,
			rowId,
			grid,
			viewModel,
			level: Number(options.level) || 1,
			options
		});
	}

	return createStatusBox('mg-row-detail-status-loading', 'Loading detail...');
}

function renderErrorState(row, rowId, error, grid, viewModel, options) {
	if (typeof options.asyncDetail.renderError === 'function') {
		return options.asyncDetail.renderError({
			row,
			rowId,
			error,
			grid,
			viewModel,
			level: Number(options.level) || 1,
			options
		});
	}

	return createStatusBox('mg-row-detail-status-error', error || 'Failed to load detail.');
}

export function resolveRowDetailOptions(grid) {
	const configured = grid.options?.pluginOptions?.rowDetail || {};
	const stateKey = configured.stateKey || 'detailView';
	const state = typeof grid.store?.peek === 'function' ? grid.store.peek() : {};
	const hasConfiguredOptions = typeof grid.options?.pluginOptions?.rowDetail === 'object';
	const hasState = !!state[stateKey];
	const baseOptions = {
		enabled: hasConfiguredOptions || hasState,
		stateKey,
		rowIdKey: 'id',
		level: 1,
		toggleOnRowClick: true,
		renderInTable: true,
		renderInCards: true,
		showLabels: true,
		emptyPlaceholder: '—',
		detailRenderer: null,
		clearOnDataReload: false,
		...configured
	};

	baseOptions.asyncDetail = resolveAsyncDetailOptions(baseOptions);

	return baseOptions;
}

export function getRowDetailRowId(row, options) {
	if (!row || typeof row !== 'object') {
		return null;
	}

	return row[options.rowIdKey] ?? null;
}

export function getActiveDetailRowId(grid, options) {
	const state = getRowDetailState(grid, options);
	return state.rowId ?? null;
}

export function getRowDetailEntry(grid, rowId, options) {
	if (rowId === null || rowId === undefined || rowId === '') {
		return null;
	}

	const state = getRowDetailState(grid, options);
	const rawEntry = state.entries[String(rowId)];

	if (!rawEntry) {
		return null;
	}

	return normalizeEntry(rawEntry);
}

export function getActiveDetailStateSignature(grid, rows, options) {
	const activeRowId = getActiveDetailRowId(grid, options);

	if (activeRowId === null) {
		return '';
	}

	const hasVisibleRow = Array.isArray(rows) && rows.some((row) => {
		return getRowDetailRowId(row, options) === activeRowId;
	});
	const entry = getRowDetailEntry(grid, activeRowId, options);

	if (!entry) {
		return `row:${String(activeRowId)}:${hasVisibleRow ? 'idle' : 'hidden'}:0`;
	}

	return [
		`row:${String(activeRowId)}`,
		entry.status,
		String(entry.version),
		entry.error || '',
		hasVisibleRow ? 'visible' : 'hidden'
	].join(':');
}

export function isDetailRowActive(row, grid, options) {
	const rowId = getRowDetailRowId(row, options);

	if (rowId === null) {
		return false;
	}

	return getActiveDetailRowId(grid, options) === rowId;
}

export function createRowDetailContent(row, grid, viewModel, columns, options) {
	const rowId = getRowDetailRowId(row, options);
	const level = Number(options.level) || 1;

	if (options.asyncDetail.enabled === true && rowId !== null) {
		const entry = getRowDetailEntry(grid, rowId, options);
		const status = entry?.status || 'idle';

		if (status === 'error') {
			return {
				content: renderErrorState(row, rowId, entry?.error, grid, viewModel, options),
				status: 'error',
				level
			};
		}

		if (status === 'loaded') {
			return {
				content: renderAsyncPayload(entry?.payload, row, rowId, grid, viewModel, options),
				status: 'loaded',
				level
			};
		}

		return {
			content: renderLoadingState(row, rowId, grid, viewModel, options),
			status: 'loading',
			level
		};
	}

	if (typeof options.detailRenderer === 'function') {
		return {
			content: options.detailRenderer(row, grid, viewModel),
			status: 'loaded',
			level
		};
	}

	const renderColumns = (columns || []).filter((column) => {
		return column.visible !== false && !isUtilityColumn(column);
	});

	if (renderColumns.length === 0) {
		return null;
	}

	const fields = createElement('div', 'mg-row-detail-fields');

	renderColumns.forEach((column) => {
		const field = createElement('div', 'mg-row-detail-field');

		if (options.showLabels !== false) {
			const label = createElement('div', 'mg-row-detail-label');
			label.textContent = column.label || column.key;
			field.appendChild(label);
		}

		const value = createElement('div', 'mg-row-detail-value');
		const content = grid.renderCellContent(row, column);

		if (content === null || content === undefined || content === '') {
			appendContent(value, options.emptyPlaceholder);
		}
		else {
			appendContent(value, content);
		}

		field.appendChild(value);
		fields.appendChild(field);
	});

	return {
		content: fields,
		status: 'loaded',
		level
	};
}


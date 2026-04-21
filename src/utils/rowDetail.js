import { appendContent, createElement } from './dom.js';

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
}

function getDetailSectionState(grid, options) {
	const state = typeof grid.store?.peek === 'function' ? grid.store.peek() : {};

	return state[options.stateKey] || {
		rowId: null,
		entries: {}
	};
}

function getDetailEntryByRowId(grid, rowId, options) {
	if (rowId === null || rowId === undefined) {
		return null;
	}

	const sectionState = getDetailSectionState(grid, options);
	const entries = sectionState.entries || {};
	const entry = entries[String(rowId)];

	return entry && typeof entry === 'object' ? entry : null;
}

function isRenderableContent(value) {
	return value !== null && value !== undefined && value !== '';
}

function buildRendererContext(row, grid, viewModel, options, entry = null) {
	const rowId = getRowDetailRowId(row, options);

	return {
		row,
		rowId,
		grid,
		viewModel,
		options,
		level: Number(entry?.level) || Number(options.level) || 1,
		parentPath: Array.isArray(entry?.parentPath) ? entry.parentPath : (Array.isArray(options.parentPath) ? options.parentPath : []),
		payload: entry?.payload ?? null,
		error: entry?.error ?? null,
		entry
	};
}

function createStateMessage(className, text) {
	const wrapper = createElement('div', className);
	wrapper.textContent = text;

	return wrapper;
}

function createDetailPresentation(content, status = 'loaded', level = 1) {
	if (!isRenderableContent(content)) {
		return null;
	}

	return {
		content,
		status,
		level: Math.max(1, Number(level) || 1)
	};
}

function renderDetailBadges(badges) {
	if (!Array.isArray(badges) || badges.length === 0) {
		return null;
	}

	const wrapper = createElement('div', 'mg-row-detail-badges');

	badges.forEach((badge) => {
		if (!isRenderableContent(badge)) {
			return;
		}

		const badgeElement = createElement('span', 'mg-row-detail-badge');
		badgeElement.textContent = String(badge);
		wrapper.appendChild(badgeElement);
	});

	return wrapper.childNodes.length > 0 ? wrapper : null;
}

function renderDetailFieldRows(rows, className) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return null;
	}

	const wrapper = createElement('div', className);

	rows.forEach((row) => {
		if (!row || typeof row !== 'object') {
			return;
		}

		const item = createElement('div', `${className}-item`);
		const label = createElement('div', `${className}-label`);
		const value = createElement('div', `${className}-value`);

		label.textContent = row.label || row.key || 'Value';
		appendContent(value, isRenderableContent(row.value) ? row.value : '—');

		item.appendChild(label);
		item.appendChild(value);
		wrapper.appendChild(item);
	});

	return wrapper.childNodes.length > 0 ? wrapper : null;
}

function renderNestedChildList(children, level) {
	if (!Array.isArray(children) || children.length === 0) {
		return null;
	}

	const wrapper = createElement('div', `mg-row-detail-list mg-row-detail-list-level-${level}`);
	const list = createElement('div', 'mg-row-detail-list-items');

	children.forEach((child) => {
		if (!child || typeof child !== 'object') {
			return;
		}

		const item = createElement('div', `mg-row-detail-list-item mg-row-detail-list-item-level-${level + 1}`);

		if (child.title) {
			const title = createElement('div', 'mg-row-detail-list-item-title');
			title.textContent = String(child.title);
			item.appendChild(title);
		}

		if (child.subtitle) {
			const subtitle = createElement('div', 'mg-row-detail-list-item-subtitle');
			subtitle.textContent = String(child.subtitle);
			item.appendChild(subtitle);
		}

		const badges = renderDetailBadges(child.badges || []);
		if (badges) {
			item.appendChild(badges);
		}

		const fields = renderDetailFieldRows(child.fields || [], 'mg-row-detail-list-item-fields');
		if (fields) {
			item.appendChild(fields);
		}

		list.appendChild(item);
	});

	wrapper.appendChild(list);

	return list.childNodes.length > 0 ? wrapper : null;
}

function renderStructuredPayload(payload, level) {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		if (isRenderableContent(payload)) {
			return createStateMessage('mg-row-detail-text', String(payload));
		}

		return null;
	}

	const wrapper = createElement('div', 'mg-row-detail-async-content');

	if (payload.headline) {
		const headline = createElement('div', 'mg-row-detail-headline');
		headline.textContent = String(payload.headline);
		wrapper.appendChild(headline);
	}

	const badges = renderDetailBadges(payload.badges || []);
	if (badges) {
		wrapper.appendChild(badges);
	}

	if (payload.summary) {
		const summary = createElement('div', 'mg-row-detail-summary');
		summary.textContent = String(payload.summary);
		wrapper.appendChild(summary);
	}

	const sections = renderDetailFieldRows(payload.sections || [], 'mg-row-detail-sections');
	if (sections) {
		wrapper.appendChild(sections);
	}

	const activity = renderDetailFieldRows(payload.activity || [], 'mg-row-detail-activity');
	if (activity) {
		wrapper.appendChild(activity);
	}

	const children = renderNestedChildList(payload.children || payload.items || [], level);
	if (children) {
		wrapper.appendChild(children);
	}

	return wrapper.childNodes.length > 0 ? wrapper : null;
}

function createDefaultFieldDetailContent(row, grid, columns, options) {
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

	return fields;
}

function createAsyncDetailPresentation(row, grid, viewModel, columns, options) {
	const asyncDetail = options.asyncDetail;

	if (!asyncDetail || typeof asyncDetail !== 'object') {
		return null;
	}

	const rowId = getRowDetailRowId(row, options);
	const entry = getDetailEntryByRowId(grid, rowId, options);
	const context = buildRendererContext(row, grid, viewModel, options, entry);
	const level = context.level;

	if (!entry || entry.status === 'idle' || entry.status === 'loading') {
		if (typeof asyncDetail.renderLoading === 'function') {
			const customLoadingContent = asyncDetail.renderLoading(context);
			const presentation = createDetailPresentation(customLoadingContent, 'loading', level);

			if (presentation) {
				return presentation;
			}
		}

		return createDetailPresentation(
			createStateMessage('mg-row-detail-loading-message', 'Loading detail...'),
			'loading',
			level
		);
	}

	if (entry.status === 'error') {
		if (typeof asyncDetail.renderError === 'function') {
			const customErrorContent = asyncDetail.renderError(context);
			const presentation = createDetailPresentation(customErrorContent, 'error', level);

			if (presentation) {
				return presentation;
			}
		}

		return createDetailPresentation(
			createStateMessage('mg-row-detail-error-message', entry.error || 'Failed to load detail.'),
			'error',
			level
		);
	}

	if (entry.status === 'loaded') {
		if (typeof asyncDetail.render === 'function') {
			const customLoadedContent = asyncDetail.render(context);
			const presentation = createDetailPresentation(customLoadedContent, 'loaded', level);

			if (presentation) {
				return presentation;
			}
		}

		const structuredPayload = renderStructuredPayload(entry.payload, level);
		const structuredPresentation = createDetailPresentation(structuredPayload, 'loaded', level);

		if (structuredPresentation) {
			return structuredPresentation;
		}

		if (typeof options.detailRenderer === 'function') {
			const fallbackCustomContent = options.detailRenderer(row, grid, viewModel);
			const fallbackPresentation = createDetailPresentation(fallbackCustomContent, 'loaded', level);

			if (fallbackPresentation) {
				return fallbackPresentation;
			}
		}

		const defaultFields = createDefaultFieldDetailContent(row, grid, columns, options);

		return createDetailPresentation(defaultFields, 'loaded', level);
	}

	return null;
}

export function resolveRowDetailOptions(grid) {
	const configured = grid.options?.pluginOptions?.rowDetail || {};
	const stateKey = configured.stateKey || 'detailView';
	const state = typeof grid.store?.peek === 'function' ? grid.store.peek() : {};
	const hasConfiguredOptions = typeof grid.options?.pluginOptions?.rowDetail === 'object';
	const hasState = !!state[stateKey];

	return {
		enabled: hasConfiguredOptions || hasState,
		stateKey,
		rowIdKey: 'id',
		toggleOnRowClick: true,
		renderInTable: true,
		renderInCards: true,
		showLabels: true,
		emptyPlaceholder: '—',
		detailRenderer: null,
		clearOnDataReload: false,
		cache: true,
		level: 1,
		parentPath: [],
		asyncDetail: null,
		...configured
	};
}

export function getRowDetailRowId(row, options) {
	if (!row || typeof row !== 'object') {
		return null;
	}

	return row[options.rowIdKey] ?? null;
}

export function getActiveDetailRowId(grid, options) {
	const sectionState = getDetailSectionState(grid, options);

	return sectionState?.rowId ?? null;
}

export function getRowDetailEntry(row, grid, options) {
	return getDetailEntryByRowId(grid, getRowDetailRowId(row, options), options);
}

export function getRowDetailStatus(row, grid, options) {
	return getRowDetailEntry(row, grid, options)?.status || 'idle';
}

export function getRowDetailLevel(row, grid, options) {
	return Number(getRowDetailEntry(row, grid, options)?.level) || Number(options.level) || 1;
}

export function getRowDetailClassNames(row, grid, options) {
	const status = getRowDetailStatus(row, grid, options);
	const level = getRowDetailLevel(row, grid, options);
	const classNames = [`mg-row-detail-level-${level}`];

	if (status === 'loading') {
		classNames.push('mg-row-detail-loading');
	}
	else if (status === 'error') {
		classNames.push('mg-row-detail-error');
	}
	else if (status === 'loaded') {
		classNames.push('mg-row-detail-loaded');
	}

	return classNames;
}

export function getActiveDetailStateSignature(grid, rows, options) {
	const visibleRows = Array.isArray(rows) ? rows : [];
	const activeRowId = getActiveDetailRowId(grid, options);

	if (activeRowId === null || activeRowId === undefined) {
		return '';
	}

	const isVisible = visibleRows.some((row) => {
		return getRowDetailRowId(row, options) === activeRowId;
	});

	if (!isVisible) {
		return '';
	}

	const entry = getDetailEntryByRowId(grid, activeRowId, options);

	return JSON.stringify({
		rowId: activeRowId,
		status: entry?.status || 'idle',
		error: entry?.error || null,
		level: Number(entry?.level) || Number(options.level) || 1,
		hasPayload: entry?.payload !== null && entry?.payload !== undefined
	});
}

export function isDetailRowActive(row, grid, options) {
	const rowId = getRowDetailRowId(row, options);

	if (rowId === null) {
		return false;
	}

	return getActiveDetailRowId(grid, options) === rowId;
}

export function createRowDetailContent(row, grid, viewModel, columns, options) {
	const asyncPresentation = createAsyncDetailPresentation(row, grid, viewModel, columns, options);

	if (asyncPresentation) {
		return asyncPresentation;
	}

	if (typeof options.detailRenderer === 'function') {
		return createDetailPresentation(
			options.detailRenderer(row, grid, viewModel),
			'loaded',
			Number(options.level) || 1
		);
	}

	return createDetailPresentation(
		createDefaultFieldDetailContent(row, grid, columns, options),
		'loaded',
		Number(options.level) || 1
	);
}

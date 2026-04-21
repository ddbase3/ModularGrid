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

function getChildEntries(entry) {
	if (!entry || typeof entry.childEntries !== 'object' || entry.childEntries === null) {
		return {};
	}

	return entry.childEntries;
}

function buildChildEntryKey(parentPath) {
	if (!Array.isArray(parentPath) || parentPath.length === 0) {
		return '';
	}

	return parentPath.map((part) => String(part)).join('>');
}

function getDetailChildEntry(entry, parentPath) {
	const entryKey = buildChildEntryKey(parentPath);

	if (!entryKey) {
		return null;
	}

	const childEntries = getChildEntries(entry);
	const childEntry = childEntries[entryKey];

	return childEntry && typeof childEntry === 'object' ? childEntry : null;
}

function isRenderableContent(value) {
	return value !== null && value !== undefined && value !== '';
}

function buildRendererContext(row, grid, viewModel, options, entry = null, extra = {}) {
	const rowId = getRowDetailRowId(row, options);
	const parentPath = Array.isArray(extra.parentPath)
		? extra.parentPath
		: Array.isArray(entry?.parentPath)
			? entry.parentPath
			: Array.isArray(options.parentPath)
				? options.parentPath
				: [];
	const payload = Object.prototype.hasOwnProperty.call(extra, 'payload')
		? extra.payload
		: entry?.payload ?? null;
	const error = Object.prototype.hasOwnProperty.call(extra, 'error')
		? extra.error
		: entry?.error ?? null;
	const level = Number(extra.level) || Number(entry?.level) || Number(options.level) || 1;
	const childPath = Array.isArray(extra.childPath)
		? extra.childPath
		: parentPath;
	const childId = extra.childId ?? (childPath.length > 0 ? childPath[childPath.length - 1] : null);

	return {
		row,
		rowId,
		grid,
		viewModel,
		options,
		level,
		parentPath,
		payload,
		error,
		entry,
		child: extra.child ?? null,
		childId,
		childPath
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

function createDetailSection(title, content, summary = '') {
	if (!isRenderableContent(content)) {
		return null;
	}

	const wrapper = createElement('div', 'mg-row-detail-section');

	if (title || summary) {
		const header = createElement('div', 'mg-row-detail-section-header');

		if (title) {
			const sectionTitle = createElement('div', 'mg-row-detail-section-title');
			sectionTitle.textContent = String(title);
			header.appendChild(sectionTitle);
		}

		if (summary) {
			const sectionSummary = createElement('div', 'mg-row-detail-section-summary');
			sectionSummary.textContent = String(summary);
			header.appendChild(sectionSummary);
		}

		wrapper.appendChild(header);
	}

	appendContent(wrapper, content);

	return wrapper;
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

function resolveChildId(child, index) {
	if (child && typeof child === 'object') {
		if (child.id !== null && child.id !== undefined && child.id !== '') {
			return String(child.id);
		}

		if (child.key !== null && child.key !== undefined && child.key !== '') {
			return String(child.key);
		}

		if (child.name !== null && child.name !== undefined && child.name !== '') {
			return String(child.name);
		}
	}

	return `item-${index}`;
}

function hasInteractiveChildDetail(options) {
	return typeof options?.asyncDetail?.loadChildDetail === 'function';
}

function renderChildDetailPresentation(row, grid, viewModel, options, entry, child, childPath, level) {
	const childEntry = getDetailChildEntry(entry, childPath);
	const asyncDetail = options.asyncDetail || {};

	if (!childEntry || childEntry.expanded !== true) {
		return null;
	}

	const context = buildRendererContext(row, grid, viewModel, options, childEntry, {
		level: Number(childEntry.level) || level,
		parentPath: childPath,
		payload: childEntry.payload ?? null,
		error: childEntry.error ?? null,
		child,
		childId: childPath[childPath.length - 1] || null,
		childPath
	});

	if (childEntry.status === 'loading' || childEntry.status === 'idle') {
		if (typeof asyncDetail.renderChildLoading === 'function') {
			const customLoadingContent = asyncDetail.renderChildLoading(context);
			const presentation = createDetailPresentation(customLoadingContent, 'loading', level);

			if (presentation) {
				return presentation;
			}
		}

		return createDetailPresentation(
			createStateMessage('mg-row-detail-status mg-row-detail-status-loading', 'Loading detail...'),
			'loading',
			level
		);
	}

	if (childEntry.status === 'error') {
		if (typeof asyncDetail.renderChildError === 'function') {
			const customErrorContent = asyncDetail.renderChildError(context);
			const presentation = createDetailPresentation(customErrorContent, 'error', level);

			if (presentation) {
				return presentation;
			}
		}

		return createDetailPresentation(
			createStateMessage('mg-row-detail-status mg-row-detail-status-error', childEntry.error || 'Failed to load detail.'),
			'error',
			level
		);
	}

	if (childEntry.status === 'loaded') {
		if (typeof asyncDetail.renderChildDetail === 'function') {
			const customLoadedContent = asyncDetail.renderChildDetail(context);
			const presentation = createDetailPresentation(customLoadedContent, 'loaded', level);

			if (presentation) {
				return presentation;
			}
		}

		const structuredPayload = renderStructuredPayload(
			childEntry.payload,
			level,
			row,
			grid,
			viewModel,
			options,
			entry,
			childPath
		);
		const structuredPresentation = createDetailPresentation(structuredPayload, 'loaded', level);

		if (structuredPresentation) {
			return structuredPresentation;
		}

		if (isRenderableContent(childEntry.payload)) {
			return createDetailPresentation(
			createStateMessage('mg-row-detail-status', String(childEntry.payload)),
			'loaded',
			level
		);
		}
	}

	return null;
}

function renderNestedChildList(children, row, grid, viewModel, options, entry, level, parentPath = []) {
	if (!Array.isArray(children) || children.length === 0) {
		return null;
	}

	const wrapper = createElement('div', `mg-row-detail-list mg-row-detail-list-level-${level}`);
	const list = createElement('div', 'mg-row-detail-list-items');
	const interactiveChildren = hasInteractiveChildDetail(options);

	children.forEach((child, index) => {
		if (!child || typeof child !== 'object') {
			return;
		}

		const childId = resolveChildId(child, index);
		const childPath = [...parentPath, childId];
		const childEntry = getDetailChildEntry(entry, childPath);
		const item = createElement('div', `mg-row-detail-list-item mg-row-detail-list-item-level-${level + 1}`);
		const itemContent = interactiveChildren
			? createElement('button', 'mg-row-detail-child-trigger')
			: createElement('div', 'mg-row-detail-child-static');
		const header = createElement('div', 'mg-row-detail-list-item-header');

		if (interactiveChildren) {
			item.classList.add('mg-row-detail-list-item-interactive');
			itemContent.type = 'button';

			if (childEntry?.expanded === true) {
				item.classList.add('mg-row-detail-list-item-expanded');
			}

			itemContent.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();

				grid.execute('toggleDetailChild', {
					rowId: getRowDetailRowId(row, options),
					row,
					child,
					childId,
					level: level + 1,
					parentPath: childPath
				});
			});
		}

		if (child.title) {
			const title = createElement('div', 'mg-row-detail-list-item-title');
			title.textContent = String(child.title);
			header.appendChild(title);
		}

		if (child.subtitle) {
			const subtitle = createElement('div', 'mg-row-detail-list-item-subtitle');
			subtitle.textContent = String(child.subtitle);
			header.appendChild(subtitle);
		}

		if (child.summary) {
			const summary = createElement('div', 'mg-row-detail-list-item-summary');
			summary.textContent = String(child.summary);
			header.appendChild(summary);
		}

		if (header.childNodes.length > 0) {
			itemContent.appendChild(header);
		}

		const badges = renderDetailBadges(child.badges || []);
		if (badges) {
			itemContent.appendChild(badges);
		}

		const fields = renderDetailFieldRows(child.fields || [], 'mg-row-detail-list-item-fields');
		if (fields) {
			itemContent.appendChild(fields);
		}

		if (interactiveChildren) {
			const toggle = createElement('div', 'mg-row-detail-list-item-toggle');
			toggle.textContent = childEntry?.expanded === true ? 'Hide details' : 'Show details';
			itemContent.appendChild(toggle);
		}

		item.appendChild(itemContent);

		const childDetailPresentation = interactiveChildren
			? renderChildDetailPresentation(row, grid, viewModel, options, entry, child, childPath, level + 1)
			: null;

		if (childDetailPresentation?.content) {
			const childDetail = createElement('div', 'mg-row-detail-child-detail');
			const childDetailContent = createElement('div', 'mg-row-detail');

			childDetailContent.classList.add(`mg-row-detail-level-${Math.max(1, Number(childDetailPresentation.level) || 1)}`);
			childDetailContent.classList.add(`mg-row-detail-${childDetailPresentation.status || 'loaded'}`);
			appendContent(childDetailContent, childDetailPresentation.content);
			childDetail.appendChild(childDetailContent);
			item.appendChild(childDetail);
		}

		list.appendChild(item);
	});

	wrapper.appendChild(list);

	return list.childNodes.length > 0 ? wrapper : null;
}

function renderStructuredPayload(payload, level, row, grid, viewModel, options, entry, parentPath = []) {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		if (isRenderableContent(payload)) {
			return createStateMessage('mg-row-detail-status', String(payload));
		}

		return null;
	}

	const wrapper = createElement('div', 'mg-row-detail-structured');

	if (payload.headline || payload.summary) {
		const header = createElement('div', 'mg-row-detail-structured-header');

		if (payload.headline) {
			const headline = createElement('div', 'mg-row-detail-structured-title');
			headline.textContent = String(payload.headline);
			header.appendChild(headline);
		}

		if (payload.summary) {
			const summary = createElement('div', 'mg-row-detail-structured-summary');
			summary.textContent = String(payload.summary);
			header.appendChild(summary);
		}

		wrapper.appendChild(header);
	}

	const badges = renderDetailBadges(payload.badges || []);
	if (badges) {
		wrapper.appendChild(badges);
	}

	const sections = renderDetailFieldRows(payload.sections || [], 'mg-row-detail-fields');
	const sectionsBlock = createDetailSection(
		payload.sectionsTitle || 'Details',
		sections,
		payload.sectionsSummary || ''
	);
	if (sectionsBlock) {
		wrapper.appendChild(sectionsBlock);
	}

	const activity = renderDetailFieldRows(payload.activity || [], 'mg-row-detail-fields');
	const activityBlock = createDetailSection(
		payload.activityTitle || 'Activity',
		activity,
		payload.activitySummary || ''
	);
	if (activityBlock) {
		wrapper.appendChild(activityBlock);
	}

	const children = renderNestedChildList(
		payload.children || payload.items || [],
		row,
		grid,
		viewModel,
		options,
		entry,
		level,
		parentPath
	);
	const childrenBlock = createDetailSection(
		payload.childrenTitle || payload.itemsTitle || 'Items',
		children,
		payload.childrenSummary || payload.itemsSummary || ''
	);
	if (childrenBlock) {
		wrapper.appendChild(childrenBlock);
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
			createStateMessage('mg-row-detail-status mg-row-detail-status-loading', 'Loading detail...'),
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
			createStateMessage('mg-row-detail-status mg-row-detail-status-error', entry.error || 'Failed to load detail.'),
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

		const structuredPayload = renderStructuredPayload(entry.payload, level, row, grid, viewModel, options, entry, []);
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
	const childEntriesSignature = Object.entries(getChildEntries(entry))
		.sort(([leftKey], [rightKey]) => {
			return leftKey.localeCompare(rightKey);
		})
		.map(([key, childEntry]) => {
			return {
				key,
				expanded: childEntry?.expanded === true,
				status: childEntry?.status || 'idle',
				error: childEntry?.error || null,
				level: Number(childEntry?.level) || 0,
				hasPayload: childEntry?.payload !== null && childEntry?.payload !== undefined
			};
		});

	return JSON.stringify({
		rowId: activeRowId,
		status: entry?.status || 'idle',
		error: entry?.error || null,
		level: Number(entry?.level) || Number(options.level) || 1,
		hasPayload: entry?.payload !== null && entry?.payload !== undefined,
		childEntries: childEntriesSignature
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


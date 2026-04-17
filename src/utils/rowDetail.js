import { appendContent, createElement } from './dom.js';

function isUtilityColumn(column) {
	return !column?.label || String(column.key || '').startsWith('__mg_');
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
	const state = typeof grid.store?.peek === 'function' ? grid.store.peek() : {};
	return state[options.stateKey]?.rowId ?? null;
}

export function isDetailRowActive(row, grid, options) {
	const rowId = getRowDetailRowId(row, options);

	if (rowId === null) {
		return false;
	}

	return getActiveDetailRowId(grid, options) === rowId;
}

export function createRowDetailContent(row, grid, viewModel, columns, options) {
	if (typeof options.detailRenderer === 'function') {
		return options.detailRenderer(row, grid, viewModel);
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
		} else {
			appendContent(value, content);
		}

		field.appendChild(value);
		fields.appendChild(field);
	});

	return fields;
}

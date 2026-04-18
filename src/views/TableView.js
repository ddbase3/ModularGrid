import { appendContent, clearElement, createElement } from '../utils/dom.js';
import {
	createRowDetailContent,
	getRowDetailRowId,
	isDetailRowActive,
	resolveRowDetailOptions
} from '../utils/rowDetail.js';
import { computeSummaryMetric, formatSummaryMetric } from '../utils/summary.js';

function isInteractiveTarget(target) {
	return target instanceof Element && !!target.closest('a, button, input, select, textarea, label, summary, details');
}

function resolveGroupingOptions(grid) {
	return {
		stateKey: 'grouping',
		label: 'Group',
		showCount: true,
		summary: {
			enabled: true,
			metrics: []
		},
		fields: [],
		...grid.options.pluginOptions?.grouping
	};
}

function resolveTableOptions(grid) {
	return {
		zebraRows: true,
		...grid.options.table
	};
}

function getGroupingState(grid, options) {
	const state = grid.store.peek();
	return state[options.stateKey] || {
		key: ''
	};
}

function findGroupingField(options, key) {
	return (options.fields || []).find((field) => field?.key === key) || null;
}

function buildGroups(rows, key) {
	const groups = new Map();

	rows.forEach((row) => {
		const value = row?.[key] ?? null;
		const signature = `${typeof value}:${String(value)}`;

		if (!groups.has(signature)) {
			groups.set(signature, {
				value,
				rows: []
			});
		}

		groups.get(signature).rows.push(row);
	});

	return Array.from(groups.values());
}

function formatGroupValue(field, value) {
	if (typeof field?.valueFormatter === 'function') {
		return field.valueFormatter(value);
	}

	if (value === null || value === undefined || value === '') {
		return '—';
	}

	if (value === true) {
		return 'Yes';
	}

	if (value === false) {
		return 'No';
	}

	return String(value);
}

function createGroupHeaderRow(renderColumns, field, value, rowCount, options) {
	const tr = createElement('tr', 'mg-group-row');
	const td = createElement('td', 'mg-group-cell');
	const content = createElement('div', 'mg-group-header');
	const main = createElement('div', 'mg-group-title');
	const meta = createElement('div', 'mg-group-meta');

	td.colSpan = Math.max(renderColumns.length, 1);

	main.textContent = `${field?.label || options.label}: ${formatGroupValue(field, value)}`;

	if (options.showCount !== false) {
		meta.textContent = `${rowCount} row${rowCount === 1 ? '' : 's'}`;
		content.appendChild(main);
		content.appendChild(meta);
	}
	else {
		content.appendChild(main);
	}

	td.appendChild(content);
	tr.appendChild(td);

	return tr;
}

function createGroupSummaryRow(renderColumns, groupRows, groupingOptions) {
	const metrics = groupingOptions.summary?.metrics || [];

	if (!Array.isArray(metrics) || metrics.length === 0 || groupingOptions.summary?.enabled === false) {
		return null;
	}

	const tr = createElement('tr', 'mg-group-summary-row');
	const td = createElement('td', 'mg-group-summary-cell');
	const content = createElement('div', 'mg-inline-buttons mg-group-summary');

	td.colSpan = Math.max(renderColumns.length, 1);

	metrics.forEach((metric, index) => {
		const item = createElement('div', 'mg-summary-item');
		const label = metric.label || metric.key || `Metric ${index + 1}`;
		const value = computeSummaryMetric(metric, groupRows);
		const formattedValue = formatSummaryMetric(metric, value, groupRows);

		item.textContent = `${label}: ${formattedValue}`;
		content.appendChild(item);
	});

	td.appendChild(content);
	tr.appendChild(td);

	return tr;
}

function getZebraClassNames(rowNumber, tableOptions) {
	if (tableOptions.zebraRows === false) {
		return {
			rowClassName: '',
			detailRowClassName: ''
		};
	}

	const parity = rowNumber % 2 === 0 ? 'even' : 'odd';

	return {
		rowClassName: `mg-row-${parity}`,
		detailRowClassName: `mg-detail-row-${parity}`
	};
}

function appendDataRow(tbody, row, grid, viewModel, renderColumns, rowDetailOptions, tableOptions, rowNumber) {
	const rowId = getRowDetailRowId(row, rowDetailOptions);
	const canToggleDetail = rowDetailOptions.enabled !== false && rowDetailOptions.renderInTable !== false && rowDetailOptions.toggleOnRowClick !== false && rowId !== null;
	const isActiveDetailRow = rowDetailOptions.enabled !== false && rowDetailOptions.renderInTable !== false && isDetailRowActive(row, grid, rowDetailOptions);
	const hasExternalRowClick = typeof grid.options.onRowClick === 'function';
	const zebraClassNames = getZebraClassNames(rowNumber, tableOptions);

	const tr = createElement('tr', 'mg-row');

	if (zebraClassNames.rowClassName) {
		tr.classList.add(zebraClassNames.rowClassName);
	}

	if (canToggleDetail || hasExternalRowClick) {
		tr.classList.add('mg-row-clickable');

		tr.addEventListener('click', (event) => {
			if (isInteractiveTarget(event.target)) {
				return;
			}

			if (canToggleDetail) {
				grid.execute('toggleDetailRow', rowId);
			}

			if (hasExternalRowClick) {
				grid.options.onRowClick(row, grid);
			}
		});
	}

	if (isActiveDetailRow) {
		tr.classList.add('mg-row-active');
	}

	renderColumns.forEach((column) => {
		const td = createElement('td', 'mg-cell');
		const content = grid.renderCellContent(row, column);

		appendContent(td, content);
		tr.appendChild(td);
	});

	tbody.appendChild(tr);

	if (isActiveDetailRow) {
		const detailContent = createRowDetailContent(row, grid, viewModel, renderColumns, rowDetailOptions);

		if (detailContent) {
			const detailRow = createElement('tr', 'mg-detail-row');
			const detailCell = createElement('td', 'mg-detail-cell');
			const detailWrapper = createElement('div', 'mg-row-detail');

			if (zebraClassNames.detailRowClassName) {
				detailRow.classList.add(zebraClassNames.detailRowClassName);
			}

			detailCell.colSpan = Math.max(renderColumns.length, 1);
			appendContent(detailWrapper, detailContent);
			detailCell.appendChild(detailWrapper);
			detailRow.appendChild(detailCell);
			tbody.appendChild(detailRow);
		}
	}
}

export class TableView {
	render(container, grid, viewModel) {
		clearElement(container);

		if (viewModel.error) {
			const errorBox = createElement('div', 'mg-state mg-state-error');
			errorBox.textContent = viewModel.error;
			container.appendChild(errorBox);
			return;
		}

		if (viewModel.loading) {
			const loadingBox = createElement('div', 'mg-state mg-state-loading');
			loadingBox.textContent = 'Loading...';
			container.appendChild(loadingBox);
			return;
		}

		const renderColumns = (viewModel.renderColumns || viewModel.columns || []).filter((column) => column.visible !== false);
		const rowDetailOptions = resolveRowDetailOptions(grid);
		const tableOptions = resolveTableOptions(grid);

		if (renderColumns.length === 0) {
			const emptyColumnsBox = createElement('div', 'mg-state');
			emptyColumnsBox.textContent = 'No visible columns selected.';
			container.appendChild(emptyColumnsBox);
			return;
		}

		const table = createElement('table', 'mg-table');
		const thead = createElement('thead', 'mg-table-head');
		const tbody = createElement('tbody', 'mg-table-body');
		const headerRow = createElement('tr', 'mg-header-row');
		let visualRowNumber = 0;

		const appendNumberedDataRow = (row) => {
			visualRowNumber += 1;

			appendDataRow(
				tbody,
				row,
				grid,
				viewModel,
				renderColumns,
				rowDetailOptions,
				tableOptions,
				visualRowNumber
			);
		};

		renderColumns.forEach((column) => {
			const th = createElement('th', 'mg-header-cell');

			if (column.width) {
				th.style.width = `${column.width}px`;
			}

			if (column.sortable === false) {
				appendContent(th, grid.renderHeaderContent(column));
			}
			else {
				const button = createElement('button', 'mg-sort-button');
				button.type = 'button';

				appendContent(button, grid.renderHeaderContent(column));

				if (viewModel.sortKey === column.key) {
					const indicator = createElement('span', 'mg-sort-indicator');
					indicator.textContent = viewModel.sortDirection === 'asc' ? '▲' : '▼';
					button.appendChild(indicator);
				}

				button.addEventListener('click', () => {
					grid.toggleSort(column.key);
				});

				th.appendChild(button);
			}

			headerRow.appendChild(th);
		});

		thead.appendChild(headerRow);
		table.appendChild(thead);

		if (viewModel.rows.length === 0) {
			const emptyRow = createElement('tr', 'mg-empty-row');
			const emptyCell = createElement('td', 'mg-empty-cell');
			emptyCell.colSpan = Math.max(renderColumns.length, 1);
			emptyCell.textContent = 'No rows found.';
			emptyRow.appendChild(emptyCell);
			tbody.appendChild(emptyRow);
		}
		else {
			const groupingOptions = resolveGroupingOptions(grid);
			const groupingState = getGroupingState(grid, groupingOptions);
			const groupingKey = groupingState.key || '';
			const groupingField = groupingKey ? findGroupingField(groupingOptions, groupingKey) : null;

			if (groupingKey && groupingField) {
				const groups = buildGroups(viewModel.rows, groupingKey);

				groups.forEach((group) => {
					tbody.appendChild(
						createGroupHeaderRow(
							renderColumns,
							groupingField,
							group.value,
							group.rows.length,
							groupingOptions
						)
					);

					group.rows.forEach((row) => {
						appendNumberedDataRow(row);
					});

					const summaryRow = createGroupSummaryRow(renderColumns, group.rows, groupingOptions);

					if (summaryRow) {
						tbody.appendChild(summaryRow);
					}
				});
			}
			else {
				viewModel.rows.forEach((row) => {
					appendNumberedDataRow(row);
				});
			}
		}

		table.appendChild(tbody);
		container.appendChild(table);
	}
}

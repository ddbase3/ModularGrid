import { appendContent, clearElement, createElement } from '../utils/dom.js';
import {
	createRowDetailContent,
	getRowDetailRowId,
	isDetailRowActive,
	resolveRowDetailOptions
} from '../utils/rowDetail.js';
import { computeSummaryMetric, formatSummaryMetric } from '../utils/summary.js';
import { wrapTextDisplayContent } from '../utils/textDisplay.js';
import { isUtilityColumn, resolveEffectivePinnedSide } from '../utils/columnPinning.js';

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
		resizableColumns: true,
		reorderableColumns: true,
		columnResizeMinWidth: 80,
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

function getMeasuredWidth(cell) {
	if (!(cell instanceof HTMLElement)) {
		return 0;
	}

	return Math.ceil(cell.getBoundingClientRect().width || cell.offsetWidth || 0);
}

function formatCssSize(value) {
	if (value === null || value === undefined || value === '') {
		return '';
	}

	if (typeof value === 'number') {
		return `${value}px`;
	}

	return String(value).trim();
}

function applyColumnSizeStyles(element, column) {
	if (!(element instanceof HTMLElement) || !column) {
		return;
	}

	const width = formatCssSize(column.width);
	const minWidth = formatCssSize(column.minWidth);
	const maxWidth = formatCssSize(column.maxWidth);

	if (width) {
		element.style.width = width;

		if (!minWidth) {
			element.style.minWidth = width;
		}
	}

	if (minWidth) {
		element.style.minWidth = minWidth;
	}

	if (maxWidth) {
		element.style.maxWidth = maxWidth;
	}
}

function applyLiveColumnWidth(table, columnIndex, width) {
	table.querySelectorAll(`[data-mg-column-index="${columnIndex}"]`).forEach((cell) => {
		if (!(cell instanceof HTMLElement)) {
			return;
		}

		cell.style.width = `${width}px`;
		cell.style.minWidth = `${width}px`;
	});
}

function parsePixelValue(value, fallback = 0) {
	const normalized = String(value || '').trim();

	if (!normalized || normalized === 'none' || normalized === 'normal' || normalized === 'auto') {
		return fallback;
	}

	const parsed = Number.parseFloat(normalized);

	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return parsed;
}

function isResizableColumn(column, tableOptions) {
	if (tableOptions.resizableColumns === false) {
		return false;
	}

	if (!column || column.resizable === false) {
		return false;
	}

	if (isUtilityColumn(column)) {
		return false;
	}

	return true;
}

function isReorderableColumn(column, tableOptions) {
	if (tableOptions.reorderableColumns === false) {
		return false;
	}

	if (!column || column.reorderable === false) {
		return false;
	}

	if (isUtilityColumn(column)) {
		return false;
	}

	return true;
}

function hasExplicitCssSize(value) {
	return value !== null && value !== undefined && String(value).trim() !== '';
}

function resolveResizeMinWidth(column, tableOptions, computedStyle) {
	const fallbackMinWidth = Math.max(1, Number(tableOptions.columnResizeMinWidth) || 0);

	if (hasExplicitCssSize(column?.minWidth)) {
		return Math.max(
			fallbackMinWidth,
			parsePixelValue(computedStyle.minWidth, fallbackMinWidth)
		);
	}

	return fallbackMinWidth;
}

function resolveResizeMaxWidth(column, computedStyle) {
	if (hasExplicitCssSize(column?.maxWidth)) {
		return parsePixelValue(computedStyle.maxWidth, Infinity);
	}

	return Infinity;
}

function createResizeHandle(th, table, grid, column, columnIndex, renderColumns, tableOptions) {
	const handle = createElement('button', 'mg-column-resize-handle');
	handle.type = 'button';
	handle.setAttribute('aria-label', `Resize ${column.label || column.key}`);

	handle.addEventListener('mousedown', (event) => {
		event.preventDefault();
		event.stopPropagation();

		const startX = event.clientX;
		const startWidth = getMeasuredWidth(th);
		const computedStyle = window.getComputedStyle(th);
		const minWidth = resolveResizeMinWidth(column, tableOptions, computedStyle);
		const maxWidth = resolveResizeMaxWidth(column, computedStyle);
		let currentWidth = startWidth;

		const onMouseMove = (moveEvent) => {
			const delta = moveEvent.clientX - startX;
			const unclampedWidth = startWidth + delta;
			const nextWidth = Math.max(minWidth, Math.min(unclampedWidth, maxWidth));

			currentWidth = Math.round(nextWidth);
			applyLiveColumnWidth(table, columnIndex, currentWidth);
			applyPinnedColumnStyles(table, renderColumns);
		};

		const onMouseUp = () => {
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			document.body.classList.remove('mg-column-resizing');

			grid.execute('setColumnWidth', {
				key: column.key,
				width: currentWidth
			});
		};

		document.body.classList.add('mg-column-resizing');
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	});

	return handle;
}

function applyPinnedColumnStyles(table, renderColumns) {
	const headerCells = Array.from(table.querySelectorAll('thead tr:first-child > [data-mg-column-index]'));

	if (headerCells.length === 0) {
		return;
	}

	const pinnedColumns = renderColumns
		.map((column, index) => {
			return {
				column,
				index,
				side: resolveEffectivePinnedSide(column),
				width: getMeasuredWidth(headerCells[index])
			};
		})
		.filter((entry) => entry.side !== '');

	const leftPinned = pinnedColumns.filter((entry) => entry.side === 'left');
	const rightPinned = pinnedColumns.filter((entry) => entry.side === 'right');

	let leftOffset = 0;
	leftPinned.forEach((entry) => {
		entry.offset = leftOffset;
		leftOffset += entry.width;
	});

	let rightOffset = 0;
	rightPinned.slice().reverse().forEach((entry) => {
		entry.offset = rightOffset;
		rightOffset += entry.width;
	});

	const lastLeftPinnedIndex = leftPinned.length > 0 ? leftPinned[leftPinned.length - 1].index : -1;
	const firstRightPinnedIndex = rightPinned.length > 0 ? rightPinned[0].index : -1;

	pinnedColumns.forEach((entry) => {
		const cells = table.querySelectorAll(`[data-mg-column-index="${entry.index}"]`);

		cells.forEach((cell) => {
			if (!(cell instanceof HTMLElement)) {
				return;
			}

			cell.classList.add('mg-cell-pinned', `mg-cell-pinned-${entry.side}`);

			if (entry.side === 'left') {
				cell.style.left = `${entry.offset}px`;
			}
			else {
				cell.style.right = `${entry.offset}px`;
			}

			if (entry.index === lastLeftPinnedIndex && entry.side === 'left') {
				cell.classList.add('mg-cell-pinned-shadow-right');
			}

			if (entry.index === firstRightPinnedIndex && entry.side === 'right') {
				cell.classList.add('mg-cell-pinned-shadow-left');
			}
		});
	});
}

function setColumnHoverState(table, columnIndex, isActive) {
	table.querySelectorAll(`[data-mg-column-index="${columnIndex}"]`).forEach((cell) => {
		if (!(cell instanceof HTMLElement)) {
			return;
		}

		cell.classList.toggle('mg-column-hover', isActive === true);
	});
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

	renderColumns.forEach((column, index) => {
		const td = createElement('td', 'mg-cell');
		const content = grid.renderCellContent(row, column);
		const displayContent = wrapTextDisplayContent(content, grid, column, row, 'mg-cell-text-display');

		td.dataset.mgColumnIndex = String(index);
		td.dataset.mgColumnKey = column.key;
		applyColumnSizeStyles(td, column);
		appendContent(td, displayContent);
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

		const scroll = createElement('div', 'mg-table-scroll');
		const scrollInner = createElement('div', 'mg-table-scroll-inner');
		const table = createElement('table', 'mg-table');
		const thead = createElement('thead', 'mg-table-head');
		const tbody = createElement('tbody', 'mg-table-body');
		const headerRow = createElement('tr', 'mg-header-row');
		const renderColumnMap = new Map(
			renderColumns.map((column) => {
				return [column.key, column];
			})
		);

		let visualRowNumber = 0;
		let activeDropCell = null;
		let activeDropPosition = '';
		let dragSourceKey = '';
		let dragSourceSide = '';

		const clearDropIndicator = () => {
			if (!(activeDropCell instanceof HTMLElement)) {
				return;
			}

			activeDropCell.classList.remove('mg-column-drop-before', 'mg-column-drop-after');
			activeDropCell = null;
			activeDropPosition = '';
		};

		const setDropIndicator = (cell, position) => {
			if (!(cell instanceof HTMLElement)) {
				return;
			}

			if (activeDropCell !== cell || activeDropPosition !== position) {
				clearDropIndicator();
			}

			activeDropCell = cell;
			activeDropPosition = position;
			cell.classList.toggle('mg-column-drop-before', position === 'before');
			cell.classList.toggle('mg-column-drop-after', position === 'after');
		};

		const isCompatibleReorderTarget = (sourceKey, targetKey) => {
			if (!sourceKey || !targetKey || sourceKey === targetKey) {
				return false;
			}

			const sourceColumn = renderColumnMap.get(sourceKey);
			const targetColumn = renderColumnMap.get(targetKey);

			if (!sourceColumn || !targetColumn) {
				return false;
			}

			if (!isReorderableColumn(sourceColumn, tableOptions) || !isReorderableColumn(targetColumn, tableOptions)) {
				return false;
			}

			return resolveEffectivePinnedSide(sourceColumn) === resolveEffectivePinnedSide(targetColumn);
		};

		const resolveDropPosition = (event, cell) => {
			const rect = cell.getBoundingClientRect();
			const relativeX = event.clientX - rect.left;

			return relativeX <= rect.width / 2 ? 'before' : 'after';
		};

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

		const createReorderHandle = (column) => {
			const handle = createElement('button', 'mg-column-reorder-handle');
			handle.type = 'button';
			handle.draggable = true;
			handle.textContent = '⠿';
			handle.setAttribute('aria-label', `Move ${column.label || column.key}`);

			handle.addEventListener('dragstart', (event) => {
				dragSourceKey = column.key;
				dragSourceSide = resolveEffectivePinnedSide(column);
				table.dataset.mgDraggedColumnKey = column.key;
				document.body.classList.add('mg-column-reordering');

				if (event.dataTransfer) {
					event.dataTransfer.effectAllowed = 'move';
					event.dataTransfer.setData('text/plain', column.key);
				}
			});

			handle.addEventListener('dragend', () => {
				dragSourceKey = '';
				dragSourceSide = '';
				delete table.dataset.mgDraggedColumnKey;
				document.body.classList.remove('mg-column-reordering');
				clearDropIndicator();
			});

			return handle;
		};

		const injectReorderHandleIntoHeaderContent = (headerContent, column) => {
			if (!(headerContent instanceof HTMLElement) || !isReorderableColumn(column, tableOptions)) {
				return false;
			}

			const headerMenuTopline = headerContent.querySelector(':scope > .mg-header-menu-topline');

			if (!(headerMenuTopline instanceof HTMLElement)) {
				return false;
			}

			headerContent.classList.add('mg-header-menu-bar-reorderable');
			headerMenuTopline.prepend(createReorderHandle(column));

			return true;
		};

		renderColumns.forEach((column, index) => {
			const th = createElement('th', 'mg-header-cell');

			th.dataset.mgColumnIndex = String(index);
			th.dataset.mgColumnKey = column.key;
			applyColumnSizeStyles(th, column);

			th.addEventListener('mouseenter', () => {
				setColumnHoverState(table, index, true);
			});

			th.addEventListener('mouseleave', () => {
				setColumnHoverState(table, index, false);
			});

			th.addEventListener('dragover', (event) => {
				const sourceKey = dragSourceKey || table.dataset.mgDraggedColumnKey || '';

				if (!isCompatibleReorderTarget(sourceKey, column.key)) {
					return;
				}

				if (resolveEffectivePinnedSide(column) !== dragSourceSide) {
					return;
				}

				event.preventDefault();
				event.dataTransfer.dropEffect = 'move';

				setDropIndicator(th, resolveDropPosition(event, th));
			});

			th.addEventListener('drop', (event) => {
				const sourceKey = dragSourceKey || table.dataset.mgDraggedColumnKey || '';
				const position = activeDropPosition || resolveDropPosition(event, th);

				if (!isCompatibleReorderTarget(sourceKey, column.key)) {
					return;
				}

				event.preventDefault();
				clearDropIndicator();
				document.body.classList.remove('mg-column-reordering');
				dragSourceKey = '';
				dragSourceSide = '';
				delete table.dataset.mgDraggedColumnKey;

				grid.execute('moveColumn', {
					fromKey: sourceKey,
					toKey: column.key,
					position
				});
			});

			const renderedHeaderContent = grid.renderHeaderContent(column);
			const usedInlineHeaderStructure = injectReorderHandleIntoHeaderContent(renderedHeaderContent, column);

			if (usedInlineHeaderStructure) {
				th.appendChild(renderedHeaderContent);
			}
			else {
				const headerCellContent = createElement('div', 'mg-header-cell-content');
				const headerCellTopline = createElement('div', 'mg-header-cell-topline');
				const headerCellContentMain = createElement('div', 'mg-header-cell-content-main');

				headerCellContentMain.style.flex = '1 1 auto';

				if (isReorderableColumn(column, tableOptions)) {
					headerCellContentMain.classList.add('mg-header-cell-reorderable');
					headerCellTopline.appendChild(createReorderHandle(column));
				}

				if (column.sortable === false) {
					appendContent(headerCellContentMain, renderedHeaderContent);
				}
				else {
					const button = createElement('button', 'mg-sort-button');
					button.type = 'button';

					appendContent(button, renderedHeaderContent);

					if (viewModel.sortKey === column.key) {
						const indicator = createElement('span', 'mg-sort-indicator');
						indicator.textContent = viewModel.sortDirection === 'asc' ? '▲' : '▼';
						button.appendChild(indicator);
					}

					button.addEventListener('click', () => {
						grid.toggleSort(column.key);
					});

					headerCellContentMain.appendChild(button);
				}

				headerCellTopline.appendChild(headerCellContentMain);
				headerCellContent.appendChild(headerCellTopline);
				th.appendChild(headerCellContent);
			}

			if (isResizableColumn(column, tableOptions)) {
				th.classList.add('mg-header-cell-resizable');
				th.appendChild(
					createResizeHandle(
						th,
						table,
						grid,
						column,
						index,
						renderColumns,
						tableOptions
					)
				);
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
		scrollInner.appendChild(table);
		scroll.appendChild(scrollInner);
		container.appendChild(scroll);

		applyPinnedColumnStyles(table, renderColumns);
	}
}

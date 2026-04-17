import { appendContent, clearElement, createElement } from '../utils/dom.js';
import {
	createRowDetailContent,
	getRowDetailRowId,
	isDetailRowActive,
	resolveRowDetailOptions
} from '../utils/rowDetail.js';

function isInteractiveTarget(target) {
	return target instanceof Element && !!target.closest('a, button, input, select, textarea, label, summary, details');
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
		const rowDetailEnabled = rowDetailOptions.enabled !== false && rowDetailOptions.renderInTable !== false;

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

		renderColumns.forEach((column) => {
			const th = createElement('th', 'mg-header-cell');

			if (column.width) {
				th.style.width = `${column.width}px`;
			}

			if (column.sortable === false) {
				appendContent(th, grid.renderHeaderContent(column));
			} else {
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
		} else {
			viewModel.rows.forEach((row) => {
				const rowId = getRowDetailRowId(row, rowDetailOptions);
				const canToggleDetail = rowDetailEnabled && rowDetailOptions.toggleOnRowClick !== false && rowId !== null;
				const isActiveDetailRow = rowDetailEnabled && isDetailRowActive(row, grid, rowDetailOptions);
				const hasExternalRowClick = typeof grid.options.onRowClick === 'function';

				const tr = createElement('tr', 'mg-row');

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

						detailCell.colSpan = Math.max(renderColumns.length, 1);
						appendContent(detailWrapper, detailContent);
						detailCell.appendChild(detailWrapper);
						detailRow.appendChild(detailCell);
						tbody.appendChild(detailRow);
					}
				}
			});
		}

		table.appendChild(tbody);
		container.appendChild(table);
	}
}

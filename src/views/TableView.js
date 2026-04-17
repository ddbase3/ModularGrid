import { appendContent, clearElement, createElement } from '../utils/dom.js';

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

		const visibleColumns = viewModel.columns.filter((column) => column.visible !== false);

		if (visibleColumns.length === 0) {
			const emptyColumnsBox = createElement('div', 'mg-state');
			emptyColumnsBox.textContent = 'No visible columns selected.';
			container.appendChild(emptyColumnsBox);
			return;
		}

		const table = createElement('table', 'mg-table');
		const thead = createElement('thead', 'mg-table-head');
		const tbody = createElement('tbody', 'mg-table-body');
		const headerRow = createElement('tr', 'mg-header-row');

		visibleColumns.forEach((column) => {
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
			emptyCell.colSpan = Math.max(visibleColumns.length, 1);
			emptyCell.textContent = 'No rows found.';
			emptyRow.appendChild(emptyCell);
			tbody.appendChild(emptyRow);
		} else {
			viewModel.rows.forEach((row) => {
				const tr = createElement('tr', 'mg-row');

				if (typeof grid.options.onRowClick === 'function') {
					tr.classList.add('mg-row-clickable');

					tr.addEventListener('click', () => {
						grid.options.onRowClick(row, grid);
					});
				}

				visibleColumns.forEach((column) => {
					const td = createElement('td', 'mg-cell');
					const content = grid.renderCellContent(row, column);

					appendContent(td, content);
					tr.appendChild(td);
				});

				tbody.appendChild(tr);
			});
		}

		table.appendChild(tbody);
		container.appendChild(table);
	}
}

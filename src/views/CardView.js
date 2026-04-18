import { appendContent, clearElement, createElement } from '../utils/dom.js';
import {
	createRowDetailContent,
	getRowDetailRowId,
	isDetailRowActive,
	resolveRowDetailOptions
} from '../utils/rowDetail.js';
import {
	getDisplayValue,
	getTextDisplayContent,
	wrapTextDisplayContent
} from '../utils/textDisplay.js';

function resolveOptions(grid) {
	return {
		titleKey: null,
		subtitleKey: null,
		titleRenderer: null,
		subtitleRenderer: null,
		showLabels: true,
		emptyPlaceholder: '—',
		...grid.options.pluginOptions?.cardView
	};
}

function isUtilityColumn(column) {
	return !column.label || String(column.key || '').startsWith('__mg_');
}

function findColumn(columns, key) {
	if (!key) {
		return null;
	}

	return columns.find((column) => column.key === key) || null;
}

function isInteractiveTarget(target) {
	return target instanceof Element && !!target.closest('a, button, input, select, textarea, label, summary, details');
}

export class CardView {
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

		if (!Array.isArray(viewModel.rows) || viewModel.rows.length === 0) {
			const emptyBox = createElement('div', 'mg-state');
			emptyBox.textContent = 'No rows found.';
			container.appendChild(emptyBox);
			return;
		}

		const options = resolveOptions(grid);
		const rowDetailOptions = resolveRowDetailOptions(grid);
		const rowDetailEnabled = rowDetailOptions.enabled !== false && rowDetailOptions.renderInCards !== false;

		const renderColumns = (viewModel.renderColumns || []).filter((column) => column.visible !== false);
		const utilityColumns = renderColumns.filter(isUtilityColumn);
		const dataColumns = renderColumns.filter((column) => !isUtilityColumn(column));

		const titleColumn = findColumn(dataColumns, options.titleKey) || dataColumns[0] || null;
		const subtitleColumn = findColumn(dataColumns, options.subtitleKey) || dataColumns[1] || null;

		const cards = createElement('div', 'mg-cards');

		viewModel.rows.forEach((row) => {
			const rowId = getRowDetailRowId(row, rowDetailOptions);
			const canToggleDetail = rowDetailEnabled && rowDetailOptions.toggleOnRowClick !== false && rowId !== null;
			const isActiveDetailRow = rowDetailEnabled && isDetailRowActive(row, grid, rowDetailOptions);
			const hasExternalRowClick = typeof grid.options.onRowClick === 'function';

			const card = createElement('article', 'mg-card');

			if (canToggleDetail || hasExternalRowClick) {
				card.classList.add('mg-card-clickable');

				card.addEventListener('click', (event) => {
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

			if (utilityColumns.length > 0) {
				const utilityBar = createElement('div', 'mg-card-utilities');

				utilityColumns.forEach((column) => {
					const item = createElement('div', 'mg-card-utility');
					const content = grid.renderCellContent(row, column);
					appendContent(item, content);
					utilityBar.appendChild(item);
				});

				card.appendChild(utilityBar);
			}

			const content = createElement('div', 'mg-card-content');

			if (titleColumn || subtitleColumn || typeof options.titleRenderer === 'function' || typeof options.subtitleRenderer === 'function') {
				const header = createElement('div', 'mg-card-header');

				const title = createElement('div', 'mg-card-title');

				if (typeof options.titleRenderer === 'function') {
					const titleContent = options.titleRenderer(row, grid, viewModel);
					appendContent(title, titleContent ?? options.emptyPlaceholder);
				}
				else if (titleColumn) {
					appendContent(
						title,
						getTextDisplayContent(
							row[titleColumn.key],
							options.emptyPlaceholder,
							grid,
							titleColumn,
							'mg-card-title-text'
						)
					);
				}
				else {
					appendContent(title, options.emptyPlaceholder);
				}

				header.appendChild(title);

				if (typeof options.subtitleRenderer === 'function') {
					const subtitle = createElement('div', 'mg-card-subtitle');
					const subtitleContent = options.subtitleRenderer(row, grid, viewModel);

					appendContent(subtitle, subtitleContent ?? options.emptyPlaceholder);
					header.appendChild(subtitle);
				}
				else if (subtitleColumn && (!titleColumn || subtitleColumn.key !== titleColumn.key)) {
					const subtitle = createElement('div', 'mg-card-subtitle');

					appendContent(
						subtitle,
						getTextDisplayContent(
							row[subtitleColumn.key],
							options.emptyPlaceholder,
							grid,
							subtitleColumn,
							'mg-card-subtitle-text'
						)
					);

					header.appendChild(subtitle);
				}

				content.appendChild(header);
			}

			const fields = createElement('div', 'mg-card-fields');

			const bodyColumns = dataColumns.filter((column) => {
				if (titleColumn && column.key === titleColumn.key) {
					return false;
				}

				if (subtitleColumn && column.key === subtitleColumn.key) {
					return false;
				}

				return true;
			});

			const fieldsToRender = bodyColumns.length > 0 ? bodyColumns : dataColumns;

			fieldsToRender.forEach((column) => {
				const field = createElement('div', 'mg-card-field');

				if (options.showLabels !== false) {
					const label = createElement('div', 'mg-card-label');
					label.textContent = column.label || column.key;
					field.appendChild(label);
				}

				const value = createElement('div', 'mg-card-value');
				const contentValue = grid.renderCellContent(row, column);
				const displayContent = wrapTextDisplayContent(contentValue, grid, column, 'mg-card-value-text');

				appendContent(value, displayContent || getDisplayValue(contentValue, options.emptyPlaceholder));
				field.appendChild(value);

				fields.appendChild(field);
			});

			content.appendChild(fields);
			card.appendChild(content);

			if (isActiveDetailRow) {
				const detailContent = createRowDetailContent(row, grid, viewModel, renderColumns, rowDetailOptions);

				if (detailContent) {
					const detailWrapper = createElement('div', 'mg-card-detail');
					appendContent(detailWrapper, detailContent);
					card.appendChild(detailWrapper);
				}
			}

			cards.appendChild(card);
		});

		container.appendChild(cards);
	}
}

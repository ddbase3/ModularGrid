import { appendContent, clearElement, createElement } from '../utils/dom.js';
import {
	getDisplayValue,
	getTextDisplayContent,
	wrapTextDisplayContent
} from '../utils/textDisplay.js';

function resolveOptions(grid) {
	return {
		rowIdKey: 'id',
		titleKey: null,
		subtitleKey: null,
		previewKeys: [],
		showLabels: true,
		emptyPlaceholder: '—',
		detailRenderer: null,
		...grid.options.pluginOptions?.splitDetailView
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

function getRowId(row, options) {
	if (!row || typeof row !== 'object') {
		return null;
	}

	return row[options.rowIdKey] ?? null;
}

export class SplitDetailView {
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
		const renderColumns = (viewModel.renderColumns || []).filter((column) => column.visible !== false);
		const utilityColumns = renderColumns.filter(isUtilityColumn);
		const dataColumns = renderColumns.filter((column) => !isUtilityColumn(column));

		const titleColumn = findColumn(dataColumns, options.titleKey) || dataColumns[0] || null;
		const subtitleColumn = findColumn(dataColumns, options.subtitleKey) || dataColumns[1] || null;

		const previewColumns = (options.previewKeys || [])
			.map((key) => findColumn(dataColumns, key))
			.filter(Boolean);

		const fallbackPreviewColumns = dataColumns.filter((column) => {
			if (titleColumn && column.key === titleColumn.key) {
				return false;
			}

			if (subtitleColumn && column.key === subtitleColumn.key) {
				return false;
			}

			return true;
		}).slice(0, 2);

		const effectivePreviewColumns = previewColumns.length > 0 ? previewColumns : fallbackPreviewColumns;

		const state = grid.store.peek();
		const selectedRowId = state.splitDetailView?.selectedRowId ?? null;
		const selectedRow = viewModel.rows.find((row) => getRowId(row, options) === selectedRowId) || viewModel.rows[0];

		const root = createElement('div', 'mg-split-view');
		const list = createElement('div', 'mg-split-list');
		const detail = createElement('div', 'mg-split-detail');

		viewModel.rows.forEach((row) => {
			const rowId = getRowId(row, options);
			const isActive = selectedRow && getRowId(selectedRow, options) === rowId;

			const item = createElement('button', 'mg-split-item');
			item.type = 'button';

			if (isActive) {
				item.classList.add('mg-split-item-active');
			}

			item.addEventListener('click', () => {
				grid.execute('setSplitDetailRow', rowId);
			});

			const itemHeader = createElement('div', 'mg-split-item-header');

			const title = createElement('div', 'mg-split-item-title');
			appendContent(
				title,
				titleColumn
					? getTextDisplayContent(
						row[titleColumn.key],
						options.emptyPlaceholder,
						grid,
						titleColumn,
						'mg-split-item-title-text'
					)
					: options.emptyPlaceholder
			);
			itemHeader.appendChild(title);

			if (subtitleColumn && (!titleColumn || subtitleColumn.key !== titleColumn.key)) {
				const subtitle = createElement('div', 'mg-split-item-subtitle');

				appendContent(
					subtitle,
					getTextDisplayContent(
						row[subtitleColumn.key],
						options.emptyPlaceholder,
						grid,
						subtitleColumn,
						'mg-split-item-subtitle-text'
					)
				);

				itemHeader.appendChild(subtitle);
			}

			item.appendChild(itemHeader);

			if (effectivePreviewColumns.length > 0) {
				const preview = createElement('div', 'mg-split-item-preview');

				effectivePreviewColumns.forEach((column) => {
					const line = createElement('div', 'mg-split-item-preview-line');
					const label = createElement('div', 'mg-split-item-preview-label');
					label.textContent = `${column.label}:`;

					const value = createElement('div', 'mg-split-item-preview-value');
					appendContent(
						value,
						getTextDisplayContent(
							row[column.key],
							options.emptyPlaceholder,
							grid,
							column,
							'mg-split-item-preview-value-text'
						)
					);

					line.appendChild(label);
					line.appendChild(value);
					preview.appendChild(line);
				});

				item.appendChild(preview);
			}

			if (utilityColumns.length > 0) {
				const utilities = createElement('div', 'mg-split-item-utilities');

				utilityColumns.forEach((column) => {
					const utility = createElement('div', 'mg-split-item-utility');
					const content = grid.renderCellContent(row, column);
					appendContent(utility, content);
					utilities.appendChild(utility);
				});

				item.appendChild(utilities);
			}

			list.appendChild(item);
		});

		if (selectedRow) {
			const detailHeader = createElement('div', 'mg-split-detail-header');

			if (titleColumn) {
				const detailTitle = createElement('div', 'mg-split-detail-title');

				appendContent(
					detailTitle,
					getTextDisplayContent(
						selectedRow[titleColumn.key],
						options.emptyPlaceholder,
						grid,
						titleColumn,
						'mg-split-detail-title-text'
					)
				);

				detailHeader.appendChild(detailTitle);
			}

			if (subtitleColumn && (!titleColumn || subtitleColumn.key !== titleColumn.key)) {
				const detailSubtitle = createElement('div', 'mg-split-detail-subtitle');

				appendContent(
					detailSubtitle,
					getTextDisplayContent(
						selectedRow[subtitleColumn.key],
						options.emptyPlaceholder,
						grid,
						subtitleColumn,
						'mg-split-detail-subtitle-text'
					)
				);

				detailHeader.appendChild(detailSubtitle);
			}

			detail.appendChild(detailHeader);

			if (typeof options.detailRenderer === 'function') {
				const customContent = options.detailRenderer(selectedRow, grid, viewModel);

				if (customContent) {
					const customWrapper = createElement('div', 'mg-split-detail-custom');
					appendContent(customWrapper, customContent);
					detail.appendChild(customWrapper);
				}
			}
			else {
				const fields = createElement('div', 'mg-split-detail-fields');

				dataColumns.forEach((column) => {
					const field = createElement('div', 'mg-split-detail-field');

					if (options.showLabels !== false) {
						const label = createElement('div', 'mg-split-detail-label');
						label.textContent = column.label || column.key;
						field.appendChild(label);
					}

					const value = createElement('div', 'mg-split-detail-value');
					const content = grid.renderCellContent(selectedRow, column);
					const displayContent = wrapTextDisplayContent(content, grid, column, 'mg-split-detail-value-text');

					appendContent(value, displayContent || getDisplayValue(content, options.emptyPlaceholder));
					field.appendChild(value);

					fields.appendChild(field);
				});

				detail.appendChild(fields);
			}
		}

		root.appendChild(list);
		root.appendChild(detail);
		container.appendChild(root);
	}
}

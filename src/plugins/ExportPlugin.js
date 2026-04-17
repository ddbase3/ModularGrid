function resolveOptions(context) {
	return {
		zone: 'actions',
		order: 100,
		rowIdKey: 'id',
		visibleOnly: true,
		includeHeaders: true,
		fileName: 'modulargrid-export',
		actions: [
			{
				key: 'csv-current',
				label: 'CSV',
				format: 'csv',
				scope: 'current'
			},
			{
				key: 'json-current',
				label: 'JSON',
				format: 'json',
				scope: 'current'
			}
		],
		...context.getPluginOptions('export')
	};
}

function getSelectedRowIds(context) {
	const state = context.peekState();

	if (!state.selection || !Array.isArray(state.selection.selectedRowIds)) {
		return [];
	}

	return state.selection.selectedRowIds;
}

function getLoadedRows(context) {
	return Array.isArray(context.peekState().data?.rows) ? context.peekState().data.rows : [];
}

function getCurrentRows(context) {
	return context.grid.getPreparedRows().rows || [];
}

function getRowsForScope(context, options, scope) {
	if (scope === 'selected') {
		const selectedIdSet = new Set(getSelectedRowIds(context));

		return getLoadedRows(context).filter((row) => {
			return selectedIdSet.has(row?.[options.rowIdKey]);
		});
	}

	if (scope === 'loaded') {
		return getLoadedRows(context);
	}

	return getCurrentRows(context);
}

function getExportColumns(context, options) {
	const columns = Array.isArray(context.peekState().columns) ? context.peekState().columns : [];

	return columns.filter((column) => {
		if (!column || !column.key) {
			return false;
		}

		if (options.visibleOnly !== false && column.visible === false) {
			return false;
		}

		return true;
	});
}

function normalizeCellValue(value) {
	if (value === null || value === undefined) {
		return '';
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return String(value);
}

function buildExportRows(rows, columns) {
	return rows.map((row) => {
		const result = {};

		columns.forEach((column) => {
			result[column.key] = row?.[column.key] ?? null;
		});

		return result;
	});
}

function escapeCsvCell(value, delimiter) {
	const normalized = normalizeCellValue(value);
	const needsQuotes =
		normalized.includes('"') ||
		normalized.includes('\n') ||
		normalized.includes('\r') ||
		normalized.includes(delimiter);

	if (!needsQuotes) {
		return normalized;
	}

	return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsvContent(rows, columns, options) {
	const delimiter = options.delimiter || ';';
	const lines = [];

	if (options.includeHeaders !== false) {
		lines.push(
			columns.map((column) => escapeCsvCell(column.label || column.key, delimiter)).join(delimiter)
		);
	}

	rows.forEach((row) => {
		lines.push(
			columns.map((column) => escapeCsvCell(row[column.key], delimiter)).join(delimiter)
		);
	});

	return lines.join('\n');
}

function buildJsonContent(rows) {
	return JSON.stringify(rows, null, 2);
}

function downloadContent(fileName, content, mimeType) {
	const blob = new Blob([content], {
		type: mimeType
	});

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);

	window.setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 0);
}

function buildFileName(baseName, action) {
	const scope = action.scope || 'current';
	const format = action.format || 'json';
	return `${baseName}-${scope}.${format}`;
}

export const ExportPlugin = {
	name: 'export',

	commands: {
		exportGridData(context, payload = {}) {
			const options = {
				...resolveOptions(context),
				...payload
			};

			const action = payload.action || {};
			const scope = action.scope || options.scope || 'current';
			const format = action.format || options.format || 'json';
			const rows = getRowsForScope(context, options, scope);
			const columns = getExportColumns(context, options);
			const exportRows = buildExportRows(rows, columns);
			const fileName = buildFileName(action.fileName || options.fileName || 'modulargrid-export', {
				scope,
				format
			});

			let content = '';
			let mimeType = 'application/json';

			if (format === 'csv') {
				content = buildCsvContent(exportRows, columns, options);
				mimeType = 'text/csv;charset=utf-8';
			}
			else {
				content = buildJsonContent(exportRows);
				mimeType = 'application/json;charset=utf-8';
			}

			downloadContent(fileName, content, mimeType);

			context.events.emit('export:created', {
				grid: context.grid,
				format,
				scope,
				fileName,
				rowCount: exportRows.length,
				columnKeys: columns.map((column) => column.key)
			});

			return {
				format,
				scope,
				fileName,
				rowCount: exportRows.length
			};
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					const actions = Array.isArray(options.actions) ? options.actions : [];

					if (actions.length === 0) {
						return null;
					}

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-export-actions';

					actions.forEach((action) => {
						const button = document.createElement('button');
						button.type = 'button';
						button.className = 'mg-button mg-export-button';
						button.textContent = action.label || action.key || 'Export';

						if (action.scope === 'selected' && getSelectedRowIds(context).length === 0) {
							button.disabled = true;
						}

						button.addEventListener('click', () => {
							context.execute('exportGridData', {
								action
							});
						});

						wrapper.appendChild(button);
					});

					return wrapper;
				}
			}
		];
	}
};

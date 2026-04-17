function resolveElement(source) {
	if (typeof source === 'string') {
		const element = document.querySelector(source);

		if (!element) {
			throw new Error(`HTML table source "${source}" was not found.`);
		}

		return element;
	}

	if (source instanceof HTMLTableElement) {
		return source;
	}

	throw new Error('HtmlTableAdapter requires a selector string or an HTMLTableElement.');
}

function makeSlug(value) {
	return String(value)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '') || 'column';
}

function buildUniqueKeys(labels) {
	const used = new Map();

	return labels.map((label, index) => {
		const base = makeSlug(label) || `column_${index + 1}`;
		const count = used.get(base) || 0;

		used.set(base, count + 1);

		if (count === 0) {
			return base;
		}

		return `${base}_${count + 1}`;
	});
}

export class HtmlTableAdapter {
	constructor(source, options = {}) {
		if (typeof source === 'object' && !(source instanceof HTMLTableElement) && !Array.isArray(source)) {
			options = source;
			source = options.source;
		}

		this.source = source;
		this.options = {
			hideSource: true,
			...options
		};
		this.parsed = null;
	}

	getTable() {
		return resolveElement(this.source);
	}

	parseTable() {
		const table = this.getTable();
		const headerCells = Array.from(table.querySelectorAll('thead tr:last-child th, thead tr:last-child td'));
		const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
		let labels = [];
		let columns = [];

		if (headerCells.length > 0) {
			labels = headerCells.map((cell, index) => {
				return cell.dataset.key || cell.textContent.trim() || `Column ${index + 1}`;
			});
		} else if (bodyRows.length > 0) {
			const firstRowCells = Array.from(bodyRows[0].children);
			labels = firstRowCells.map((cell, index) => {
				return cell.dataset.key || `Column ${index + 1}`;
			});
		}

		const keys = buildUniqueKeys(labels);

		columns = labels.map((label, index) => {
			return {
				key: keys[index],
				label,
				visible: true,
				sortable: true
			};
		});

		const rows = bodyRows.map((row) => {
			const cells = Array.from(row.children);
			const entry = {};

			columns.forEach((column, index) => {
				entry[column.key] = cells[index] ? cells[index].textContent.trim() : '';
			});

			return entry;
		});

		return {
			columns,
			rows,
			total: rows.length
		};
	}

	async load() {
		if (!this.parsed) {
			this.parsed = this.parseTable();

			if (this.options.hideSource !== false) {
				const table = this.getTable();
				table.hidden = true;
			}
		}

		return {
			columns: this.parsed.columns,
			rows: this.parsed.rows.slice(),
			total: this.parsed.total
		};
	}
}

export class GridDataController {
	constructor(grid) {
		this.grid = grid;
	}

	buildRequest() {
		const state = this.grid.store.peek();

		return {
			page: state.query.page,
			pageSize: state.query.pageSize,
			search: state.query.search,
			sortKey: state.query.sortKey,
			sortDirection: state.query.sortDirection
		};
	}

	async load() {
		if (!this.grid.adapter || typeof this.grid.adapter.load !== 'function') {
			throw new Error('No valid data adapter configured.');
		}

		const request = this.buildRequest();

		this.grid.events.emit('data:before-load', {
			grid: this.grid,
			request
		});

		const result = await this.grid.adapter.load(request, this.grid);
		const normalized = this.normalizeResult(result);

		this.grid.events.emit('data:after-load', {
			grid: this.grid,
			result: normalized
		});

		return normalized;
	}

	normalizeResult(result) {
		if (Array.isArray(result)) {
			return {
				rows: result,
				total: result.length,
				columns: null
			};
		}

		if (!result || !Array.isArray(result.rows)) {
			throw new Error('Adapter must return an array or an object with a rows array.');
		}

		return {
			rows: result.rows,
			total: typeof result.total === 'number' ? result.total : result.rows.length,
			columns: Array.isArray(result.columns) ? result.columns : null
		};
	}
}

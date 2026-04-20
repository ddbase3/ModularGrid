export class GridDataController {
	constructor(grid) {
		this.grid = grid;
	}

	buildRequest(options = {}) {
		const state = this.grid.store.peek();

		return {
			page: options.page ?? state.query.page,
			pageSize: options.pageSize ?? state.query.pageSize,
			search: options.search ?? state.query.search,
			sortKey: options.sortKey ?? state.query.sortKey,
			sortDirection: options.sortDirection ?? state.query.sortDirection
		};
	}

	async load(options = {}) {
		if (!this.grid.adapter || typeof this.grid.adapter.load !== 'function') {
			throw new Error('No valid data adapter configured.');
		}

		const loadMode = options.mode === 'append' ? 'append' : 'replace';
		const request = this.buildRequest(options);

		this.grid.events.emit('data:before-load', {
			grid: this.grid,
			request,
			mode: loadMode
		});

		const result = await this.grid.adapter.load(request, this.grid);
		const normalized = this.normalizeResult(result);

		this.grid.events.emit('data:after-load', {
			grid: this.grid,
			result: normalized,
			mode: loadMode
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


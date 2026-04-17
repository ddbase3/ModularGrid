function getValueByPath(object, path, fallback = undefined) {
	if (!path) {
		return fallback;
	}

	const parts = String(path).split('.');
	let current = object;

	for (const part of parts) {
		if (!current || typeof current !== 'object' || !(part in current)) {
			return fallback;
		}

		current = current[part];
	}

	return current;
}

export class AjaxAdapter {
	constructor(options = {}) {
		if (typeof options === 'string') {
			options = {
				url: options
			};
		}

		this.options = {
			url: '',
			method: 'GET',
			rowsPath: 'data',
			totalPath: 'total',
			columnsPath: 'columns',
			queryParamMap: {
				page: 'page',
				pageSize: 'pageSize',
				search: 'search',
				sortKey: 'sort',
				sortDirection: 'direction'
			},
			headers: {},
			fetchOptions: {},
			mapRequest: null,
			mapResponse: null,
			...options
		};
	}

	resolveUrl(request) {
		if (typeof this.options.url === 'function') {
			return this.options.url(request);
		}

		return this.options.url;
	}

	buildQueryObject(request) {
		if (typeof this.options.mapRequest === 'function') {
			return this.options.mapRequest(request);
		}

		const map = this.options.queryParamMap || {};

		return {
			[map.page || 'page']: request.page,
			[map.pageSize || 'pageSize']: request.pageSize,
			[map.search || 'search']: request.search,
			[map.sortKey || 'sort']: request.sortKey,
			[map.sortDirection || 'direction']: request.sortDirection
		};
	}

	buildUrl(request) {
		const rawUrl = this.resolveUrl(request);

		if (!rawUrl) {
			throw new Error('AjaxAdapter requires a URL.');
		}

		const url = new URL(rawUrl, window.location.href);
		const method = String(this.options.method || 'GET').toUpperCase();

		if (method === 'GET') {
			const query = this.buildQueryObject(request);

			Object.entries(query).forEach(([key, value]) => {
				if (value === undefined || value === null || value === '') {
					return;
				}

				url.searchParams.set(key, String(value));
			});
		}

		return url.toString();
	}

	buildFetchOptions(request) {
		const method = String(this.options.method || 'GET').toUpperCase();
		const fetchOptions = {
			method,
			headers: {
				...this.options.headers
			},
			...this.options.fetchOptions
		};

		if (method !== 'GET' && fetchOptions.body === undefined) {
			fetchOptions.headers = {
				'Content-Type': 'application/json',
				...fetchOptions.headers
			};

			fetchOptions.body = JSON.stringify(this.buildQueryObject(request));
		}

		return fetchOptions;
	}

	normalizePayload(payload) {
		if (typeof this.options.mapResponse === 'function') {
			const normalized = this.options.mapResponse(payload) || {};
			const rows = Array.isArray(normalized.rows) ? normalized.rows : [];

			return {
				rows,
				total: normalized.total ?? rows.length,
				columns: Array.isArray(normalized.columns) ? normalized.columns : null,
				payload
			};
		}

		const rows = getValueByPath(payload, this.options.rowsPath, getValueByPath(payload, 'rows', []));
		const total = getValueByPath(payload, this.options.totalPath, Array.isArray(rows) ? rows.length : 0);
		const columns = getValueByPath(payload, this.options.columnsPath, null);

		if (!Array.isArray(rows)) {
			throw new Error('AjaxAdapter expected an array in the response.');
		}

		return {
			rows,
			total,
			columns: Array.isArray(columns) ? columns : null,
			payload
		};
	}

	async load(request) {
		const url = this.buildUrl(request);
		const fetchOptions = this.buildFetchOptions(request);
		const response = await fetch(url, fetchOptions);

		if (!response.ok) {
			throw new Error(`Ajax request failed with status ${response.status}.`);
		}

		const payload = await response.json();

		return this.normalizePayload(payload);
	}
}

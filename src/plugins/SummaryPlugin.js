function resolveOptions(context) {
	return {
		zone: 'footerInfo',
		order: 20,
		scope: 'page',
		metrics: [],
		emptyText: '',
		...context.getPluginOptions('summary')
	};
}

function getRows(context, viewModel, options) {
	if (options.scope === 'loaded') {
		return Array.isArray(context.peekState().data?.rows) ? context.peekState().data.rows : [];
	}

	return Array.isArray(viewModel.rows) ? viewModel.rows : [];
}

function toNumber(value) {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	const number = Number(value);

	if (Number.isNaN(number)) {
		return null;
	}

	return number;
}

function formatNumber(value, metric) {
	if (value === null || value === undefined) {
		return '—';
	}

	if (metric.format === 'currency') {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: metric.currency || 'EUR',
			minimumFractionDigits: typeof metric.decimals === 'number' ? metric.decimals : 2,
			maximumFractionDigits: typeof metric.decimals === 'number' ? metric.decimals : 2
		}).format(value);
	}

	return new Intl.NumberFormat(undefined, {
		minimumFractionDigits: typeof metric.decimals === 'number' ? metric.decimals : 0,
		maximumFractionDigits: typeof metric.decimals === 'number' ? metric.decimals : 2
	}).format(value);
}

function computeMetric(metric, rows) {
	const type = metric.type || 'count';

	if (type === 'count') {
		return rows.length;
	}

	if (!metric.key) {
		return null;
	}

	const values = rows
		.map((row) => toNumber(row[metric.key]))
		.filter((value) => value !== null);

	if (type === 'sum') {
		return values.reduce((sum, value) => sum + value, 0);
	}

	if (type === 'avg') {
		if (values.length === 0) {
			return null;
		}

		return values.reduce((sum, value) => sum + value, 0) / values.length;
	}

	if (type === 'min') {
		if (values.length === 0) {
			return null;
		}

		return Math.min(...values);
	}

	if (type === 'max') {
		if (values.length === 0) {
			return null;
		}

		return Math.max(...values);
	}

	if (type === 'countTrue') {
		return rows.filter((row) => row[metric.key] === true).length;
	}

	return null;
}

function formatMetricValue(metric, value, rows) {
	if (typeof metric.formatter === 'function') {
		return metric.formatter(value, {
			metric,
			rows
		});
	}

	if (typeof value === 'number') {
		return formatNumber(value, metric);
	}

	if (value === null || value === undefined || value === '') {
		return '—';
	}

	return String(value);
}

export const SummaryPlugin = {
	name: 'summary',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					const rows = getRows(context, viewModel, options);
					const metrics = Array.isArray(options.metrics) ? options.metrics : [];

					if (metrics.length === 0) {
						if (!options.emptyText) {
							return null;
						}

						const empty = document.createElement('div');
						empty.className = 'mg-summary-empty';
						empty.textContent = options.emptyText;
						return empty;
					}

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-summary';

					metrics.forEach((metric, index) => {
						const item = document.createElement('div');
						item.className = 'mg-summary-item';

						const label = metric.label || metric.key || `Metric ${index + 1}`;
						const value = computeMetric(metric, rows);
						const formattedValue = formatMetricValue(metric, value, rows);

						item.textContent = `${label}: ${formattedValue}`;
						wrapper.appendChild(item);
					});

					return wrapper;
				}
			}
		];
	}
};

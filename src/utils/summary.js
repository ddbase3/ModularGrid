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

export function computeSummaryMetric(metric, rows) {
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

export function formatSummaryMetric(metric, value, rows) {
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

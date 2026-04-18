import { computeSummaryMetric, formatSummaryMetric } from '../utils/summary.js';

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
						const value = computeSummaryMetric(metric, rows);
						const formattedValue = formatSummaryMetric(metric, value, rows);

						item.textContent = `${label}: ${formattedValue}`;
						wrapper.appendChild(item);
					});

					return wrapper;
				}
			}
		];
	}
};

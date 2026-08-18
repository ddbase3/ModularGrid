function resolveOptions(context) {
	return {
		zone: 'footerInfo',
		order: 10,
		displayMode: 'range',
		loadedLabel: context.getString('loaded'),
		allLoadedLabel: context.getString('loadedAll'),
		loadingMoreLabel: context.getString('loadingMore'),
		...context.getPluginOptions('info')
	};
}

function renderLoadedInfo(info, context, options, viewModel) {
	const loaded = Math.max(0, Number(viewModel.loadedRowCount) || 0);
	const total = Math.max(0, Number(viewModel.total) || 0);

	if (loaded === 0 && total === 0) {
		info.textContent = context.getString('noRecords');
		return info;
	}

	if (total > 0 && loaded >= total) {
		info.textContent = context.getString('loadedAllRecords', { total });
		return info;
	}

	if (total > 0) {
		info.textContent = context.getString('loadedOfRecords', { loaded, total }) + (viewModel.loadingMore ? ` · ${options.loadingMoreLabel}` : '');
		return info;
	}

	info.textContent = context.getString('loadedRecords', { loaded }) + (viewModel.loadingMore ? ` · ${options.loadingMoreLabel}` : '');
	return info;
}

export const InfoPlugin = {
	name: 'info',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					const info = document.createElement('div');
					info.className = 'mg-info';

					if (options.displayMode === 'loaded') {
						return renderLoadedInfo(info, context, options, viewModel);
					}

					if (viewModel.filteredTotal === 0) {
						info.textContent = context.getString('noRecords');
						return info;
					}

					if (viewModel.filteredTotal !== viewModel.total) {
						info.textContent = context.getString('recordsRangeFiltered', { from: viewModel.from, to: viewModel.to, filteredTotal: viewModel.filteredTotal, total: viewModel.total });
						return info;
					}

					info.textContent = context.getString('recordsRange', { from: viewModel.from, to: viewModel.to, total: viewModel.total });
					return info;
				}
			}
		];
	}
};


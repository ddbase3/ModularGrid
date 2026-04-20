function resolveOptions(context) {
	return {
		zone: 'footerInfo',
		order: 10,
		displayMode: 'range',
		loadedLabel: 'Loaded',
		allLoadedLabel: 'Loaded all',
		loadingMoreLabel: 'Loading more',
		...context.getPluginOptions('info')
	};
}

function renderLoadedInfo(info, options, viewModel) {
	const loaded = Math.max(0, Number(viewModel.loadedRowCount) || 0);
	const total = Math.max(0, Number(viewModel.total) || 0);

	if (loaded === 0 && total === 0) {
		info.textContent = 'No records';
		return info;
	}

	if (total > 0 && loaded >= total) {
		info.textContent = `${options.allLoadedLabel} ${total} records`;
		return info;
	}

	if (total > 0) {
		info.textContent = `${options.loadedLabel} ${loaded} of ${total} records${viewModel.loadingMore ? ` · ${options.loadingMoreLabel}` : ''}`;
		return info;
	}

	info.textContent = `${options.loadedLabel} ${loaded} records${viewModel.loadingMore ? ` · ${options.loadingMoreLabel}` : ''}`;
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
						return renderLoadedInfo(info, options, viewModel);
					}

					if (viewModel.filteredTotal === 0) {
						info.textContent = 'No records';
						return info;
					}

					if (viewModel.filteredTotal !== viewModel.total) {
						info.textContent = `Records ${viewModel.from} to ${viewModel.to} of ${viewModel.filteredTotal} (filtered from ${viewModel.total})`;
						return info;
					}

					info.textContent = `Records ${viewModel.from} to ${viewModel.to} of ${viewModel.total}`;
					return info;
				}
			}
		];
	}
};


function resolveOptions(context) {
	return {
		zone: 'footerInfo',
		order: 10,
		...context.getPluginOptions('info')
	};
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

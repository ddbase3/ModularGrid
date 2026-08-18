function resolveOptions(context) {
	return {
		zone: 'footerPaging',
		order: 10,
		showWhenSinglePage: true,
		...context.getPluginOptions('paging')
	};
}

export const PagingPlugin = {
	name: 'paging',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					if (context.grid.options.features?.paging === false) {
						return null;
					}

					if (!options.showWhenSinglePage && viewModel.totalPages <= 1) {
						return null;
					}

					const pager = document.createElement('div');
					pager.className = 'mg-pager';

					const previousButton = document.createElement('button');
					previousButton.type = 'button';
					previousButton.className = 'mg-button';
					previousButton.textContent = `← ${context.getString('previous')}`;
					previousButton.disabled = viewModel.page <= 1;

					previousButton.addEventListener('click', () => {
						context.execute('setPage', viewModel.page - 1);
					});

					const label = document.createElement('span');
					label.className = 'mg-pager-label';
					label.textContent = context.getString('pageStatus', { page: viewModel.page, totalPages: viewModel.totalPages });

					const nextButton = document.createElement('button');
					nextButton.type = 'button';
					nextButton.className = 'mg-button';
					nextButton.textContent = `${context.getString('next')} →`;
					nextButton.disabled = viewModel.page >= viewModel.totalPages;

					nextButton.addEventListener('click', () => {
						context.execute('setPage', viewModel.page + 1);
					});

					pager.appendChild(previousButton);
					pager.appendChild(label);
					pager.appendChild(nextButton);

					return pager;
				}
			}
		];
	}
};

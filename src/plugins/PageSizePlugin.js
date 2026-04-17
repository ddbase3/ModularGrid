function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 20,
		label: 'Rows per page',
		...context.getPluginOptions('pageSize')
	};
}

export const PageSizePlugin = {
	name: 'pageSize',

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

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-control-group';

					const label = document.createElement('label');
					label.className = 'mg-label';
					label.textContent = options.label;

					const select = document.createElement('select');
					select.className = 'mg-select';

					(context.grid.options.pageSizeOptions || []).forEach((value) => {
						const option = document.createElement('option');
						option.value = String(value);
						option.textContent = String(value);

						if (Number(value) === Number(viewModel.pageSize)) {
							option.selected = true;
						}

						select.appendChild(option);
					});

					select.addEventListener('change', () => {
						context.execute('setPageSize', Number(select.value));
					});

					wrapper.appendChild(label);
					wrapper.appendChild(select);

					return wrapper;
				}
			}
		];
	}
};

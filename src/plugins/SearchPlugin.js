function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 10,
		label: 'Search',
		placeholder: 'Search all columns',
		showClearButton: true,
		...context.getPluginOptions('search')
	};
}

export const SearchPlugin = {
	name: 'search',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					const wrapper = document.createElement('div');
					wrapper.className = 'mg-control-group';

					const label = document.createElement('label');
					label.className = 'mg-label';
					label.textContent = options.label;

					const inputRow = document.createElement('div');
					inputRow.className = 'mg-inline-buttons';

					const input = document.createElement('input');
					input.type = 'search';
					input.className = 'mg-input';
					input.placeholder = options.placeholder;
					input.value = viewModel.search || '';
					input.dataset.mgFocusKey = 'search-input';

					input.addEventListener('input', () => {
						context.execute('setSearch', input.value);
					});

					inputRow.appendChild(input);

					if (options.showClearButton) {
						const clearButton = document.createElement('button');
						clearButton.type = 'button';
						clearButton.className = 'mg-button';
						clearButton.textContent = 'Clear';

						clearButton.addEventListener('click', () => {
							context.execute('clearSearch');
						});

						inputRow.appendChild(clearButton);
					}

					wrapper.appendChild(label);
					wrapper.appendChild(inputRow);

					return wrapper;
				}
			}
		];
	}
};

function resolveOptions(context) {
	return {
		zone: 'viewZone',
		order: 10,
		labels: {},
		include: null,
		exclude: [],
		...context.getPluginOptions('viewSwitcher')
	};
}

function isViewAllowed(view, options) {
	if (Array.isArray(options.include) && options.include.length > 0) {
		return options.include.includes(view.name);
	}

	if (Array.isArray(options.exclude) && options.exclude.includes(view.name)) {
		return false;
	}

	return true;
}

export const ViewSwitcherPlugin = {
	name: 'viewSwitcher',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render({ viewModel }) {
					const views = context.grid.viewManager
						.getAll()
						.filter((view) => isViewAllowed(view, options));

					if (views.length <= 1) {
						return null;
					}

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-view-switcher';

					views.forEach((view) => {
						const button = document.createElement('button');
						button.type = 'button';
						button.className = 'mg-button';
						button.textContent = options.labels[view.name] || view.label || view.name;

						if (viewModel.viewMode === view.name) {
							button.disabled = true;
						}

						button.addEventListener('click', () => {
							context.execute('setViewMode', view.name);
						});

						wrapper.appendChild(button);
					});

					return wrapper;
				}
			}
		];
	}
};

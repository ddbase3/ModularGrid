function resolveOptions(context) {
	return {
		zone: 'controlsZone',
		order: 30,
		stateKey: 'grouping',
		label: 'Group by',
		clearLabel: 'No grouping',
		fields: [],
		defaultKey: '',
		summary: {
			enabled: true,
			metrics: []
		},
		...context.getPluginOptions('grouping')
	};
}

function buildInitialState(options, currentState = {}) {
	return {
		key: currentState.key || options.defaultKey || ''
	};
}

function getGroupingState(context, options) {
	return context.peekState()[options.stateKey] || {
		key: ''
	};
}

export const GroupingPlugin = {
	name: 'grouping',

	install(context) {
		const options = resolveOptions(context);
		const currentState = context.peekState()[options.stateKey] || {};

		context.setState({
			[options.stateKey]: buildInitialState(options, currentState)
		});
	},

	commands: {
		setGrouping(context, payload = '') {
			const options = resolveOptions(context);
			const nextKey = typeof payload === 'string'
				? payload
				: String(payload?.key || '');

			context.setState({
				[options.stateKey]: {
					key: nextKey
				},
				query: {
					page: 1
				}
			});

			context.events.emit('grouping:changed', {
				grid: context.grid,
				key: nextKey
			});

			return context.grid;
		},

		clearGrouping(context) {
			const options = resolveOptions(context);

			context.setState({
				[options.stateKey]: {
					key: ''
				},
				query: {
					page: 1
				}
			});

			context.events.emit('grouping:changed', {
				grid: context.grid,
				key: ''
			});

			return context.grid;
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					const fields = Array.isArray(options.fields) ? options.fields : [];

					if (fields.length === 0) {
						return null;
					}

					const groupingState = getGroupingState(context, options);
					const wrapper = document.createElement('div');
					wrapper.className = 'mg-control-group mg-grouping-control';

					const label = document.createElement('label');
					label.className = 'mg-label';
					label.textContent = options.label;

					const select = document.createElement('select');
					select.className = 'mg-select';
					select.dataset.mgFocusKey = `grouping-${options.stateKey}`;

					const emptyOption = document.createElement('option');
					emptyOption.value = '';
					emptyOption.textContent = options.clearLabel;
					select.appendChild(emptyOption);

					fields.forEach((field) => {
						const option = document.createElement('option');
						option.value = field.key;
						option.textContent = field.label || field.key;

						if (field.key === groupingState.key) {
							option.selected = true;
						}

						select.appendChild(option);
					});

					select.addEventListener('change', () => {
						context.execute('setGrouping', select.value);
					});

					wrapper.appendChild(label);
					wrapper.appendChild(select);

					return wrapper;
				}
			}
		];
	}
};

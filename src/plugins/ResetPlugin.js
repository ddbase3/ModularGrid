function resolveOptions(context) {
	return {
		zone: 'actions',
		order: 100,
		label: 'Reset',
		sections: ['query', 'columns'],
		...context.getPluginOptions('reset')
	};
}

function buildResetPatch(currentState, initialState, sections) {
	const patch = {};

	sections.forEach((section) => {
		if (!(section in initialState)) {
			return;
		}

		if (section === 'columns' && Array.isArray(initialState.columns)) {
			patch.columns = initialState.columns.map((column) => {
				return {
					...column
				};
			});
			return;
		}

		if (section === 'query' && initialState.query) {
			patch.query = {
				...initialState.query
			};
			return;
		}

		patch[section] = initialState[section];
	});

	return patch;
}

export const ResetPlugin = {
	name: 'reset',

	commands: {
		resetGridState(context, payload = {}) {
			const options = {
				...resolveOptions(context),
				...payload
			};

			const currentState = context.peekState();
			const initialState = context.grid.getInitialStateSnapshot();
			const patch = buildResetPatch(currentState, initialState, options.sections || []);

			context.setState(patch);

			context.events.emit('grid:reset', {
				grid: context.grid,
				sections: options.sections || []
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
					const button = document.createElement('button');
					button.type = 'button';
					button.className = 'mg-button';
					button.textContent = options.label;

					button.addEventListener('click', () => {
						context.execute('resetGridState', {
							sections: options.sections
						});
					});

					return button;
				}
			}
		];
	}
};

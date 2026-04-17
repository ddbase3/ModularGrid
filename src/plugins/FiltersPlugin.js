function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 20,
		stateKey: 'filters',
		showClearButton: true,
		clearLabel: 'Clear filters',
		debounceMs: 250,
		fields: [],
		initialValues: {},
		...context.getPluginOptions('filters')
	};
}

function getDefaultValue(field) {
	if (Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
		return field.defaultValue;
	}

	if (field.type === 'checkbox') {
		return false;
	}

	return '';
}

function buildInitialState(options, currentState = {}) {
	const nextState = {
		...(options.initialValues || {})
	};

	(options.fields || []).forEach((field) => {
		if (!field || !field.key) {
			return;
		}

		if (!Object.prototype.hasOwnProperty.call(nextState, field.key)) {
			nextState[field.key] = getDefaultValue(field);
		}
	});

	return {
		...nextState,
		...currentState
	};
}

function getFilterState(context, options) {
	const state = context.peekState();
	return state[options.stateKey] || {};
}

function setFilterState(context, options, nextState) {
	context.setState({
		[options.stateKey]: nextState,
		query: {
			page: 1
		}
	});

	context.events.emit('filters:changed', {
		grid: context.grid,
		stateKey: options.stateKey,
		filters: nextState
	});

	return context.grid;
}

function normalizeFieldValue(field, value) {
	if (field.type === 'checkbox') {
		return value === true;
	}

	return value ?? '';
}

function clearTimers(context) {
	const timers = context._filtersPluginTimers || {};

	Object.values(timers).forEach((timerId) => {
		window.clearTimeout(timerId);
	});

	context._filtersPluginTimers = {};
}

function scheduleFieldUpdate(context, options, field, value) {
	const delay = Math.max(0, Number(field.debounceMs ?? options.debounceMs ?? 0) || 0);

	if (delay === 0 || (field.type !== 'text' && field.type !== 'search')) {
		context.execute('setFilterValue', {
			key: field.key,
			value
		});
		return;
	}

	context._filtersPluginTimers = context._filtersPluginTimers || {};

	if (context._filtersPluginTimers[field.key]) {
		window.clearTimeout(context._filtersPluginTimers[field.key]);
	}

	context._filtersPluginTimers[field.key] = window.setTimeout(() => {
		delete context._filtersPluginTimers[field.key];

		context.execute('setFilterValue', {
			key: field.key,
			value
		});
	}, delay);
}

function renderSelectField(context, options, field, value) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-filter-group';

	const label = document.createElement('label');
	label.className = 'mg-label';
	label.textContent = field.label || field.key;

	const select = document.createElement('select');
	select.className = 'mg-select';
	select.dataset.mgFocusKey = `filter-${options.stateKey}-${field.key}`;

	(field.options || []).forEach((entry) => {
		const option = document.createElement('option');
		option.value = entry.value;
		option.textContent = entry.label;

		if (String(entry.value) === String(value ?? '')) {
			option.selected = true;
		}

		select.appendChild(option);
	});

	if (field.width) {
		select.style.width = `${field.width}px`;
	}

	select.addEventListener('change', () => {
		scheduleFieldUpdate(context, options, field, select.value);
	});

	wrapper.appendChild(label);
	wrapper.appendChild(select);

	return wrapper;
}

function renderTextField(context, options, field, value) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-filter-group';

	const label = document.createElement('label');
	label.className = 'mg-label';
	label.textContent = field.label || field.key;

	const input = document.createElement('input');
	input.type = field.type === 'search' ? 'search' : 'text';
	input.className = 'mg-input';
	input.placeholder = field.placeholder || '';
	input.value = value ?? '';
	input.dataset.mgFocusKey = `filter-${options.stateKey}-${field.key}`;

	if (field.width) {
		input.style.width = `${field.width}px`;
	}

	input.addEventListener('input', () => {
		scheduleFieldUpdate(context, options, field, input.value);
	});

	wrapper.appendChild(label);
	wrapper.appendChild(input);

	return wrapper;
}

function renderCheckboxField(context, options, field, value) {
	const wrapper = document.createElement('label');
	wrapper.className = 'mg-inline-buttons mg-filter-checkbox';

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = value === true;
	input.dataset.mgFocusKey = `filter-${options.stateKey}-${field.key}`;

	input.addEventListener('change', () => {
		scheduleFieldUpdate(context, options, field, input.checked);
	});

	const text = document.createElement('span');
	text.textContent = field.label || field.key;

	wrapper.appendChild(input);
	wrapper.appendChild(text);

	return wrapper;
}

function renderField(context, options, field, value) {
	if (!field || !field.key) {
		return null;
	}

	if (field.type === 'select') {
		return renderSelectField(context, options, field, value);
	}

	if (field.type === 'checkbox') {
		return renderCheckboxField(context, options, field, value);
	}

	return renderTextField(context, options, field, value);
}

export const FiltersPlugin = {
	name: 'filters',

	install(context) {
		const options = resolveOptions(context);
		const currentState = context.peekState()[options.stateKey] || {};
		const initialState = buildInitialState(options, currentState);

		context._filtersPluginTimers = {};

		context.setState({
			[options.stateKey]: initialState
		});
	},

	destroy(context) {
		clearTimers(context);
	},

	commands: {
		setFilterValue(context, payload = {}) {
			const options = resolveOptions(context);
			const key = String(payload.key || '');

			if (!key) {
				return context.grid;
			}

			const currentState = getFilterState(context, options);
			const field = (options.fields || []).find((entry) => entry?.key === key) || {
				key,
				type: 'text'
			};

			return setFilterState(context, options, {
				...currentState,
				[key]: normalizeFieldValue(field, payload.value)
			});
		},

		clearFilters(context) {
			const options = resolveOptions(context);
			clearTimers(context);

			return setFilterState(context, options, buildInitialState(options));
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					const state = getFilterState(context, options);
					const fields = Array.isArray(options.fields) ? options.fields : [];

					if (fields.length === 0) {
						return null;
					}

					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-filters';

					fields.forEach((field) => {
						const element = renderField(context, options, field, state[field.key]);

						if (element) {
							wrapper.appendChild(element);
						}
					});

					if (options.showClearButton !== false) {
						const clearButton = document.createElement('button');
						clearButton.type = 'button';
						clearButton.className = 'mg-button mg-filter-clear';
						clearButton.textContent = options.clearLabel;

						clearButton.addEventListener('click', () => {
							context.execute('clearFilters');
						});

						wrapper.appendChild(clearButton);
					}

					return wrapper;
				}
			}
		];
	}
};

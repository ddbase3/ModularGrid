import { appendContent } from '../utils/dom.js';

function resolveOptions(context) {
	return {
		zone: 'toolbar',
		order: 20,
		stateKey: 'filters',
		visibilityStateKey: 'compactFilterVisibility',
		showClearButton: true,
		showPicker: true,
		clearLabel: 'Clear filters',
		addLabel: 'Add filter',
		addPlaceholder: 'Select optional filter',
		removeLabel: 'Remove filter',
		debounceMs: 250,
		fields: [],
		initialValues: {},
		initialVisibleKeys: [],
		...context.getPluginOptions('compactFilters')
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

function buildBaselineFilterState(options) {
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

	return nextState;
}

function buildInitialFilterState(options, currentState = {}) {
	return {
		...buildBaselineFilterState(options),
		...currentState
	};
}

function getFilterState(context, options) {
	const state = context.peekState();
	return state[options.stateKey] || {};
}

function getFieldByKey(options, key) {
	return (options.fields || []).find((field) => field?.key === key) || null;
}

function normalizeVisibleKeys(value) {
	if (Array.isArray(value)) {
		return value.map((key) => String(key || '')).filter((key) => key !== '');
	}

	if (value && typeof value === 'object') {
		if (Array.isArray(value.visibleKeys)) {
			return normalizeVisibleKeys(value.visibleKeys);
		}

		return Object.entries(value)
			.filter(([, visible]) => visible === true)
			.map(([key]) => String(key || ''))
			.filter((key) => key !== '');
	}

	return [];
}

function getVisibilityState(context, options) {
	const state = context.peekState();
	const visibility = state[options.visibilityStateKey] || {};

	return {
		visibleKeys: normalizeVisibleKeys(visibility)
	};
}

function isOptionalField(field) {
	if (!field || !field.key) {
		return false;
	}

	if (field.visibility === 'optional' || field.optional === true) {
		return true;
	}

	if (field.visibility === 'always' || field.alwaysVisible === true) {
		return false;
	}

	return false;
}

function valueSignature(value) {
	try {
		return JSON.stringify(value);
	} catch (error) {
		return String(value);
	}
}

function areValuesEqual(a, b) {
	return valueSignature(a) === valueSignature(b);
}

function isDefaultValue(field, value) {
	if (typeof field.isDefault === 'function') {
		return field.isDefault(value, field) === true;
	}

	return areValuesEqual(value, getDefaultValue(field));
}

function buildVisibilityState(visibleKeys) {
	return {
		visibleKeys: Array.from(new Set(visibleKeys.map((key) => String(key || '')).filter((key) => key !== '')))
	};
}

function buildInitialVisibilityState(options, currentVisibility = {}, filterState = {}) {
	const visibleKeys = new Set([
		...normalizeVisibleKeys(options.initialVisibleKeys),
		...normalizeVisibleKeys(currentVisibility)
	]);

	(options.fields || []).forEach((field) => {
		if (!isOptionalField(field)) {
			return;
		}

		if (!Object.prototype.hasOwnProperty.call(filterState, field.key)) {
			return;
		}

		if (!isDefaultValue(field, filterState[field.key])) {
			visibleKeys.add(field.key);
		}
	});

	return buildVisibilityState(Array.from(visibleKeys));
}

function normalizeFieldValue(field, value) {
	if (typeof field.normalize === 'function') {
		return field.normalize(value, field);
	}

	if (field.type === 'checkbox') {
		return value === true;
	}

	if (field.type === 'number') {
		if (value === null || value === undefined || value === '') {
			return '';
		}

		const numberValue = Number(value);
		return Number.isFinite(numberValue) ? numberValue : '';
	}

	return value ?? '';
}

function clearTimers(context) {
	const timers = context._compactFiltersPluginTimers || {};

	Object.values(timers).forEach((timerId) => {
		window.clearTimeout(timerId);
	});

	context._compactFiltersPluginTimers = {};
}

function destroyRenderedControls(context) {
	const controls = context._compactFiltersPluginControls || [];

	controls.forEach((entry) => {
		if (!entry) {
			return;
		}

		if (entry.instance && typeof entry.instance.destroy === 'function') {
			entry.instance.destroy();
			return;
		}

		if (entry.field && typeof entry.field.destroyControl === 'function') {
			entry.field.destroyControl(entry.instance, entry.api);
		}
	});

	context._compactFiltersPluginControls = [];
}

function scheduleFieldUpdate(context, options, field, value) {
	const delay = Math.max(0, Number(field.debounceMs ?? options.debounceMs ?? 0) || 0);
	const fieldType = field.type || 'text';

	if (delay === 0 || (fieldType !== 'text' && fieldType !== 'search')) {
		context.execute('setFilterValue', {
			key: field.key,
			value
		});
		return;
	}

	context._compactFiltersPluginTimers = context._compactFiltersPluginTimers || {};

	if (context._compactFiltersPluginTimers[field.key]) {
		window.clearTimeout(context._compactFiltersPluginTimers[field.key]);
	}

	context._compactFiltersPluginTimers[field.key] = window.setTimeout(() => {
		delete context._compactFiltersPluginTimers[field.key];

		context.execute('setFilterValue', {
			key: field.key,
			value
		});
	}, delay);
}

function emitFiltersChanged(context, options, filters) {
	context.events.emit('filters:changed', {
		grid: context.grid,
		stateKey: options.stateKey,
		filters
	});
}

function emitVisibilityChanged(context, options, visibility) {
	context.events.emit('compactFilters:visibilityChanged', {
		grid: context.grid,
		stateKey: options.visibilityStateKey,
		visibility
	});
}

function setFilterState(context, options, nextFilters, nextVisibility = null) {
	const patch = {
		[options.stateKey]: nextFilters,
		query: {
			page: 1
		}
	};

	if (nextVisibility !== null) {
		patch[options.visibilityStateKey] = nextVisibility;
	}

	context.setState(patch);
	emitFiltersChanged(context, options, nextFilters);

	if (nextVisibility !== null) {
		emitVisibilityChanged(context, options, nextVisibility);
	}

	return context.grid;
}

function setVisibilityState(context, options, nextVisibility) {
	context.setState({
		[options.visibilityStateKey]: nextVisibility
	});

	emitVisibilityChanged(context, options, nextVisibility);

	return context.grid;
}

function appendFieldDimensions(element, field) {
	if (field.width) {
		element.style.width = `${field.width}px`;
	}

	if (field.minWidth) {
		element.style.minWidth = `${field.minWidth}px`;
	}

	if (field.maxWidth) {
		element.style.maxWidth = `${field.maxWidth}px`;
	}
}

function createFieldGroup(field) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-filter-group mg-compact-filter-group';
	wrapper.dataset.filterKey = field.key;

	const label = document.createElement('label');
	label.className = 'mg-label';
	label.textContent = field.label || field.key;

	wrapper.appendChild(label);

	return wrapper;
}

function applyControlMetadata(control, options, field) {
	control.name = field.name || field.key;
	control.dataset.key = field.key;
	control.dataset.filterKey = field.key;
	control.dataset.mgFocusKey = `filter-${options.stateKey}-${field.key}`;
}

function renderSelectControl(context, options, field, value) {
	const select = document.createElement('select');
	select.className = 'mg-select mg-compact-filter-control';
	applyControlMetadata(select, options, field);

	(field.options || []).forEach((entry) => {
		const option = document.createElement('option');
		const optionValue = entry && typeof entry === 'object' ? entry.value : entry;
		const optionLabel = entry && typeof entry === 'object' ? entry.label : entry;

		option.value = optionValue ?? '';
		option.textContent = optionLabel ?? option.value;

		if (String(option.value) === String(value ?? '')) {
			option.selected = true;
		}

		select.appendChild(option);
	});

	appendFieldDimensions(select, field);

	select.addEventListener('change', () => {
		scheduleFieldUpdate(context, options, field, select.value);
	});

	return select;
}

function renderTextControl(context, options, field, value) {
	const input = document.createElement('input');
	input.type = field.type === 'search' ? 'search' : 'text';
	input.className = 'mg-input mg-compact-filter-control';
	input.placeholder = field.placeholder || '';
	input.value = value ?? '';
	applyControlMetadata(input, options, field);
	appendFieldDimensions(input, field);

	input.addEventListener('input', () => {
		scheduleFieldUpdate(context, options, field, input.value);
	});

	return input;
}

function renderNumberControl(context, options, field, value) {
	const input = document.createElement('input');
	input.type = field.type === 'range' ? 'range' : 'number';
	input.className = 'mg-input mg-compact-filter-control';
	input.value = value ?? '';
	applyControlMetadata(input, options, field);
	appendFieldDimensions(input, field);

	['min', 'max', 'step'].forEach((attribute) => {
		if (field[attribute] !== undefined && field[attribute] !== null) {
			input.setAttribute(attribute, String(field[attribute]));
		}
	});

	input.addEventListener('input', () => {
		scheduleFieldUpdate(context, options, field, input.value);
	});

	return input;
}

function renderDateControl(context, options, field, value) {
	const input = document.createElement('input');
	input.type = field.type === 'datetime' ? 'datetime-local' : 'date';
	input.className = 'mg-input mg-compact-filter-control';
	input.value = value ?? '';
	applyControlMetadata(input, options, field);
	appendFieldDimensions(input, field);

	input.addEventListener('change', () => {
		scheduleFieldUpdate(context, options, field, input.value);
	});

	return input;
}

function renderCheckboxControl(context, options, field, value) {
	const label = document.createElement('label');
	label.className = 'mg-inline-buttons mg-filter-checkbox mg-compact-filter-control';

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = value === true;
	applyControlMetadata(input, options, field);

	input.addEventListener('change', () => {
		scheduleFieldUpdate(context, options, field, input.checked);
	});

	const text = document.createElement('span');
	text.textContent = field.checkboxLabel || field.label || field.key;

	label.appendChild(input);
	label.appendChild(text);

	return label;
}

function renderRadioControl(context, options, field, value) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-inline-buttons mg-compact-radio-group mg-compact-filter-control';

	(field.options || []).forEach((entry) => {
		const optionValue = entry && typeof entry === 'object' ? entry.value : entry;
		const optionLabel = entry && typeof entry === 'object' ? entry.label : entry;
		const label = document.createElement('label');
		label.className = 'mg-inline-buttons mg-compact-radio-option';

		const input = document.createElement('input');
		input.type = 'radio';
		input.name = field.name || field.key;
		input.value = optionValue ?? '';
		input.checked = String(input.value) === String(value ?? '');
		input.dataset.key = field.key;
		input.dataset.filterKey = field.key;
		input.dataset.mgFocusKey = `filter-${options.stateKey}-${field.key}-${String(input.value)}`;

		input.addEventListener('change', () => {
			if (input.checked) {
				scheduleFieldUpdate(context, options, field, input.value);
			}
		});

		const text = document.createElement('span');
		text.textContent = optionLabel ?? input.value;

		label.appendChild(input);
		label.appendChild(text);
		wrapper.appendChild(label);
	});

	return wrapper;
}

function renderCustomControl(context, options, field, value, viewModel) {
	const api = {
		grid: context.grid,
		context,
		field,
		value,
		defaultValue: getDefaultValue(field),
		viewModel,
		setValue(nextValue) {
			scheduleFieldUpdate(context, options, field, nextValue);
		},
		clearValue() {
			scheduleFieldUpdate(context, options, field, getDefaultValue(field));
		},
		hideFilter() {
			context.execute('hideCompactFilter', {
				key: field.key
			});
		}
	};
	const result = field.renderControl(api);
	const element = result && result.element ? result.element : result;

	if (result && (typeof result.destroy === 'function' || typeof field.destroyControl === 'function')) {
		context._compactFiltersPluginControls = context._compactFiltersPluginControls || [];
		context._compactFiltersPluginControls.push({
			field,
			instance: result,
			api
		});
	}

	return element;
}

function renderControl(context, options, field, value, viewModel) {
	if (typeof field.renderControl === 'function') {
		return renderCustomControl(context, options, field, value, viewModel);
	}

	if (field.type === 'select') {
		return renderSelectControl(context, options, field, value);
	}

	if (field.type === 'checkbox') {
		return renderCheckboxControl(context, options, field, value);
	}

	if (field.type === 'radio') {
		return renderRadioControl(context, options, field, value);
	}

	if (field.type === 'number' || field.type === 'range') {
		return renderNumberControl(context, options, field, value);
	}

	if (field.type === 'date' || field.type === 'datetime') {
		return renderDateControl(context, options, field, value);
	}

	return renderTextControl(context, options, field, value);
}

function renderField(context, options, field, value, viewModel) {
	if (!field || !field.key) {
		return null;
	}

	const wrapper = createFieldGroup(field);
	const control = renderControl(context, options, field, value, viewModel);

	appendContent(wrapper, control);

	if (isOptionalField(field)) {
		const removeButton = document.createElement('button');
		removeButton.type = 'button';
		removeButton.className = 'mg-button mg-compact-filter-remove';
		removeButton.title = options.removeLabel;
		removeButton.setAttribute('aria-label', options.removeLabel);
		removeButton.textContent = '×';

		removeButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			context.execute('hideCompactFilter', {
				key: field.key
			});
		});

		wrapper.appendChild(removeButton);
	}

	return wrapper;
}

function getOptionalFields(options) {
	return (options.fields || []).filter(isOptionalField);
}

function getVisibleKeys(options, filters, visibility) {
	const visibleKeys = new Set(normalizeVisibleKeys(visibility));

	(options.fields || []).forEach((field) => {
		if (!field || !field.key) {
			return;
		}

		if (!isOptionalField(field)) {
			visibleKeys.add(field.key);
			return;
		}

		if (Object.prototype.hasOwnProperty.call(filters, field.key) && !isDefaultValue(field, filters[field.key])) {
			visibleKeys.add(field.key);
		}
	});

	return visibleKeys;
}

function renderPicker(context, options, fields, visibleKeys) {
	const optionalFields = fields.filter(isOptionalField);

	if (options.showPicker === false || optionalFields.length === 0) {
		return null;
	}

	const hiddenOptionalFields = optionalFields.filter((field) => !visibleKeys.has(field.key));
	const wrapper = document.createElement('label');
	wrapper.className = 'mg-control-group mg-compact-filter-picker';

	const label = document.createElement('span');
	label.className = 'mg-label';
	label.textContent = options.addLabel;

	const select = document.createElement('select');
	select.className = 'mg-select';
	select.dataset.mgFocusKey = `filter-${options.stateKey}-picker`;
	select.disabled = hiddenOptionalFields.length === 0;

	const placeholder = document.createElement('option');
	placeholder.value = '';
	placeholder.textContent = options.addPlaceholder;
	select.appendChild(placeholder);

	hiddenOptionalFields.forEach((field) => {
		const option = document.createElement('option');
		option.value = field.key;
		option.textContent = field.label || field.key;
		select.appendChild(option);
	});

	select.addEventListener('change', () => {
		const key = select.value;

		if (key !== '') {
			context.execute('showCompactFilter', {
				key
			});
		}

		select.value = '';
	});

	wrapper.appendChild(label);
	wrapper.appendChild(select);

	return wrapper;
}

export const CompactFiltersPlugin = {
	name: 'compactFilters',

	install(context) {
		const options = resolveOptions(context);
		const currentState = context.peekState()[options.stateKey] || {};
		const initialFilters = buildInitialFilterState(options, currentState);
		const currentVisibility = context.peekState()[options.visibilityStateKey] || {};
		const initialVisibility = buildInitialVisibilityState(options, currentVisibility, initialFilters);

		context._compactFiltersPluginTimers = {};
		context._compactFiltersPluginControls = [];

		context.setState({
			[options.stateKey]: initialFilters,
			[options.visibilityStateKey]: initialVisibility
		});
	},

	destroy(context) {
		clearTimers(context);
		destroyRenderedControls(context);
	},

	commands: {
		setFilterValue(context, payload = {}) {
			const options = resolveOptions(context);
			const key = String(payload.key || '');

			if (!key) {
				return context.grid;
			}

			const currentFilters = getFilterState(context, options);
			const field = getFieldByKey(options, key) || {
				key,
				type: 'text'
			};
			const nextValue = normalizeFieldValue(field, payload.value);
			const nextFilters = {
				...currentFilters,
				[key]: nextValue
			};
			let nextVisibility = null;

			if (isOptionalField(field) && !isDefaultValue(field, nextValue)) {
				const currentVisibility = getVisibilityState(context, options);
				nextVisibility = buildVisibilityState([
					...currentVisibility.visibleKeys,
					key
				]);
			}

			return setFilterState(context, options, nextFilters, nextVisibility);
		},

		clearFilters(context) {
			const options = resolveOptions(context);
			clearTimers(context);

			const nextFilters = buildBaselineFilterState(options);
			const nextVisibility = buildInitialVisibilityState(options, {}, nextFilters);

			return setFilterState(context, options, nextFilters, nextVisibility);
		},

		showCompactFilter(context, payload = {}) {
			const options = resolveOptions(context);
			const key = String(payload.key || '');
			const field = getFieldByKey(options, key);

			if (!field || !isOptionalField(field)) {
				return context.grid;
			}

			const currentVisibility = getVisibilityState(context, options);
			const nextVisibility = buildVisibilityState([
				...currentVisibility.visibleKeys,
				key
			]);

			return setVisibilityState(context, options, nextVisibility);
		},

		hideCompactFilter(context, payload = {}) {
			const options = resolveOptions(context);
			const key = String(payload.key || '');
			const field = getFieldByKey(options, key);

			if (!field || !isOptionalField(field)) {
				return context.grid;
			}

			const currentFilters = getFilterState(context, options);
			const currentVisibility = getVisibilityState(context, options);
			const nextFilters = {
				...currentFilters,
				[key]: getDefaultValue(field)
			};
			const nextVisibility = buildVisibilityState(
				currentVisibility.visibleKeys.filter((visibleKey) => visibleKey !== key)
			);

			return setFilterState(context, options, nextFilters, nextVisibility);
		},

		toggleCompactFilter(context, payload = {}) {
			const options = resolveOptions(context);
			const key = String(payload.key || '');
			const currentVisibility = getVisibilityState(context, options);

			if (currentVisibility.visibleKeys.includes(key)) {
				return context.execute('hideCompactFilter', {
					key
				});
			}

			return context.execute('showCompactFilter', {
				key
			});
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render(renderContext = {}) {
					destroyRenderedControls(context);

					const state = getFilterState(context, options);
					const visibility = getVisibilityState(context, options);
					const fields = Array.isArray(options.fields) ? options.fields : [];

					if (fields.length === 0) {
						return null;
					}

					const visibleKeys = getVisibleKeys(options, state, visibility);
					const wrapper = document.createElement('div');
					wrapper.className = 'mg-inline-buttons mg-filters mg-compact-filters';

					const picker = renderPicker(context, options, fields, visibleKeys);

					if (picker) {
						wrapper.appendChild(picker);
					}

					fields.forEach((field) => {
						if (!field || !field.key || !visibleKeys.has(field.key)) {
							return;
						}

						const element = renderField(context, options, field, state[field.key], renderContext.viewModel);

						if (element) {
							wrapper.appendChild(element);
						}
					});

					if (options.showClearButton !== false) {
						const clearButton = document.createElement('button');
						clearButton.type = 'button';
						clearButton.className = 'mg-button mg-filter-clear mg-compact-filter-clear';
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

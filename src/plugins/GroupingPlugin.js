import { attachFloatingDropdown } from '../utils/dropdown.js';

function resolveOptions(context) {
	return {
		zone: 'controlsZone',
		order: 30,
		stateKey: 'grouping',
		label: 'Group by',
		clearLabel: 'No grouping',
		fields: [],
		defaultKey: '',
		defaultFields: [],
		mode: 'single',
		presentation: '',
		dropdownTitle: 'Group rows by',
		dropdownDescription: 'Toggle fields on or off. The checked order defines the grouping path.',
		dropdownAlign: 'start',
		dropdownStateKey: '',
		onChange: null,
		summary: {
			enabled: true,
			metrics: []
		},
		...context.getPluginOptions('grouping')
	};
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeStatePatch(basePatch, extraPatch) {
	if (!isPlainObject(extraPatch)) {
		return basePatch;
	}

	const result = {
		...basePatch
	};

	Object.entries(extraPatch).forEach(([key, value]) => {
		if (isPlainObject(result[key]) && isPlainObject(value)) {
			result[key] = {
				...result[key],
				...value
			};
			return;
		}

		result[key] = value;
	});

	return result;
}

function normalizeFieldOptions(options) {
	const result = [];

	(options.fields || []).forEach((field) => {
		if (typeof field === 'string' && field.trim() !== '') {
			result.push({
				key: field.trim(),
				label: field.trim()
			});
			return;
		}

		if (!field || typeof field !== 'object') {
			return;
		}

		const key = typeof field.key === 'string' ? field.key.trim() : '';

		if (!key) {
			return;
		}

		result.push({
			...field,
			key,
			label: field.label || key
		});
	});

	return result;
}

function normalizeFields(values, options) {
	const allowedKeys = new Set(
		normalizeFieldOptions(options).map((field) => field.key)
	);
	const seen = new Set();
	const result = [];

	(values || []).forEach((value) => {
		const key = typeof value === 'string' ? value.trim() : '';

		if (!key || !allowedKeys.has(key) || seen.has(key)) {
			return;
		}

		seen.add(key);
		result.push(key);
	});

	return result;
}

function isMultiMode(options) {
	return options.mode === 'multi';
}

function resolvePresentation(options) {
	if (options.presentation === 'dropdown' || options.presentation === 'select') {
		return options.presentation;
	}

	return isMultiMode(options) ? 'dropdown' : 'select';
}

function buildSingleState(options, currentState = {}) {
	const availableFields = normalizeFieldOptions(options);
	const availableKeys = new Set(availableFields.map((field) => field.key));
	const currentKey = typeof currentState.key === 'string' ? currentState.key.trim() : '';
	const fallbackKey = typeof options.defaultKey === 'string' ? options.defaultKey.trim() : '';

	if (currentKey && availableKeys.has(currentKey)) {
		return {
			key: currentKey
		};
	}

	if (fallbackKey && availableKeys.has(fallbackKey)) {
		return {
			key: fallbackKey
		};
	}

	return {
		key: ''
	};
}

function buildMultiState(options, currentState = {}) {
	const currentFields = normalizeFields(currentState.fields, options);

	if (currentFields.length > 0) {
		return {
			fields: currentFields
		};
	}

	if (typeof currentState.key === 'string' && currentState.key.trim() !== '') {
		return {
			fields: normalizeFields([currentState.key], options)
		};
	}

	const defaultFields = normalizeFields(options.defaultFields, options);

	if (defaultFields.length > 0) {
		return {
			fields: defaultFields
		};
	}

	if (typeof options.defaultKey === 'string' && options.defaultKey.trim() !== '') {
		return {
			fields: normalizeFields([options.defaultKey], options)
		};
	}

	return {
		fields: []
	};
}

function buildInitialState(options, currentState = {}) {
	if (isMultiMode(options)) {
		return buildMultiState(options, currentState);
	}

	return buildSingleState(options, currentState);
}

function getGroupingState(context, options) {
	return context.peekState()[options.stateKey] || buildInitialState(options);
}

function getActiveFieldsFromState(state, options) {
	if (isMultiMode(options)) {
		return normalizeFields(state?.fields, options);
	}

	const key = typeof state?.key === 'string' ? state.key.trim() : '';

	return key ? normalizeFields([key], options) : [];
}

function getFieldLabel(options, key) {
	return normalizeFieldOptions(options).find((field) => field.key === key)?.label || key;
}

function getSummaryText(options, state) {
	const activeFields = getActiveFieldsFromState(state, options);

	if (activeFields.length === 0) {
		return options.clearLabel;
	}

	return activeFields.map((key) => getFieldLabel(options, key)).join(' → ');
}

function buildStatePatch(context, options, nextGroupingState) {
	const basePatch = {
		[options.stateKey]: nextGroupingState,
		query: {
			page: 1
		}
	};

	if (typeof options.onChange !== 'function') {
		return basePatch;
	}

	const extraPatch = options.onChange({
		context,
		state: context.peekState(),
		nextGroupingState,
		key: typeof nextGroupingState.key === 'string' ? nextGroupingState.key : '',
		fields: getActiveFieldsFromState(nextGroupingState, options),
		options
	});

	return mergeStatePatch(basePatch, extraPatch);
}

function emitGroupingChanged(context, options, nextGroupingState) {
	const fields = getActiveFieldsFromState(nextGroupingState, options);

	context.events.emit('grouping:changed', {
		grid: context.grid,
		stateKey: options.stateKey,
		key: fields[0] || '',
		fields
	});
}

function createSelectControl(context, options) {
	const fields = normalizeFieldOptions(options);

	if (fields.length === 0) {
		return null;
	}

	const groupingState = getGroupingState(context, options);
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-grouping-control mg-grouping-control-select';

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

function createDropdownControl(context, options) {
	const fields = normalizeFieldOptions(options);

	if (fields.length === 0) {
		return null;
	}

	const groupingState = getGroupingState(context, options);
	const activeFields = getActiveFieldsFromState(groupingState, options);
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-grouping-control mg-grouping-control-dropdown';

	const label = document.createElement('label');
	label.className = 'mg-label';
	label.textContent = options.label;
	wrapper.appendChild(label);

	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-grouping-dropdown';

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-grouping-dropdown-summary';
	summary.setAttribute('aria-label', options.label);

	const summaryValue = document.createElement('span');
	summaryValue.className = 'mg-grouping-dropdown-value';
	summaryValue.textContent = getSummaryText(options, groupingState);
	summary.appendChild(summaryValue);

	details.appendChild(summary);

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-grouping-dropdown-menu';

	if (options.dropdownTitle) {
		const title = document.createElement('div');
		title.className = 'mg-grouping-dropdown-title';
		title.textContent = options.dropdownTitle;
		menu.appendChild(title);
	}

	if (options.dropdownDescription) {
		const description = document.createElement('div');
		description.className = 'mg-grouping-dropdown-description';
		description.textContent = options.dropdownDescription;
		menu.appendChild(description);
	}

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list mg-grouping-checkbox-list';

	fields.forEach((field) => {
		const row = document.createElement('label');
		row.className = 'mg-checkbox-row mg-grouping-checkbox-row';

		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = activeFields.includes(field.key);

		input.addEventListener('click', (event) => {
			event.stopPropagation();
		});

		input.addEventListener('change', () => {
			const nextFields = input.checked
				? [...activeFields, field.key]
				: activeFields.filter((key) => key !== field.key);

			context.execute('setGroupingFields', nextFields);
		});

		row.appendChild(input);

		const text = document.createElement('span');
		text.textContent = field.label || field.key;
		row.appendChild(text);

		if (activeFields.includes(field.key)) {
			const badge = document.createElement('span');
			badge.className = 'mg-grouping-order-badge';
			badge.textContent = String(activeFields.indexOf(field.key) + 1);
			row.appendChild(badge);
		}

		list.appendChild(row);
	});

	menu.appendChild(list);

	const actions = document.createElement('div');
	actions.className = 'mg-grouping-dropdown-actions';

	const clearButton = document.createElement('button');
	clearButton.type = 'button';
	clearButton.className = 'mg-button mg-grouping-clear-button';
	clearButton.textContent = options.clearLabel;
	clearButton.disabled = activeFields.length === 0;

	clearButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		context.execute('clearGrouping');
	});

	actions.appendChild(clearButton);
	menu.appendChild(actions);

	details.appendChild(menu);

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign: options.dropdownAlign,
		stateKey: options.dropdownStateKey || `grouping-${options.stateKey}`
	});

	wrapper.appendChild(details);

	return wrapper;
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
				? payload.trim()
				: String(payload?.key || '').trim();
			const availableKeys = new Set(
				normalizeFieldOptions(options).map((field) => field.key)
			);
			const normalizedKey = availableKeys.has(nextKey) ? nextKey : '';
			const nextGroupingState = isMultiMode(options)
				? {
					fields: normalizedKey ? [normalizedKey] : []
				}
				: {
					key: normalizedKey
				};

			context.setState(buildStatePatch(context, options, nextGroupingState));
			emitGroupingChanged(context, options, nextGroupingState);

			return context.grid;
		},

		setGroupingFields(context, payload = []) {
			const options = resolveOptions(context);
			const nextFields = normalizeFields(payload, options);
			const nextGroupingState = isMultiMode(options)
				? {
					fields: nextFields
				}
				: {
					key: nextFields[0] || ''
				};

			context.setState(buildStatePatch(context, options, nextGroupingState));
			emitGroupingChanged(context, options, nextGroupingState);

			return context.grid;
		},

		toggleGroupingField(context, payload = '') {
			const options = resolveOptions(context);
			const key = typeof payload === 'string'
				? payload.trim()
				: String(payload?.key || '').trim();

			if (!key) {
				return context.grid;
			}

			if (!isMultiMode(options)) {
				return context.execute('setGrouping', key);
			}

			const currentState = getGroupingState(context, options);
			const activeFields = getActiveFieldsFromState(currentState, options);
			const nextFields = activeFields.includes(key)
				? activeFields.filter((field) => field !== key)
				: [...activeFields, key];

			return context.execute('setGroupingFields', nextFields);
		},

		clearGrouping(context) {
			const options = resolveOptions(context);
			const nextGroupingState = isMultiMode(options)
				? {
					fields: []
				}
				: {
					key: ''
				};

			context.setState(buildStatePatch(context, options, nextGroupingState));
			emitGroupingChanged(context, options, nextGroupingState);

			return context.grid;
		}
	},

	layoutContributions(context) {
		const options = resolveOptions(context);
		const fields = normalizeFieldOptions(options);

		if (fields.length === 0) {
			return [];
		}

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					if (resolvePresentation(options) === 'dropdown') {
						return createDropdownControl(context, options);
					}

					return createSelectControl(context, options);
				}
			}
		];
	}
};

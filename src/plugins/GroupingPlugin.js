import { attachFloatingDropdown } from '../utils/dropdown.js';

function resolveOptions(context) {
	return {
		zone: 'controlsZone',
		order: 30,
		stateKey: 'grouping',
		label: 'Group by',
		clearLabel: 'No grouping',
		clearButtonLabel: 'Clear grouping',
		description: '',
		fields: [],
		defaultKey: '',
		defaultKeys: [],
		multiple: false,
		control: 'select',
		dropdownAlign: 'end',
		summary: {
			enabled: true,
			metrics: []
		},
		...context.getPluginOptions('grouping')
	};
}

function normalizeGroupingKeys(values, options) {
	const allowedKeys = new Set(
		(Array.isArray(options.fields) ? options.fields : []).map((field) => String(field?.key || '').trim()).filter(Boolean)
	);
	const normalized = [];
	const used = new Set();

	(values || []).forEach((value) => {
		const key = String(value || '').trim();

		if (!key || !allowedKeys.has(key) || used.has(key)) {
			return;
		}

		used.add(key);
		normalized.push(key);
	});

	if (options.multiple !== true && normalized.length > 1) {
		return [normalized[0]];
	}

	return normalized;
}

function buildInitialState(options, currentState = {}) {
	const rawKeys = Array.isArray(currentState.keys)
		? currentState.keys
		: Array.isArray(options.defaultKeys) && options.defaultKeys.length > 0
			? options.defaultKeys
			: currentState.key
				? [currentState.key]
				: options.defaultKey
					? [options.defaultKey]
					: [];
	const keys = normalizeGroupingKeys(rawKeys, options);

	return {
		key: keys[0] || '',
		keys
	};
}

function getGroupingState(context, options) {
	const state = context.peekState()[options.stateKey] || {};

	return buildInitialState(options, state);
}

function getGroupingFieldLabel(options, key) {
	return (options.fields || []).find((field) => field?.key === key)?.label || key;
}

function getGroupingSummaryText(options, keys) {
	if (!Array.isArray(keys) || keys.length === 0) {
		return options.clearLabel;
	}

	return keys.map((key) => getGroupingFieldLabel(options, key)).join(' → ');
}

function applyGroupingState(context, options, keys) {
	const nextKeys = normalizeGroupingKeys(keys, options);
	const nextState = {
		key: nextKeys[0] || '',
		keys: nextKeys
	};

	context.setState({
		[options.stateKey]: nextState,
		query: {
			page: 1
		}
	});

	context.events.emit('grouping:changed', {
		grid: context.grid,
		key: nextState.key,
		keys: nextState.keys
	});

	return context.grid;
}

function createSelectControl(context, options, groupingState) {
	const fields = Array.isArray(options.fields) ? options.fields : [];
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

function createDropdownControl(context, options, groupingState) {
	const wrapper = document.createElement('div');
	wrapper.className = 'mg-control-group mg-grouping-control';

	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-grouping-dropdown';

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-grouping-dropdown-summary';
	const summaryValue = document.createElement('span');
	summaryValue.className = 'mg-grouping-dropdown-value';
	summaryValue.textContent = getGroupingSummaryText(options, groupingState.keys);
	summary.appendChild(summaryValue);

	details.appendChild(summary);

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-grouping-dropdown-menu';

	if (options.description) {
		const description = document.createElement('div');
		description.className = 'mg-grouping-dropdown-copy';
		description.textContent = options.description;
		menu.appendChild(description);
	}

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list mg-grouping-checkbox-list';

	(options.fields || []).forEach((field) => {
		const row = document.createElement('label');
		row.className = 'mg-checkbox-row mg-grouping-checkbox-row';

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = groupingState.keys.includes(field.key);
		checkbox.addEventListener('change', () => {
			context.execute('toggleGroupingField', field.key);
		});
		row.appendChild(checkbox);

		const text = document.createElement('span');
		text.textContent = field.label || field.key;
		row.appendChild(text);

		if (groupingState.keys.includes(field.key)) {
			const badge = document.createElement('span');
			badge.className = 'mg-grouping-order-badge';
			badge.textContent = String(groupingState.keys.indexOf(field.key) + 1);
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
	clearButton.textContent = options.clearButtonLabel;
	clearButton.disabled = groupingState.keys.length === 0;
	clearButton.addEventListener('click', () => {
		context.execute('clearGrouping');
	});
	actions.appendChild(clearButton);
	menu.appendChild(actions);

	details.appendChild(menu);
	wrapper.appendChild(details);

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign: options.dropdownAlign,
		stateKey: `${options.stateKey}:dropdown`
	});

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
			let nextKeys = [];

			if (Array.isArray(payload)) {
				nextKeys = payload;
			}
			else if (Array.isArray(payload?.keys)) {
				nextKeys = payload.keys;
			}
			else if (typeof payload === 'string') {
				nextKeys = payload ? [payload] : [];
			}
			else if (payload && typeof payload === 'object' && payload.key) {
				nextKeys = [payload.key];
			}

			return applyGroupingState(context, options, nextKeys);
		},

		toggleGroupingField(context, payload = '') {
			const options = resolveOptions(context);
			const key = String(payload || '').trim();

			if (!key) {
				return context.grid;
			}

			const groupingState = getGroupingState(context, options);
			const exists = groupingState.keys.includes(key);
			const nextKeys = exists
				? groupingState.keys.filter((fieldKey) => fieldKey !== key)
				: options.multiple === true
					? [...groupingState.keys, key]
					: [key];

			return applyGroupingState(context, options, nextKeys);
		},

		clearGrouping(context) {
			const options = resolveOptions(context);

			return applyGroupingState(context, options, []);
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

					if (options.control === 'dropdown' || options.multiple === true) {
						return createDropdownControl(context, options, groupingState);
					}

					return createSelectControl(context, options, groupingState);
				}
			}
		];
	}
};


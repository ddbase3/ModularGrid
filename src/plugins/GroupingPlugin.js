import { attachFloatingDropdown } from '../utils/dropdown.js';

function resolveOptions(context) {
	const configured = context.getPluginOptions('grouping') || {};

	return {
		zone: 'controlsZone',
		order: 30,
		stateKey: 'grouping',
		label: 'Group by',
		clearLabel: 'No grouping',
		fields: [],
		defaultKey: '',
		control: 'select',
		multi: false,
		onStateChangePatch: null,
		summary: {
			enabled: true,
			metrics: []
		},
		dropdown: {
			summaryLabel: 'Grouping',
			emptyLabel: 'No grouping',
			headline: 'Group rows by',
			copy: 'Toggle fields on or off. The checked order defines the grouping path.',
			clearLabel: 'Clear grouping',
			preferredAlign: 'end',
			stateKey: '',
			wrapperClassName: '',
			detailsClassName: '',
			summaryClassName: '',
			summaryLabelClassName: '',
			summaryValueClassName: '',
			menuClassName: '',
			headlineClassName: '',
			copyClassName: '',
			listClassName: '',
			rowClassName: '',
			badgeClassName: '',
			actionsClassName: '',
			clearButtonClassName: ''
		},
		...configured,
		dropdown: {
			summaryLabel: 'Grouping',
			emptyLabel: 'No grouping',
			headline: 'Group rows by',
			copy: 'Toggle fields on or off. The checked order defines the grouping path.',
			clearLabel: 'Clear grouping',
			preferredAlign: 'end',
			stateKey: '',
			wrapperClassName: '',
			detailsClassName: '',
			summaryClassName: '',
			summaryLabelClassName: '',
			summaryValueClassName: '',
			menuClassName: '',
			headlineClassName: '',
			copyClassName: '',
			listClassName: '',
			rowClassName: '',
			badgeClassName: '',
			actionsClassName: '',
			clearButtonClassName: '',
			...(configured.dropdown || {})
		}
	};
}

function getAvailableFields(options) {
	return (Array.isArray(options.fields) ? options.fields : []).filter((field) => {
		return field && typeof field === 'object' && typeof field.key === 'string' && field.key.trim() !== '';
	});
}

function normalizeGroupingFields(values, options) {
	const availableFields = getAvailableFields(options);
	const allowedKeys = new Set(availableFields.map((field) => field.key));
	const result = [];
	const used = new Set();

	(values || []).forEach((value) => {
		const key = String(value || '').trim();

		if (!key || !allowedKeys.has(key) || used.has(key)) {
			return;
		}

		used.add(key);
		result.push(key);
	});

	return result;
}

function buildInitialState(options, currentState = {}) {
	if (options.multi === true) {
		return {
			fields: normalizeGroupingFields(currentState.fields || [], options)
		};
	}

	return {
		key: currentState.key || options.defaultKey || ''
	};
}

function getGroupingState(context, options) {
	const state = context.peekState()[options.stateKey];

	if (!state || typeof state !== 'object') {
		return buildInitialState(options);
	}

	return buildInitialState(options, state);
}

function findField(options, key) {
	return getAvailableFields(options).find((field) => field.key === key) || null;
}

function buildGroupingSummaryText(options, activeFields) {
	if (!Array.isArray(activeFields) || activeFields.length === 0) {
		return options.dropdown.emptyLabel;
	}

	return activeFields.map((key) => {
		return findField(options, key)?.label || key;
	}).join(' → ');
}

function mergeStatePatch(basePatch, extraPatch) {
	if (!extraPatch || typeof extraPatch !== 'object' || Array.isArray(extraPatch)) {
		return basePatch;
	}

	const nextPatch = {
		...basePatch,
		...extraPatch
	};

	if (basePatch.query || extraPatch.query) {
		nextPatch.query = {
			...(basePatch.query || {}),
			...(extraPatch.query || {})
		};
	}

	return nextPatch;
}

function buildStatePatch(context, options, nextGroupingState, payload = null) {
	const basePatch = {
		[options.stateKey]: nextGroupingState,
		query: {
			page: 1
		}
	};

	if (typeof options.onStateChangePatch !== 'function') {
		return basePatch;
	}

	const extraPatch = options.onStateChangePatch({
		context,
		currentState: context.peekState(),
		nextGroupingState,
		payload
	});

	return mergeStatePatch(basePatch, extraPatch);
}

function createSelectControl(context, options) {
	const fields = getAvailableFields(options);

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

function createDropdownControl(context, options) {
	const fields = getAvailableFields(options);

	if (fields.length === 0) {
		return null;
	}

	const groupingState = getGroupingState(context, options);
	const activeFields = normalizeGroupingFields(groupingState.fields || [], options);
	const dropdownOptions = options.dropdown || {};

	const wrapper = document.createElement('div');
	wrapper.className = 'mg-grouping-control-dropdown-wrapper';

	if (dropdownOptions.wrapperClassName) {
		wrapper.classList.add(...dropdownOptions.wrapperClassName.split(' ').filter(Boolean));
	}

	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-grouping-dropdown';

	if (dropdownOptions.detailsClassName) {
		details.classList.add(...dropdownOptions.detailsClassName.split(' ').filter(Boolean));
	}

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-grouping-dropdown-summary';

	if (dropdownOptions.summaryClassName) {
		summary.classList.add(...dropdownOptions.summaryClassName.split(' ').filter(Boolean));
	}

	const summaryLabel = document.createElement('span');
	summaryLabel.className = 'mg-grouping-dropdown-summary-label';

	if (dropdownOptions.summaryLabelClassName) {
		summaryLabel.classList.add(...dropdownOptions.summaryLabelClassName.split(' ').filter(Boolean));
	}

	summaryLabel.textContent = dropdownOptions.summaryLabel || options.label;
	summary.appendChild(summaryLabel);

	const summaryValue = document.createElement('span');
	summaryValue.className = 'mg-grouping-dropdown-summary-value';

	if (dropdownOptions.summaryValueClassName) {
		summaryValue.classList.add(...dropdownOptions.summaryValueClassName.split(' ').filter(Boolean));
	}

	summaryValue.textContent = buildGroupingSummaryText(options, activeFields);
	summary.appendChild(summaryValue);

	details.appendChild(summary);

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-grouping-dropdown-menu';

	if (dropdownOptions.menuClassName) {
		menu.classList.add(...dropdownOptions.menuClassName.split(' ').filter(Boolean));
	}

	const headline = document.createElement('div');
	headline.className = 'mg-grouping-dropdown-headline';

	if (dropdownOptions.headlineClassName) {
		headline.classList.add(...dropdownOptions.headlineClassName.split(' ').filter(Boolean));
	}

	headline.textContent = dropdownOptions.headline;
	menu.appendChild(headline);

	if (dropdownOptions.copy) {
		const copy = document.createElement('div');
		copy.className = 'mg-grouping-dropdown-copy';

		if (dropdownOptions.copyClassName) {
			copy.classList.add(...dropdownOptions.copyClassName.split(' ').filter(Boolean));
		}

		copy.textContent = dropdownOptions.copy;
		menu.appendChild(copy);
	}

	const list = document.createElement('div');
	list.className = 'mg-checkbox-list mg-grouping-dropdown-list';

	if (dropdownOptions.listClassName) {
		list.classList.add(...dropdownOptions.listClassName.split(' ').filter(Boolean));
	}

	fields.forEach((field) => {
		const row = document.createElement('label');
		row.className = 'mg-checkbox-row mg-grouping-dropdown-row';

		if (dropdownOptions.rowClassName) {
			row.classList.add(...dropdownOptions.rowClassName.split(' ').filter(Boolean));
		}

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = activeFields.includes(field.key);

		checkbox.addEventListener('change', () => {
			const nextFields = checkbox.checked
				? [...activeFields, field.key]
				: activeFields.filter((activeKey) => activeKey !== field.key);

			context.execute('setGrouping', {
				fields: nextFields
			});
		});

		row.appendChild(checkbox);

		const label = document.createElement('span');
		label.textContent = field.label || field.key;
		row.appendChild(label);

		if (activeFields.includes(field.key)) {
			const badge = document.createElement('span');
			badge.className = 'mg-grouping-dropdown-order-badge';

			if (dropdownOptions.badgeClassName) {
				badge.classList.add(...dropdownOptions.badgeClassName.split(' ').filter(Boolean));
			}

			badge.textContent = String(activeFields.indexOf(field.key) + 1);
			row.appendChild(badge);
		}

		list.appendChild(row);
	});

	menu.appendChild(list);

	const actions = document.createElement('div');
	actions.className = 'mg-grouping-dropdown-actions';

	if (dropdownOptions.actionsClassName) {
		actions.classList.add(...dropdownOptions.actionsClassName.split(' ').filter(Boolean));
	}

	const clearButton = document.createElement('button');
	clearButton.type = 'button';
	clearButton.className = 'mg-button mg-grouping-dropdown-clear-button';

	if (dropdownOptions.clearButtonClassName) {
		clearButton.classList.add(...dropdownOptions.clearButtonClassName.split(' ').filter(Boolean));
	}

	clearButton.textContent = dropdownOptions.clearLabel || options.clearLabel;
	clearButton.disabled = activeFields.length === 0;

	clearButton.addEventListener('click', () => {
		context.execute('clearGrouping');
	});

	actions.appendChild(clearButton);
	menu.appendChild(actions);

	details.appendChild(menu);

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign: dropdownOptions.preferredAlign || 'end',
		stateKey: dropdownOptions.stateKey || `${options.stateKey}:dropdown`
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

			if (options.multi === true) {
				const nextFields = Array.isArray(payload)
					? normalizeGroupingFields(payload, options)
					: normalizeGroupingFields(payload?.fields || [], options);
				const nextGroupingState = {
					fields: nextFields
				};

				context.setState(
					buildStatePatch(context, options, nextGroupingState, payload)
				);

				context.events.emit('grouping:changed', {
					grid: context.grid,
					key: nextFields[0] || '',
					fields: nextFields
				});

				return context.grid;
			}

			const nextKey = typeof payload === 'string'
				? payload
				: String(payload?.key || '');
			const nextGroupingState = {
				key: nextKey
			};

			context.setState(
				buildStatePatch(context, options, nextGroupingState, payload)
			);

			context.events.emit('grouping:changed', {
				grid: context.grid,
				key: nextKey,
				fields: nextKey ? [nextKey] : []
			});

			return context.grid;
		},

		clearGrouping(context) {
			const options = resolveOptions(context);
			const nextGroupingState = options.multi === true
				? { fields: [] }
				: { key: '' };

			context.setState(
				buildStatePatch(context, options, nextGroupingState, null)
			);

			context.events.emit('grouping:changed', {
				grid: context.grid,
				key: '',
				fields: []
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
					if (options.control === 'dropdown' && options.multi === true) {
						return createDropdownControl(context, options);
					}

					return createSelectControl(context, options);
				}
			}
		];
	}
};

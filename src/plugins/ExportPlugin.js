import { attachFloatingDropdown } from '../utils/dropdown.js';

function resolveOptions(context) {
	const configured = context.getPluginOptions('export') || {};
	const labels = configured.labels || {};

	return {
		zone: 'actions',
		order: 100,
		buttonLabel: context.getString('export'),
		exporters: [],
		defaultExporter: '',
		scopes: [],
		defaultScope: 'filtered',
		fields: [],
		defaultFields: [],
		onExport: null,
		preferredAlign: 'end',
		stateKey: 'export',
		...configured,
		labels: {
			formatTab: 'Format',
			dataTab: 'Data',
			fieldsTab: 'Fields',
			run: context.getString('export'),
			working: 'Exporting ...',
			failed: 'Export failed.',
			noFields: 'Select at least one field.',
			noSelection: context.getString('noSelection'),
			...labels
		}
	};
}

function getSelectedRowIds(context) {
	const selectedRowIds = context.peekState().selection?.selectedRowIds;
	return Array.isArray(selectedRowIds) ? selectedRowIds : [];
}

function normalizeOptionList(values, keyName) {
	if (!Array.isArray(values)) {
		return [];
	}

	return values.filter((item) => {
		return item
			&& typeof item === 'object'
			&& typeof item[keyName] === 'string'
			&& item[keyName].trim() !== '';
	});
}

function normalizeFieldKeys(values, fields) {
	const allowedKeys = new Set(fields.map((field) => field.key));
	const result = [];

	(Array.isArray(values) ? values : []).forEach((value) => {
		const key = String(value || '').trim();

		if (!key || !allowedKeys.has(key) || result.includes(key)) {
			return;
		}

		result.push(key);
	});

	return result;
}

function getExportState(context, options) {
	if (!context.grid._mgExportPluginState) {
		context.grid._mgExportPluginState = {};
	}

	const exporters = normalizeOptionList(options.exporters, 'name');
	const scopes = normalizeOptionList(options.scopes, 'key');
	const fields = normalizeOptionList(options.fields, 'key');
	const state = context.grid._mgExportPluginState;
	const exporterNames = exporters.map((item) => item.name);
	const scopeKeys = scopes.map((item) => item.key);

	if (!exporterNames.includes(state.exporter)) {
		state.exporter = exporterNames.includes(options.defaultExporter)
			? options.defaultExporter
			: (exporterNames[0] || '');
	}

	if (!scopeKeys.includes(state.scope)) {
		state.scope = scopeKeys.includes(options.defaultScope)
			? options.defaultScope
			: (scopeKeys[0] || 'filtered');
	}

	if (!Array.isArray(state.fields)) {
		state.fields = normalizeFieldKeys(options.defaultFields, fields);
	}

	state.fields = normalizeFieldKeys(state.fields, fields);

	return state;
}

function createRadioList(items, activeValue, onChange) {
	const list = document.createElement('div');
	list.className = 'mg-export-choice-list';
	const groupName = `mg-export-${Math.random().toString(36).slice(2)}`;

	items.forEach((item) => {
		const row = document.createElement('label');
		row.className = 'mg-export-choice-row';

		const input = document.createElement('input');
		input.type = 'radio';
		input.name = groupName;
		input.checked = item.value === activeValue;
		input.addEventListener('change', () => {
			if (input.checked) {
				onChange(item.value);
			}
		});

		const label = document.createElement('span');
		label.textContent = item.label;

		row.appendChild(input);
		row.appendChild(label);
		list.appendChild(row);
	});

	return list;
}

function createExportControl(context, options) {
	const exporters = normalizeOptionList(options.exporters, 'name');
	const scopes = normalizeOptionList(options.scopes, 'key');
	const fields = normalizeOptionList(options.fields, 'key');

	if (exporters.length === 0 || scopes.length === 0 || fields.length === 0 || typeof options.onExport !== 'function') {
		return null;
	}

	const state = getExportState(context, options);
	const details = document.createElement('details');
	details.className = 'mg-dropdown mg-export-dropdown';

	const summary = document.createElement('summary');
	summary.className = 'mg-button mg-dropdown-summary mg-export-button';
	summary.textContent = options.buttonLabel || context.getString('export');
	details.appendChild(summary);

	const menu = document.createElement('div');
	menu.className = 'mg-dropdown-menu mg-export-menu';

	const tabs = document.createElement('div');
	tabs.className = 'mg-export-tabs';

	const panelWrapper = document.createElement('div');
	panelWrapper.className = 'mg-export-panels';

	const tabDefinitions = [
		{ key: 'format', label: options.labels.formatTab },
		{ key: 'data', label: options.labels.dataTab },
		{ key: 'fields', label: options.labels.fieldsTab }
	];
	const panels = new Map();
	const tabButtons = new Map();

	const activateTab = (key) => {
		state.tab = key;

		tabButtons.forEach((button, tabKey) => {
			button.classList.toggle('mg-export-tab-active', tabKey === key);
			button.setAttribute('aria-selected', tabKey === key ? 'true' : 'false');
		});

		panels.forEach((panel, panelKey) => {
			panel.hidden = panelKey !== key;
		});
	};

	tabDefinitions.forEach((tab) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'mg-export-tab';
		button.textContent = tab.label;
		button.addEventListener('click', () => activateTab(tab.key));
		tabs.appendChild(button);
		tabButtons.set(tab.key, button);

		const panel = document.createElement('div');
		panel.className = 'mg-export-panel';
		panel.dataset.exportPanel = tab.key;
		panelWrapper.appendChild(panel);
		panels.set(tab.key, panel);
	});

	panels.get('format').appendChild(createRadioList(
		exporters.map((item) => ({ value: item.name, label: item.label || item.name })),
		state.exporter,
		(value) => {
			state.exporter = value;
		}
	));

	panels.get('data').appendChild(createRadioList(
		scopes.map((item) => ({ value: item.key, label: item.label || item.key })),
		state.scope,
		(value) => {
			state.scope = value;
		}
	));

	const fieldList = document.createElement('div');
	fieldList.className = 'mg-export-field-list';

	fields.forEach((field) => {
		const row = document.createElement('label');
		row.className = 'mg-export-choice-row';

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.checked = state.fields.includes(field.key);
		checkbox.addEventListener('change', () => {
			state.fields = checkbox.checked
				? normalizeFieldKeys([...state.fields, field.key], fields)
				: state.fields.filter((key) => key !== field.key);
		});

		const label = document.createElement('span');
		label.textContent = field.label || field.key;

		row.appendChild(checkbox);
		row.appendChild(label);
		fieldList.appendChild(row);
	});

	panels.get('fields').appendChild(fieldList);

	menu.appendChild(tabs);
	menu.appendChild(panelWrapper);

	const status = document.createElement('div');
	status.className = 'mg-export-status';
	status.hidden = true;
	menu.appendChild(status);

	const actions = document.createElement('div');
	actions.className = 'mg-export-actions';

	const runButton = document.createElement('button');
	runButton.type = 'button';
	runButton.className = 'mg-button mg-export-run-button';
	runButton.textContent = options.labels.run;

	runButton.addEventListener('click', async () => {
		status.hidden = true;
		status.textContent = '';

		if (state.fields.length === 0) {
			status.textContent = options.labels.noFields;
			status.hidden = false;
			activateTab('fields');
			return;
		}

		const selectedRowIds = getSelectedRowIds(context);
		if (state.scope === 'selected' && selectedRowIds.length === 0) {
			status.textContent = options.labels.noSelection;
			status.hidden = false;
			activateTab('data');
			return;
		}

		runButton.disabled = true;
		status.textContent = options.labels.working;
		status.hidden = false;

		try {
			await options.onExport({
				grid: context.grid,
				context,
				exporter: state.exporter,
				scope: state.scope,
				fields: [...state.fields],
				selectedRowIds
			});
			status.hidden = true;
			details.open = false;
		}
		catch (error) {
			status.textContent = error?.message || options.labels.failed;
			status.hidden = false;
		}
		finally {
			runButton.disabled = false;
		}
	});

	actions.appendChild(runButton);
	menu.appendChild(actions);
	details.appendChild(menu);

	activateTab(['format', 'data', 'fields'].includes(state.tab) ? state.tab : 'format');

	attachFloatingDropdown(details, {
		grid: context.grid,
		summary,
		menu,
		preferredAlign: options.preferredAlign,
		stateKey: options.stateKey
	});

	return details;
}

export const ExportPlugin = {
	name: 'export',

	layoutContributions(context) {
		const options = resolveOptions(context);

		return [
			{
				zone: options.zone,
				order: options.order,
				render() {
					return createExportControl(context, options);
				}
			}
		];
	}
};

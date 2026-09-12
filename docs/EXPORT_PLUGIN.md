# ExportPlugin

`ExportPlugin` is the ModularGrid UI control for server/delegated exports.

It deliberately does not own data serialization. The grid may be backed by server-side paging, filters, access-control rules or data that is not loaded into the browser. Therefore the plugin collects export choices and delegates the operation to the configured `onExport` callback.

## UI contract

The plugin renders one control in its configured layout zone. A consumer may place it in a horizontal topline without introducing nested topline rows.

The dropdown exposes:

- exporter/format choice
- data scope choice
- field choice

Configuration example:

```js
export: {
	zone: 'topLine1',
	order: 35,
	buttonLabel: 'Export',
	exporters: [
		{ name: 'csvreportexporter', label: 'CSV' },
		{ name: 'jsonreportexporter', label: 'JSON' }
	],
	scopes: [
		{ key: 'selected', label: 'Current selection' },
		{ key: 'filtered', label: 'Current filtering' },
		{ key: 'all', label: 'All data' }
	],
	fields: [
		{ key: 'name', label: 'Name' },
		{ key: 'email', label: 'Email' }
	],
	defaultFields: ['name', 'email'],
	onExport(request) {
		return sendExportRequest(request);
	}
}
```

The callback receives:

```js
{
	exporter,
	scope,
	fields,
	selectedRowIds
}
```

`selectedRowIds` comes from the normal ModularGrid selection state. The server or owning application remains responsible for interpreting those identifiers and applying authorization.

## Selection consistency

Table rendering must never mark a changed selection signature as already rendered while reusing old checkbox DOM. The infinite-scroll reuse and append paths therefore require unchanged selection and text-display signatures before they can reuse the existing table body.

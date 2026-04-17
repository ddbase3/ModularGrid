# Extended Ajax Demo

This demo uses the public endpoint:

- `https://base3.de/modulargriddemoservice.json`

## Goal

The demo shows the framework-level combination of:

- server-side paging
- server-side search
- server-side sorting
- server-side filter state outside the default query object
- shared row-detail rendering in both table and card view
- responsive automatic switching between table and cards
- manual view switching that still works on wide screens

## Relevant framework features

### `dataMode: "server"`

When `dataMode` is set to `server`, the grid no longer performs local search, sorting and paging on the loaded rows. Instead, it treats the adapter result as already prepared by the backend.

### `server.watchStateKeys`

The grid can watch additional top-level state keys and reload automatically when they change.

This demo uses:

```js
server: {
	searchDebounceMs: 220,
	watchStateKeys: ['query', 'serverFilters']
}

That is why changes in the custom serverFilters plugin also trigger a reload.

RowDetailPlugin

The same detail state is used in both the table and card view.

The demo configures it like this:

rowDetail: {
	rowIdKey: 'id',
	clearOnDataReload: true,
	detailRenderer: renderPersonDetail
}
Expected backend request shape

The demo sends a POST body like:

{
	"mode": "page",
	"page": 1,
	"pageSize": 10,
	"search": "",
	"sort": [
		{
			"key": "lastname",
			"dir": "asc",
			"type": "string"
		}
	],
	"filters": {
		"status": "active"
	},
	"group": []
}
Expected backend response shape

At minimum:

{
	"data": [],
	"total": 0
}

Optional fields such as columns can also be returned and are accepted by AjaxAdapter.


---

## `docs/architecture/SERVER_MODE_AND_ROW_DETAIL.md`
```markdown
# Server Mode and Shared Row Detail

This document describes the framework additions introduced for the extended ajax demo.

## 1. Server mode

`ModularGrid` now supports:

```js
dataMode: 'server'
Behavior

In server mode, the grid does not apply client-side:

search
sorting
paging

The loaded rows are treated as the final page returned by the backend, while data.total is used to compute pager information.

2. Automatic reload on watched state keys

The server mode can watch top-level state sections and trigger reloads when they change.

Example:

server: {
	searchDebounceMs: 220,
	watchStateKeys: ['query', 'serverFilters']
}
Notes
query should normally always be watched.
additional plugin state can be watched if it affects the backend request
search changes are debounced
non-search changes reload immediately
3. Shared row detail state

A new plugin is available:

RowDetailPlugin

It provides:

setDetailRow
clearDetailRow
toggleDetailRow

Default state key:

detailView.rowId
4. Rendering row details in multiple views

Both TableView and CardView now understand pluginOptions.rowDetail.

Example:

rowDetail: {
	rowIdKey: 'id',
	clearOnDataReload: true,
	detailRenderer(row, grid, viewModel) {
		return ...
	}
}
Supported options
stateKey
rowIdKey
toggleOnRowClick
renderInTable
renderInCards
showLabels
emptyPlaceholder
detailRenderer
clearOnDataReload
5. Card view title and subtitle renderers

CardView now supports:

titleRenderer(row, grid, viewModel)
subtitleRenderer(row, grid, viewModel)

This allows card headers that are independent from a single raw data field.

6. Responsive view switching fix

ResponsiveViewPlugin now switches only on breakpoint transitions.

That means:

entering narrow mode still forces the configured narrow view
leaving narrow mode restores the last wide view
manually selecting the card view on a wide screen is no longer reverted immediately

This removes the previous issue where the view switcher button could not keep the card view active on wide screens.

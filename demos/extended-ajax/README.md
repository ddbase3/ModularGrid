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
- wide table rendering with horizontal scrolling
- long-text clamp rendering using a combined `free_text` + `notes` column
- optional extra columns exposed through the column selector

## Relevant framework features

### `dataMode: "server"`

When `dataMode` is set to `server`, the grid no longer performs local search, sorting and paging on the loaded rows. Instead, it treats the adapter result as already prepared by the backend.

### `server.watchStateKeys`

The grid can watch additional top-level state keys and reload automatically when they change.

This demo uses:

```js
server: {
	searchDebounceMs: 220,
	watchStateKeys: ['query', 'filters']
}

That is why changes in the query state and the external filters state trigger backend reloads.

Wide table rendering

The table view now renders inside a dedicated horizontal scroll container.

This matters for this demo because the visible baseline now includes several wide render columns:

person
address
status
metrics
activity
text overview

Additional optional fields can be enabled through the column selector without breaking the overall layout.

Combined long-text column

The demo includes a synthetic render column:

text_overview

It combines:

free_text
notes

The column uses the clamp strategy so that longer text stays compact in table, card and split detail rendering.

Row detail behavior

The same detail state is used in both the table and card view.

The demo configures it like this:

rowDetail: {
	rowIdKey: 'id',
	clearOnDataReload: true
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

Related architecture notes
Server mode

ModularGrid supports:

dataMode: 'server'

In server mode, the grid does not apply client-side:

search
sorting
paging

The loaded rows are treated as the final page returned by the backend, while data.total is used to compute pager information.

Shared row detail state

RowDetailPlugin provides:

setDetailRow
clearDetailRow
toggleDetailRow

Default state key:

detailView.rowId
Rendering row details in multiple views

Both TableView and CardView understand pluginOptions.rowDetail.

Example:

rowDetail: {
	rowIdKey: 'id',
	clearOnDataReload: true,
	detailRenderer(row, grid, viewModel) {
		return ...
	}
}

Supported options include:

stateKey
rowIdKey
toggleOnRowClick
renderInTable
renderInCards
showLabels
emptyPlaceholder
detailRenderer
clearOnDataReload
Responsive view switching fix

ResponsiveViewPlugin switches only on breakpoint transitions.

That means:

entering narrow mode still forces the configured narrow view
leaving narrow mode restores the last wide view
manually selecting the card view on a wide screen is no longer reverted immediately

This removes the previous issue where the view switcher button could not keep the card view active on wide screens.
